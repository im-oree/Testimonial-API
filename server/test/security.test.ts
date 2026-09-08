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

describe('DOC 6 — platform console RBAC (role templates & staff accounts)', () => {
  let superT = '';
  let adminT = '';
  let editorT = '';

  before(async () => {
    superT = await login('admin@zojatech.test', 'demo1234', true);
    adminT = await login('tolu@zojatech.test', 'demo1234', true);
    editorT = await login('kemi@zojatech.test', 'demo1234', true);
  });

  it('a suspended platform account cannot sign in', async () => {
    const res = await req('POST', '/v1/platform/auth/login', { body: { email: 'bode@zojatech.test', password: 'demo1234' } });
    assert.equal(res.status, 403);
  });

  it('super admin session carries the role-template permission superset', async () => {
    const me = await req('GET', '/v1/auth/me', { token: superT });
    assert.equal(me.status, 200);
    const body = me.json as { user: { role: string }; permissions: string[]; roleTemplates?: unknown[] };
    assert.equal(body.user.role, 'platform_owner');
    for (const p of ['tenants.read', 'tenants.write', 'staff.read', 'staff.write', 'impersonate', 'audit.all', 'platform.manage']) {
      assert.ok(body.permissions.includes(p), `super admin holds ${p}`);
    }
    assert.equal(body.roleTemplates?.length, 4);
  });

  it('editor template: view tenants/staff, but no tenant writes, impersonation or staff mgmt', async () => {
    assert.equal((await req('GET', '/v1/platform/tenants', { token: editorT })).status, 200);
    assert.equal((await req('GET', '/v1/platform/staff', { token: editorT })).status, 200);
    assert.equal(
      (await req('POST', '/v1/platform/tenants', { token: editorT, body: { name: 'x', ownerEmail: 'x@x.test' } })).status,
      403,
    );
    assert.equal((await req('POST', '/v1/platform/tenants/tenant-acme/impersonate', { token: editorT })).status, 403);
    assert.equal(
      (await req('POST', '/v1/platform/staff', { token: editorT, body: { name: 'n', email: 'n@n.test', role: 'platform_support' } })).status,
      403,
    );
  });

  it('admin template: tenants.write allowed, staff management still 403 (write independence)', async () => {
    assert.equal((await req('PATCH', '/v1/platform/tenants/tenant-acme', { token: adminT, body: { status: 'trialing' } })).status, 200);
    assert.equal((await req('PATCH', '/v1/platform/tenants/tenant-acme', { token: adminT, body: { status: 'active' } })).status, 200);
    assert.equal(
      (await req('POST', '/v1/platform/staff', { token: adminT, body: { name: 'n', email: 'n@n.test', role: 'platform_support' } })).status,
      403,
    );
  });

  it('super admin runs the full staff lifecycle (create, role, suspend, revoke-session, delete)', async () => {
    const created = await req('POST', '/v1/platform/staff', {
      token: superT,
      body: { name: 'Rbac Test', email: 'rbac@zojatech.test', role: 'platform_editor', password: 'hunter22' },
    });
    assert.equal(created.status, 201);
    const id = (created.json as { id: string }).id;

    // signed in while active…
    const activeToken = await login('rbac@zojatech.test', 'hunter22', true);
    assert.equal((await req('PATCH', `/v1/platform/staff/${id}`, { token: superT, body: { status: 'suspended' } })).status, 200);
    // …suspension kills both fresh logins and the already-issued token
    assert.equal((await req('POST', '/v1/platform/auth/login', { body: { email: 'rbac@zojatech.test', password: 'hunter22' } })).status, 403);
    assert.equal((await req('GET', '/v1/platform/tenants', { token: activeToken })).status, 403);

    assert.equal((await req('DELETE', `/v1/platform/staff/${id}`, { token: superT })).status, 200);
    assert.equal((await req('PATCH', `/v1/platform/staff/${id}`, { token: superT, body: { name: 'Ghost' } })).status, 404);
  });

  it('self-service: own password resets without staff.write; own role/status and self-removal are locked', async () => {
    assert.equal((await req('PATCH', '/v1/platform/staff/ps-2', { token: adminT, body: { password: 'demo4321' } })).status, 200);
    assert.equal((await req('PATCH', '/v1/platform/staff/ps-2', { token: adminT, body: { role: 'platform_owner' } })).status, 400);
    assert.equal((await req('PATCH', '/v1/platform/staff/ps-1', { token: superT, body: { status: 'suspended' } })).status, 400);
    assert.equal((await req('DELETE', '/v1/platform/staff/ps-1', { token: superT })).status, 400);
  });

  it('audit log records staff lifecycle with the acting account', async () => {
    const res = await req('GET', '/v1/platform/audit-logs?perPage=20', { token: superT });
    assert.equal(res.status, 200);
    const rows = (res.json as { rows: Array<{ action: string; actor: string; resource: string }> }).rows;
    assert.ok(rows.some((r) => r.action === 'staff.created'), 'staff.created present');
    assert.ok(rows.some((r) => r.action === 'staff.password_changed' && r.actor === 'tolu@zojatech.test'));
    assert.ok(rows.some((r) => r.action === 'staff.suspended' || r.action === 'staff.updated'));
    const auditUrl = res.json as { rows?: unknown[] };
    assert.equal((auditUrl.rows ?? []).length > 0, true);
  });
});

