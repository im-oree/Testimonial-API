/**
 * DEV-ONLY local demo store (2026-09-08).
 *
 * Temporary "local storage" so the entire website is testable end-to-end
 * before the Doc-3 REST routes + repositories exist. It is a mutable,
 * in-memory seed of the exact response shapes the UI already consumes
 * (see apps/web/lib/tenant-types.ts, platform-types.ts, public-types.ts),
 * enforced per-tenant scoping, so swapping it for the real engine later
 * changes ZERO frontend code. Every endpoint lives in demo.controller.ts.
 *
 * REMOVE this module when the real Doc-3 routes + repositories are wired.
 */
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types (shape-compatible with the frontend contracts)
// ---------------------------------------------------------------------------
export type DemoRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type TestimonialStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: DemoRole | 'platform_owner';
  tenantId?: string;
}

export interface DemoTenant {
  id: string;
  name: string;
  slug: string;
  appId: string;
  brandColor: string | null;
  plan: 'starter' | 'growth' | 'scale';
  status: 'active' | 'suspended' | 'trialing';
  createdAt: string;
  ownerEmail: string;
  seatsUsed: number;
  seatsLimit: number;
  appName: string;
}

export interface DemoTestimonial {
  id: string;
  appId: string;
  formId?: string | null;
  content: string;
  authorName?: string | null;
  rating?: number;
  status: TestimonialStatus;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  mediaUrl?: string | null;
}

export interface DemoFormQuestion {
  id: string;
  type: 'text' | 'rating' | 'video' | 'select';
  label: string;
  required: boolean;
  options?: string[];
}

export interface DemoForm {
  id: string;
  appId: string;
  name: string;
  slug: string;
  published: boolean;
  submissionCount: number;
  createdAt: string;
  questions: DemoFormQuestion[];
}

export interface DemoWidget {
  id: string;
  appId: string;
  formId: string | null;
  name: string;
  enabled: boolean;
  theme: 'light' | 'dark';
  accentColor: string;
  embedType: 'script' | 'iframe' | 'react';
  updatedAt: string;
  fontFamily?: string;
  title?: string;
  ctaText?: string;
  embedCode?: Record<string, string>;
}

export interface DemoTeamMember {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: DemoRole;
  status: 'active' | 'invited' | 'suspended';
  lastActiveAt?: string;
}

export interface DemoWebhook {
  id: string;
  appId: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secretMasked?: string;
}

export interface DemoWebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: 'success' | 'failed' | 'retrying';
  statusCode?: number;
  attemptedAt: string;
}

export interface DemoAuditEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  ip?: string;
  createdAt: string;
  appId?: string;
}

export interface DemoApiKey {
  id: string;
  appId: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  scopes: string[];
}

export interface DemoImportJob {
  id: string;
  appId: string;
  fileName: string;
  status: 'queued' | 'mapping' | 'processing' | 'done' | 'failed';
  totalRows?: number;
  importedRows?: number;
  createdAt: string;
}

export interface DemoInvoice {
  id: string;
  tenantName: string;
  amountUsd: number;
  status: 'paid' | 'open' | 'past_due';
  createdAt: string;
}

export interface DemoPlatformStaff {
  id: string;
  name: string;
  email: string;
  role: 'platform_admin' | 'platform_support';
  status: 'active' | 'invited' | 'suspended';
  lastActiveAt?: string;
}

export interface DemoAiProvider {
  id: string;
  name: string;
  models: string[];
  enabled: boolean;
  defaultModel?: string;
}

