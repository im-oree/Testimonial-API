/**
 * Auth routes (Bearer-token sessions, no cookies).
 *
 *   POST /v1/auth/login              company/tenant staff sign in
 *   POST /v1/platform/auth/login     platform staff sign in
 *   POST /v1/auth/mfa/verify         demo MFA challenge (accepts any 6 digits)
 *   POST /v1/auth/refresh            keeps a session alive (returns { ok })
 *   POST /v1/auth/onboarding         finish invite sign-up
 *   POST /v1/auth/invites/accept     accept a team invite
 *   GET  /v1/auth/me                 current session info
 */
import { Router, type Request } from 'express';
import { DEMO } from '../demo-data';
import {
  badRequest,
  createSessionToken,
  requireCompany,
  requirePlatform,
  sessionOf,
  unauthorized,
} from '../lib';

export const authRouter = Router();

function companyUser(req: Request): { id: string; email: string; name: string; role: string } {
  const email = String(req.body?.email ?? '').toLowerCase().trim();
  const password = String(req.body?.password ?? '');
  const user = DEMO.companyUsers().find((u) => u.email === email && u.password === password);
  if (!user) throw badRequest('Invalid email or password.');
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

// POST /v1/auth/login
authRouter.post('/auth/login', (req, res) => {
  const user = companyUser(req);
  const token = createSessionToken('company', user.email);
  res.status(200).json({ requiresMfa: false, user: { email: user.email }, token });
});

// POST /v1/platform/auth/login
authRouter.post('/platform/auth/login', (req, res) => {
  const email = String(req.body?.email ?? '').toLowerCase().trim();
  const password = String(req.body?.password ?? '');
  const user = DEMO.platformUsers().find((u) => u.email === email && u.password === password);
  if (!user) throw badRequest('Invalid email or password.');
  const token = createSessionToken('platform', user.email);
  res.status(200).json({ requiresMfa: false, user: { email: user.email }, token });
});

// POST /v1/auth/mfa/verify
authRouter.post('/auth/mfa/verify', (req, res) => {
  const email = String(req.body?.email ?? '').toLowerCase().trim();
  const code = String(req.body?.code ?? '');
  const user = DEMO.companyUsers().find((u) => u.email === email);
  if (!user) throw badRequest('Unknown account.');
  if (!/^\d{6}$/.test(code)) throw badRequest('Invalid verification code.');
  const token = createSessionToken('company', user.email);
  res.status(200).json({ requiresMfa: false, user: { email: user.email }, token });
});

// POST /v1/auth/refresh
authRouter.post('/auth/refresh', (req, res) => {
  if (!sessionOf(req)) throw unauthorized('No active session.');
  res.status(200).json({ ok: true });
});

// POST /v1/auth/onboarding
authRouter.post('/auth/onboarding', (req, res) => {
  if (!req.body?.token) throw badRequest('Missing invite token.');
  const user = DEMO.companyUsers().find((u) => u.email === 'owner@acme.test');
  if (!user) throw badRequest('Invalid invite token.');
  const token = createSessionToken('company', user.email);
  res.status(200).json({ user: { email: user.email }, token });
});

// POST /v1/auth/invites/accept
authRouter.post('/auth/invites/accept', (req, res) => {
  if (!req.body?.token) throw badRequest('Missing invite token.');
  const user = DEMO.companyUsers().find((u) => u.email === 'owner@acme.test');
  if (!user) throw badRequest('Invalid invite token.');
  const token = createSessionToken('company', user.email);
  res.status(200).json({ user: { email: user.email }, token });
});

// GET /v1/auth/me
authRouter.get('/auth/me', (req, res) => {
  const session = sessionOf(req);
  if (!session) throw unauthorized('No active session.');

  if (session.kind === 'platform') {
    const user = DEMO.platformUsers().find((u) => u.email === session.email);
    if (!user) throw unauthorized('No active session.');
    res.json({
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: null, role: user.role },
      tenant: null,
      permissions: [],
      permissionsVersion: 1,
      impersonating: null,
    });
    return;
  }

  const raw = DEMO.companyUsers().find((u) => u.email === session.email);
  if (!raw) throw unauthorized('No active session.');
  const tenant = DEMO.tenantForUser(raw);
  const impersonating =
    session.impersonatedBy && DEMO.platformUsers().some((p) => p.email === session.impersonatedBy)
      ? { by: session.impersonatedBy, tenantId: tenant.id, tenantName: tenant.name }
      : null;
  res.json({
    user: { id: raw.id, email: raw.email, name: raw.name, avatarUrl: null, role: raw.role },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      brandColor: tenant.brandColor,
      logoUrl: tenant.logoUrl ?? null,
      theme: DEMO.themeOfTenant(tenant),
    },
    permissions: DEMO.permissionsFor(raw.role),
    permissionsVersion: 1,
    impersonating,
  });
});

// POST /v1/auth/impersonation/exit — a company session created by a platform
// admin swaps back to a fresh platform token for the admin who started it.
authRouter.post('/auth/impersonation/exit', (req, res) => {
  const session = sessionOf(req);
  if (!session || session.kind !== 'company' || !session.impersonatedBy) {
    throw unauthorized('No active impersonation session.');
  }
  const platformUser = DEMO.platformUsers().find((p) => p.email === session.impersonatedBy);
  if (!platformUser) throw unauthorized('No active impersonation session.');
  const token = createSessionToken('platform', platformUser.email);
  res.status(200).json({ token, user: { email: platformUser.email } });
});