describe('DOC 6 — company team management & tenant RBAC (role templates, staff accounts, scoped audit)', () => {
  let adminToken = '';

  before(async () => {
    // Create a second super-tier member (role 'admin') via the owner's invite.
    const created = await req('POST', '/v1/team/invites', {
      token: ownerToken,
      body: { email: 'boss@acme.test', role: 'admin' },
    });
    assert.equal(created.status, 201);
    const creds = (created.json as { credentials: { email: string; password: string } }).credentials;
    assert.equal(creds.password, 'demo1234');
    adminToken = await login('boss@acme.test', 'demo1234');
  });

  it('role templates are served and mirror what the server enforces', async () => {
    const res = await req('GET', '/v1/team/roles', { token: ownerToken });
    assert.equal(res.status, 200);
    const templates = (res.json as { templates: Array<{ id: string; perms: string[] }> }).templates;
    assert.equal(templates.length, 4);
    const owner = templates.find((t) => t.id === 'owner');
    assert.ok(owner?.perms.includes('team.manage'));
    assert.ok(owner?.perms.includes('audit.read'));
    const viewer = templates.find((t) => t.id === 'viewer');
    assert.ok(viewer && !viewer.perms.includes('team.manage') && viewer.perms.includes('testimonials.read'));
  });

  it('invited members get working credentials; wrong-role members cannot manage the team', async () => {
    const team = await req('GET', '/v1/team', { token: ownerToken });
    const rows = (team.json as { rows: Array<{ id: string; email: string; role: string }> }).rows;
    assert.ok(rows.some((r) => r.email === 'boss@acme.test' && r.role === 'admin'));
    assert.equal((await req('POST', '/v1/team/invites', { token: editorToken, body: { email: 'x@acme.test', role: 'viewer' } })).status, 401);
    assert.equal((await req('POST', '/v1/team/invites', { token: viewerToken, body: { email: 'y@acme.test', role: 'viewer' } })).status, 401);
  });

  it('admin can reset another member’s password but not their own, and not the owner row', async () => {
    const team = await req('GET', '/v1/team', { token: adminToken });
    const rows = (team.json as { rows: Array<{ id: string; email: string; role: string }> }).rows;
    const boss = rows.find((r) => r.email === 'boss@acme.test')!;
    const eden = rows.find((r) => r.email === 'editor@acme.test')!;

    // reset editor's password -> old login dies, new login works
    assert.equal((await req('PATCH', `/v1/team/${eden.id}`, { token: adminToken, body: { password: 'fresh123' } })).status, 200);
    assert.equal((await req('POST', '/v1/auth/login', { body: { email: 'editor@acme.test', password: 'demo1234' } })).status, 400);
    assert.equal((await req('POST', '/v1/auth/login', { body: { email: 'editor@acme.test', password: 'fresh123' } })).status, 200);

    // own role/status/password locked on the team surface
    assert.equal((await req('PATCH', `/v1/team/${boss.id}`, { token: adminToken, body: { role: 'owner' } })).status, 400);
    assert.equal((await req('PATCH', `/v1/team/${boss.id}`, { token: adminToken, body: { password: 'x12345' } })).status, 400);

    // owner row is protected even for an admin actor
    const ada = rows.find((r) => r.email === 'owner@acme.test')!;
    assert.equal((await req('PATCH', `/v1/team/${ada.id}`, { token: adminToken, body: { role: 'viewer' } })).status, 400);
  });

  it('suspended members lose login and live sessions; reactivation restores both', async () => {
    const team = await req('GET', '/v1/team', { token: ownerToken });
    const rows = (team.json as { rows: Array<{ id: string; email: string }> }).rows;
    const boss = rows.find((r) => r.email === 'boss@acme.test')!;
    assert.equal((await req('PATCH', `/v1/team/${boss.id}`, { token: ownerToken, body: { status: 'suspended' } })).status, 200);
    assert.equal((await req('POST', '/v1/auth/login', { body: { email: 'boss@acme.test', password: 'demo1234' } })).status, 403);
    assert.equal((await req('GET', '/v1/team', { token: adminToken })).status, 403);
    assert.equal((await req('PATCH', `/v1/team/${boss.id}`, { token: ownerToken, body: { status: 'active' } })).status, 200);
    assert.equal((await req('POST', '/v1/auth/login', { body: { email: 'boss@acme.test', password: 'demo1234' } })).status, 200);
  });

  it('company audit log is scoped to the workspace', async () => {
    const res = await req('GET', '/v1/audit-logs', { token: ownerToken });
    assert.equal(res.status, 200);
    const rows = (res.json as { rows: Array<{ id: string; tenantId?: string }> }).rows;
    assert.ok(rows.length > 0);
    for (const r of rows) assert.equal(r.tenantId, 'tenant-acme', 'no cross-workspace rows leak');
    assert.ok(rows.some((r) => r.id === 'ta-4'), 'seeded invite entry visible');
  });

  it('super admin merges every workspace into the platform log; others cannot ask for it', async () => {
    const superToken = await login('admin@zojatech.test', 'demo1234', true);
    const all = await req('GET', '/v1/platform/audit-logs?scope=all&perPage=200', { token: superToken });
    assert.equal(all.status, 200);
    const body = all.json as { rows: Array<{ tenantId?: string }>; scope: string };
    assert.equal(body.scope, 'all');
    assert.ok(body.rows.some((r) => r.tenantId === 'tenant-acme'), 'workspace rows present in the merged log');

    const editorStaff = await login('kemi@zojatech.test', 'demo1234', true);
    assert.equal((await req('GET', '/v1/platform/audit-logs?scope=all', { token: editorStaff })).status, 403);
  });
});