export interface DemoAiTask {
  id: string;
  provider: string;
  operation: 'classify' | 'summarize' | 'flag';
  status: 'success' | 'failed' | 'skipped';
  latencyMs?: number;
  costUsd?: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Seed content pools
// ---------------------------------------------------------------------------
const AUTHORS = [
  'Sara Okafor', 'Miguel Herrera', 'Aisha Bello', 'Tom Becker', 'Lena Fischer',
  'Chidi Nwosu', 'Priya Sharma', 'Dan Costa', 'Ngozi Eze', 'Owen Murphy',
];
const COMPLIMENTS = [
  'Absolutely love it — onboarding took minutes and support is superb.',
  'The widget matches our brand perfectly and loads fast on mobile.',
  'Collected 40+ video testimonials in the first month. Game changer.',
  'Moderation queue is exactly what our legal team asked for.',
  'Our conversion rate on the testimonial wall is up noticeably.',
  'Clean API, clear docs, no surprises. Integrations were painless.',
  'Customers actually submit more now that it takes 20 seconds.',
  'Great tooling for agencies running multiple client sites.',
];
const PENDING_TEXT = [
  'Pending review — please moderate this submission.',
  'New submission waiting for approval.',
];
const MONTHLY_BY_PLAN: Record<DemoTenant['plan'], number> = { starter: 29, growth: 99, scale: 299 };

// ---------------------------------------------------------------------------
// Tenants + users
// ---------------------------------------------------------------------------
const TENANTS: DemoTenant[] = [
  {
    id: 'tenant-acme', name: 'Acme Inc', slug: 'acme', appId: 'app-acme-1', brandColor: '#FF5733',
    plan: 'starter', status: 'active', createdAt: '2026-08-01T09:00:00.000Z',
    ownerEmail: 'owner@acme.test', seatsUsed: 3, seatsLimit: 5, appName: 'Acme Marketing Site',
  },
  {
    id: 'tenant-lumen', name: 'Lumen Labs', slug: 'lumen', appId: 'app-lumen-1', brandColor: '#6366F1',
    plan: 'growth', status: 'active', createdAt: '2026-06-15T08:00:00.000Z',
    ownerEmail: 'hello@lumen.test', seatsUsed: 8, seatsLimit: 15, appName: 'Lumen App',
  },
  {
    id: 'tenant-nordic', name: 'Nordic Peak', slug: 'nordicpeak', appId: 'app-nordic-1', brandColor: '#10B981',
    plan: 'starter', status: 'trialing', createdAt: '2026-08-28T12:00:00.000Z',
    ownerEmail: 'hi@nordicpeak.test', seatsUsed: 3, seatsLimit: 5, appName: 'Nordic Peak Store',
  },
];

const USERS: DemoUser[] = [
  { id: 'u-owner', email: 'owner@acme.test', password: 'demo1234', name: 'Ada Owner', role: 'owner', tenantId: 'tenant-acme' },
  { id: 'u-editor', email: 'editor@acme.test', password: 'demo1234', name: 'Eden Editor', role: 'editor', tenantId: 'tenant-acme' },
  { id: 'u-viewer', email: 'chris@acme.test', password: 'demo1234', name: 'Chris Viewer', role: 'viewer', tenantId: 'tenant-acme' },
  { id: 'u-admin', email: 'admin@zojatech.test', password: 'demo1234', name: 'Zojatech Admin', role: 'platform_owner' },
];

const OWNER_PERMISSIONS = [
  'testimonials.read', 'testimonials.write', 'testimonials.moderate',
  'forms.manage', 'widgets.manage', 'team.manage', 'webhooks.manage',
  'billing.view', 'settings.manage', 'audit.read',
];
const EDITOR_PERMISSIONS = ['testimonials.read', 'testimonials.write', 'forms.manage', 'widgets.manage'];

function permissionsFor(role: DemoRole | 'platform_owner'): string[] {
  if (role === 'owner' || role === 'admin') return [...OWNER_PERMISSIONS];
  if (role === 'editor') return [...EDITOR_PERMISSIONS];
  if (role === 'viewer') return ['testimonials.read', 'audit.read'];
  return [];
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------
function dayIso(dayOfSep: number): string {
  return new Date(Date.UTC(2026, 8, dayOfSep)).toISOString();
}

function seedTestimonials(): DemoTestimonial[] {
  const rows: DemoTestimonial[] = [];
  let i = 0;
  const push = (t: Omit<DemoTestimonial, 'createdAt' | 'updatedAt'> & { day: number }): void => {
    const { day, ...rest } = t;
    rows.push({ ...rest, createdAt: dayIso(day), updatedAt: dayIso(day) });
  };
  const gen = (appId: string, approved: number, pending: number, rejected: number): void => {
    let n = 0;
    for (; n < approved; n += 1) {
      push({
        id: `t-${appId}-a-${n}`, appId,
        authorName: AUTHORS[(i + n) % AUTHORS.length],
        content: COMPLIMENTS[(i + n) % COMPLIMENTS.length],
        rating: 4 + ((i + n) % 2), // 4 or 5
        status: 'approved',
        tags: (i + n) % 2 === 0 ? ['website', 'product'] : ['video-ready'],
        day: 1 + ((i + n) % 8),
      });
    }
    for (let p = 0; p < pending; p += 1) {
      push({
        id: `t-${appId}-p-${p}`, appId,
        authorName: AUTHORS[(i + n + p) % AUTHORS.length],
        content: PENDING_TEXT[p % PENDING_TEXT.length],
        rating: 5,
        status: 'pending',
        tags: ['new'],
        day: 2 + ((n + p) % 7),
      });
    }
    if (rejected > 0) {
      push({
        id: `t-${appId}-r-0`, appId,
        authorName: 'Spam Bot',
        content: 'Buy cheap followers now!!!',
        rating: 1,
        status: 'rejected',
        tags: [],
        day: 2,
      });
    }
    i += 1;
  };
  gen('app-acme-1', 12, 4, 1);
  gen('app-lumen-1', 6, 3, 1);
  gen('app-nordic-1', 2, 2, 0);
  return rows;
}

let TESTIMONIALS: DemoTestimonial[] = seedTestimonials();

// ---------------------------------------------------------------------------
// Forms / widgets / team / webhooks / api-keys / imports / audit / billing
// ---------------------------------------------------------------------------
const FORMS: DemoForm[] = [
  {
    id: 'f-acme-1', appId: 'app-acme-1', name: 'Website review', slug: 'website-review', published: true,
    submissionCount: 32, createdAt: dayIso(2),
    questions: [
      { id: 'q1', type: 'rating', label: 'How likely are you to recommend us?', required: true },
      { id: 'q2', type: 'text', label: 'What did we do well?', required: false },
      { id: 'q3', type: 'text', label: 'What could we improve?', required: false },
    ],
  },
  {
    id: 'f-acme-2', appId: 'app-acme-1', name: 'Video testimonial request', slug: 'video-testimonial', published: false,
    submissionCount: 0, createdAt: dayIso(5),
    questions: [
      { id: 'q1', type: 'video', label: 'Record a 30 second clip', required: true },
      { id: 'q2', type: 'text', label: 'Your name & role', required: true },
    ],
  },
  {
    id: 'f-lumen-1', appId: 'app-lumen-1', name: 'Product feedback', slug: 'product-feedback', published: true,
    submissionCount: 58, createdAt: dayIso(4),
    questions: [
      { id: 'q1', type: 'rating', label: 'Overall rating', required: true },
      { id: 'q2', type: 'select', label: 'Which feature helped most?', required: false, options: ['Analytics', 'API', 'Themes', 'Other'] },
      { id: 'q3', type: 'text', label: 'Anything else?', required: false },
    ],
  },
  {
    id: 'f-nordic-1', appId: 'app-nordic-1', name: 'Checkout experience', slug: 'checkout-experience', published: true,
    submissionCount: 7, createdAt: dayIso(6),
    questions: [
      { id: 'q1', type: 'rating', label: 'How smooth was checkout?', required: true },
      { id: 'q2', type: 'text', label: 'Tell us more', required: false },
    ],
  },
];

const WIDGETS: DemoWidget[] = [
  {
    id: 'w-acme-1', appId: 'app-acme-1', formId: 'f-acme-1', name: 'Feedback button', enabled: true,
    theme: 'dark', accentColor: '#FF5733', embedType: 'script', updatedAt: dayIso(6),
    fontFamily: 'Inter', title: 'Share your experience', ctaText: 'Leave a review',
    embedCode: { html: '<script async src="/w.js" data-widget="w-acme-1"></script>' },
  },
  {
    id: 'w-acme-2', appId: 'app-acme-1', formId: null, name: 'Review wall', enabled: true,
    theme: 'light', accentColor: '#FF5733', embedType: 'iframe', updatedAt: dayIso(3),
    title: 'Loved by customers', embedCode: { html: '<iframe src="/v1/public/widgets/w-acme-2"></iframe>' },
  },
  {
    id: 'w-lumen-1', appId: 'app-lumen-1', formId: 'f-lumen-1', name: 'Inline feedback', enabled: false,
    theme: 'light', accentColor: '#6366F1', embedType: 'react', updatedAt: dayIso(5),
  },
];

const TEAM: DemoTeamMember[] = [
  { id: 'm-ada', tenantId: 'tenant-acme', name: 'Ada Owner', email: 'owner@acme.test', role: 'owner', status: 'active', lastActiveAt: dayIso(8) },
  { id: 'm-eden', tenantId: 'tenant-acme', name: 'Eden Editor', email: 'editor@acme.test', role: 'editor', status: 'active', lastActiveAt: dayIso(7) },
  { id: 'm-chris', tenantId: 'tenant-acme', name: 'Chris Viewer', email: 'chris@acme.test', role: 'viewer', status: 'invited' },
];

const WEBHOOKS: DemoWebhook[] = [
  { id: 'wh-acme-1', appId: 'app-acme-1', name: 'Production', url: 'https://hooks.acme.test/events', events: ['testimonial.created', 'testimonial.approved', 'testimonial.rejected'], enabled: true, secretMasked: 'whsec_8f2a…' },
  { id: 'wh-acme-2', appId: 'app-acme-1', name: 'Slack alerts', url: 'https://hooks.slack.com/services/T00/B00/xxxx', events: ['testimonial.flagged'], enabled: false, secretMasked: 'whsec_ab12…' },
  { id: 'wh-lumen-1', appId: 'app-lumen-1', name: 'CRM sync', url: 'https://api.lumen.test/webhook', events: ['testimonial.created'], enabled: true },
];

const DELIVERIES: DemoWebhookDelivery[] = [
  { id: 'd1', webhookId: 'wh-acme-1', event: 'testimonial.created', status: 'success', statusCode: 200, attemptedAt: dayIso(8) },
  { id: 'd2', webhookId: 'wh-acme-1', event: 'testimonial.approved', status: 'success', statusCode: 200, attemptedAt: dayIso(7) },
  { id: 'd3', webhookId: 'wh-acme-1', event: 'testimonial.created', status: 'retrying', attemptedAt: dayIso(8) },
  { id: 'd4', webhookId: 'wh-acme-2', event: 'testimonial.flagged', status: 'failed', statusCode: 502, attemptedAt: dayIso(6) },
];

const API_KEYS: DemoApiKey[] = [
  { id: 'k1', appId: 'app-acme-1', name: 'Production', prefix: 'api_live_8f2a', lastUsedAt: dayIso(8), createdAt: dayIso(1), scopes: ['testimonials.read', 'testimonials.write'] },
  { id: 'k2', appId: 'app-acme-1', name: 'Staging', prefix: 'api_test_ab12', lastUsedAt: null, createdAt: dayIso(4), scopes: ['testimonials.read'] },
];

const IMPORTS: DemoImportJob[] = [
  { id: 'imp-1', appId: 'app-acme-1', fileName: 'summer_wall.csv', status: 'done', totalRows: 120, importedRows: 120, createdAt: dayIso(6) },
  { id: 'imp-2', appId: 'app-acme-1', fileName: 'agency_migration.csv', status: 'failed', totalRows: 14, importedRows: 2, createdAt: dayIso(8) },
];

const TENANT_AUDIT: DemoAuditEntry[] = [
  { id: 'ta-1', actor: 'owner@acme.test', action: 'testimonial.approved', resource: 't-app-acme-1-a-0', ip: '192.168.1.10', createdAt: dayIso(8) },
  { id: 'ta-2', actor: 'owner@acme.test', action: 'testimonial.rejected', resource: 't-app-acme-1-r-0', ip: '192.168.1.10', createdAt: dayIso(7) },
  { id: 'ta-3', actor: 'editor@acme.test', action: 'form.published', resource: 'f-acme-2', ip: '192.168.1.11', createdAt: dayIso(6) },
  { id: 'ta-4', actor: 'owner@acme.test', action: 'team.invite_sent', resource: 'chris@acme.test', ip: '192.168.1.10', createdAt: dayIso(5) },
  { id: 'ta-5', actor: 'system', action: 'auth.login', resource: 'owner@acme.test', ip: '197.210.0.4', createdAt: dayIso(8) },
];

const PLATFORM_STAFF: DemoPlatformStaff[] = [
  { id: 'ps-1', name: 'Zojatech Admin', email: 'admin@zojatech.test', role: 'platform_admin', status: 'active', lastActiveAt: dayIso(8) },
  { id: 'ps-2', name: 'Tolu Support', email: 'tolu@zojatech.test', role: 'platform_support', status: 'active', lastActiveAt: dayIso(6) },
];

const PLATFORM_WEBHOOKS: DemoWebhook[] = [
  { id: 'whp-1', appId: '*', name: 'Ops room', url: 'https://ops.zojatech.test/hooks/tenant', events: ['tenant.created', 'tenant.plan_changed'], enabled: true },
];

const PLATFORM_AUDIT: DemoAuditEntry[] = [
  { id: 'pa-1', actor: 'admin@zojatech.test', action: 'tenant.plan_changed', resource: 'tenant-lumen', ip: '10.0.0.8', createdAt: dayIso(8) },
  { id: 'pa-2', actor: 'tolu@zojatech.test', action: 'tenant.suspended', resource: 'tenant-nordic', ip: '10.0.0.9', createdAt: dayIso(5) },
  { id: 'pa-3', actor: 'admin@zojatech.test', action: 'staff.invited', resource: 'tolu@zojatech.test', createdAt: dayIso(3) },
];

const INVOICES: DemoInvoice[] = [
  { id: 'inv-1', tenantName: 'Acme Inc', amountUsd: 29, status: 'paid', createdAt: dayIso(1) },
  { id: 'inv-2', tenantName: 'Lumen Labs', amountUsd: 99, status: 'paid', createdAt: dayIso(1) },
  { id: 'inv-3', tenantName: 'Nordic Peak', amountUsd: 29, status: 'open', createdAt: dayIso(7) },
];

const AI_PROVIDERS: DemoAiProvider[] = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'], enabled: true, defaultModel: 'gpt-4o-mini' },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet'], enabled: true, defaultModel: 'claude-3-5-sonnet' },
  { id: 'google', name: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash'], enabled: false, defaultModel: 'gemini-1.5-flash' },
];

