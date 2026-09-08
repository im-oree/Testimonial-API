/**
 * Platform admin console routes — tenant directory, billing, staff, webhooks,
 * audit log and AI provider management. All require a platform session.
 */
import { Router, type Request } from 'express';
import { DEMO, MONTHLY_BY_PLAN, type DemoTenant } from '../demo-data';
import { badRequest, createSessionToken, notFound, paginate, queryString, requirePlatform, sessionOf, type Paging } from '../lib';
import { parseThemePatch } from '../theme';

export const platformRouter = Router();

// GET /v1/platform/overview — aggregate cards + a per-tenant table so the
// super-company sees every company's own metrics (MRR, products, responses…).
platformRouter.get('/platform/overview', (req, res) => {
  requirePlatform(req);
  const m = DEMO.mrrs();
  const byTenant = DEMO.allTenants().map((t) => {
    const apps = DEMO.appsOfTenant(t.id).map((a) => DEMO.appSummary(a));
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      ownerEmail: t.ownerEmail,
      monthlyCostUsd: MONTHLY_BY_PLAN[t.plan],
      products: apps.length,
      testimonials: apps.reduce((s, a) => s + a.totalTestimonials, 0),
      approved: apps.reduce((s, a) => s + a.approved, 0),
      pending: apps.reduce((s, a) => s + a.pending, 0),
      forms: apps.reduce((s, a) => s + a.forms, 0),
      responses: apps.reduce((s, a) => s + a.submissions, 0),
      createdAt: t.createdAt,
    };
  });
  res.json({
    ...m,
    monthlyMrrUsd: byTenant.reduce((s, r) => s + r.monthlyCostUsd, 0),
    subCompanies: byTenant.length,
    byTenant,
  });
});