describe('DOC 6 — company settings surface (workspace profile)', () => {
  it('rename requires settings.manage and lands in /me + the workspace audit log', async () => {
    const owner = await login('owner@acme.test', 'demo1234');
    const viewer = await login('chris@acme.test', 'demo1234');

    assert.equal((await req('PATCH', '/v1/settings/workspace', { token: viewer, body: { name: 'Nope' } })).status, 401);
    assert.equal((await req('PATCH', '/v1/settings/workspace', { token: owner, body: { name: 'Acme Inc (QA)' } })).status, 200);
    const me = await req('GET', '/v1/auth/me', { token: owner });
    assert.equal((me.json as { tenant: { name: string } }).tenant.name, 'Acme Inc (QA)');
    const audit = await req('GET', '/v1/audit-logs?perPage=5', { token: owner });
    const actions = (audit.json as { rows: Array<{ action: string; resource: string }> }).rows.map((r) => r.action);
    assert.ok(actions.includes('settings.workspace_updated'));
    // restore the seed name so other suites keep working
    assert.equal((await req('PATCH', '/v1/settings/workspace', { token: owner, body: { name: 'Acme Inc' } })).status, 200);
  });
});

describe('DOC 6 — testimonial CRUD, live toggle & bulk management', () => {
  it('viewer cannot create/edit/delete testimonials (write permission required)', async () => {
    assert.equal(
      (await req('POST', '/v1/apps/app-acme-1/testimonials', { token: viewerToken, body: { content: 'nope' } })).status,
      401,
    );
    assert.equal(
      (
        await req('PATCH', '/v1/apps/app-acme-1/testimonials/t-app-acme-1-a-0', {
          token: viewerToken,
          body: { content: 'nope' },
        })
      ).status,
      401,
    );
    assert.equal(
      (await req('DELETE', '/v1/apps/app-acme-1/testimonials/t-app-acme-1-a-0', { token: viewerToken })).status,
      401,
    );
  });

  it('editor can create and edit content but cannot change moderation status', async () => {
    const created = await req('POST', '/v1/apps/app-acme-1/testimonials', {
      token: editorToken,
      body: { content: 'Editor-written review', authorName: 'Editor', rating: 4 },
    });
    assert.equal(created.status, 201);
    const id = (created.json as { id: string }).id;
    const edited = await req('PATCH', `/v1/apps/app-acme-1/testimonials/${id}`, {
      token: editorToken,
      body: { content: 'Editor-written review (edited)' },
    });
    assert.equal(edited.status, 200);
    // status changes need testimonials.moderate
    assert.equal(
      (await req('PATCH', `/v1/apps/app-acme-1/testimonials/${id}`, { token: editorToken, body: { status: 'rejected' } })).status,
      401,
    );
    // cleanup
    assert.equal((await req('DELETE', `/v1/apps/app-acme-1/testimonials/${id}`, { token: ownerToken })).status, 200);
  });

  it('create clamps ratings and caps content length (write-time hygiene)', async () => {
    const created = await req('POST', '/v1/apps/app-acme-1/testimonials', {
      token: ownerToken,
      body: { content: 'x', authorName: 'Hygiene', rating: 99 },
    });
    assert.equal(created.status, 201);
    const row = created.json as { rating: number };
    assert.equal(row.rating, 5);
    assert.equal(
      (await req('POST', '/v1/apps/app-acme-1/testimonials', { token: ownerToken, body: { content: '   ' } })).status,
      400,
    );
  });

  it('live toggle pulls a review from the public wall without changing its status', async () => {
    const list = await req('GET', '/v1/apps/app-acme-1/testimonials?status=approved&perPage=1', { token: ownerToken });
    const victim = (list.json as { rows: Array<{ id: string }> }).rows[0];
    const wallBefore = await req('GET', '/v1/public/walls/acme-marketing-site');
    const beforeIds = (wallBefore.json as { testimonials: Array<{ id: string }> }).testimonials.map((t) => t.id);
    assert.ok(beforeIds.includes(victim.id), 'seeded approved review should be on the wall');

    const hidden = await req('PATCH', `/v1/apps/app-acme-1/testimonials/${victim.id}`, { token: ownerToken, body: { visible: false } });
    assert.equal(hidden.status, 200);
    const wallAfter = await req('GET', '/v1/public/walls/acme-marketing-site');
    const afterIds = (wallAfter.json as { testimonials: Array<{ id: string }> }).testimonials.map((t) => t.id);
    assert.ok(!afterIds.includes(victim.id), 'hidden review must not render on the wall');
    assert.equal((hidden.json as { status: string }).status, 'approved', 'hiding must not change moderation state');

    // restore
    assert.equal(
      (await req('PATCH', `/v1/apps/app-acme-1/testimonials/${victim.id}`, { token: ownerToken, body: { visible: true } })).status,
      200,
    );
  });

  it('bulk actions are permission-checked, capped and app-scoped', async () => {
    // viewer cannot bulk-anything
    assert.equal(
      (await req('POST', '/v1/apps/app-acme-1/testimonials/bulk', { token: viewerToken, body: { action: 'approve', ids: [] } }))
        .status,
      401,
    );
    // editor cannot bulk-delete (moderate required) but can toggle visibility
    assert.equal(
      (await req('POST', '/v1/apps/app-acme-1/testimonials/bulk', { token: editorToken, body: { action: 'delete', ids: [] } })).status,
      401,
    );
    const ids = ['t-app-acme-1-a-1', 't-app-acme-1-a-2'];
    const bulkHide = await req('POST', '/v1/apps/app-acme-1/testimonials/bulk', { token: ownerToken, body: { action: 'hide', ids } });
    assert.equal(bulkHide.status, 200);
    assert.equal((bulkHide.json as { affected: number }).affected, 2);
    // foreign ids silently resolve to nothing (no IDOR, no error leak)
    const foreign = await req('POST', '/v1/apps/app-acme-1/testimonials/bulk', {
      token: ownerToken,
      body: { action: 'hide', ids: ['t-app-lumen-1-a-0'] },
    });
    assert.equal(foreign.status, 200);
    assert.equal((foreign.json as { affected: number }).affected, 0);
    // restore
    assert.equal(
      (await req('POST', '/v1/apps/app-acme-1/testimonials/bulk', { token: ownerToken, body: { action: 'show', ids } })).status,
      200,
    );
  });
});