const AI_TASKS: DemoAiTask[] = [
  { id: 'task-1', provider: 'openai', operation: 'classify', status: 'success', latencyMs: 420, costUsd: 0.0021, createdAt: dayIso(8) },
  { id: 'task-2', provider: 'openai', operation: 'flag', status: 'success', latencyMs: 310, costUsd: 0.0012, createdAt: dayIso(8) },
  { id: 'task-3', provider: 'anthropic', operation: 'summarize', status: 'success', latencyMs: 890, costUsd: 0.0034, createdAt: dayIso(7) },
  { id: 'task-4', provider: 'openai', operation: 'classify', status: 'failed', latencyMs: 15000, costUsd: 0, createdAt: dayIso(7) },
  { id: 'task-5', provider: 'anthropic', operation: 'classify', status: 'success', latencyMs: 520, costUsd: 0.0018, createdAt: dayIso(6) },
  { id: 'task-6', provider: 'google', operation: 'classify', status: 'skipped', createdAt: dayIso(6) },
];

// ---------------------------------------------------------------------------
// Store helpers
// ---------------------------------------------------------------------------
export const DEMO = {
  tenantByAppId(appId: string): DemoTenant | undefined {
    return TENANTS.find((t) => t.appId === appId);
  },
  tenantById(id: string): DemoTenant | undefined {
    return TENANTS.find((t) => t.id === id);
  },
  allTenants(): DemoTenant[] {
    return TENANTS.map((t) => ({ ...t }));
  },
  tenantForUser(user: { tenantId?: string }): DemoTenant {
    const t = TENANTS.find((x) => x.id === user.tenantId) ?? TENANTS[0];
    return t;
  },
  companyUsers(): DemoUser[] {
    return USERS.filter((u) => u.tenantId);
  },
  platformUsers(): DemoUser[] {
    return USERS.filter((u) => !u.tenantId);
  },
  permissionsFor,
  testimonialsOfApp(appId: string): DemoTestimonial[] {
    return TESTIMONIALS.filter((r) => r.appId === appId);
  },
  addTestimonial(t: Omit<DemoTestimonial, 'id' | 'createdAt'>): DemoTestimonial {
    const row: DemoTestimonial = { ...t, id: `t-${randomUUID().slice(0, 8)}`, createdAt: new Date().toISOString() };
    TESTIMONIALS.push(row);
    return row;
  },
  updateTestimonial(id: string, patch: Partial<DemoTestimonial>): DemoTestimonial | undefined {
    const row = TESTIMONIALS.find((r) => r.id === id);
    if (!row) return undefined;
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    return row;
  },
  deleteTestimonial(id: string): boolean {
    const before = TESTIMONIALS.length;
    TESTIMONIALS = TESTIMONIALS.filter((r) => r.id !== id);
    return TESTIMONIALS.length < before;
  },
  formsOfApp(appId: string): DemoForm[] {
    return FORMS.filter((f) => f.appId === appId);
  },
  findForm(appId: string, formId: string): DemoForm | undefined {
    return FORMS.find((f) => f.appId === appId && f.id === formId);
  },
  formBySlug(slug: string): DemoForm | undefined {
    return FORMS.find((f) => f.slug === slug);
  },
  saveForm(appId: string, form: { id?: string; name: string; slug: string; published: boolean; questions: DemoFormQuestion[] }): DemoForm {
    const existing = form.id ? FORMS.find((f) => f.id === form.id && f.appId === appId) : undefined;
    if (existing) {
      Object.assign(existing, { name: form.name, slug: form.slug, published: form.published, questions: form.questions });
      return existing;
    }
    const created: DemoForm = {
      id: `f-${randomUUID().slice(0, 6)}`, appId, name: form.name, slug: form.slug,
      published: form.published, submissionCount: 0, createdAt: new Date().toISOString(), questions: form.questions,
    };
    FORMS.push(created);
    return created;
  },
  setFormPublished(formId: string, published: boolean): DemoForm | undefined {
    const form = FORMS.find((f) => f.id === formId);
    if (!form) return undefined;
    form.published = published;
    return form;
  },
  widgetsOfApp(appId: string): DemoWidget[] {
    return WIDGETS.filter((w) => w.appId === appId);
  },
  findWidget(appId: string, widgetId: string): DemoWidget | undefined {
    return WIDGETS.find((w) => w.appId === appId && w.id === widgetId);
  },
  saveWidget(appId: string, widget: { id?: string; formId: string | null; name: string; enabled: boolean; theme: 'light' | 'dark'; accentColor: string; embedType: 'script' | 'iframe' | 'react' }): DemoWidget {
    const existing = widget.id ? WIDGETS.find((w) => w.id === widget.id && w.appId === appId) : undefined;
    if (existing) {
      Object.assign(existing, widget);
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    const created: DemoWidget = {
      ...widget, id: `w-${randomUUID().slice(0, 6)}`, appId, updatedAt: new Date().toISOString(),
      title: 'Share your experience', embedCode: { html: `<script async src="/w.js" data-widget="w-${randomUUID().slice(0, 6)}"></script>` },
    };
    WIDGETS.push(created);
    return created;
  },
  setWidgetEnabled(widgetId: string, enabled: boolean): DemoWidget | undefined {
    const w = WIDGETS.find((x) => x.id === widgetId);
    if (!w) return undefined;
    w.enabled = enabled;
    w.updatedAt = new Date().toISOString();
    return w;
  },
  teamOfTenant(tenantId: string): DemoTeamMember[] {
    return TEAM.filter((m) => m.tenantId === tenantId);
  },
  inviteTeamMember(tenantId: string, email: string, role: DemoRole): DemoTeamMember {
    const member: DemoTeamMember = {
      id: `m-${randomUUID().slice(0, 6)}`, tenantId,
      name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      email, role, status: 'invited',
    };
    TEAM.push(member);
    const tenant = TENANTS.find((t) => t.id === tenantId);
    if (tenant) tenant.seatsUsed = TEAM.filter((m) => m.tenantId === tenantId).length;
    return member;
  },
  patchTeamMember(memberId: string, patch: { role?: DemoRole; status?: 'active' | 'suspended' | 'invited' }): DemoTeamMember | undefined {
    const m = TEAM.find((x) => x.id === memberId);
    if (!m) return undefined;
    Object.assign(m, patch);
    return m;
  },
  webhooksOfApp(appId: string): DemoWebhook[] {
    return WEBHOOKS.filter((w) => w.appId === appId);
  },
  deliveriesForWebhook(webhookId: string): DemoWebhookDelivery[] {
    return DELIVERIES.filter((d) => d.webhookId === webhookId);
  },
  apiKeysOfApp(appId: string): DemoApiKey[] {
    return API_KEYS.filter((k) => k.appId === appId);
  },
  createApiKey(appId: string, name: string, scopes: string[]): DemoApiKey {
    const key: DemoApiKey = {
      id: `k-${randomUUID().slice(0, 6)}`, appId, name, prefix: `api_${scopes.includes('testimonials.write') ? 'live' : 'test'}_${randomUUID().slice(0, 4)}`,
      lastUsedAt: null, createdAt: new Date().toISOString(), scopes,
    };
    API_KEYS.push(key);
    return key;
  },
  rotateApiKey(keyId: string): DemoApiKey | undefined {
    const k = API_KEYS.find((x) => x.id === keyId);
    if (!k) return undefined;
    k.prefix = `api_${randomUUID().slice(0, 4)}_${randomUUID().slice(0, 4)}`;
    k.createdAt = new Date().toISOString();
    return k;
  },
  importsOfApp(appId: string): DemoImportJob[] {
    return IMPORTS.filter((j) => j.appId === appId);
  },
  enqueueImport(appId: string, fileName: string): DemoImportJob {
    const job: DemoImportJob = {
      id: `imp-${randomUUID().slice(0, 6)}`, appId, fileName, status: 'queued',
      createdAt: new Date().toISOString(),
    };
    IMPORTS.unshift(job);
    return job;
  },
  tenantAuditEntries(): DemoAuditEntry[] {
    return [...TENANT_AUDIT];
  },
  platformAuditEntries(): DemoAuditEntry[] {
    return [...PLATFORM_AUDIT];
  },
  invoices(): DemoInvoice[] {
    return [...INVOICES];
  },
  platformStaff(): DemoPlatformStaff[] {
    return [...PLATFORM_STAFF];
  },
  platformWebhooks(): DemoWebhook[] {
    return [...PLATFORM_WEBHOOKS];
  },
  aiProviders(): DemoAiProvider[] {
    return AI_PROVIDERS.map((p) => ({ ...p, models: [...p.models] }));
  },
  setAiProviderEnabled(providerId: string, enabled: boolean): DemoAiProvider | undefined {
    const p = AI_PROVIDERS.find((x) => x.id === providerId);
    if (!p) return undefined;
    p.enabled = enabled;
    return p;
  },
  aiTasks(): DemoAiTask[] {
    return [...AI_TASKS];
  },
  aiCosts(): { totalUsd: number; byProvider: Array<{ provider: string; usd: number }> } {
    const byProvider = new Map<string, number>();
    for (const t of AI_TASKS) {
      if (t.status !== 'success') continue;
      byProvider.set(t.provider, (byProvider.get(t.provider) ?? 0) + (t.costUsd ?? 0));
    }
    const rows = [...byProvider.entries()].map(([provider, usd]) => ({ provider, usd: Number(usd.toFixed(4)) }));
    return { totalUsd: Number(rows.reduce((s, r) => s + r.usd, 0).toFixed(4)), byProvider: rows };
  },
  mrrs(): { monthlyMrrUsd: number; tenants: number; activeApps: number; totalTestimonials: number; pendingReview: number } {
    const monthlyMrrUsd = TENANTS.reduce((s, t) => s + MONTHLY_BY_PLAN[t.plan], 0);
    const all = TESTIMONIALS;
    return {
      monthlyMrrUsd,
      tenants: TENANTS.length,
      activeApps: TENANTS.length,
      totalTestimonials: all.length,
      pendingReview: all.filter((r) => r.status === 'pending').length,
    };
  },
  tenantStatusForDetail(tenant: DemoTenant) {
    return {
      id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan, status: tenant.status,
      testimonialCount: TESTIMONIALS.filter((r) => r.appId === tenant.appId).length,
      createdAt: tenant.createdAt, ownerEmail: tenant.ownerEmail,
      seatsUsed: TEAM.filter((m) => m.tenantId === tenant.id).length,
      seatsLimit: tenant.seatsLimit,
      apps: [{ id: tenant.appId, name: tenant.appName }],
    };
  },
  // Billing view for the signed-in tenant
  billingForTenant(tenant: DemoTenant) {
    return {
      plan: tenant.plan, status: 'active', seatsUsed: TEAM.filter((m) => m.tenantId === tenant.id).length,
      seatsLimit: tenant.seatsLimit, nextInvoiceAt: '2026-10-01T00:00:00.000Z',
      monthlyCostUsd: MONTHLY_BY_PLAN[tenant.plan],
    };
  },
};

/** In-memory session id → account email. Restart clears sessions (dev only). */
export class DemoSessions {
  private readonly sessions = new Map<string, { kind: 'company' | 'platform'; email: string }>();

  create(kind: 'company' | 'platform', email: string): string {
    const sid = randomUUID();
    this.sessions.set(sid, { kind, email });
    return sid;
  }

  resolve(sid: string | undefined): { kind: 'company' | 'platform'; email: string } | null {
    if (!sid) return null;
    return this.sessions.get(sid) ?? null;
  }
}

export function demoAccountLabel(role: 'company' | 'platform'): { email: string; password: string } {
  if (role === 'platform') return { email: 'admin@zojatech.test', password: 'demo1234' };
  return { email: 'owner@acme.test', password: 'demo1234' };
}
