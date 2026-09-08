/**
 * Tenant (company) dashboard routes — everything a signed-in company user
 * sees: overview stats, testimonials + moderation, imports, forms, widgets,
 * api keys, webhooks, team, audit logs and billing.
 *
 * All routes require a company session (`Authorization: Bearer <token>`).
 */
import { Router, type Request } from 'express';
import {
  COMPANY_ROLE_TEMPLATES,
  DEMO,
  WIDGET_DESIGN_IDS,
  type DemoRole,
  type DemoTestimonial,
  type DesignOptions,
  type DesignSort,
  type TestimonialStatus,
} from '../demo-data';
import {
  missingWidgetFields,
  REQUIRED_WIDGET_FIELDS,
  widgetTemplateById,
  widgetTemplateRows,
} from '../widget-templates';
import {
  appOfSession,
  badRequest,
  formOr404,
  MODERATION_ACTIONS,
  normalizeQuestions,
  notFound,
  paginate,
  queryString,
  createSessionToken,
  requireCompany,
  requirePermission,
  requireTenantOfApp,
  rowsForApp,
  rowOr404,
  sessionOf,
  slugify,
  tenantOfSession,
  type Paging,
  type RawQuestion,
} from '../lib';
import { parseThemePatch, presetSummary, THEME_PRESETS } from '../theme';

export const tenantRouter = Router();

// ---------------------------------------------------------------------------
// Apps — the company workspace home. A tenant creates one app per website and
// manages testimonials/forms inside each app. These routes are tenant-scoped:
// companies only ever see apps their own tenant owns.
// ---------------------------------------------------------------------------

// GET /v1/apps  (all apps of the signed-in company, with stats + paging)
tenantRouter.get('/apps', (req, res) => {
  const tenant = tenantOfSession(req);
  const q = queryString(req, 'q')?.trim().toLowerCase();
  const status = queryString(req, 'status');
  let rows = DEMO.appsOfTenant(tenant.id).map((a) => DEMO.appSummary(a));
  if (status && status !== 'all') rows = rows.filter((r) => r.status === status);
  if (q) rows = rows.filter((r) => `${r.name} ${r.slug} ${r.websiteUrl ?? ''}`.toLowerCase().includes(q));
  const sorted = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const perPage = Math.min(Math.max(Number(queryString(req, 'perPage') ?? 50) || 50, 1), 200);
  const page = Math.max(Number(queryString(req, 'page') ?? 1) || 1, 1);
  const totals = rows.reduce(
    (s, a) => ({
      totalTestimonials: s.totalTestimonials + a.totalTestimonials,
      pending: s.pending + a.pending,
      approved: s.approved + a.approved,
      rejected: s.rejected + a.rejected,
      forms: s.forms + a.forms,
      submissions: s.submissions + a.submissions,
    }),
    { totalTestimonials: 0, pending: 0, approved: 0, rejected: 0, forms: 0, submissions: 0 },
  );
  res.json({ rows: sorted.slice((page - 1) * perPage, page * perPage), total: sorted.length, totals });
});

// POST /v1/apps  (create an app for a website)
tenantRouter.post('/apps', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  const name = String(req.body?.name ?? '').trim();
  if (!name) throw badRequest('App name is required.');
  const accentColor =
    typeof req.body?.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(req.body.accentColor.trim()) ? req.body.accentColor.trim() : null;
  const app = DEMO.createApp(tenant.id, { name, websiteUrl: req.body?.websiteUrl, accentColor });
  // Every new app comes with a ready-to-use public review form so the owner
  // can start collecting testimonials on that website immediately.
  const formSlug = DEMO.uniqueFormSlug(`${app.slug}-review`);
  DEMO.saveForm(app.id, {
    name: `${app.name} review`,
    slug: formSlug,
    published: true,
    questions: [
      { id: 'q1', type: 'rating', label: 'How likely are you to recommend us?', required: true },
      { id: 'q2', type: 'text', label: 'What did we do well?', required: false },
    ],
  });
  res.status(201).json({ app: DEMO.appSummary(app), formSlug });
});