describe('DOC 6 — widget templates: catalogue, apply & the widget contract', () => {
  it('template catalogue requires a company session; cross-kind tokens are rejected', async () => {
    assert.equal((await req('GET', '/v1/widget-templates')).status, 401);
    assert.equal((await req('GET', '/v1/widget-templates', { token: platformToken })).status, 401);
    const list = await req('GET', '/v1/widget-templates', { token: ownerToken });
    assert.equal(list.status, 200);
    const rows = (list.json as { rows: Array<{ id: string; width: number; height: number; schema: { elements: unknown[] } }> }).rows;
    assert.ok(rows.length >= 5, 'catalogue should ship multiple templates');
    for (const t of rows) {
      assert.ok(Number.isFinite(t.width) && t.width > 0, 'templates must declare fixed dimensions');
      assert.ok(Number.isFinite(t.height) && t.height > 0, 'templates must declare fixed dimensions');
    }
    assert.ok((list.json as { requiredFields: string[] }).requiredFields.includes('review_rating'));
  });

  it('applying a template requires apps.manage and is app-scoped', async () => {
    assert.equal(
      (await req('POST', '/v1/apps/app-acme-1/widget-template/quote-card/apply', { token: viewerToken })).status,
      401,
    );
    // foreign tenant's app id -> 404, never a leak
    const lumen = await login('hello@lumen.test', 'demo1234');
    assert.equal((await req('POST', '/v1/apps/app-acme-1/widget-template/quote-card/apply', { token: lumen })).status, 404);
    assert.equal((await req('POST', '/v1/apps/app-acme-1/widget-template/nope/apply', { token: ownerToken })).status, 404);

    const applied = await req('POST', '/v1/apps/app-acme-1/widget-template/hero-banner/apply', { token: ownerToken });
    assert.equal(applied.status, 200);
    const body = applied.json as { app: { designTemplateId: string; studioVersion: number }; template: { width: number; height: number } };
    assert.equal(body.app.designTemplateId, 'hero-banner');
    assert.ok(body.app.studioVersion >= 1, 'applying bumps the studio version');
    assert.equal(body.template.width, 1200);

    // the public wall now serves the applied template as the product's widget
    const wall = await req('GET', '/v1/public/walls/acme-marketing-site');
    const widget = (wall.json as { widget: { templateId: string; width: number; height: number } }).widget;
    assert.equal(widget.templateId, 'hero-banner');
    assert.equal(widget.width, 1200);
    assert.equal(widget.height, 420);
  });

  it('a saved design must keep the required widget components (widget contract)', async () => {
    // strip every binding -> no longer a widget -> 400
    const schema = {
      name: 'Broken',
      canvas: { width: 720, height: 560, background: '#fff' },
      version: 1,
      elements: [{ id: 'e1', type: 'text', layout: { x: 0, y: 0, width: 100, height: 40, z: 1 }, text: 'no bindings' }],
    };
    const res = await req('PATCH', '/v1/dashboard/apps/app-acme-1/design/schema', { token: ownerToken, body: { schema } });
    assert.equal(res.status, 400);
    assert.ok(String((res.json as { error?: { message?: string } }).error?.message ?? '').includes('review_text'));

    // a design that keeps the three bound components saves fine
    const valid = {
      name: 'Valid widget',
      canvas: { width: 540, height: 760, background: '#0ea5a0' },
      version: 2,
      elements: [
        { id: 'a', type: 'text', visible: true, name: 'Review', layout: { x: 80, y: 300, width: 380, height: 200, z: 10 }, style: { background: null, radius: 0, opacity: 1 }, typography: { fontSize: 18, fontWeight: 500, color: '#fff', align: 'center' }, text: 'sample', imageUrl: null, binding: { bindingKey: 'review_text', property: 'text' }, animation: null },
        { id: 'b', type: 'heading', visible: true, name: 'Reviewer', layout: { x: 80, y: 520, width: 380, height: 30, z: 10 }, style: { background: null, radius: 0, opacity: 1 }, typography: { fontSize: 16, fontWeight: 700, color: '#fff', align: 'center' }, text: 'sample', imageUrl: null, binding: { bindingKey: 'reviewer_name', property: 'text' }, animation: null },
        { id: 'c', type: 'rating-stars', visible: true, name: 'Rating', layout: { x: 210, y: 240, width: 120, height: 30, z: 10 }, style: { background: null, radius: 0, opacity: 1 }, typography: null, text: null, imageUrl: null, binding: { bindingKey: 'review_rating', property: 'rating' }, animation: null },
      ],
    };
    const ok = await req('PATCH', '/v1/dashboard/apps/app-acme-1/design/schema', { token: ownerToken, body: { schema: valid } });
    assert.equal(ok.status, 200);
    assert.ok((ok.json as { studioVersion: number }).studioVersion >= 1);
    // the public embed now serves the customised widget
    const wall = await req('GET', '/v1/public/walls/acme-marketing-site');
    const w = (wall.json as { widget: { width: number; height: number; schema: { canvas: { background: string } } } }).widget;
    assert.equal(w.width, 540);
    assert.equal(w.schema.canvas.background, '#0ea5a0');

    // viewer cannot save either
    assert.equal(
      (
        await req('PATCH', '/v1/dashboard/apps/app-acme-1/design/schema', {
          token: viewerToken,
          body: { schema: null },
        })
      ).status,
      401,
    );
  });
});

