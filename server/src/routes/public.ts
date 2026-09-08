/**
 * Public routes — no session needed. These power the embeddable testimonial
 * forms that external visitors fill in.
 */
import { Router } from 'express';
import { DEMO } from '../demo-data';
import { badRequest, notFound } from '../lib';
import { hexSoft, RADIUS_PX, resolveTheme, type ThemeFont, type ThemeRadius } from '../theme';
import { defaultWidgetTemplate, schemaCanvasSize } from '../widget-templates';

export const publicRouter = Router();

// Public read endpoints are CORS-open on purpose: they only ever serve
// published/approved content (never session data), so any external site can
// fetch a theme or a wall directly — that is the documented widget path.
publicRouter.use((req, res, next) => {
  if (req.method === 'GET') res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

/** Theme resolved for one app: the tenant's tokens with any app-level accent override. */
function themeForApp(appSlug: string) {
  const app = DEMO.appBySlug(appSlug);
  const tenant = app ? DEMO.tenantOfApp(app.id) : undefined;
  if (!app || !tenant) return null;
  const base = resolveTheme(tenant);
  // Layering: template -> company theme -> per-product overrides.
  const primary = app.accentColor ?? base.primary;
  const accent = (app.themeAccent as string | null | undefined) ?? base.accent;
  const radius: ThemeRadius = (app.themeRadius as ThemeRadius | null | undefined) ?? base.radius;
  const font: ThemeFont = (app.themeFont as ThemeFont | null | undefined) ?? base.font;
  return {
    app: { id: app.id, name: app.name, slug: app.slug, websiteUrl: app.websiteUrl },
    tenantName: tenant.name,
    logoUrl: tenant.logoUrl ?? null,
    design: app.widgetDesign ?? tenant.widgetDesign ?? 'classic',
    designTemplateId: app.designTemplateId ?? tenant.designTemplateId ?? null,
    designOptions: app.designOptions ?? null,
    designVersion: app.designVersion ?? 0,
    theme: { ...base, primary, soft: hexSoft(primary), accent, radius, radiusPx: RADIUS_PX[radius], font },
  };
}

// GET /v1/public/theme-presets — the template catalogue Zojatech owns (no auth).
// Tenants see exactly this list in their Appearance page.
publicRouter.get('/public/theme-presets', (_req, res) => {
  res.json({ presets: DEMO.themeTemplates() });
});

// GET /v1/public/theme/:appSlug — pre-resolved tokens for walls/forms/widgets.
publicRouter.get('/public/theme/:appSlug', (req, res) => {
  const themed = themeForApp(req.params.appSlug);
  if (!themed) throw notFound('Wall not found.');
  res.json(themed);
});

// GET /v1/public/forms/:slug
publicRouter.get('/public/forms/:slug', (req, res) => {
  const form = DEMO.formBySlug(req.params.slug);
  const tenant = form ? DEMO.tenantOfApp(form.appId) : undefined;
  const app = form ? DEMO.appById(form.appId) : undefined;
  if (!form || !tenant || !form.published) throw notFound('Form not found.');
  const themed = app ? themeForApp(app.slug) : null;
  res.json({
    id: form.id,
    slug: form.slug,
    name: form.name,
    tenantName: tenant.name,
    logoUrl: tenant.logoUrl ?? null,
    brandColor: app?.accentColor ?? tenant.brandColor ?? '#0ea5a0',
    theme: themed?.theme ?? null,
    appName: app?.name ?? tenant.name,
    websiteUrl: app?.websiteUrl ?? null,
    questions: form.questions,
  });
});

// GET /v1/public/walls/:appSlug — public testimonial wall for a product
// (approved reviews only). Anyone can view it; the page offers a teal
// "Add a Review +" CTA that links to the product's published form.
publicRouter.get('/public/walls/:appSlug', (req, res) => {
  const app = DEMO.appBySlug(req.params.appSlug);
  const tenant = app ? DEMO.tenantOfApp(app.id) : undefined;
  if (!app || !tenant) throw notFound('Wall not found.');
  // Only approved reviews that are switched live render publicly — the live
  // toggle on the testimonials page pulls a review from every surface without
  // touching its moderation state.
  let approved = DEMO.testimonialsOfApp(app.id).filter((t) => t.status === 'approved' && t.visible !== false);
  // Content options saved with the design version (no-code builder).
  const o = app.designOptions ?? {};
  if (o.sort === 'highest') approved = approved.sort((a, b) => ((b.rating ?? 0) - (a.rating ?? 0)) || (a.createdAt < b.createdAt ? 1 : -1));
  else if (o.sort === 'oldest') approved = approved.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  else approved = approved.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (typeof o.ratingMin === 'number') approved = approved.filter((t) => (t.rating ?? 0) >= (o.ratingMin as number));
  if (typeof o.maxReviews === 'number') approved = approved.slice(0, o.maxReviews as number);
  const publishedForm = DEMO.formsOfApp(app.id).find((f) => f.published) ?? null;
  const themed = themeForApp(app.slug);

  // The product's widget: its saved (template-based) design rendered by the
  // embed iframe with live records. Products that never picked a template or
  // opened the studio still get the default one, so the embed always works.
  const savedSchema =
    app.studioSchema && typeof app.studioSchema === 'object' && !Array.isArray(app.studioSchema) ? app.studioSchema : null;
  const widgetSchema = savedSchema ?? JSON.parse(JSON.stringify(defaultWidgetTemplate().schema));
  const size = schemaCanvasSize(widgetSchema);
  const widgetName = (widgetSchema as { name?: unknown }).name;
  const widget = {
    templateId: savedSchema ? (app.designTemplateId ?? null) : defaultWidgetTemplate().id,
    name: typeof widgetName === 'string' && widgetName.trim() ? widgetName.trim() : defaultWidgetTemplate().name,
    width: size.width,
    height: size.height,
    schema: widgetSchema,
  };

  res.json({
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    brandColor: app.accentColor ?? tenant.brandColor ?? '#0ea5a0',
    logoUrl: tenant.logoUrl ?? null,
    theme: themed?.theme ?? null,
    design: app.widgetDesign ?? tenant.widgetDesign ?? 'classic',
    designTemplateId: app.designTemplateId ?? tenant.designTemplateId ?? null,
    designOptions: app.designOptions ?? null,
    designVersion: app.designVersion ?? 0,
    app: { id: app.id, name: app.name, slug: app.slug, websiteUrl: app.websiteUrl },
    form: publishedForm ? { slug: publishedForm.slug, name: publishedForm.name } : null,
    widget,
    testimonials: approved.map((t) => ({
      id: t.id,
      content: t.content,
      authorName: t.authorName ?? 'Anonymous visitor',
      rating: t.rating ?? null,
      createdAt: t.createdAt,
    })),
  });
});

// POST /v1/public/forms/:slug/submissions
publicRouter.post('/public/forms/:slug/submissions', (req, res) => {
  const form = DEMO.formBySlug(req.params.slug);
  const tenant = form ? DEMO.tenantOfApp(form.appId) : undefined;
  if (!form || !tenant || !form.published) throw notFound('Form not found.');

  const ratingQ = form.questions.find((q) => q.type === 'rating');
  const textQs = form.questions.filter((q) => q.type === 'text' || q.type === 'select');
  const answers = req.body?.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw badRequest('Invalid submission.');
  const answerMap = answers as Record<string, unknown>;

  // Write-time hygiene (DOC 6 §2.5 mass assignment / §4 PII): clamp ratings to
  // 1–5, cap every free-text field, and only ever read known question ids.
  const answerText = (id: string): string => (typeof answerMap[id] === 'string' ? (answerMap[id] as string).trim().slice(0, 2000) : '');
  let content = textQs
    .map((q) => answerText(q.id))
    .filter((v) => v.length > 0)
    .join(' — ')
    .slice(0, 5000);
  if (!content) content = `New ${form.name} submission`;

  const nameAnswer = answerMap.name ?? answerMap.name_role ?? answerMap.yourName;
  const authorName = (typeof nameAnswer === 'string' ? nameAnswer.trim().slice(0, 120) : '') || 'Anonymous visitor';

  const ratingRaw = ratingQ ? answerMap[ratingQ.id] : undefined;
  const rating = typeof ratingRaw === 'number' && Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, Math.round(ratingRaw))) : undefined;

  DEMO.addTestimonial({
    appId: form.appId,
    formId: form.id,
    content,
    authorName,
    rating,
    status: 'pending',
    tags: ['form'],
  });
  res.status(201).json({ ok: true });
});
