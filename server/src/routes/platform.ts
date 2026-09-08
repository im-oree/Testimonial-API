/**
 * Platform admin console routes — tenant directory, billing, staff, webhooks,
 * audit log and AI provider management. All require a platform session.
 */
import { Router, type Request } from 'express';
import { DEMO, MONTHLY_BY_PLAN, PLATFORM_ROLE_TEMPLATES, WIDGET_DESIGN_IDS, platformPermissionsFor, type DemoTenant, type PlatformRole } from '../demo-data';
import { badRequest, createSessionToken, forbidden, notFound, paginate, platformStaffOfSession, queryString, requirePlatform, requirePlatformPermission, sessionOf, type Paging } from '../lib';
import { REQUIRED_WIDGET_FIELDS, widgetTemplateRows } from '../widget-templates';
import { isValidHexColor, parseThemePatch, RADIUS_IDS, FONT_IDS, type ThemeFont, type ThemeRadius } from '../theme';

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
  requirePlatformPermission(req, 'tenants.write');
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
  requirePlatformPermission(req, 'impersonate');
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

// ---------------------------------------------------------------------------
// Design templates (marketplace tier 1) — widget designs with a visual preset.
// Zojatech curates these; tenants adopt one as their company default on their
// Appearance page (tier 2) and can clone one onto a single product (tier 3).
// ---------------------------------------------------------------------------

// GET /v1/platform/design-templates
// GET /v1/platform/widget-templates — the global widget template catalogue
// (the same gallery tenants see), for the platform console's template view.
platformRouter.get('/platform/widget-templates', (req, res) => {
  requirePlatform(req);
  res.json({ rows: widgetTemplateRows(), requiredFields: REQUIRED_WIDGET_FIELDS });
});

platformRouter.get('/platform/design-templates', (req, res) => {
  requirePlatform(req);
  res.json({ rows: DEMO.designTemplates() });
});

function designTemplateFromBody(body: Record<string, unknown>) {
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : '';
  if (!name) throw badRequest('A template name is required.');
  const designId = typeof body?.designId === 'string' ? body.designId.trim() : '';
  if (!(WIDGET_DESIGN_IDS as readonly string[]).includes(designId as (typeof WIDGET_DESIGN_IDS)[number])) {
    throw badRequest('Unknown widget design id.');
  }
  const primary = typeof body?.primary === 'string' ? body.primary.trim() : '';
  const accent = typeof body?.accent === 'string' ? body.accent.trim() : '';
  if (!isValidHexColor(primary) || !isValidHexColor(accent)) throw badRequest('Template colours must be hex values like #1B2559.');
  const radius: ThemeRadius = RADIUS_IDS.includes(body?.radius as ThemeRadius) ? (body.radius as ThemeRadius) : 'md';
  const font: ThemeFont = FONT_IDS.includes(body?.font as ThemeFont) ? (body.font as ThemeFont) : 'system';
  const category = typeof body?.category === 'string' ? body.category.trim().slice(0, 30) : '';
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 180) : '';
  return { name, description, category, designId, primary, accent, radius, font };
}

// POST /v1/platform/design-templates
platformRouter.post('/platform/design-templates', (req, res) => {
  requirePlatformPermission(req, 'templates.write');
  res.status(201).json(DEMO.createDesignTemplate(designTemplateFromBody(req.body ?? {})));
});

// PATCH /v1/platform/design-templates/:templateId
platformRouter.patch('/platform/design-templates/:templateId', (req, res) => {
  requirePlatformPermission(req, 'templates.write');
  const updated = DEMO.updateDesignTemplate(req.params.templateId, designTemplateFromBody(req.body ?? {}));
  if (!updated) throw notFound('Template not found.');
  res.json(updated);
});