describe('DOC 7C — platform template catalogue', () => {
  it('the global widget catalogue is platform-only', async () => {
    assert.equal((await req('GET', '/v1/platform/widget-templates')).status, 401);
    assert.equal((await req('GET', '/v1/platform/widget-templates', { token: ownerToken })).status, 401);
    const res = await req('GET', '/v1/platform/widget-templates', { token: platformToken });
    assert.equal(res.status, 200);
    const rows = (res.json as { rows: Array<{ id: string; width: number }> }).rows;
    assert.ok(rows.length >= 30, 'the full catalogue is visible to the platform');
  });
});

describe('DOC 6 — design drafts: preview, customise and publish without applying', () => {
  it('draft endpoints require a company session with apps.manage and are app-scoped', async () => {
    assert.equal((await req('GET', '/v1/dashboard/apps/app-acme-1/design/draft')).status, 401);
    assert.equal((await req('GET', '/v1/dashboard/apps/app-acme-1/design/draft', { token: platformToken })).status, 401);
    assert.equal((await req('POST', '/v1/apps/app-acme-1/widget-template/tilt-card/draft', { token: viewerToken })).status, 401);
    const lumen = await login('hello@lumen.test', 'demo1234');
    assert.equal((await req('POST', '/v1/apps/app-acme-1/widget-template/tilt-card/draft', { token: lumen })).status, 404);
    assert.equal((await req('PATCH', '/v1/dashboard/apps/app-lumen-1/design/draft', { token: ownerToken, body: { schema: {} } })).status, 404);
  });

  it('a draft never touches the live embed until it is published', async () => {
    // The live widget before any draft work (set by the earlier tests).
    const before = await req('GET', '/v1/public/walls/acme-marketing-site');
    const beforeWidget = (before.json as { widget: { templateId: string | null; width: number } }).widget;

    // 1. Start a draft from the coverflow template.
    const started = await req('POST', '/v1/apps/app-acme-1/widget-template/coverflow-deck/draft', { token: ownerToken });
    assert.equal(started.status, 200);
    assert.equal((started.json as { app: { designDraft: { templateId: string } | null } }).app.designDraft?.templateId, 'coverflow-deck');

    // 2. The studio loads the draft; the embed still serves the live design.
    const draft = await req('GET', '/v1/dashboard/apps/app-acme-1/design/draft', { token: ownerToken });
    assert.equal(draft.status, 200);
    const draftSchema = (draft.json as { schema: { name: string } | null; templateId: string | null }).schema;
    assert.ok(draftSchema, 'draft schema should be present');
    assert.equal((draft.json as { templateId: string | null }).templateId, 'coverflow-deck');
    const mid = await req('GET', '/v1/public/walls/acme-marketing-site');
    assert.equal((mid.json as { widget: { width: number } }).widget.width, beforeWidget.width, 'draft must not change the live embed');

    // 3. Saving the draft keeps the embed untouched.
    const saved = await req('PATCH', '/v1/dashboard/apps/app-acme-1/design/draft', {
      token: ownerToken,
      body: { schema: { ...draftSchema, name: 'Tuned coverflow' } },
    });
    assert.equal(saved.status, 200);
    const still = await req('GET', '/v1/public/walls/acme-marketing-site');
    assert.equal((still.json as { widget: { width: number } }).widget.width, beforeWidget.width, 'saving a draft must not publish it');

    // 4. Draft saves enforce the widget contract too.
    const broken = await req('PATCH', '/v1/dashboard/apps/app-acme-1/design/draft', {
      token: ownerToken,
      body: { schema: { name: 'Broken', canvas: { width: 300, height: 200, background: '#fff' }, version: 1, elements: [] } },
    });
    assert.equal(broken.status, 400);

    // 5. Publish: the only path that changes the embed.
    const published = await req('POST', '/v1/dashboard/apps/app-acme-1/design/draft/publish', { token: ownerToken });
    assert.equal(published.status, 200);
    assert.ok((published.json as { studioVersion: number }).studioVersion >= 1);
    const after = await req('GET', '/v1/public/walls/acme-marketing-site');
    const afterWidget = (after.json as { widget: { templateId: string | null; width: number; schema: { name: string } } }).widget;
    assert.equal(afterWidget.templateId, 'coverflow-deck');
    assert.equal(afterWidget.width, 960);
    assert.equal(afterWidget.schema.name, 'Tuned coverflow');

    // 6. Publishing consumed the draft.
    const empty = await req('GET', '/v1/dashboard/apps/app-acme-1/design/draft', { token: ownerToken });
    assert.equal((empty.json as { schema: unknown }).schema, null);
    assert.equal((await req('POST', '/v1/dashboard/apps/app-acme-1/design/draft/publish', { token: ownerToken })).status, 404);

    // 7. A discard keeps the live design.
    const again = await req('POST', '/v1/apps/app-acme-1/widget-template/tilt-card/draft', { token: ownerToken });
    assert.equal(again.status, 200);
    const discarded = await req('DELETE', '/v1/dashboard/apps/app-acme-1/design/draft', { token: ownerToken });
    assert.equal(discarded.status, 200);
    const final = await req('GET', '/v1/public/walls/acme-marketing-site');
    assert.equal((final.json as { widget: { templateId: string | null } }).widget.templateId, 'coverflow-deck', 'discard keeps the live design');
  });
});