// PATCH /v1/apps/:appId  (rename / set website / pause)
tenantRouter.patch('/apps/:appId', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === req.params.appId)) throw notFound('App not found.');
  const patch: {
    name?: string;
    websiteUrl?: string | null;
    status?: 'active' | 'paused';
    accentColor?: string | null;
    themeAccent?: string | null;
    themeRadius?: string | null;
    themeFont?: string | null;
    widgetDesign?: string | null;
    designTemplateId?: string | null;
    designOptions?: DesignOptions | null;
  } = {};
  if (typeof req.body?.name === 'string') patch.name = req.body.name.trim().slice(0, 80);
  if (typeof req.body?.websiteUrl === 'string') patch.websiteUrl = req.body.websiteUrl.trim().slice(0, 300) || null;
  else if (req.body?.websiteUrl === null) patch.websiteUrl = null;
  if (req.body?.status === 'active' || req.body?.status === 'paused') patch.status = req.body.status;
  if (typeof req.body?.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(req.body.accentColor.trim())) patch.accentColor = req.body.accentColor.trim();
  else if (req.body?.accentColor === null || req.body?.accentColor === '') patch.accentColor = null;
  if (req.body?.themeAccent !== undefined) {
    if (typeof req.body.themeAccent === 'string' && /^#[0-9a-fA-F]{6}$/.test(req.body.themeAccent.trim())) patch.themeAccent = req.body.themeAccent.trim();
    else if (req.body.themeAccent === null || req.body.themeAccent === '') patch.themeAccent = null;
    else throw badRequest('Per-product accent must be a hex colour or null.');
  }
  if (req.body?.themeRadius !== undefined) {
    if (req.body.themeRadius === null || req.body.themeRadius === '') patch.themeRadius = null;
    else if (['sm', 'md', 'lg'].includes(String(req.body.themeRadius))) patch.themeRadius = String(req.body.themeRadius);
    else throw badRequest('Per-product radius must be sm, md or lg.');
  }
  if (req.body?.themeFont !== undefined) {
    if (req.body.themeFont === null || req.body.themeFont === '') patch.themeFont = null;
    else if (['system', 'serif', 'mono'].includes(String(req.body.themeFont))) patch.themeFont = String(req.body.themeFont);
    else throw badRequest('Per-product font must be system, serif or mono.');
  }
  if (req.body?.widgetDesign !== undefined) {
    const id = typeof req.body.widgetDesign === 'string' ? req.body.widgetDesign.trim() : '';
    if (id === '' || req.body.widgetDesign === null) patch.widgetDesign = null;
    else if ((WIDGET_DESIGN_IDS as readonly string[]).includes(id)) patch.widgetDesign = id;
    else throw badRequest('Unknown widget design id.');
  }
  if (req.body?.designTemplateId !== undefined) {
    const tpl = typeof req.body.designTemplateId === 'string' ? req.body.designTemplateId.trim() : '';
    patch.designTemplateId = tpl === '' ? null : tpl.slice(0, 60);
  }
  if (req.body?.designOptions !== undefined) {
    const raw = req.body.designOptions;
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) patch.designOptions = null;
    else {
      const o = raw as Record<string, unknown>;
      const out: DesignOptions = {};
      if (o.ratingMin === null || o.ratingMin === '') out.ratingMin = null;
      else if (typeof o.ratingMin === 'number' && Number.isFinite(o.ratingMin) && o.ratingMin >= 1 && o.ratingMin <= 5) out.ratingMin = Math.round(o.ratingMin);
      if (o.maxReviews === null || o.maxReviews === '') out.maxReviews = null;
      else if (typeof o.maxReviews === 'number' && Number.isFinite(o.maxReviews) && o.maxReviews >= 1 && o.maxReviews <= 50) out.maxReviews = Math.round(o.maxReviews);
      if (o.sort === null || o.sort === '') out.sort = null;
      else if (o.sort === 'newest' || o.sort === 'highest' || o.sort === 'oldest') out.sort = o.sort as DesignSort;
      patch.designOptions = out;
    }
  }
  const updated = DEMO.updateApp(req.params.appId, patch);
  if (!updated) throw notFound('App not found.');
  res.json({ app: DEMO.appSummary(updated) });
});

// GET /v1/widget-templates — the widget template catalogue. Every template
// carries the required rating components and fixed dimensions; schemas are
// included so the picker can render true live previews.
tenantRouter.get('/widget-templates', (req, res) => {
  requireCompany(req);
  res.json({ rows: widgetTemplateRows(), requiredFields: REQUIRED_WIDGET_FIELDS });
});

// POST /v1/apps/:appId/widget-template/:templateId/apply — apply a template to
// a product: a fresh copy of its schema becomes the product's widget design
// (the studio customises it from there) and the embed reflects it immediately.
tenantRouter.post('/apps/:appId/widget-template/:templateId/apply', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === req.params.appId)) throw notFound('App not found.');
  const template = widgetTemplateById(req.params.templateId);
  if (!template) throw notFound('Template not found.');
  const updated = DEMO.applyWidgetTemplate(req.params.appId, template);
  if (!updated) throw notFound('App not found.');
  res.json({
    app: DEMO.appSummary(updated),
    template: { id: template.id, name: template.name, width: template.width, height: template.height },
  });
});

// POST /v1/apps/:appId/widget-template/:templateId/draft — start an
// UNPUBLISHED draft from a template: preview & customise & save it in the
// studio without touching the live embed until an explicit publish.
tenantRouter.post('/apps/:appId/widget-template/:templateId/draft', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === req.params.appId)) throw notFound('App not found.');
  const template = widgetTemplateById(req.params.templateId);
  if (!template) throw notFound('Template not found.');
  const updated = DEMO.startDesignDraft(req.params.appId, template);
  if (!updated) throw notFound('App not found.');
  res.json({
    app: DEMO.appSummary(updated),
    template: { id: template.id, name: template.name, width: template.width, height: template.height },
  });
});

// GET /v1/dashboard/apps/:appId/design/schema — the product's visual-editor
// schema draft (DOC 7B). Null until the studio saves one for this product.
tenantRouter.get('/dashboard/apps/:appId/design/schema', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === req.params.appId)) throw notFound('App not found.');
  const app = DEMO.appById(req.params.appId);
  if (!app) throw notFound('App not found.');
  res.json({
    schema: app.studioSchema ?? null,
    studioVersion: app.studioVersion ?? 0,
    updatedAt: app.studioUpdatedAt ?? null,
    designVersion: app.designVersion ?? 0,
  });
});

// PATCH /v1/dashboard/apps/:appId/design/schema — persist a studio save. The
// schema is validated structurally (object or null) and capped in size, and
// must keep the required widget components: a design without the rating
// system (review text, reviewer name, rating stars) is not a widget and never
// reaches the public embed.
tenantRouter.patch('/dashboard/apps/:appId/design/schema', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === req.params.appId)) throw notFound('App not found.');
  const schema = (req.body as Record<string, unknown> | undefined)?.schema ?? null;
  if (schema !== null && (typeof schema !== 'object' || Array.isArray(schema))) throw badRequest('Schema must be a design JSON object or null.');
  const serialized = JSON.stringify(schema ?? {});
  if (serialized.length > 400_000) throw badRequest('Schema is too large (max 400 KB).');
  if (schema !== null) {
    const missing = missingWidgetFields(schema);
    if (missing.length > 0) {
      throw badRequest(`A widget must keep its required components — add back: ${missing.join(', ')}.`);
    }
  }
  const updated = DEMO.updateStudioSchema(req.params.appId, schema);
  if (!updated) throw notFound('App not found.');
  res.json({
    schema: updated.studioSchema ?? null,
    studioVersion: updated.studioVersion ?? 0,
    updatedAt: updated.studioUpdatedAt ?? null,
    designVersion: updated.designVersion ?? 0,
  });
});