// DELETE /v1/platform/design-templates/:templateId
platformRouter.delete('/platform/design-templates/:templateId', (req, res) => {
  requirePlatformPermission(req, 'templates.write');
  if (!DEMO.deleteDesignTemplate(req.params.templateId)) throw notFound('Template not found.');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Theme templates — Zojatech owns the template catalogue tenants adopt.
// ---------------------------------------------------------------------------

// GET /v1/platform/theme-templates
platformRouter.get('/platform/theme-templates', (req, res) => {
  requirePlatform(req);
  res.json({ rows: DEMO.themeTemplates() });
});

function templateFromBody(body: Record<string, unknown>) {
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : '';
  if (!name) throw badRequest('A template name is required.');
  const primary = typeof body?.primary === 'string' ? body.primary.trim() : '';
  const accent = typeof body?.accent === 'string' ? body.accent.trim() : '';
  if (!isValidHexColor(primary) || !isValidHexColor(accent)) throw badRequest('Template colours must be hex values like #1B2559.');
  const radius: ThemeRadius = RADIUS_IDS.includes(body?.radius as ThemeRadius) ? (body.radius as ThemeRadius) : 'md';
  const font: ThemeFont = FONT_IDS.includes(body?.font as ThemeFont) ? (body.font as ThemeFont) : 'system';
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 160) : '';
  return { name, description, primary, accent, radius, font };
}

// POST /v1/platform/theme-templates
platformRouter.post('/platform/theme-templates', (req, res) => {
  requirePlatformPermission(req, 'templates.write');
  res.status(201).json(DEMO.createThemeTemplate(templateFromBody(req.body ?? {})));
});

// PATCH /v1/platform/theme-templates/:templateId
platformRouter.patch('/platform/theme-templates/:templateId', (req, res) => {
  requirePlatformPermission(req, 'templates.write');
  const body = templateFromBody(req.body ?? {});
  const updated = DEMO.updateThemeTemplate(req.params.templateId, body);
  if (!updated) throw notFound('Template not found.');
  res.json(updated);
});

// DELETE /v1/platform/theme-templates/:templateId
platformRouter.delete('/platform/theme-templates/:templateId', (req, res) => {
  requirePlatformPermission(req, 'templates.write');
  if (!DEMO.deleteThemeTemplate(req.params.templateId)) throw notFound('Template not found.');
  res.json({ ok: true });
});

// GET /v1/platform/tenants/:tenantId
platformRouter.get('/platform/tenants/:tenantId', (req, res) => {
  requirePlatformPermission(req, 'tenants.read');
  const t = DEMO.tenantById(req.params.tenantId);
  if (!t) throw notFound('Tenant not found.');
  res.json(DEMO.tenantStatusForDetail(t));
});

// GET /v1/platform/tenants/:tenantId/staff
platformRouter.get('/platform/tenants/:tenantId/staff', (req, res) => {
  requirePlatformPermission(req, 'tenants.read');
  const t = DEMO.tenantById(req.params.tenantId);
  if (!t) throw notFound('Tenant not found.');
  res.json({ rows: DEMO.teamOfTenant(t.id) });
});

// PATCH /v1/platform/tenants/:tenantId
platformRouter.patch('/platform/tenants/:tenantId', (req, res) => {
  requirePlatformPermission(req, 'tenants.write');
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
  requirePlatformPermission(req, 'tenants.write');
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
  requirePlatformPermission(req, 'tenants.write');
  const t = DEMO.tenantById(req.params.tenantId);
  if (!t) throw notFound('Tenant not found.');
  const confirm = queryString(req, 'confirm');
  if (confirm !== 'true' && confirm !== '1') throw badRequest('Confirmation is required to delete a tenant.');
  t.status = 'suspended'; // demo: never hard-deletes the seeded tenants
  res.json({ ok: true });
});

const PLATFORM_ROLE_IDS = PLATFORM_ROLE_TEMPLATES.map((r) => r.id);
const sanitizeStaff = (m: { id: string; name: string; email: string; role: PlatformRole; status: string; lastActiveAt?: string; createdAt?: string }) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  role: m.role,
  status: m.status,
  lastActiveAt: m.lastActiveAt ?? null,
  createdAt: m.createdAt ?? null,
});
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function staffRole(value: unknown): PlatformRole {
  if (typeof value === 'string' && (PLATFORM_ROLE_IDS as string[]).includes(value)) return value as PlatformRole;
  throw badRequest('Unknown platform role.');
}

// GET /v1/platform/staff — directory of platform console accounts.
platformRouter.get('/platform/staff', (req, res) => {
  requirePlatformPermission(req, 'staff.read');
  res.json({ rows: DEMO.platformStaff().map(sanitizeStaff), templates: PLATFORM_ROLE_TEMPLATES });
});

// POST /v1/platform/staff — create a staff account (name/email/role/password).
platformRouter.post('/platform/staff', (req, res) => {
  const actor = requirePlatformPermission(req, 'staff.write');
  const name = String(req.body?.name ?? '').trim().slice(0, 80);
  if (!name) throw badRequest('Name is required.');
  const email = String(req.body?.email ?? '').toLowerCase().trim();
  if (!isValidEmail(email)) throw badRequest('A valid email is required.');
  const role = staffRole(req.body?.role);
  const password = String(req.body?.password ?? 'demo1234');
  if (password.length < 6) throw badRequest('Password must be at least 6 characters.');
  const created = DEMO.createPlatformStaff({ name, email, role, password });
  if (!created) throw badRequest('A staff account with that email already exists.');
  DEMO.appendPlatformAudit({ actor: actor.email, action: 'staff.created', resource: email, ip: '10.0.0.7' });
  res.status(201).json(sanitizeStaff(created));
});