// POST /v1/platform/tenants — create a tenant end-to-end: tenant row +
// owner login (default demo password, shown once) + platform audit entry.
platformRouter.post('/platform/tenants', (req, res) => {
  requirePlatform(req);
  const name = String(req.body?.name ?? '').trim();
  if (!name) throw badRequest('Company name is required.');
  const ownerEmail = String(req.body?.ownerEmail ?? '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw badRequest('A valid admin email is required.');
  const ownerName = String(req.body?.ownerName ?? '').trim();
  const plan = ['starter', 'growth', 'scale'].includes(String(req.body?.plan ?? '')) ? String(req.body.plan) : 'starter';
  const slug = String(req.body?.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  if (DEMO.allTenants().some((t) => t.ownerEmail === ownerEmail)) throw badRequest('That email is already the owner of a tenant.');
  const { tenant, owner } = DEMO.createTenant({
    name,
    slug: slug || undefined,
    plan: plan as DemoTenant['plan'],
    ownerName,
    ownerEmail,
  });
  res.status(201).json({
    tenant: DEMO.tenantStatusForDetail(tenant),
    owner: { id: owner.id, name: owner.name, email: owner.email, role: owner.role },
    credentials: { email: owner.email, password: 'demo1234' },
    message: 'Tenant created. The owner can now sign in with the email and the demo password shown here once.',
  });
});

// GET /v1/platform/tenants
platformRouter.get('/platform/tenants', (req, res) => {
  requirePlatform(req);
  const status = queryString(req, 'status');
  const q = queryString(req, 'q')?.trim().toLowerCase();
  let rows = DEMO.allTenants().map((t) => {
    const apps = DEMO.appsOfTenant(t.id).map((a) => DEMO.appSummary(a));
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      ownerEmail: t.ownerEmail,
      monthlyCostUsd: MONTHLY_BY_PLAN[t.plan],
      appCount: apps.length,
      testimonialCount: apps.reduce((s, a) => s + a.totalTestimonials, 0),
      pendingCount: apps.reduce((s, a) => s + a.pending, 0),
      createdAt: t.createdAt,
    };
  });
  if (status && status !== 'all') rows = rows.filter((r) => r.status === status);
  if (q) rows = rows.filter((r) => `${r.name} ${r.slug} ${r.plan}`.toLowerCase().includes(q));
  const perPage = Math.min(Math.max(Number(queryString(req, 'perPage') ?? 50) || 50, 1), 200);
  const page = Math.max(Number(queryString(req, 'page') ?? 1) || 1, 1);
  res.json({ rows: rows.slice((page - 1) * perPage, page * perPage), total: rows.length });
});

// POST /v1/platform/tenants/:tenantId/impersonate — super-company access:
// return a company token that opens that tenant's workspace as its owner.
platformRouter.post('/platform/tenants/:tenantId/impersonate', (req, res) => {
  requirePlatform(req);
  const t = DEMO.tenantById(req.params.tenantId);
  if (!t) throw notFound('Tenant not found.');
  const owner = DEMO.companyUsers().find((u) => u.email === t.ownerEmail);
  if (!owner) throw notFound('Tenant owner is not a demo account.');
  const platformEmail = sessionOf(req)?.email ?? 'admin@zojatech.test';
  const token = createSessionToken('company', owner.email, platformEmail);
  res.status(200).json({
    token,
    user: { email: owner.email, name: owner.name },
    tenant: { id: t.id, name: t.name, slug: t.slug },
  });
});

// GET /v1/platform/tenants/:tenantId
platformRouter.get('/platform/tenants/:tenantId', (req, res) => {
  requirePlatform(req);
  const t = DEMO.tenantById(req.params.tenantId);
  if (!t) throw notFound('Tenant not found.');
  res.json(DEMO.tenantStatusForDetail(t));
});

// GET /v1/platform/tenants/:tenantId/staff
platformRouter.get('/platform/tenants/:tenantId/staff', (req, res) => {
  requirePlatform(req);
  const t = DEMO.tenantById(req.params.tenantId);
  if (!t) throw notFound('Tenant not found.');
  res.json({ rows: DEMO.teamOfTenant(t.id) });
});

// PATCH /v1/platform/tenants/:tenantId
platformRouter.patch('/platform/tenants/:tenantId', (req, res) => {
  requirePlatform(req);
  const t = DEMO.tenantById(req.params.tenantId);
  if (!t) throw notFound('Tenant not found.');
  if (req.body.plan && ['starter', 'growth', 'scale'].includes(req.body.plan)) t.plan = req.body.plan;
  if (req.body.status && ['active', 'suspended', 'trialing'].includes(req.body.status)) t.status = req.body.status;
  if (typeof req.body.brandColor === 'string') {
    const color = req.body.brandColor.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw badRequest('Brand color must be a hex value like #1B2559.');
    t.brandColor = color;
  }
  if ('logoUrl' in req.body) {
    const raw = typeof req.body.logoUrl === 'string' ? req.body.logoUrl.trim().slice(0, 300) : '';
    t.logoUrl = raw || null;
  }
  if (req.body.ownerEmail !== undefined || req.body.ownerName !== undefined) {
    const ownerEmail = String(req.body.ownerEmail ?? t.ownerEmail).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw badRequest('A valid admin email is required.');
    if (DEMO.allTenants().some((x) => x.id !== t.id && x.ownerEmail === ownerEmail)) throw badRequest('That email is already the owner of another tenant.');
    const updated = DEMO.updateTenantOwner(t.id, { email: ownerEmail, name: req.body.ownerName !== undefined ? String(req.body.ownerName) : undefined });
    if (!updated) throw notFound('Tenant not found.');
  }
  res.json(DEMO.tenantStatusForDetail(t));
});

// PATCH /v1/platform/tenants/:tenantId/theme — Zojatech manages a tenant's
// DOC-7 theme (presets + tokens). Tenants can also manage their own theme via
// /v1/settings/theme; writes here bump the same version counter.
platformRouter.patch('/platform/tenants/:tenantId/theme', (req, res) => {
  requirePlatform(req);
  const t = DEMO.tenantById(req.params.tenantId);
  if (!t) throw notFound('Tenant not found.');
  const parsed = parseThemePatch(req.body ?? {});
  if (!parsed.ok) throw badRequest(parsed.error);
  if ('logoUrl' in req.body) DEMO.updateTenantIdentity(t.id, { logoUrl: req.body.logoUrl });
  const updated = DEMO.updateTenantTheme(t.id, parsed.patch);
  if (!updated) throw notFound('Tenant not found.');
  res.json({ theme: DEMO.themeOfTenant(updated), brandColor: updated.brandColor, logoUrl: updated.logoUrl ?? null });
});

// DELETE /v1/platform/tenants/:tenantId
platformRouter.delete('/platform/tenants/:tenantId', (req, res) => {
  requirePlatform(req);
  const t = DEMO.tenantById(req.params.tenantId);
  if (!t) throw notFound('Tenant not found.');
  const confirm = queryString(req, 'confirm');
  if (confirm !== 'true' && confirm !== '1') throw badRequest('Confirmation is required to delete a tenant.');
  t.status = 'suspended'; // demo: never hard-deletes the seeded tenants
  res.json({ ok: true });
});

// GET /v1/platform/staff
platformRouter.get('/platform/staff', (req, res) => {
  requirePlatform(req);
  res.json({ rows: DEMO.platformStaff() });
});

// GET /v1/platform/billing
platformRouter.get('/platform/billing', (req, res) => {
  requirePlatform(req);
  res.json({ monthlyMrrUsd: DEMO.mrrs().monthlyMrrUsd, invoices: DEMO.invoices() });
});

// GET /v1/platform/webhooks
platformRouter.get('/platform/webhooks', (req, res) => {
  requirePlatform(req);
  res.json({ rows: DEMO.platformWebhooks() });
});

// GET /v1/platform/audit-logs
platformRouter.get('/platform/audit-logs', (req, res) => {
  requirePlatform(req);
  const query: Paging = req.query as Paging;
  const sorted = DEMO.platformAuditEntries().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ rows: paginate(sorted, query), total: sorted.length });
});

// GET /v1/platform/ai/providers
platformRouter.get('/platform/ai/providers', (req, res) => {
  requirePlatform(req);
  res.json({ rows: DEMO.aiProviders() });
});

// PATCH /v1/platform/ai/providers/:providerId
platformRouter.patch('/platform/ai/providers/:providerId', (req, res) => {
  requirePlatform(req);
  const p = DEMO.setAiProviderEnabled(req.params.providerId, Boolean(req.body?.enabled));
  if (!p) throw notFound('Provider not found.');
  res.json(p);
});

// GET /v1/platform/ai/tasks
platformRouter.get('/platform/ai/tasks', (req, res) => {
  requirePlatform(req);
  const query: Paging = req.query as Paging;
  const sorted = DEMO.aiTasks().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ rows: paginate(sorted, query), total: sorted.length });
});

// GET /v1/platform/ai/costs
platformRouter.get('/platform/ai/costs', (req, res) => {
  requirePlatform(req);
  const costs = DEMO.aiCosts();
  res.json({ period: '2026-09', totalUsd: costs.totalUsd, byProvider: costs.byProvider });
});