// GET /v1/dashboard/apps/:appId/design/draft — the unpublished draft the
// studio is customising (null when the live design is what you see).
tenantRouter.get('/dashboard/apps/:appId/design/draft', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === req.params.appId)) throw notFound('App not found.');
  const app = DEMO.appById(req.params.appId);
  if (!app) throw notFound('App not found.');
  res.json({
    schema: app.designDraft ?? null,
    templateId: app.designDraftTemplateId ?? null,
    updatedAt: app.designDraftUpdatedAt ?? null,
  });
});

// PATCH /v1/dashboard/apps/:appId/design/draft — save the studio draft. Same
// contract as the live schema save (size cap + required components), but it
// never touches the public embed — publishing is a separate explicit step.
tenantRouter.patch('/dashboard/apps/:appId/design/draft', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === req.params.appId)) throw notFound('App not found.');
  const app = DEMO.appById(req.params.appId);
  if (!app) throw notFound('App not found.');
  const schema = (req.body as Record<string, unknown> | undefined)?.schema ?? null;
  if (schema !== null && (typeof schema !== 'object' || Array.isArray(schema))) throw badRequest('Schema must be a design JSON object or null.');
  const serialized = JSON.stringify(schema ?? {});
  if (serialized.length > 400_000) throw badRequest('Schema is too large (max 400 KB).');
  if (schema !== null) {
    const missing = missingWidgetFields(schema);
    if (missing.length > 0) {
      throw badRequest(`A widget must keep its required components — add back: ${missing.join(', ')}.`);
    }
  }
  const updated = DEMO.updateDesignDraft(req.params.appId, schema);
  if (!updated) throw notFound('App not found.');
  res.json({
    schema: updated.designDraft ?? null,
    templateId: updated.designDraftTemplateId ?? null,
    updatedAt: updated.designDraftUpdatedAt ?? null,
  });
});

// POST /v1/dashboard/apps/:appId/design/draft/publish — push the draft live:
// this is the ONLY studio path that changes what the embed serves.
tenantRouter.post('/dashboard/apps/:appId/design/draft/publish', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === req.params.appId)) throw notFound('App not found.');
  const updated = DEMO.publishDesignDraft(req.params.appId);
  if (!updated) throw notFound('No draft to publish — save one first.');
  res.json({
    schema: updated.studioSchema ?? null,
    studioVersion: updated.studioVersion ?? 0,
    updatedAt: updated.studioUpdatedAt ?? null,
    designVersion: updated.designVersion ?? 0,
  });
});

// DELETE /v1/dashboard/apps/:appId/design/draft — throw the draft away and
// keep serving the live design.
tenantRouter.delete('/dashboard/apps/:appId/design/draft', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === req.params.appId)) throw notFound('App not found.');
  const updated = DEMO.discardDesignDraft(req.params.appId);
  if (!updated) throw notFound('App not found.');
  res.json({ app: DEMO.appSummary(updated) });
});

// GET /v1/dashboard/apps/:appId/design — current versioned design + history.
tenantRouter.get('/dashboard/apps/:appId/design', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'apps.manage');
  if (!DEMO.appsOfTenant(tenant.id).some((a) => a.id === req.params.appId)) throw notFound('App not found.');
  const app = DEMO.appById(req.params.appId);
  if (!app) throw notFound('App not found.');
  res.json({
    design: {
      designId: app.widgetDesign ?? 'classic',
      options: app.designOptions ?? null,
      version: app.designVersion ?? 0,
      updatedAt: app.designUpdatedAt ?? null,
    },
    history: app.designHistory ?? [],
  });
});

// ---------------------------------------------------------------------------
// Dashboard overview (per app)
// ---------------------------------------------------------------------------

// GET /v1/dashboard/overview?appId=...
tenantRouter.get('/dashboard/overview', (req, res) => {
  const appId = queryString(req, 'appId') ?? appOfSession(req);
  const rows = rowsForApp(req, appId);
  res.json({
    totalPending: rows.filter((r) => r.status === 'pending').length,
    totalApproved: rows.filter((r) => r.status === 'approved').length,
    totalRejected: rows.filter((r) => r.status === 'rejected').length,
    totalTestimonials: rows.length,
    conversionRate: rows.length ? 42 : undefined,
  });
});

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

// GET /v1/apps/:appId/testimonials/tags
tenantRouter.get('/apps/:appId/testimonials/tags', (req, res) => {
  const rows = rowsForApp(req, req.params.appId);
  res.json({ tags: [...new Set(rows.flatMap((r) => r.tags))].sort() });
});

