/**
 * DEV-ONLY local demo controller (see demo-data.ts header).
 *
 * Implements every REST route the merged website currently consumes so the
 * preview is fully clickable BEFORE the real Doc-3 controllers exist:
 *
 *   Auth          POST /v1/auth/login · /v1/platform/auth/login · /v1/auth/refresh
 *                 POST /v1/auth/mfa/verify · /v1/auth/onboarding · /v1/auth/invites/accept
 *                 GET  /v1/auth/me
 *   Tenant app    GET  /v1/dashboard/overview
 *                 GET/PATCH/DELETE /v1/apps/:appId/testimonials(+ tags/export/
 *                 :id/moderation/bulk/moderation/imports) · forms · widgets ·
 *                 api-keys · webhooks · /v1/team · /v1/audit-logs · /v1/billing
 *   Platform      GET/PATCH/DELETE /v1/platform/tenants(+ /:id/staff) ·
 *                 /v1/platform/overview · staff · billing · webhooks ·
 *                 audit-logs · ai/(providers|tasks|costs)
 *   Public        GET  /v1/public/forms/:slug · POST .../submissions
 *
 * In-memory + cookie-session based with per-tenant scoping (a tenant can
 * never read another app's data). Replace with the real Doc-3 slice when it
 * lands — response shapes below already match the frontend 1:1.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DEMO, DemoSessions, type DemoFormQuestion, type DemoRole, type DemoTestimonial, type DemoTenant } from './demo-data';

const SESSION_COOKIE = 'sid';

function secureCookie(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] ?? '');
  if (proto.split(',')[0]?.trim() === 'https') return true;
  const host = String(req.headers.host ?? '');
  return !/(localhost|127\.0\.0\.1|\[::1\])/.test(host);
}

interface Paging {
  status?: string;
  q?: string;
  perPage?: number;
  page?: number;
}

const MODERATION_TO_STATUS: Record<string, DemoTestimonial['status']> = {
  approve: 'approved',
  reject: 'rejected',
  archive: 'archived',
};

const PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  owner: ['testimonials.read', 'testimonials.write', 'testimonials.moderate', 'forms.manage', 'widgets.manage', 'team.manage', 'webhooks.manage', 'billing.view', 'settings.manage', 'audit.read'],
  admin: ['testimonials.read', 'testimonials.write', 'testimonials.moderate', 'forms.manage', 'widgets.manage', 'team.manage', 'webhooks.manage', 'billing.view', 'settings.manage', 'audit.read'],
  editor: ['testimonials.read', 'testimonials.write', 'forms.manage', 'widgets.manage'],
  viewer: ['testimonials.read', 'audit.read'],
};

@Controller()
export class DemoController {
  private readonly sessions = new DemoSessions();

  // =========================================================================
  // Auth
  // =========================================================================
  @Post('auth/login')
  @HttpCode(200)
  companyLogin(
    @Body() body: { email?: string; password?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = this.companyUser(body?.email, body?.password);
    const sid = this.sessions.create('company', user.email);
    this.setCookie(res, req, sid);
    return { requiresMfa: false, user: { email: user.email }, token: sid };
  }

  @Post('platform/auth/login')
  @HttpCode(200)
  platformLogin(
    @Body() body: { email?: string; password?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = DEMO.platformUsers().find((u) => u.email === body?.email?.toLowerCase().trim() && u.password === body?.password);
    if (!user) throw new BadRequestException('Invalid email or password.');
    const sid = this.sessions.create('platform', user.email);
    this.setCookie(res, req, sid);
    return { requiresMfa: false, user: { email: user.email }, token: sid };
  }

  @Post('auth/mfa/verify')
  @HttpCode(200)
  mfaVerify(
    @Body() body: { email?: string; code?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = this.findCompanyUser(body?.email);
    if (!user) throw new BadRequestException('Unknown account.');
    if (!body?.code || !/^\d{6}$/.test(body.code)) throw new BadRequestException('Invalid verification code.');
    const sid = this.sessions.create('company', user.email);
    this.setCookie(res, req, sid);
    return { requiresMfa: false, user: { email: user.email }, token: sid };
  }

  @Post('auth/refresh')
  @HttpCode(200)
  refresh(@Req() req: Request) {
    if (!this.session(req)) throw new UnauthorizedException('No active session.');
    return { ok: true };
  }

  @Post('auth/onboarding')
  @HttpCode(200)
  onboarding(
    @Body() body: { token?: string; name?: string; password?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.token) throw new BadRequestException('Missing invite token.');
    const user = this.findCompanyUser('owner@acme.test');
    if (!user) throw new BadRequestException('Invalid invite token.');
    const sid = this.sessions.create('company', user.email);
    this.setCookie(res, req, sid);
    return { user: { email: user.email }, token: sid };
  }

  @Post('auth/invites/accept')
  @HttpCode(200)
  acceptInvite(
    @Body() body: { token?: string; name?: string; password?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.token) throw new BadRequestException('Missing invite token.');
    const user = this.findCompanyUser('owner@acme.test');
    if (!user) throw new BadRequestException('Invalid invite token.');
    const sid = this.sessions.create('company', user.email);
    this.setCookie(res, req, sid);
    return { user: { email: user.email }, token: sid };
  }

  @Get('auth/me')
  me(@Req() req: Request) {
    const session = this.session(req);
    if (!session) throw new UnauthorizedException('No active session.');
    if (session.kind === 'platform') {
      const user = DEMO.platformUsers().find((u) => u.email === session.email)!;
      return {
        user: { id: user.id, email: user.email, name: user.name, avatarUrl: null, role: user.role },
        tenant: null,
        permissions: [],
        permissionsVersion: 1,
        impersonating: null,
      };
    }
    const raw = DEMO.companyUsers().find((u) => u.email === session.email);
    if (!raw) throw new UnauthorizedException('No active session.');
    const tenant = DEMO.tenantForUser(raw);
    return {
      user: { id: raw.id, email: raw.email, name: raw.name, avatarUrl: null, role: raw.role },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        appId: tenant.appId,
        brandColor: tenant.brandColor,
      },
      permissions: PERMISSIONS_BY_ROLE[raw.role] ?? [],
      permissionsVersion: 1,
      impersonating: null,
    };
  }

  // =========================================================================
  // Tenant dashboard
  // =========================================================================
  @Get('dashboard/overview')
  dashboardOverview(@Query('appId') appId: string | undefined, @Req() req: Request) {
    const rows = this.rowsForApp(req, appId ?? this.appOfSession(req));
    return {
      totalPending: rows.filter((r) => r.status === 'pending').length,
      totalApproved: rows.filter((r) => r.status === 'approved').length,
      totalRejected: rows.filter((r) => r.status === 'rejected').length,
      totalTestimonials: rows.length,
      conversionRate: rows.length ? 42 : undefined,
    };
  }

  // ---- testimonials -------------------------------------------------------
  @Get('apps/:appId/testimonials/tags')
  testimonialTags(@Param('appId') appId: string, @Req() req: Request) {
    const rows = this.rowsForApp(req, appId);
    return { tags: [...new Set(rows.flatMap((r) => r.tags))].sort() };
  }

  @Get('apps/:appId/testimonials/export')
  testimonialExport(@Param('appId') appId: string, @Req() req: Request) {
    const rows = this.rowsForApp(req, appId);
    const csv = ['id,author,rating,status,content']
      .concat(rows.map((r) => [r.id, r.authorName ?? 'Anonymous', r.rating ?? '', r.status, `"${r.content.replace(/"/g, '""')}"`].join(',')))
      .join('\n');
    return { downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}` };
  }

  @Post('apps/:appId/testimonials/bulk/moderation')
  @HttpCode(200)
  bulkModeration(
    @Param('appId') appId: string,
    @Body() body: { ids?: string[]; action?: string },
    @Req() req: Request,
  ) {
    this.requirePermission(req, 'testimonials.moderate');
    const rows = this.rowsForApp(req, appId);
    const action = body?.action ?? '';
    const status = MODERATION_TO_STATUS[action];
    if (!status) throw new BadRequestException('Invalid moderation action.');
    for (const row of rows) {
      if (body?.ids?.includes(row.id) && row.status === 'pending') row.status = status;
    }
    return { ok: true };
  }

  @Patch('apps/:appId/testimonials/:id/moderation')
  @HttpCode(200)
  moderateOne(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Body() body: { action?: string; reason?: string },
    @Req() req: Request,
  ) {
    this.requirePermission(req, 'testimonials.moderate');
    const row = this.rowOr404(req, appId, id);
    const action = body?.action ?? '';
    const status = MODERATION_TO_STATUS[action];
    if (!status) throw new BadRequestException('Invalid moderation action.');
    if (action === 'reject' && !body.reason) throw new BadRequestException('Rejection reason is required.');
    row.status = status;
    row.tags = action === 'reject' ? [...row.tags, 'rejected'] : row.tags;
    return { ok: true };
  }

  @Delete('apps/:appId/testimonials/:id')
  @HttpCode(200)
  deleteOne(@Param('appId') appId: string, @Param('id') id: string, @Req() req: Request) {
    this.requirePermission(req, 'testimonials.moderate');
    this.rowOr404(req, appId, id); // scope check (404 if not this tenant's app)
    DEMO.deleteTestimonial(id);
    return { ok: true };
  }

  @Patch('apps/:appId/testimonials/:id')
  @HttpCode(200)
  tagOne(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Body() body: { tags?: string[] },
    @Req() req: Request,
  ) {
    this.requirePermission(req, 'testimonials.write');
    const row = this.rowOr404(req, appId, id);
    if (!Array.isArray(body?.tags)) throw new BadRequestException('tags must be an array.');
    row.tags = body.tags;
    return { ok: true };
  }

  @Get('apps/:appId/testimonials')
  appTestimonials(
    @Param('appId') appId: string,
    @Query() query: Paging,
    @Req() req: Request,
  ) {
    const scoped = this.rowsForApp(req, appId);
    const status = query.status && query.status !== 'all' ? query.status : null;
    const q = query.q?.trim().toLowerCase();
    let out = scoped;
    if (status) out = out.filter((r) => r.status === status);
    if (q) out = out.filter((r) => `${r.authorName ?? ''} ${r.content} ${r.tags.join(' ')}`.toLowerCase().includes(q));
    const sorted = [...out].sort((a, b) => (a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1));
    const perPage = Math.min(Math.max(Number(query.perPage ?? 50) || 50, 1), 200);
    const page = Math.max(Number(query.page ?? 1) || 1, 1);
    return { rows: sorted.slice((page - 1) * perPage, page * perPage), total: sorted.length };
  }

  @Get('apps/:appId/testimonials/:id')
  testimonialDetail(@Param('appId') appId: string, @Param('id') id: string, @Req() req: Request) {
    return this.rowOr404(req, appId, id);
  }

  // ---- imports ------------------------------------------------------------
  @Get('apps/:appId/imports')
  importList(@Param('appId') appId: string, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    return { rows: DEMO.importsOfApp(appId) };
  }

  @Post('apps/:appId/imports')
  @HttpCode(201)
  importCreate(@Param('appId') appId: string, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    this.requirePermission(req, 'testimonials.write');
    const job = DEMO.enqueueImport(appId, 'upload.csv');
    return job;
  }

  // ---- forms --------------------------------------------------------------
  @Get('apps/:appId/forms')
  formList(@Param('appId') appId: string, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    const rows = DEMO.formsOfApp(appId).map((f) => ({
      id: f.id, appId: f.appId, name: f.name, slug: f.slug, published: f.published,
      submissionCount: f.submissionCount, createdAt: f.createdAt,
    }));
    return { rows };
  }

  @Get('apps/:appId/forms/:formId/stats')
  formStats(@Param('appId') appId: string, @Param('formId') formId: string, @Req() req: Request) {
    const form = this.formOr404(req, appId, formId);
    return { submissions: form.submissionCount, completionRate: 68, avgRating: 4.6 };
  }

  @Get('apps/:appId/forms/:formId')
  formDetail(@Param('appId') appId: string, @Param('formId') formId: string, @Req() req: Request) {
    return this.formOr404(req, appId, formId);
  }

  @Post('apps/:appId/forms')
  @HttpCode(201)
  formCreate(@Param('appId') appId: string, @Body() body: FormSaveBody, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    this.requirePermission(req, 'forms.manage');
    const name = body?.name?.trim() || 'Untitled form';
    const slug = body?.slug?.trim() || slugify(name);
    return DEMO.saveForm(appId, {
      name,
      slug,
      published: body?.published ?? false,
      questions: normalizeQuestions(body?.questions),
    });
  }

  @Post('apps/:appId/forms/:formId')
  @HttpCode(200)
  formUpdate(@Param('appId') appId: string, @Param('formId') formId: string, @Body() body: FormSaveBody, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    this.requirePermission(req, 'forms.manage');
    const existing = this.formOr404(req, appId, formId);
    const name = body?.name?.trim() || existing.name;
    return DEMO.saveForm(appId, {
      id: formId,
      name,
      slug: body?.slug?.trim() || existing.slug,
      published: body?.published ?? existing.published,
      questions: normalizeQuestions(body?.questions ?? existing.questions),
    });
  }

  @Patch('apps/:appId/forms/:formId')
  @HttpCode(200)
  formPublish(@Param('appId') appId: string, @Param('formId') formId: string, @Body() body: { published?: boolean }, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    this.requirePermission(req, 'forms.manage');
    const form = DEMO.setFormPublished(formId, Boolean(body?.published));
    if (!form) throw new NotFoundException('Form not found.');
    return form;
  }

  // ---- widgets ------------------------------------------------------------
  @Get('apps/:appId/widgets')
  widgetList(@Param('appId') appId: string, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    return { rows: DEMO.widgetsOfApp(appId) };
  }

  @Get('apps/:appId/widgets/:widgetId')
  widgetDetail(@Param('appId') appId: string, @Param('widgetId') widgetId: string, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    const w = DEMO.findWidget(appId, widgetId);
    if (!w) throw new NotFoundException('Widget not found.');
    return w;
  }

  @Post('apps/:appId/widgets')
  @HttpCode(201)
  widgetCreate(@Param('appId') appId: string, @Body() body: WidgetSaveBody, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    this.requirePermission(req, 'widgets.manage');
    const name = body?.name?.trim() || 'Untitled widget';
    return DEMO.saveWidget(appId, {
      name,
      formId: body?.formId ?? null,
      enabled: body?.enabled ?? false,
      theme: body?.theme ?? 'light',
      accentColor: body?.accentColor ?? '#6366F1',
      embedType: body?.embedType ?? 'script',
    });
  }

  @Post('apps/:appId/widgets/:widgetId')
  @HttpCode(200)
  widgetUpdate(@Param('appId') appId: string, @Param('widgetId') widgetId: string, @Body() body: WidgetSaveBody, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    this.requirePermission(req, 'widgets.manage');
    const existing = DEMO.findWidget(appId, widgetId);
    if (!existing) throw new NotFoundException('Widget not found.');
    return DEMO.saveWidget(appId, {
      id: widgetId,
      name: body?.name?.trim() || existing.name,
      formId: body?.formId ?? existing.formId,
      enabled: body?.enabled ?? existing.enabled,
      theme: body?.theme ?? existing.theme,
      accentColor: body?.accentColor ?? existing.accentColor,
      embedType: body?.embedType ?? existing.embedType,
    });
  }

  @Patch('apps/:appId/widgets/:widgetId')
  @HttpCode(200)
  widgetToggle(@Param('appId') appId: string, @Param('widgetId') widgetId: string, @Body() body: { enabled?: boolean }, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    this.requirePermission(req, 'widgets.manage');
    const w = DEMO.setWidgetEnabled(widgetId, Boolean(body?.enabled));
    if (!w) throw new NotFoundException('Widget not found.');
    return w;
  }

  // ---- api keys -----------------------------------------------------------
  @Get('apps/:appId/api-keys')
  apiKeyList(@Param('appId') appId: string, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    return { rows: DEMO.apiKeysOfApp(appId) };
  }

  @Post('apps/:appId/api-keys')
  @HttpCode(201)
  apiKeyCreate(@Param('appId') appId: string, @Body() body: { name?: string; scopes?: string[] }, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    if (!body?.name) throw new BadRequestException('Key name is required.');
    return DEMO.createApiKey(appId, body.name, body.scopes ?? ['testimonials.read']);
  }

  @Post('apps/:appId/api-keys/:keyId/rotate')
  @HttpCode(200)
  apiKeyRotate(@Param('appId') appId: string, @Param('keyId') keyId: string, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    const k = DEMO.rotateApiKey(keyId);
    if (!k) throw new NotFoundException('API key not found.');
    return k;
  }

  // ---- webhooks (tenant) --------------------------------------------------
  @Get('apps/:appId/webhooks')
  webhookList(@Param('appId') appId: string, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    return { rows: DEMO.webhooksOfApp(appId) };
  }

  @Get('apps/:appId/webhooks/:webhookId/deliveries')
  webhookDeliveries(@Param('appId') appId: string, @Param('webhookId') webhookId: string, @Req() req: Request) {
    this.requireTenantOfApp(req, appId);
    const wh = DEMO.webhooksOfApp(appId).find((w) => w.id === webhookId);
    if (!wh) throw new NotFoundException('Webhook not found.');
    return { rows: DEMO.deliveriesForWebhook(webhookId) };
  }

  // ---- team ---------------------------------------------------------------
  @Get('team')
  teamList(@Req() req: Request) {
    const tenant = this.tenantOfSession(req);
    return { rows: DEMO.teamOfTenant(tenant.id) };
  }

  @Post('team/invites')
  @HttpCode(201)
  teamInvite(@Body() body: { email?: string; role?: DemoRole }, @Req() req: Request) {
    const tenant = this.tenantOfSession(req);
    this.requirePermission(req, 'team.manage');
    if (!body?.email) throw new BadRequestException('Email is required.');
    const member = DEMO.inviteTeamMember(tenant.id, body.email.toLowerCase(), body.role ?? 'viewer');
    return { member };
  }

  @Patch('team/:memberId')
  @HttpCode(200)
  teamPatch(@Param('memberId') memberId: string, @Body() body: { role?: DemoRole; status?: string }, @Req() req: Request) {
    const tenant = this.tenantOfSession(req);
    this.requirePermission(req, 'team.manage');
    const member = DEMO.teamOfTenant(tenant.id).find((m) => m.id === memberId);
    if (!member) throw new NotFoundException('Member not found.');
    if (body.role) member.role = body.role;
    if (body.status) member.status = body.status as typeof member.status;
    return member;
  }

  // ---- audit + billing (tenant) ------------------------------------------
  @Get('audit-logs')
  tenantAudit(@Query() query: Paging, @Req() req: Request) {
    this.requireCompany(req);
    const rows = this.paginate(DEMO.tenantAuditEntries().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), query);
    return { rows, total: rows.length };
  }

  @Get('billing')
  tenantBilling(@Req() req: Request) {
    const tenant = this.tenantOfSession(req);
    return DEMO.billingForTenant(tenant);
  }

  // =========================================================================
  // Platform console
  // =========================================================================
  @Get('platform/overview')
  platformOverview(@Req() req: Request) {
    this.requirePlatform(req);
    return DEMO.mrrs();
  }

  @Get('platform/tenants')
  platformTenants(@Query() query: Paging, @Req() req: Request) {
    this.requirePlatform(req);
    const status = query.status && query.status !== 'all' ? query.status : null;
    const q = query.q?.trim().toLowerCase();
    let rows = DEMO.allTenants().map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      testimonialCount: DEMO.testimonialsOfApp(t.appId).length,
      createdAt: t.createdAt,
    }));
    if (status) rows = rows.filter((r) => r.status === status);
    if (q) rows = rows.filter((r) => `${r.name} ${r.slug} ${r.plan}`.toLowerCase().includes(q));
    const perPage = Math.min(Math.max(Number(query.perPage ?? 50) || 50, 1), 200);
    const page = Math.max(Number(query.page ?? 1) || 1, 1);
    return { rows: rows.slice((page - 1) * perPage, page * perPage), total: rows.length };
  }

  @Get('platform/tenants/:tenantId')
  platformTenantDetail(@Param('tenantId') tenantId: string, @Req() req: Request) {
    this.requirePlatform(req);
    const t = DEMO.tenantById(tenantId);
    if (!t) throw new NotFoundException('Tenant not found.');
    return DEMO.tenantStatusForDetail(t);
  }

  @Get('platform/tenants/:tenantId/staff')
  platformTenantStaff(@Param('tenantId') tenantId: string, @Req() req: Request) {
    this.requirePlatform(req);
    const t = DEMO.tenantById(tenantId);
    if (!t) throw new NotFoundException('Tenant not found.');
    return { rows: DEMO.teamOfTenant(t.id) };
  }

  @Patch('platform/tenants/:tenantId')
  @HttpCode(200)
  platformTenantPatch(
    @Param('tenantId') tenantId: string,
    @Body() body: { plan?: string; status?: string },
    @Req() req: Request,
  ) {
    this.requirePlatform(req);
    const t = DEMO.tenantById(tenantId);
    if (!t) throw new NotFoundException('Tenant not found.');
    if (body.plan && ['starter', 'growth', 'scale'].includes(body.plan)) t.plan = body.plan as DemoTenant['plan'];
    if (body.status && ['active', 'suspended', 'trialing'].includes(body.status)) t.status = body.status as DemoTenant['status'];
    return DEMO.tenantStatusForDetail(t);
  }

  @Delete('platform/tenants/:tenantId')
  @HttpCode(200)
  platformTenantDelete(@Param('tenantId') tenantId: string, @Query('confirm') confirm: string, @Req() req: Request) {
    this.requirePlatform(req);
    const t = DEMO.tenantById(tenantId);
    if (!t) throw new NotFoundException('Tenant not found.');
    if (confirm !== 'true' && confirm !== '1') throw new BadRequestException('Confirmation is required to delete a tenant.');
    t.status = 'suspended'; // dev demo: never hard-deletes the only seeded tenants
    return { ok: true };
  }

  @Get('platform/staff')
  platformStaff(@Req() req: Request) {
    this.requirePlatform(req);
    return { rows: DEMO.platformStaff() };
  }

  @Get('platform/billing')
  platformBilling(@Req() req: Request) {
    this.requirePlatform(req);
    return { monthlyMrrUsd: DEMO.mrrs().monthlyMrrUsd, invoices: DEMO.invoices() };
  }

  @Get('platform/webhooks')
  platformWebhooks(@Req() req: Request) {
    this.requirePlatform(req);
    return { rows: DEMO.platformWebhooks() };
  }

  @Get('platform/audit-logs')
  platformAudit(@Query() query: Paging, @Req() req: Request) {
    this.requirePlatform(req);
    const rows = this.paginate(DEMO.platformAuditEntries().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), query);
    return { rows, total: rows.length };
  }

  @Get('platform/ai/providers')
  aiProviders(@Req() req: Request) {
    this.requirePlatform(req);
    return { rows: DEMO.aiProviders() };
  }

  @Patch('platform/ai/providers/:providerId')
  @HttpCode(200)
  aiProviderToggle(@Param('providerId') providerId: string, @Body() body: { enabled?: boolean }, @Req() req: Request) {
    this.requirePlatform(req);
    const p = DEMO.setAiProviderEnabled(providerId, Boolean(body?.enabled));
    if (!p) throw new NotFoundException('Provider not found.');
    return p;
  }

  @Get('platform/ai/tasks')
  aiTasks(@Query() query: Paging, @Req() req: Request) {
    this.requirePlatform(req);
    const rows = this.paginate(DEMO.aiTasks().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), query);
    return { rows, total: rows.length };
  }

  @Get('platform/ai/costs')
  aiCosts(@Req() req: Request) {
    this.requirePlatform(req);
    const costs = DEMO.aiCosts();
    return { period: '2026-09', totalUsd: costs.totalUsd, byProvider: costs.byProvider };
  }

  // =========================================================================
  // Public (no session)
  // =========================================================================
  @Get('public/forms/:slug')
  publicForm(@Param('slug') slug: string) {
    const form = DEMO.formBySlug(slug);
    const tenant = form ? DEMO.tenantByAppId(form.appId) : undefined;
    if (!form || !tenant || !form.published) throw new NotFoundException('Form not found.');
    return {
      id: form.id,
      slug: form.slug,
      name: form.name,
      tenantName: tenant.name,
      logoUrl: null,
      brandColor: tenant.brandColor ?? '#6366F1',
      questions: form.questions,
    };
  }

  @Post('public/forms/:slug/submissions')
  @HttpCode(201)
  publicSubmission(
    @Param('slug') slug: string,
    @Body() body: { answers?: Record<string, unknown>; captchaToken?: string },
  ) {
    const form = DEMO.formBySlug(slug);
    const tenant = form ? DEMO.tenantByAppId(form.appId) : undefined;
    if (!form || !tenant || !form.published) throw new NotFoundException('Form not found.');

    const ratingQ = form.questions.find((q) => q.type === 'rating');
    const textQs = form.questions.filter((q) => q.type === 'text' || q.type === 'select');
    const answers = body?.answers ?? {};
    let content = textQs.map((q) => answers[q.id]).filter((v) => typeof v === 'string' && v).join(' — ');
    if (!content) content = `New ${form.name} submission`;
    const nameAnswer = answers.name ?? answers.name_role ?? answers.yourName;
    const ratingAnswer = ratingQ ? answers[ratingQ.id] : undefined;
    DEMO.addTestimonial({
      appId: form.appId,
      formId: form.id,
      content,
      authorName: typeof nameAnswer === 'string' && nameAnswer ? nameAnswer : 'Anonymous visitor',
      rating: typeof ratingAnswer === 'number' ? ratingAnswer : undefined,
      status: 'pending',
      tags: ['form'],
    });
    return { ok: true };
  }

  // =========================================================================
  // helpers
  // =========================================================================
  private paginate<T>(rows: T[], query: Paging): T[] {
    const perPage = Math.min(Math.max(Number(query.perPage ?? 50) || 50, 1), 200);
    const page = Math.max(Number(query.page ?? 1) || 1, 1);
    return rows.slice((page - 1) * perPage, page * perPage);
  }

  private setCookie(res: Response, req: Request, sid: string): void {
    const secure = secureCookie(req);
    res.cookie(SESSION_COOKIE, sid, {
      httpOnly: true,
      sameSite: secure ? 'none' : 'lax',
      secure,
      path: '/',
    });
  }

  private bearerToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length).trim() || undefined;
  }

  private readSid(req: Request): string | undefined {
    // Primary: session token via Authorization header (survives embedded
    // iframe previews where third-party cookies are blocked). Fallback: the
    // HttpOnly sid cookie for same-origin browsing.
    const bearer = this.bearerToken(req);
    if (bearer) return bearer;
    const header = req.headers.cookie ?? '';
    for (const part of header.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === SESSION_COOKIE) return v.join('=');
    }
    return undefined;
  }

  private session(req: Request): { kind: 'company' | 'platform'; email: string } | null {
    return this.sessions.resolve(this.readSid(req));
  }

  private findCompanyUser(email: string | undefined): DemoUserLite | undefined {
    return this.userLite(DEMO.companyUsers().find((u) => u.email === email?.toLowerCase().trim()));
  }

  private companyUser(email: string | undefined, password: string | undefined): DemoUserLite {
    const user = DEMO.companyUsers().find((u) => u.email === email?.toLowerCase().trim() && u.password === password);
    if (!user) throw new BadRequestException('Invalid email or password.');
    return this.userLite(user)!;
  }

  private userLite(u?: { id: string; email: string; name: string; role: string }): DemoUserLite | undefined {
    if (!u) return undefined;
    return { id: u.id, email: u.email, name: u.name, role: u.role as DemoUserLite['role'] };
  }

  private requireCompany(req: Request): DemoUserLite {
    const session = this.session(req);
    if (!session || session.kind !== 'company') throw new UnauthorizedException('No active session.');
    const user = DEMO.companyUsers().find((u) => u.email === session.email);
    if (!user) throw new UnauthorizedException('No active session.');
    return this.userLite(user)!;
  }

  private requireCompanyUser(email: string): DemoUserLite {
    const user = DEMO.companyUsers().find((u) => u.email === email);
    if (!user) throw new UnauthorizedException('No active session.');
    return this.userLite(user)!;
  }

  private requirePlatform(req: Request): void {
    const session = this.session(req);
    if (!session || session.kind !== 'platform') throw new UnauthorizedException('No active session.');
  }

  private tenantOfSession(req: Request): DemoTenant {
    const user = DEMO.companyUsers().find((u) => u.email === this.requireCompany(req).email)!;
    return DEMO.tenantForUser(user);
  }

  private appOfSession(req: Request): string {
    return this.tenantOfSession(req).appId;
  }

  /** Returns the tenant user's app rows; foreign appIds resolve to [] (never leak). */
  private rowsForApp(req: Request, appId: string): DemoTestimonial[] {
    if (appId !== this.appOfSession(req)) return [];
    return DEMO.testimonialsOfApp(appId);
  }

  private requireTenantOfApp(req: Request, appId: string): DemoTenant {
    const tenant = this.tenantOfSession(req);
    if (tenant.appId !== appId) throw new NotFoundException('App not found.');
    return tenant;
  }

  private requirePermission(req: Request, permission: string): void {
    const user = this.requireCompany(req);
    const perms = PERMISSIONS_BY_ROLE[user.role] ?? [];
    if (!perms.includes(permission)) throw new UnauthorizedException('You do not have permission to do that.');
  }

  private rowOr404(req: Request, appId: string, id: string): DemoTestimonial {
    const row = this.rowsForApp(req, appId).find((r) => r.id === id);
    if (!row) throw new NotFoundException('Testimonial not found.');
    return row;
  }

  private formOr404(req: Request, appId: string, formId: string) {
    const form = DEMO.findForm(appId, formId);
    if (!form) throw new NotFoundException('Form not found.');
    return form;
  }
}

interface DemoUserLite {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'platform_owner';
}

interface RawQuestion {
  id?: string;
  type?: string;
  label?: string;
  required?: boolean;
  options?: string[];
}

interface FormSaveBody {
  name?: string;
  slug?: string;
  published?: boolean;
  questions?: RawQuestion[];
}

interface WidgetSaveBody {
  id?: string;
  formId?: string | null;
  name?: string;
  enabled?: boolean;
  theme?: 'light' | 'dark';
  accentColor?: string;
  embedType?: 'script' | 'iframe' | 'react';
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'untitled-form'
  );
}

const QUESTION_TYPES = new Set(['text', 'rating', 'video', 'select']);

function normalizeQuestions(raw?: RawQuestion[]): DemoFormQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((q, idx) => ({
    id: q.id ?? `q${idx + 1}`,
    type: (QUESTION_TYPES.has(q.type ?? '') ? q.type : 'text') as DemoFormQuestion['type'],
    label: q.label?.trim() || `Question ${idx + 1}`,
    required: Boolean(q.required),
    options: Array.isArray(q.options) ? q.options : undefined,
  }));
}