// PATCH /v1/platform/staff/:staffId — edit name/email, change role template,
// suspend/activate, or reset the account password (no current-password proof:
// a super admin or admin acting on another account). Two access modes:
//   · self-service — any console staff may update their own name/password;
//   · management — staff.write, and the account's role/status can never be
//     changed by the person holding it (protects the console from lock-out).
platformRouter.patch('/platform/staff/:staffId', (req, res) => {
  const target = DEMO.platformStaff().find((m) => m.id === req.params.staffId);
  if (!target) throw notFound('Staff account not found.');
  const actor = platformStaffOfSession(req);
  const selfEdit = actor.email === target.email;
  if (!selfEdit) requirePlatformPermission(req, 'staff.write');
  const patch: Partial<{ name: string; email: string; role: PlatformRole; status: 'active' | 'invited' | 'suspended'; password: string }> = {};
  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim().slice(0, 80);
    if (!name) throw badRequest('Name cannot be empty.');
    patch.name = name;
  }
  if (selfEdit && (req.body?.role !== undefined || req.body?.status !== undefined || req.body?.email !== undefined)) {
    throw badRequest('You cannot change your own role, status or email.');
  }
  if (req.body?.email !== undefined) {
    const email = String(req.body.email).toLowerCase().trim();
    if (!isValidEmail(email)) throw badRequest('A valid email is required.');
    patch.email = email;
  }
  if (req.body?.role !== undefined) patch.role = staffRole(req.body.role);
  if (req.body?.status !== undefined) {
    if (!['active', 'invited', 'suspended'].includes(String(req.body.status))) throw badRequest('Unknown status.');
    patch.status = req.body.status as 'active' | 'invited' | 'suspended';
  }
  if (req.body?.password !== undefined) {
    const password = String(req.body.password);
    if (password.length < 6) throw badRequest('Password must be at least 6 characters.');
    patch.password = password;
  }
  const updated = DEMO.patchPlatformStaff(target.id, patch);
  if (!updated) throw badRequest('That email is already in use by another account.');
  const action = patch.password ? (selfEdit ? 'staff.password_changed' : 'staff.password_reset') : 'staff.updated';
  DEMO.appendPlatformAudit({ actor: actor.email, action, resource: updated.email, ip: '10.0.0.7' });
  res.json(sanitizeStaff(updated));
});

// DELETE /v1/platform/staff/:staffId — remove a console account (super admin only).
platformRouter.delete('/platform/staff/:staffId', (req, res) => {
  const actor = requirePlatformPermission(req, 'platform.manage');
  const target = DEMO.platformStaff().find((m) => m.id === req.params.staffId);
  if (!target) throw notFound('Staff account not found.');
  if (target.email === actor.email) throw badRequest('You cannot remove your own account.');
  DEMO.deletePlatformStaff(target.id);
  DEMO.appendPlatformAudit({ actor: actor.email, action: 'staff.removed', resource: target.email, ip: '10.0.0.7' });
  res.json({ ok: true });
});

// GET /v1/platform/billing
platformRouter.get('/platform/billing', (req, res) => {
  requirePlatformPermission(req, 'billing.read');
  res.json({ monthlyMrrUsd: DEMO.mrrs().monthlyMrrUsd, invoices: DEMO.invoices() });
});

// GET /v1/platform/webhooks
platformRouter.get('/platform/webhooks', (req, res) => {
  requirePlatform(req);
  res.json({ rows: DEMO.platformWebhooks() });
});

// GET /v1/platform/audit-logs — console + (super admin) workspace events.
// scope=platform (default) lists Zojatech console actions; scope=all merges
// every tenant workspace's own audit log — that superset requires audit.all
// and is how the super admin "sees everything". A tenantId query narrows to a
// single workspace (its console entries by resource id, or its own log rows).
platformRouter.get('/platform/audit-logs', (req, res) => {
  const staff = requirePlatformPermission(req, 'audit.read');
  const query: Paging = req.query as Paging;
  const tenantId = queryString(req, 'tenantId');
  const scope = queryString(req, 'scope') === 'all' ? 'all' : 'platform';
  if (scope === 'all' && !platformPermissionsFor(staff.role).includes('audit.all')) throw forbidden('Your role cannot view other workspaces’ audit logs.');
  const inScope = (e: { resource: string; tenantId?: string }) => !tenantId || e.resource === tenantId || e.tenantId === tenantId;
  let pool = DEMO.platformAuditEntries().filter(inScope);
  if (scope === 'all') pool = pool.concat(DEMO.tenantAuditEntries().filter(inScope));
  const sorted = pool.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const tenantNames: Record<string, string> = {};
  for (const t of DEMO.allTenants()) tenantNames[t.id] = t.name;
  res.json({ rows: paginate(sorted, query), total: sorted.length, scope, tenantNames });
});

// GET /v1/platform/ai/providers
platformRouter.get('/platform/ai/providers', (req, res) => {
  requirePlatform(req);
  res.json({ rows: DEMO.aiProviders() });
});

// PATCH /v1/platform/ai/providers/:providerId
platformRouter.patch('/platform/ai/providers/:providerId', (req, res) => {
  requirePlatformPermission(req, 'platform.manage');
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