// GET /v1/apps/:appId/testimonials/export
tenantRouter.get('/apps/:appId/testimonials/export', (req, res) => {
  const rows = rowsForApp(req, req.params.appId);
  const csv = ['id,author,rating,status,content']
    .concat(rows.map((r) => [r.id, r.authorName ?? 'Anonymous', r.rating ?? '', r.status, `"${r.content.replace(/"/g, '""')}"`].join(',')))
    .join('\n');
  res.json({ downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}` });
});

// GET /v1/apps/:appId/testimonials
tenantRouter.get('/apps/:appId/testimonials', (req, res) => {
  const scoped = rowsForApp(req, req.params.appId);
  const status = queryString(req, 'status');
  const q = queryString(req, 'q')?.trim().toLowerCase();
  let out = scoped;
  if (status && status !== 'all') out = out.filter((r) => r.status === status);
  if (q) out = out.filter((r) => `${r.authorName ?? ''} ${r.content} ${r.tags.join(' ')}`.toLowerCase().includes(q));
  const sorted = [...out].sort((a, b) =>
    a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1,
  );
  const perPage = Math.min(Math.max(Number(queryString(req, 'perPage') ?? 50) || 50, 1), 200);
  const page = Math.max(Number(queryString(req, 'page') ?? 1) || 1, 1);
  res.json({ rows: sorted.slice((page - 1) * perPage, page * perPage), total: sorted.length });
});

// POST /v1/apps/:appId/testimonials  (manual create — full CRUD support)
tenantRouter.post('/apps/:appId/testimonials', (req, res) => {
  requirePermission(req, 'testimonials.write');
  const content = String(req.body?.content ?? '').trim().slice(0, 2000);
  if (!content) throw badRequest('Testimonial content is required.');
  const authorName = req.body?.authorName == null || req.body.authorName === '' ? null : String(req.body.authorName).trim().slice(0, 120);
  const rating =
    req.body?.rating == null || req.body?.rating === '' ? undefined : Math.min(5, Math.max(1, Math.round(Number(req.body.rating)) || 1));
  const status = (['pending', 'approved', 'rejected', 'archived'] as const).includes(req.body?.status)
    ? (req.body.status as TestimonialStatus)
    : 'approved'; // manually added reviews are trusted live by default
  const tags = Array.isArray(req.body?.tags) ? req.body.tags.map((t: unknown) => String(t).slice(0, 40)).slice(0, 30) : [];
  const visible = req.body?.visible === false ? false : true;
  const created = DEMO.addTestimonial({ appId: req.params.appId, content, authorName, rating, status, visible, tags });
  res.status(201).json(created);
});

// POST /v1/apps/:appId/testimonials/bulk  (bulk management: status, live
// toggle, delete). ids are capped (DOC 6 §2.9) and every id is resolved
// through the app-scoped rows so a foreign id can never be touched.
const BULK_ACTIONS = new Set(['approve', 'reject', 'archive', 'show', 'hide', 'delete']);
tenantRouter.post('/apps/:appId/testimonials/bulk', (req, res) => {
  const action = String(req.body?.action ?? '');
  if (!BULK_ACTIONS.has(action)) throw badRequest('Invalid bulk action.');
  // Status changes and deletes are destructive moderation work; the live
  // toggle is a content edit.
  requirePermission(req, action === 'show' || action === 'hide' ? 'testimonials.write' : 'testimonials.moderate');
  const rows = rowsForApp(req, req.params.appId);
  const ids: string[] = (Array.isArray(req.body?.ids) ? req.body.ids : []).slice(0, 100); // DOC 6 §2.9 — bulk caps
  const scopedIds = new Set(rows.filter((r) => ids.includes(r.id)).map((r) => r.id));
  let affected = 0;
  if (action === 'delete') {
    for (const id of scopedIds) {
      if (DEMO.deleteTestimonial(id)) affected += 1;
    }
  } else if (action === 'show' || action === 'hide') {
    for (const id of scopedIds) {
      if (DEMO.updateTestimonial(id, { visible: action === 'show' })) affected += 1;
    }
  } else {
    const status = MODERATION_ACTIONS[action];
    for (const id of scopedIds) {
      if (DEMO.updateTestimonial(id, { status })) affected += 1;
    }
  }
  res.json({ ok: true, affected });
});

// POST /v1/apps/:appId/testimonials/bulk/moderation
tenantRouter.post('/apps/:appId/testimonials/bulk/moderation', (req, res) => {
  requirePermission(req, 'testimonials.moderate');
  const rows = rowsForApp(req, req.params.appId);
  const status = MODERATION_ACTIONS[String(req.body?.action ?? '')];
  if (!status) throw badRequest('Invalid moderation action.');
  const ids: string[] = (Array.isArray(req.body?.ids) ? req.body.ids : []).slice(0, 100); // DOC 6 §2.9 — bulk caps
  for (const row of rows) {
    if (ids.includes(row.id) && row.status === 'pending') {
      DEMO.updateTestimonial(row.id, { status });
    }
  }
  res.json({ ok: true });
});

// PATCH /v1/apps/:appId/testimonials/:id/moderation
tenantRouter.patch('/apps/:appId/testimonials/:id/moderation', (req, res) => {
  requirePermission(req, 'testimonials.moderate');
  const row = rowOr404(req, req.params.appId, req.params.id);
  const action = String(req.body?.action ?? '');
  const status = MODERATION_ACTIONS[action];
  if (!status) throw badRequest('Invalid moderation action.');
  if (action === 'reject' && !String(req.body?.reason ?? '').trim().slice(0, 500)) throw badRequest('Rejection reason is required.');
  const tags = action === 'reject' ? [...row.tags, 'rejected'] : row.tags;
  DEMO.updateTestimonial(row.id, { status, tags });
  res.json({ ok: true });
});

// DELETE /v1/apps/:appId/testimonials/:id
tenantRouter.delete('/apps/:appId/testimonials/:id', (req, res) => {
  requirePermission(req, 'testimonials.moderate');
  rowOr404(req, req.params.appId, req.params.id); // scope check
  DEMO.deleteTestimonial(req.params.id);
  res.json({ ok: true });
});

// PATCH /v1/apps/:appId/testimonials/:id  (full edit: content, author, rating,
// tags, live toggle — plus status changes for moderators)
tenantRouter.patch('/apps/:appId/testimonials/:id', (req, res) => {
  requirePermission(req, 'testimonials.write');
  const row = rowOr404(req, req.params.appId, req.params.id);
  const body = req.body ?? {};
  const patch: Partial<DemoTestimonial> = {};

  if (body.content !== undefined) {
    const content = String(body.content ?? '').trim().slice(0, 2000);
    if (!content) throw badRequest('Testimonial content cannot be empty.');
    patch.content = content;
  }
  if (body.authorName !== undefined) {
    patch.authorName = body.authorName == null || body.authorName === '' ? null : String(body.authorName).trim().slice(0, 120);
  }
  if (body.rating !== undefined) {
    patch.rating =
      body.rating == null || body.rating === '' ? undefined : Math.min(5, Math.max(1, Math.round(Number(body.rating)) || 1));
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) throw badRequest('tags must be an array.');
    patch.tags = body.tags.map((t: unknown) => String(t).slice(0, 40)).slice(0, 30);
  }
  if (body.visible !== undefined) {
    if (typeof body.visible !== 'boolean') throw badRequest('visible must be a boolean.');
    patch.visible = body.visible;
  }
  if (body.status !== undefined) {
    // Moving a review between moderation states is moderator work, separate
    // from editing its content.
    requirePermission(req, 'testimonials.moderate');
    if (!(['pending', 'approved', 'rejected', 'archived'] as const).includes(body.status)) throw badRequest('Unknown status.');
    patch.status = body.status;
  }

  const updated = DEMO.updateTestimonial(row.id, patch);
  if (!updated) throw notFound('Testimonial not found.');
  res.json(updated);
});

// GET /v1/apps/:appId/testimonials/:id
tenantRouter.get('/apps/:appId/testimonials/:id', (req, res) => {
  res.json(rowOr404(req, req.params.appId, req.params.id));
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

// GET /v1/apps/:appId/imports
tenantRouter.get('/apps/:appId/imports', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  res.json({ rows: DEMO.importsOfApp(req.params.appId) });
});

// POST /v1/apps/:appId/imports
tenantRouter.post('/apps/:appId/imports', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  requirePermission(req, 'testimonials.write');
  res.status(201).json(DEMO.enqueueImport(req.params.appId, 'upload.csv'));
});

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

interface FormSaveBody {
  name?: string;
  slug?: string;
  published?: boolean;
  questions?: RawQuestion[];
}

// GET /v1/apps/:appId/forms
tenantRouter.get('/apps/:appId/forms', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  const rows = DEMO.formsOfApp(req.params.appId).map((f) => ({
    id: f.id,
    appId: f.appId,
    name: f.name,
    slug: f.slug,
    published: f.published,
    submissionCount: f.submissionCount,
    createdAt: f.createdAt,
  }));
  res.json({ rows });
});

// POST /v1/apps/:appId/forms  (create)
tenantRouter.post('/apps/:appId/forms', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  requirePermission(req, 'forms.manage');
  const body = req.body as FormSaveBody;
  const name = (body?.name?.trim() || 'Untitled form').slice(0, 80);
  const slug = (body?.slug?.trim() || slugify(name)).slice(0, 60);
  res.status(201).json(
    DEMO.saveForm(req.params.appId, {
      name,
      slug,
      published: body?.published ?? false,
      questions: normalizeQuestions(body?.questions),
    }),
  );
});

// GET /v1/apps/:appId/forms/:formId/stats
tenantRouter.get('/apps/:appId/forms/:formId/stats', (req, res) => {
  const form = formOr404(req, req.params.appId, req.params.formId);
  res.json({ submissions: form.submissionCount, completionRate: 68, avgRating: 4.6 });
});

// GET /v1/apps/:appId/forms/:formId
tenantRouter.get('/apps/:appId/forms/:formId', (req, res) => {
  res.json(formOr404(req, req.params.appId, req.params.formId));
});

// POST /v1/apps/:appId/forms/:formId  (full update)
tenantRouter.post('/apps/:appId/forms/:formId', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  requirePermission(req, 'forms.manage');
  const body = req.body as FormSaveBody;
  const existing = formOr404(req, req.params.appId, req.params.formId);
  const name = (body?.name?.trim() || existing.name).slice(0, 80);
  res.status(200).json(
    DEMO.saveForm(req.params.appId, {
      id: req.params.formId,
      name,
      slug: (body?.slug?.trim() || existing.slug).slice(0, 60),
      published: body?.published ?? existing.published,
      questions: normalizeQuestions(body?.questions ?? existing.questions),
    }),
  );
});

// PATCH /v1/apps/:appId/forms/:formId  (publish/unpublish)
tenantRouter.patch('/apps/:appId/forms/:formId', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  requirePermission(req, 'forms.manage');
  const form = DEMO.setFormPublished(req.params.formId, Boolean(req.body?.published));
  if (!form) throw notFound('Form not found.');
  res.json(form);
});

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

interface WidgetSaveBody {
  id?: string;
  formId?: string | null;
  name?: string;
  enabled?: boolean;
  theme?: 'light' | 'dark';
  accentColor?: string;
  embedType?: 'script' | 'iframe' | 'react';
}

// GET /v1/apps/:appId/widgets
tenantRouter.get('/apps/:appId/widgets', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  res.json({ rows: DEMO.widgetsOfApp(req.params.appId) });
});

// GET /v1/apps/:appId/widgets/:widgetId
tenantRouter.get('/apps/:appId/widgets/:widgetId', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  const w = DEMO.findWidget(req.params.appId, req.params.widgetId);
  if (!w) throw notFound('Widget not found.');
  res.json(w);
});

// POST /v1/apps/:appId/widgets  (create)
tenantRouter.post('/apps/:appId/widgets', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  requirePermission(req, 'widgets.manage');
  const body = req.body as WidgetSaveBody;
  const name = body?.name?.trim() || 'Untitled widget';
  res.status(201).json(
    DEMO.saveWidget(req.params.appId, {
      name,
      formId: body?.formId ?? null,
      enabled: body?.enabled ?? false,
      theme: body?.theme ?? 'light',
      accentColor: body?.accentColor ?? '#6366F1',
      embedType: body?.embedType ?? 'script',
    }),
  );
});

// POST /v1/apps/:appId/widgets/:widgetId  (full update)
tenantRouter.post('/apps/:appId/widgets/:widgetId', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  requirePermission(req, 'widgets.manage');
  const body = req.body as WidgetSaveBody;
  const existing = DEMO.findWidget(req.params.appId, req.params.widgetId);
  if (!existing) throw notFound('Widget not found.');
  res.json(
    DEMO.saveWidget(req.params.appId, {
      id: req.params.widgetId,
      name: body?.name?.trim() || existing.name,
      formId: body?.formId ?? existing.formId,
      enabled: body?.enabled ?? existing.enabled,
      theme: body?.theme ?? existing.theme,
      accentColor: body?.accentColor ?? existing.accentColor,
      embedType: body?.embedType ?? existing.embedType,
    }),
  );
});

// PATCH /v1/apps/:appId/widgets/:widgetId  (enable/disable)
tenantRouter.patch('/apps/:appId/widgets/:widgetId', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  requirePermission(req, 'widgets.manage');
  const w = DEMO.setWidgetEnabled(req.params.widgetId, Boolean(req.body?.enabled));
  if (!w) throw notFound('Widget not found.');
  res.json(w);
});

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

// GET /v1/apps/:appId/api-keys
tenantRouter.get('/apps/:appId/api-keys', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  res.json({ rows: DEMO.apiKeysOfApp(req.params.appId) });
});

// POST /v1/apps/:appId/api-keys
tenantRouter.post('/apps/:appId/api-keys', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  if (!req.body?.name) throw badRequest('Key name is required.');
  const scopes: string[] = Array.isArray(req.body?.scopes) ? req.body.scopes : ['testimonials.read'];
  res.status(201).json(DEMO.createApiKey(req.params.appId, req.body.name, scopes));
});

// POST /v1/apps/:appId/api-keys/:keyId/rotate
tenantRouter.post('/apps/:appId/api-keys/:keyId/rotate', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  const k = DEMO.rotateApiKey(req.params.keyId);
  if (!k) throw notFound('API key not found.');
  res.json(k);
});

// ---------------------------------------------------------------------------
// Webhooks (tenant)
// ---------------------------------------------------------------------------

// GET /v1/apps/:appId/webhooks
tenantRouter.get('/apps/:appId/webhooks', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  res.json({ rows: DEMO.webhooksOfApp(req.params.appId) });
});

// GET /v1/apps/:appId/webhooks/:webhookId/deliveries
tenantRouter.get('/apps/:appId/webhooks/:webhookId/deliveries', (req, res) => {
  requireTenantOfApp(req, req.params.appId);
  const wh = DEMO.webhooksOfApp(req.params.appId).find((w) => w.id === req.params.webhookId);
  if (!wh) throw notFound('Webhook not found.');
  res.json({ rows: DEMO.deliveriesForWebhook(req.params.webhookId) });
});

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

// GET /v1/account — the signed-in tenant user's own profile.
tenantRouter.get('/account', (req, res) => {
  requireCompany(req);
  const session = sessionOf(req);
  const user = DEMO.companyUsers().find((u) => u.email === session?.email);
  if (!user) throw notFound('Account not found.');
  const tenant = tenantOfSession(req);
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, tenantName: tenant.name });
});

// PATCH /v1/account — update own name/email and change password. When the
// email changes the session token is re-issued (tokens embed the email).
tenantRouter.patch('/account', (req, res) => {
  requireCompany(req);
  const session = sessionOf(req);
  const user = DEMO.companyUsers().find((u) => u.email === session?.email);
  if (!user) throw notFound('Account not found.');
  const body = req.body ?? {};
  let newToken: string | undefined;

  if (typeof body.name === 'string') user.name = (body.name.trim().slice(0, 80) || user.name).trim();

  if (typeof body.email === 'string') {
    const email = body.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('A valid email is required.');
    if (email !== user.email) {
      const taken = DEMO.companyUsers().some((u) => u.email === email) || DEMO.platformUsers().some((u) => u.email === email);
      if (taken) throw badRequest('That email is already in use.');
      const tenant = tenantOfSession(req);
      const member = DEMO.teamOfTenant(tenant.id).find((m) => m.email === user.email);
      if (member) member.email = email;
      if (tenant.ownerEmail === user.email) tenant.ownerEmail = email;
      user.email = email;
      newToken = createSessionToken('company', email);
    }
  }

  if (body.currentPassword !== undefined || body.newPassword !== undefined) {
    if (
      typeof body.currentPassword !== 'string' ||
      typeof body.newPassword !== 'string' ||
      body.newPassword.length < 6 ||
      body.newPassword.length > 100
    ) {
      throw badRequest('Current password and a new password of at least 6 characters are required.');
    }
    if (user.password !== body.currentPassword) throw badRequest('Current password is incorrect.');
    user.password = body.newPassword;
  }

  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token: newToken });
});

// GET /v1/team — the tenant's member directory.
tenantRouter.get('/team', (req, res) => {
  const tenant = tenantOfSession(req);
  res.json({ rows: DEMO.teamOfTenant(tenant.id) });
});

// GET /v1/team/roles — company role templates (tenant RBAC presets). The UI
// renders these as cards/matrices; the server enforces the same grants.
tenantRouter.get('/team/roles', (req, res) => {
  const tenant = tenantOfSession(req);
  res.json({ tenantId: tenant.id, templates: COMPANY_ROLE_TEMPLATES });
});

// POST /v1/team/invites — create a member AND a working sign-in account. The
// demo has no outbound email, so the inviter gets the one-time credentials.
const INVITE_ROLES = new Set(['owner', 'admin', 'editor', 'viewer']);

tenantRouter.post('/team/invites', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'team.manage');
  const rawEmail = String(req.body?.email ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) throw badRequest('A valid email is required.');
  const email = rawEmail.toLowerCase().slice(0, 120);
  if (DEMO.companyUsers().some((u) => u.email === email)) throw badRequest('A sign-in account with that email already exists.');
  if (DEMO.teamOfTenant(tenant.id).some((m) => m.email === email)) throw badRequest('That person is already on the team.');
  if (tenant.seatsUsed >= tenant.seatsLimit) throw badRequest('This workspace has reached its seat limit.');
  const role: DemoRole = INVITE_ROLES.has(String(req.body.role ?? '')) ? (req.body.role as DemoRole) : 'viewer';
  const password = 'demo1234';
  const member = DEMO.inviteTeamMember(tenant.id, email, role, password);
  DEMO.appendTenantAudit({
    actor: sessionOf(req)?.email ?? member.email,
    action: 'team.invite_sent',
    resource: email,
    tenantId: tenant.id,
  });
  res.status(201).json({
    member,
    credentials: { email, password },
    message: 'Member added. They can sign in now with the credentials shown once here.',
  });
});

// PATCH /v1/team/:memberId — change a member's role template, suspend/activate,
// or reset their sign-in password. The owner row is the tenant's super admin:
// no other member (and not the owner through this endpoint) may change it, and
// nobody may edit their own role/status/password here (own profile lives in
// Account settings).
tenantRouter.patch('/team/:memberId', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'team.manage');
  const actor = requireCompany(req);
  const member = DEMO.teamOfTenant(tenant.id).find((m) => m.id === req.params.memberId);
  if (!member) throw notFound('Member not found.');
  const body = req.body ?? {};
  const wantsRole = body.role !== undefined;
  const wantsStatus = body.status !== undefined;
  const wantsPassword = body.password !== undefined;

  const ownerRow = member.email === tenant.ownerEmail;
  if (ownerRow && (wantsRole || wantsStatus)) {
    throw badRequest('The owner account is this workspace’s super admin and cannot be demoted or suspended from Team & roles.');
  }
  if (member.email === actor.email && (wantsRole || wantsStatus || wantsPassword)) {
    throw badRequest('You cannot change your own role, status or password here — use Account settings for your profile.');
  }
  if (wantsPassword) {
    const user = DEMO.companyUserByEmail(tenant.id, member.email);
    if (!user) throw badRequest('That member has no sign-in account yet.');
    const password = String(body.password);
    if (password.length < 6) throw badRequest('Password must be at least 6 characters.');
    user.password = password;
    DEMO.appendTenantAudit({ actor: actor.email, action: 'team.password_reset', resource: member.email, tenantId: tenant.id });
  }
  const patch: { role?: DemoRole; status?: 'active' | 'suspended' | 'invited' } = {};
  if (wantsRole) {
    const role = String(body.role);
    if (!INVITE_ROLES.has(role)) throw badRequest('Unknown role.');
    patch.role = role as DemoRole;
  }
  if (wantsStatus) {
    if (!['active', 'suspended', 'invited'].includes(String(body.status))) throw badRequest('Unknown status.');
    patch.status = body.status as 'active' | 'suspended' | 'invited';
  }
  const updated = DEMO.patchTeamMember(req.params.memberId, patch);
  if (updated && patch.role) DEMO.appendTenantAudit({ actor: actor.email, action: 'team.role_changed', resource: member.email, tenantId: tenant.id });
  if (updated && patch.status) DEMO.appendTenantAudit({ actor: actor.email, action: patch.status === 'suspended' ? 'team.suspended' : 'team.activated', resource: member.email, tenantId: tenant.id });
  res.json(updated);
});

// ---------------------------------------------------------------------------
// Audit + billing (tenant)
// ---------------------------------------------------------------------------

// GET /v1/settings/theme — the tenant's DOC-7 theme (presets + resolved tokens)
// plus the company-wide widget default (marketplace tier 2) and the template it
// came from. Products without their own override inherit this design.
tenantRouter.get('/settings/theme', (req, res) => {
  const tenant = tenantOfSession(req);
  const template = tenant.designTemplateId ? DEMO.designTemplateById(tenant.designTemplateId) : undefined;
  res.json({
    theme: DEMO.themeOfTenant(tenant),
    presets: THEME_PRESETS.map((p) => presetSummary(p)),
    logoUrl: tenant.logoUrl ?? null,
    brandColor: tenant.brandColor,
    design: {
      widgetDesign: tenant.widgetDesign ?? null,
      template: template ? { id: template.id, name: template.name } : null,
    },
  });
});

// GET /v1/settings/theme/marketplace — Zojatech's design template catalogue the
// tenant browses on its Appearance page and adopts as its company default.
tenantRouter.get('/settings/theme/marketplace', (req, res) => {
  const tenant = tenantOfSession(req);
  res.json({
    rows: DEMO.designTemplates().map((t) => ({
      ...t,
      active: tenant.designTemplateId === t.id,
    })),
    current: { widgetDesign: tenant.widgetDesign ?? null, templateId: tenant.designTemplateId ?? null },
  });
});

// POST /v1/settings/theme/templates/:templateId/apply — company-level adoption:
// copies the marketplace template's visual preset and widget design onto the
// tenant (tier 2). Products keep their own per-product designs (tier 3).
tenantRouter.post('/settings/theme/templates/:templateId/apply', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'settings.manage');
  const template = DEMO.designTemplateById(req.params.templateId);
  if (!template) throw notFound('Template not found.');
  const themed = DEMO.updateTenantTheme(tenant.id, {
    presetId: null,
    primary: template.primary,
    accent: template.accent,
    radius: template.radius,
    font: template.font,
  });
  if (!themed) throw notFound('Tenant not found.');
  const updated = DEMO.updateTenantDefaultDesign(themed.id, { designId: template.designId, templateId: template.id });
  DEMO.bumpDesignTemplateUse(template.id);
  if (!updated) throw notFound('Tenant not found.');
  res.json({
    theme: DEMO.themeOfTenant(updated),
    design: { widgetDesign: template.designId, template: { id: template.id, name: template.name } },
  });
});

// PATCH /v1/settings/theme — tenant self-service theme editor. Saves presets /
// tokens + logo, bumps the version so public surfaces and embeds reflect
// immediately on next read (single pre-resolved payload server-side). Also
// accepts `widgetDesign` to set the company-wide widget default directly.
tenantRouter.patch('/settings/theme', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'settings.manage');
  const parsed = parseThemePatch(req.body ?? {});
  if (!parsed.ok) throw badRequest(parsed.error);
  const withLogo = DEMO.updateTenantIdentity(tenant.id, { logoUrl: req.body?.logoUrl });
  const updated = withLogo ? DEMO.updateTenantTheme(withLogo.id, parsed.patch) : undefined;
  if (!updated) throw notFound('Tenant not found.');
  let finalTenant = updated;
  const rawDesign = (req.body as Record<string, unknown> | undefined)?.widgetDesign;
  if (rawDesign !== undefined) {
    const id = typeof rawDesign === 'string' ? rawDesign.trim() : '';
    if (id !== '' && !(WIDGET_DESIGN_IDS as readonly string[]).includes(id as (typeof WIDGET_DESIGN_IDS)[number])) {
      throw badRequest('Unknown widget design id.');
    }
    const patched = DEMO.updateTenantDefaultDesign(updated.id, {
      designId: id === '' ? null : id,
      templateId: id === '' ? null : undefined,
    });
    if (patched) finalTenant = patched;
  }
  const template = finalTenant.designTemplateId ? DEMO.designTemplateById(finalTenant.designTemplateId) : undefined;
  res.json({
    theme: DEMO.themeOfTenant(finalTenant),
    presets: THEME_PRESETS.map((p) => presetSummary(p)),
    logoUrl: finalTenant.logoUrl ?? null,
    brandColor: finalTenant.brandColor,
    design: {
      widgetDesign: finalTenant.widgetDesign ?? null,
      template: template ? { id: template.id, name: template.name } : null,
    },
  });
});

// PATCH /v1/settings/theme — tenant self-service theme editor. Saves presets /
// tokens + logo, bumps the version so public surfaces and embeds reflect
// immediately on next read (single pre-resolved payload server-side).
tenantRouter.patch('/settings/theme', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'settings.manage');
  const parsed = parseThemePatch(req.body ?? {});
  if (!parsed.ok) throw badRequest(parsed.error);
  const withLogo = DEMO.updateTenantIdentity(tenant.id, { logoUrl: req.body?.logoUrl });
  const updated = withLogo ? DEMO.updateTenantTheme(withLogo.id, parsed.patch) : undefined;
  if (!updated) throw notFound('Tenant not found.');
  res.json({
    theme: DEMO.themeOfTenant(updated),
    presets: THEME_PRESETS.map((p) => presetSummary(p)),
    logoUrl: updated.logoUrl ?? null,
    brandColor: updated.brandColor,
  });
});

// PATCH /v1/settings/identity — the tenant updates its own logo/brand colour;
// shown in its workspace chrome and on its public form + walls.
tenantRouter.patch('/settings/identity', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'settings.manage');
  const brandColor = req.body?.brandColor;
  if (brandColor !== undefined && (typeof brandColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(brandColor.trim()))) {
    throw badRequest('Brand colour must be a hex value like #1B2559.');
  }
  const updated = DEMO.updateTenantIdentity(tenant.id, {
    brandColor: brandColor === undefined ? undefined : (brandColor as string),
    logoUrl: req.body?.logoUrl,
  });
  res.json({
    tenant: { id: updated?.id, name: updated?.name, slug: updated?.slug, brandColor: updated?.brandColor ?? null, logoUrl: updated?.logoUrl ?? null },
  });
});

// PATCH /v1/settings/workspace — the workspace's own profile settings
// (name). Slug stays immutable (public URLs depend on it); the platform side
// handles plan/status. Changes show up in the sidebar identity after the
// session refreshes and are recorded in the workspace audit log.
tenantRouter.patch('/settings/workspace', (req, res) => {
  const tenant = tenantOfSession(req);
  requirePermission(req, 'settings.manage');
  const name = String(req.body?.name ?? '').trim();
  if (!name) throw badRequest('A workspace name is required.');
  if (name.length > 80) throw badRequest('Workspace name must be 80 characters or fewer.');
  const updated = DEMO.updateTenantWorkspace(tenant.id, name);
  if (!updated) throw notFound('Tenant not found.');
  DEMO.appendTenantAudit({ actor: sessionOf(req)?.email ?? 'unknown', action: 'settings.workspace_updated', resource: updated.name, tenantId: tenant.id });
  res.json({ tenant: { id: updated.id, name: updated.name, slug: updated.slug, brandColor: updated.brandColor ?? null, logoUrl: updated.logoUrl ?? null } });
});

// GET /v1/audit-logs — this workspace's own log. Members only ever see their
// tenant's entries: other workspaces' rows never leave the server.
tenantRouter.get('/audit-logs', (req, res) => {
  requireCompany(req);
  const tenant = tenantOfSession(req);
  const own = DEMO.tenantAuditEntries().filter((e) => e.tenantId === tenant.id);
  const sorted = own.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const query: Paging = req.query as Paging;
  const rows = paginate(sorted, query);
  res.json({ rows, total: sorted.length });
});

// GET /v1/billing
tenantRouter.get('/billing', (req, res) => {
  const tenant = tenantOfSession(req);
  res.json(DEMO.billingForTenant(tenant));
});
