/**
 * DOC 6 — Security test suite (demo-applicable subset).
 *
 * Runs against the real Express app (in-process, ephemeral port) and the seeded
 * in-memory demo store. Covers the attack surfaces that exist in this demo:
 *   - IDOR: cross-tenant access to apps/testimonials/forms/widgets/api-keys/
 *     webhooks must 404, never leak, for every entity type (multi-app model).
 *   - Vertical RBAC: viewers/editors cannot moderate or create apps.
 *   - Cross-kind sessions: a company token cannot hit /v1/platform/* and a
 *     platform token cannot hit company /v1/apps.
 *   - Token tampering ("alg:none", bit-flips, garbage) -> 401.
 *   - Impersonation lifecycle: issue -> correct /me -> still tenant-scoped ->
 *     exit returns a platform session.
 *   - Write-time hygiene: ratings clamp to 1–5, free text is length-capped.
 *   - Security response headers present; x-powered-by removed.
 *
 * Production-only controls from DOC 6 (Postgres/Prisma SQLi, Redis rate
 * limiting, RS256/JWK auth, argon2, KMS, Docker, pen/load testing) are N/A for
 * the in-memory demo engine — see docs/06-immune-system-status.md.
 *
 * Run:  npm --prefix server run test:security
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';

let server: Server;
let base = '';

async function req(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ status: number; json: Record<string, unknown> | unknown[] | null; headers: Headers }> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: Record<string, unknown> | unknown[] | null = null;
  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown> | unknown[];
    } catch {
      json = null;
    }
  }
  return { status: res.status, json, headers: res.headers };
}

const login = async (email: string, password: string, platform = false): Promise<string> => {
  const path = platform ? '/v1/platform/auth/login' : '/v1/auth/login';
  const { status, json } = await req('POST', path, { body: { email, password } });
  assert.equal(status, 200, `login ${email}`);
  return (json as { token: string }).token;
};

let ownerToken = '';
let viewerToken = '';
let editorToken = '';
let platformToken = '';
let acmePendingId = '';

before(async () => {
  server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  ownerToken = await login('owner@acme.test', 'demo1234');
  viewerToken = await login('chris@acme.test', 'demo1234');
  editorToken = await login('editor@acme.test', 'demo1234');
  platformToken = await login('admin@zojatech.test', 'demo1234', true);

  const own = await req('GET', '/v1/apps/app-acme-1/testimonials?status=pending&perPage=5', { token: ownerToken });
  const rows = (own.json as { rows: Array<{ id: string }> }).rows;
  acmePendingId = rows[0]?.id ?? '';
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('DOC 6 — IDOR: cross-tenant access returns 404 and never leaks', () => {
  const foreignCases: Array<[string, string]> = [
    ['GET', '/v1/apps/app-lumen-1/testimonials?perPage=200'],
    ['GET', '/v1/apps/app-lumen-1/testimonials/t-app-lumen-1-a-0'],
    ['GET', '/v1/apps/app-lumen-1/forms'],
    ['GET', '/v1/apps/app-lumen-1/widgets'],
    ['GET', '/v1/apps/app-lumen-1/api-keys'],
    ['GET', '/v1/apps/app-lumen-1/webhooks'],
    ['GET', '/v1/apps/app-nordic-1/testimonials'],
    ['GET', '/v1/dashboard/overview?appId=app-lumen-1'],
    ['GET', '/v1/apps/does-not-exist/testimonials'],
    ['GET', '/v1/apps/does-not-exist/forms'],
  ];
  for (const [method, path] of foreignCases) {
    it(`${method} ${path} -> 404 as a different tenant`, async () => {
      const res = await req(method, path, { token: ownerToken });
      assert.equal(res.status, 404);
      assert.doesNotMatch(JSON.stringify(res.json), /app-lumen-1|Lumen|testimonial content/i);
    });
  }

  it('cross-tenant moderation mutation is rejected with 404', async () => {
    const res = await req('PATCH', '/v1/apps/app-lumen-1/testimonials/t-app-lumen-1-p-0/moderation', {
      token: ownerToken,
      body: { action: 'approve' },
    });
    assert.equal(res.status, 404);
  });

  it('owner can still read all of their own apps (Acme has two)', async () => {
    const list = await req('GET', '/v1/apps?perPage=200', { token: ownerToken });
    assert.equal(list.status, 200);
    const rows = (list.json as { rows: Array<{ id: string }> }).rows;
    assert.ok(rows.some((r) => r.id === 'app-acme-1'), 'owns app-acme-1');
    assert.ok(rows.some((r) => r.id === 'app-acme-2'), 'owns app-acme-2');
    const blog = await req('GET', '/v1/apps/app-acme-2/testimonials', { token: ownerToken });
    assert.equal(blog.status, 200);
  });
});

describe('DOC 6 — vertical RBAC (server-enforced, no client trust)', () => {
  it('viewer cannot moderate a pending testimonial', async () => {
    assert.ok(acmePendingId, 'expected a seeded pending id');
    const res = await req('PATCH', `/v1/apps/app-acme-1/testimonials/${acmePendingId}/moderation`, {
      token: viewerToken,
      body: { action: 'approve' },
    });
    assert.equal(res.status, 401);
  });

  it('editor cannot moderate (write only, no moderate permission)', async () => {
    const res = await req('PATCH', `/v1/apps/app-acme-1/testimonials/${acmePendingId}/moderation`, {
      token: editorToken,
      body: { action: 'approve' },
    });
    assert.equal(res.status, 401);
  });

  it('viewer cannot create an app (apps.manage required)', async () => {
    const res = await req('POST', '/v1/apps', { token: viewerToken, body: { name: 'Hijack' } });
    assert.equal(res.status, 401);
  });

  it('owner (with permission) can read and create', async () => {
    const read = await req('GET', '/v1/apps', { token: ownerToken });
    assert.equal(read.status, 200);
    const created = await req('POST', '/v1/apps', { token: ownerToken, body: { name: 'Security test app' } });
    assert.equal(created.status, 201);
  });
});

describe('DOC 6 — cross-kind sessions are rejected', () => {
  it('platform token cannot call company routes', async () => {
    const res = await req('GET', '/v1/apps', { token: platformToken });
    assert.equal(res.status, 401);
  });
  it('company token cannot call platform routes', async () => {
    const res = await req('GET', '/v1/platform/tenants', { token: ownerToken });
    assert.equal(res.status, 401);
  });
});

describe('DOC 6 — token tampering is rejected', () => {
  it('garbage token -> 401', async () => {
    const res = await req('GET', '/v1/auth/me', { token: 'not-a-real-token' });
    assert.equal(res.status, 401);
  });
  it('alg:none style token -> 401', async () => {
    const fake = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from('{}').toString('base64url')}`;
    const res = await req('GET', '/v1/auth/me', { token: fake });
    assert.equal(res.status, 401);
  });
  it('bit-flipped valid token -> 401', async () => {
    const flipped = `${ownerToken.slice(0, 12)}${ownerToken[12] === 'A' ? 'B' : 'A'}${ownerToken.slice(13)}`;
    const res = await req('GET', '/v1/auth/me', { token: flipped });
    assert.equal(res.status, 401);
  });
  it('valid token still works through every channel (header, x-session-token, query)', async () => {
    assert.equal((await req('GET', '/v1/auth/me', { token: ownerToken })).status, 200);
    assert.equal((await req('GET', '/v1/auth/me', { headers: { 'x-session-token': ownerToken } })).status, 200);
    assert.equal((await req('GET', `/v1/auth/me?session_token=${encodeURIComponent(ownerToken)}`)).status, 200);
  });
});

describe('DOC 6 — impersonation lifecycle', () => {
  it('platform admin can open a tenant as its owner, stay scoped, then exit', async () => {
    const issue = await req('POST', '/v1/platform/tenants/tenant-acme/impersonate', { token: platformToken });
    assert.equal(issue.status, 200);
    const impToken = (issue.json as { token: string }).token;

    const me = await req('GET', '/v1/auth/me', { token: impToken });
    assert.equal(me.status, 200);
    const meJson = me.json as {
      user: { email: string };
      tenant: { name: string };
      impersonating: { by: string; tenantName: string };
    };
    assert.equal(meJson.user.email, 'owner@acme.test');
    assert.equal(meJson.tenant.name, 'Acme Inc');
    assert.equal(meJson.impersonating.by, 'admin@zojatech.test');

    // Still tenant-scoped: owns Acme's apps, cannot hit the platform console.
    assert.equal((await req('GET', '/v1/apps/app-acme-1/forms', { token: impToken })).status, 200);
    assert.equal((await req('GET', '/v1/apps/app-lumen-1/forms', { token: impToken })).status, 404);
    assert.equal((await req('GET', '/v1/platform/tenants', { token: impToken })).status, 401);

    // Exit swaps back to the platform admin.
    const exit = await req('POST', '/v1/auth/impersonation/exit', { token: impToken });
    assert.equal(exit.status, 200);
    const exitToken = (exit.json as { token: string }).token;
    const me2 = (await req('GET', '/v1/auth/me', { token: exitToken })).json as {
      user: { email: string };
      tenant: null;
      impersonating: null;
    };
    assert.equal(me2.user.email, 'admin@zojatech.test');
    assert.equal(me2.tenant, null);
    assert.equal(me2.impersonating, null);
  });
});

describe('DOC 6 — write-time hygiene on public submissions', () => {
  it('clamps ratings to 1..5 and caps free text + author name', async () => {
    const res = await req('POST', '/v1/public/forms/website-review/submissions', {
      body: { answers: { q1: 99, q2: 'x'.repeat(4000), name: 'N'.repeat(500) } },
    });
    assert.equal(res.status, 201);

    const list = await req('GET', '/v1/apps/app-acme-1/testimonials?status=pending&perPage=200', { token: ownerToken });
    assert.equal(list.status, 200);
    const rows = (list.json as { rows: Array<{ rating?: number; authorName?: string; content: string }> }).rows;
    const created = rows.find((r) => r.authorName === 'N'.repeat(120));
    assert.ok(created, 'submission stored with capped author name');
    assert.equal(created.rating, 5, 'rating 99 clamped to 5');
    assert.ok(created.content.length <= 2000, 'free text capped (2000/answer)');
  });

  it('rejects non-object answers', async () => {
    const res = await req('POST', '/v1/public/forms/website-review/submissions', { body: { answers: 'nope' } });
    assert.equal(res.status, 400);
  });
});

describe('DOC 6 — response hardening', () => {
  it('sets nosniff + referrer-policy and removes x-powered-by', async () => {
    const res = await req('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  it('errors are JSON, never stack traces or internal text', async () => {
    const res = await req('GET', '/v1/auth/me');
    assert.equal(res.status, 401);
    const body = JSON.stringify(res.json);
    assert.match(body, /error/);
    assert.doesNotMatch(body, /at |\.ts:|stack|demo-data|node_modules/i);
  });
});
