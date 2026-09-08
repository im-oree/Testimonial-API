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
import { RADIUS_IDS, FONT_IDS, resolveTheme, THEME_PRESETS, type ResolvedTheme, type StoredTheme, type ThemeFont, type ThemeRadius } from './theme';
import type { ThemePreset } from './theme';

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
  brandColor: string | null;
  logoUrl?: string | null;
  /** DOC-7 theme — written by updateTenantTheme; resolved lazily for reads. */
  theme?: StoredTheme | null;
  /** Company-wide widget design default (marketplace template tier 2). */
  widgetDesign?: string | null;
  designTemplateId?: string | null;
  plan: 'starter' | 'growth' | 'scale';
  status: 'active' | 'suspended' | 'trialing';
  createdAt: string;
  ownerEmail: string;
  seatsUsed: number;
  seatsLimit: number;
}

/** Widget design ids the widget library ships (client/src/widgets/index.tsx). */
export const WIDGET_DESIGN_IDS = ['classic', 'spotlight', 'carousel', 'wall', 'marquee', 'orbit'] as const;
export type WidgetDesignId = (typeof WIDGET_DESIGN_IDS)[number];

/**
 * An App/Product = one website or collection surface where a tenant collects
 * testimonials. A tenant can own many; every testimonial, form, widget,
 * webhook and API key belongs to exactly one (appId). Companies manage only
 * their own; the platform console can create companies, see metrics and
 * impersonate (super-company access).
 */
export type DesignSort = 'newest' | 'highest' | 'oldest';

/** No-code content options that ride along with a product's widget design. */
export interface DesignOptions {
  ratingMin?: number | null;
  maxReviews?: number | null;
  sort?: DesignSort | null;
}

export interface DemoApp {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  description?: string | null;
  adminEmail?: string | null;
  accentColor?: string | null;
  /** Per-product theme overrides (layered over the company theme). */
  themeAccent?: string | null;
  themeRadius?: string | null;
  themeFont?: string | null;
  /** Per-product widget design from the plug-and-play library. */
  widgetDesign?: string | null;
  /** Marketplace template this product design was cloned from (if any). */
  designTemplateId?: string | null;
  /** Content + layout options saved with the design (each save = new version). */
  designOptions?: DesignOptions | null;
  designVersion?: number;
  designUpdatedAt?: string | null;
  /** Last few design snapshots (version history). */
  designHistory?: Array<{ version: number; designId: string | null; options: DesignOptions | null; savedAt: string }>;
  /** Visual editor (DOC 7B) custom schema draft — opaque JSON owned by the editor. */
  studioSchema?: unknown | null;
  studioVersion?: number;
  studioUpdatedAt?: string | null;
  /**
   * Unpublished design draft (preview/customize/save without applying): a
   * schema being tuned in the studio before an explicit publish pushes it
   * into studioSchema (the live embed). Null = no draft.
   */
  designDraft?: unknown | null;
  designDraftTemplateId?: string | null;
  designDraftUpdatedAt?: string | null;
  status: 'active' | 'paused';
  createdAt: string;
}

export interface DemoTestimonial {
  id: string;
  appId: string;
  formId?: string | null;
  content: string;
  authorName?: string | null;
  rating?: number;
  status: TestimonialStatus;
  /**
   * Live toggle: approved testimonials with visible !== false render on the
   * public wall. Hiding one keeps it approved in the dashboard but pulls it
   * from every public surface until it is switched back on.
   */
  visible?: boolean;
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
  /** Tenant whose workspace produced this entry (workspace-scope audit). */
  tenantId?: string;
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

export type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_editor' | 'platform_support';

export interface DemoPlatformStaff {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  status: 'active' | 'invited' | 'suspended';
  password?: string;
  lastActiveAt?: string;
  createdAt?: string;
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
export const MONTHLY_BY_PLAN: Record<DemoTenant['plan'], number> = { starter: 29, growth: 99, scale: 299 };

// ---------------------------------------------------------------------------
// Tenants + users
// ---------------------------------------------------------------------------
const TENANTS: DemoTenant[] = [
  {
    id: 'tenant-acme', name: 'Acme Inc', slug: 'acme', brandColor: '#FF5733',
    plan: 'starter', status: 'active', createdAt: '2026-08-01T09:00:00.000Z',
    ownerEmail: 'owner@acme.test', seatsUsed: 3, seatsLimit: 5,
  },
  {
    id: 'tenant-lumen', name: 'Lumen Labs', slug: 'lumen', brandColor: '#6366F1',
    plan: 'growth', status: 'active', createdAt: '2026-06-15T08:00:00.000Z',
    ownerEmail: 'hello@lumen.test', seatsUsed: 8, seatsLimit: 15,
  },
  {
    id: 'tenant-nordic', name: 'Nordic Peak', slug: 'nordicpeak', brandColor: '#10B981',
    plan: 'starter', status: 'trialing', createdAt: '2026-08-28T12:00:00.000Z',
    ownerEmail: 'hi@nordicpeak.test', seatsUsed: 3, seatsLimit: 5,
  },
];

/**
 * Every tenant's apps (one per website). Acme has two so the demo shows the
 * "I have another external website" story: Acme Marketing Site + Acme Blog,
 * each with its own isolated testimonials, forms and stats.
 */
const APPS: DemoApp[] = [
  {
    id: 'app-acme-1', tenantId: 'tenant-acme', name: 'Acme Marketing Site', slug: 'acme-marketing-site',
    websiteUrl: 'https://www.acme.test', status: 'active', createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'app-acme-2', tenantId: 'tenant-acme', name: 'Acme Blog', slug: 'acme-blog',
    websiteUrl: 'https://blog.acme.test', status: 'active', createdAt: '2026-08-20T12:00:00.000Z',
  },
  {
    id: 'app-lumen-1', tenantId: 'tenant-lumen', name: 'Lumen App', slug: 'lumen-app',
    websiteUrl: 'https://app.lumen.test', status: 'active', createdAt: '2026-06-15T09:00:00.000Z',
  },
  {
    id: 'app-nordic-1', tenantId: 'tenant-nordic', name: 'Nordic Peak Store', slug: 'nordic-peak-store',
    websiteUrl: 'https://shop.nordicpeak.test', status: 'active', createdAt: '2026-08-28T13:00:00.000Z',
  },
];

const USERS: DemoUser[] = [
  { id: 'u-owner', email: 'owner@acme.test', password: 'demo1234', name: 'Ada Owner', role: 'owner', tenantId: 'tenant-acme' },
  { id: 'u-editor', email: 'editor@acme.test', password: 'demo1234', name: 'Eden Editor', role: 'editor', tenantId: 'tenant-acme' },
  { id: 'u-viewer', email: 'chris@acme.test', password: 'demo1234', name: 'Chris Viewer', role: 'viewer', tenantId: 'tenant-acme' },
  { id: 'u-lumen-owner', email: 'hello@lumen.test', password: 'demo1234', name: 'Lin Lumen', role: 'owner', tenantId: 'tenant-lumen' },
  { id: 'u-nordic-owner', email: 'hi@nordicpeak.test', password: 'demo1234', name: 'Nora Nordic', role: 'owner', tenantId: 'tenant-nordic' },
  { id: 'u-admin', email: 'admin@zojatech.test', password: 'demo1234', name: 'Zojatech Admin', role: 'platform_owner' },
];

const OWNER_PERMISSIONS = [
  'apps.manage',
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
// Company role templates (tenant RBAC presets). These are the grants each role
// enforces — reads and writes are separate permissions, so e.g. viewing a
// review queue never grants the right to moderate it. The owner is the tenant's
// super admin: its row and membership cannot be changed by another member.
// ---------------------------------------------------------------------------
export interface CompanyRoleTemplate {
  id: DemoRole;
  name: string;
  description: string;
  perms: string[];
}

export const COMPANY_ROLE_TEMPLATES: CompanyRoleTemplate[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Super admin of this tenant: full control over products, reviews, moderation, forms, widgets, team, settings and the audit log. Owns the workspace and cannot be demoted or suspended by other members.',
    perms: [...OWNER_PERMISSIONS],
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Runs day-to-day operations with the same broad grants as the owner — products, reviews, team invitations and role changes, settings — except ownership itself stays with the owner account.',
    perms: [...OWNER_PERMISSIONS],
  },
  {
    id: 'editor',
    name: 'Editor',
    description: 'Content work: add and edit testimonials, publish forms and shape the widget. Cannot moderate the queue, invite people or touch settings.',
    perms: [...EDITOR_PERMISSIONS],
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only stakeholder access: approved reviews, public walls and the tenant audit log. Nothing can be changed.',
    perms: ['testimonials.read', 'audit.read'],
  },
];

// ---------------------------------------------------------------------------
// Platform role templates (RBAC presets). Each permission is independent —
// reads and writes are separate grants, so e.g. "tenants.read" never implies
// "tenants.write".
// ---------------------------------------------------------------------------
export interface PlatformRoleTemplate {
  id: 'platform_owner' | 'platform_admin' | 'platform_editor' | 'platform_support';
  name: string;
  description: string;
  perms: string[];
}

export const PLATFORM_ROLE_TEMPLATES: PlatformRoleTemplate[] = [
  {
    id: 'platform_owner',
    name: 'Super admin',
    description: 'Full control — every tenant, template, staff account, impersonation and every audit log (platform + workspaces).',
    perms: ['tenants.read', 'tenants.write', 'templates.write', 'staff.read', 'staff.write', 'impersonate', 'billing.read', 'audit.read', 'audit.all', 'platform.manage'],
  },
  {
    id: 'platform_admin',
    name: 'Admin',
    description: 'Runs tenants, templates, impersonation and billing; can view staff and audit logs but not manage accounts.',
    perms: ['tenants.read', 'tenants.write', 'templates.write', 'staff.read', 'impersonate', 'billing.read', 'audit.read'],
  },
  {
    id: 'platform_editor',
    name: 'Editor',
    description: 'Curates templates and browses tenants; no impersonation, accounts or billing.',
    perms: ['tenants.read', 'templates.write', 'staff.read', 'audit.read'],
  },
  {
    id: 'platform_support',
    name: 'Support',
    description: 'Read-only console access to help companies; cannot change anything.',
    perms: ['tenants.read', 'audit.read'],
  },
];

export function platformPermissionsFor(role: string): string[] {
  return PLATFORM_ROLE_TEMPLATES.find((r) => r.id === role)?.perms ?? [];
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------
function dayIso(dayOfSep: number): string {
  return new Date(Date.UTC(2026, 8, dayOfSep)).toISOString();
}

/** Local slugify (kept out of lib.ts to avoid an import cycle with DEMO). */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'untitled-app'
  );
}

/**
 * Product-style identifier, e.g. "PRD-ATLS" (spec naming). Single-word names
 * use the first four letters ("Beacon" -> BEAC); multi-word names use word
 * initials ("Acme Marketing Site" -> AMS). Prefix is PRD-.
 */
export function productCode(name: string): string {
  const words = name
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  const code = words.length > 1 ? words.map((w) => w[0]).join('') : words[0] ?? '';
  const letters = (code || name.replace(/[^a-zA-Z0-9]/g, '')).slice(0, 4).toUpperCase();
  return `PRD-${letters || 'PROD'}`;
}

/** Unique tenant slug across every tenant. */
function uniqueTenantSlug(base: string): string {
  let candidate = base;
  let n = 2;
  while (TENANTS.some((t) => t.slug === candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
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
        visible: true,
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
        visible: true,
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
        visible: true,
        tags: [],
        day: 2,
      });
    }
    i += 1;
  };
  gen('app-acme-1', 12, 4, 1);
  gen('app-acme-2', 5, 1, 0);
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
    id: 'f-acme-b1', appId: 'app-acme-2', name: 'Blog readers review', slug: 'blog-review', published: true,
    submissionCount: 11, createdAt: dayIso(7),
    questions: [
      { id: 'q1', type: 'rating', label: 'How useful was this article?', required: true },
      { id: 'q2', type: 'text', label: 'What did you take away?', required: false },
      { id: 'q3', type: 'select', label: 'Which topic next?', required: false, options: ['Guides', 'Product news', 'Customer stories', 'Other'] },
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
  { id: 'ta-1', actor: 'owner@acme.test', action: 'testimonial.approved', resource: 't-app-acme-1-a-0', ip: '192.168.1.10', createdAt: dayIso(8), tenantId: 'tenant-acme' },
  { id: 'ta-2', actor: 'owner@acme.test', action: 'testimonial.rejected', resource: 't-app-acme-1-r-0', ip: '192.168.1.10', createdAt: dayIso(7), tenantId: 'tenant-acme' },
  { id: 'ta-3', actor: 'editor@acme.test', action: 'form.published', resource: 'f-acme-2', ip: '192.168.1.11', createdAt: dayIso(6), tenantId: 'tenant-acme' },
  { id: 'ta-4', actor: 'owner@acme.test', action: 'team.invite_sent', resource: 'chris@acme.test', ip: '192.168.1.10', createdAt: dayIso(5), tenantId: 'tenant-acme' },
  { id: 'ta-5', actor: 'system', action: 'auth.login', resource: 'owner@acme.test', ip: '197.210.0.4', createdAt: dayIso(8), tenantId: 'tenant-acme' },
  { id: 'ta-6', actor: 'system', action: 'tenant.created', resource: 'owner@acme.test', createdAt: dayIso(20), tenantId: 'tenant-lumen' },
];

let PLATFORM_STAFF: DemoPlatformStaff[] = [
  { id: 'ps-1', name: 'Zojatech Super Admin', email: 'admin@zojatech.test', role: 'platform_owner', password: 'demo1234', status: 'active', lastActiveAt: dayIso(8), createdAt: '2026-01-01T08:00:00.000Z' },
  { id: 'ps-2', name: 'Tolu Admin', email: 'tolu@zojatech.test', role: 'platform_admin', password: 'demo1234', status: 'active', lastActiveAt: dayIso(7), createdAt: '2026-02-14T09:00:00.000Z' },
  { id: 'ps-3', name: 'Kemi Editor', email: 'kemi@zojatech.test', role: 'platform_editor', password: 'demo1234', status: 'active', lastActiveAt: dayIso(5), createdAt: '2026-03-01T09:00:00.000Z' },
  { id: 'ps-4', name: 'Bode Support', email: 'bode@zojatech.test', role: 'platform_support', password: 'demo1234', status: 'suspended', lastActiveAt: dayIso(9), createdAt: '2026-04-22T09:00:00.000Z' },
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
// ---------------------------------------------------------------------------
// Theme templates — the catalogue Zojatech owns. Tenants adopt one on their
// Appearance page and can fine-tune afterwards. Seeded from the built-ins.
// ---------------------------------------------------------------------------
export interface ThemeTemplateRow extends ThemePreset {
  builtin: boolean;
}

let THEME_TEMPLATES: ThemeTemplateRow[] = THEME_PRESETS.map((t) => ({ ...t, builtin: true }));

// ---------------------------------------------------------------------------
// Design templates — the marketplace (DOC 7 section 5). Tier 1 rows are owned
// by Zojatech and list a widget design + a visual preset; tenants adopt them
// as their company default (tier 2) or clone them onto one product (tier 3).
// ---------------------------------------------------------------------------
export interface DesignTemplateRow {
  id: string;
  name: string;
  description: string;
  category: string;
  designId: string;
  primary: string;
  accent: string;
  radius: ThemeRadius;
  font: ThemeFont;
  builtin: boolean;
  useCount: number;
}

const DESIGN_TEMPLATE_SEED: Array<Omit<DesignTemplateRow, 'builtin' | 'useCount'>> = [
  { id: 'dt-grid-classic', name: 'Classic Teal', description: 'The dependable grid — every review card clean and scannable.', category: 'Grid', designId: 'classic', primary: '#0d9488', accent: '#0f766e', radius: 'md', font: 'system' },
  { id: 'dt-wall-ocean', name: 'Wall of Love Ocean', description: 'Masonry wall of customer quotes with a deep blue accent.', category: 'Wall', designId: 'wall', primary: '#1e40af', accent: '#0ea5e9', radius: 'lg', font: 'system' },
  { id: 'dt-spotlight-royal', name: 'Spotlight Royal', description: 'One featured review in the spotlight, the rest in a quiet grid.', category: 'Spotlight', designId: 'spotlight', primary: '#4338ca', accent: '#7c3aed', radius: 'md', font: 'system' },
  { id: 'dt-carousel-sunset', name: 'Carousel Sunset', description: 'Rotating reviews with warm orange branding.', category: 'Carousel', designId: 'carousel', primary: '#c2410c', accent: '#ea580c', radius: 'lg', font: 'serif' },
  { id: 'dt-orbit-violet', name: 'Orbit Violet', description: 'Author photos in a circle — hover to read their review.', category: 'Orbit', designId: 'orbit', primary: '#6d28d9', accent: '#a21caf', radius: 'lg', font: 'system' },
  { id: 'dt-marquee-forest', name: 'Marquee Forest', description: 'Scrolling strips of praise with a green brand tone.', category: 'Marquee', designId: 'marquee', primary: '#166534', accent: '#16a34a', radius: 'sm', font: 'mono' },
];

let DESIGN_TEMPLATES: DesignTemplateRow[] = DESIGN_TEMPLATE_SEED.map((t) => ({ ...t, builtin: true, useCount: 0 }));

export const DEMO = {
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

  // --- Apps ------------------------------------------------------------

  appsOfTenant(tenantId: string): DemoApp[] {
    return APPS.filter((a) => a.tenantId === tenantId).map((a) => ({ ...a }));
  },
  appById(appId: string): DemoApp | undefined {
    return APPS.find((a) => a.id === appId);
  },
  appBySlug(slug: string): DemoApp | undefined {
    return APPS.find((a) => a.slug === slug);
  },
  /** Tenant that owns the given app (or undefined when the app is unknown). */
  tenantOfApp(appId: string): DemoTenant | undefined {
    const app = APPS.find((a) => a.id === appId);
    return app ? TENANTS.find((t) => t.id === app.tenantId) : undefined;
  },
  /** Unique app slug across every tenant. */
  uniqueAppSlug(base: string): string {
    let candidate = base;
    let n = 2;
    while (APPS.some((a) => a.slug === candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
  },
  /** Unique public form slug across every app (public forms live at /forms/:slug). */
  uniqueFormSlug(base: string): string {
    let candidate = base;
    let n = 2;
    while (FORMS.some((f) => f.slug === candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
  },
  createApp(tenantId: string, input: { name: string; websiteUrl?: string | null; description?: string | null; accentColor?: string | null }): DemoApp {
    const app: DemoApp = {
      id: `app-${randomUUID().slice(0, 8)}`,
      tenantId,
      name: input.name.trim(),
      slug: DEMO.uniqueAppSlug(slugify(input.name)),
      websiteUrl: input.websiteUrl?.trim() || null,
      description: input.description?.trim() || null,
      adminEmail: null,
      accentColor: input.accentColor?.trim() || null,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    APPS.push(app);
    return { ...app };
  },
  updateApp(
    appId: string,
    patch: {
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
    },
  ): DemoApp | undefined {
    const app = APPS.find((a) => a.id === appId);
    if (!app) return undefined;
    if (patch.widgetDesign !== undefined || patch.designOptions !== undefined) {
      // Versioned design save: snapshot the previous state, bump the version.
      app.designHistory = app.designHistory ?? [];
      app.designHistory.unshift({
        version: app.designVersion ?? 0,
        designId: app.widgetDesign ?? null,
        options: app.designOptions ?? null,
        savedAt: new Date().toISOString(),
      });
      app.designHistory = app.designHistory.slice(0, 8);
      app.designVersion = (app.designVersion ?? 0) + 1;
      app.designUpdatedAt = new Date().toISOString();
    }
    if (patch.name?.trim()) app.name = patch.name.trim();
    if (patch.websiteUrl !== undefined) app.websiteUrl = patch.websiteUrl?.trim() || null;
    if (patch.status) app.status = patch.status;
    if (patch.accentColor !== undefined) app.accentColor = patch.accentColor?.trim() || null;
    if (patch.themeAccent !== undefined) app.themeAccent = patch.themeAccent;
    if (patch.themeRadius !== undefined) app.themeRadius = patch.themeRadius;
    if (patch.themeFont !== undefined) app.themeFont = patch.themeFont;
    if (patch.widgetDesign !== undefined) app.widgetDesign = patch.widgetDesign?.trim() || null;
    if (patch.designOptions !== undefined) app.designOptions = patch.designOptions;
    if (patch.designTemplateId !== undefined) app.designTemplateId = patch.designTemplateId?.trim() || null;
    return { ...app };
  },
  /** Studio schema record (DOC 7B): store the schema JSON and bump the design
   * version so public caches/embeds invalidate exactly like other design saves. */
  updateStudioSchema(appId: string, schema: unknown): DemoApp | undefined {
    const app = APPS.find((a) => a.id === appId);
    if (!app) return undefined;
    app.studioSchema = schema;
    app.studioVersion = (app.studioVersion ?? 0) + 1;
    app.studioUpdatedAt = new Date().toISOString();
    app.designVersion = (app.designVersion ?? 0) + 1;
    app.designUpdatedAt = new Date().toISOString();
    return { ...app };
  },
  /**
   * Apply a widget template to a product: a fresh copy of the template's
   * fixed-dimension schema becomes the product's studio design (replacing any
   * previous customisation) and the template id is remembered for the picker.
   */
  applyWidgetTemplate(appId: string, template: { id: string; schema: unknown }): DemoApp | undefined {
    const app = APPS.find((a) => a.id === appId);
    if (!app) return undefined;
    app.designTemplateId = template.id;
    const saved = DEMO.updateStudioSchema(appId, JSON.parse(JSON.stringify(template.schema)));
    return saved ?? { ...app };
  },

  /** Start an unpublished draft from a template (or the current live design):
   *  the studio customises it and only an explicit publish touches the embed. */
  startDesignDraft(appId: string, template: { id: string; schema: unknown } | null): DemoApp | undefined {
    const app = APPS.find((a) => a.id === appId);
    if (!app) return undefined;
    const base = template ? JSON.parse(JSON.stringify(template.schema)) : app.studioSchema ?? null;
    app.designDraft = base;
    app.designDraftTemplateId = template ? template.id : app.designTemplateId ?? null;
    app.designDraftUpdatedAt = new Date().toISOString();
    return { ...app };
  },

  /** Save the unpublished draft (studio Save button). */
  updateDesignDraft(appId: string, schema: unknown): DemoApp | undefined {
    const app = APPS.find((a) => a.id === appId);
    if (!app) return undefined;
    app.designDraft = schema;
    app.designDraftUpdatedAt = new Date().toISOString();
    return { ...app };
  },

  /** Publish the draft: it becomes the live design the embed serves. */
  publishDesignDraft(appId: string): DemoApp | undefined {
    const app = APPS.find((a) => a.id === appId);
    if (!app || app.designDraft == null) return undefined;
    if (app.designDraftTemplateId) app.designTemplateId = app.designDraftTemplateId;
    const saved = DEMO.updateStudioSchema(appId, JSON.parse(JSON.stringify(app.designDraft)));
    app.designDraft = null;
    app.designDraftTemplateId = null;
    app.designDraftUpdatedAt = null;
    return saved ?? { ...app };
  },

  /** Throw the draft away and keep the live design. */
  discardDesignDraft(appId: string): DemoApp | undefined {
    const app = APPS.find((a) => a.id === appId);
    if (!app) return undefined;
    app.designDraft = null;
    app.designDraftTemplateId = null;
    app.designDraftUpdatedAt = null;
    return { ...app };
  },
  /** Summary counts for one app/product (used by lists, dashboards, metrics). */
  appSummary(app: DemoApp) {
    const rows = TESTIMONIALS.filter((r) => r.appId === app.id);
    const forms = FORMS.filter((f) => f.appId === app.id);
    const rated = rows.filter((r) => r.status === 'approved' && typeof r.rating === 'number');
    const avgRating = rated.length ? Number((rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length).toFixed(1)) : null;
    return {
      id: app.id,
      tenantId: app.tenantId,
      name: app.name,
      code: productCode(app.name),
      slug: app.slug,
      websiteUrl: app.websiteUrl,
      description: app.description ?? app.websiteUrl ?? null,
      adminEmail: app.adminEmail ?? null,
      accentColor: app.accentColor ?? null,
      themeOverride: {
        primary: app.accentColor ?? null,
        accent: app.themeAccent ?? null,
        radius: app.themeRadius ?? null,
        font: app.themeFont ?? null,
      },
      widgetDesign: app.widgetDesign ?? null,
      designTemplateId: app.designTemplateId ?? null,
      designVersion: app.designVersion ?? 0,
      studioVersion: app.studioVersion ?? 0,
      designOptions: app.designOptions ?? null,
      designDraft: app.designDraft
        ? { templateId: app.designDraftTemplateId ?? null, updatedAt: app.designDraftUpdatedAt ?? null }
        : null,
      status: app.status,
      createdAt: app.createdAt,
      totalTestimonials: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
      archived: rows.filter((r) => r.status === 'archived').length,
      avgRating,
      forms: forms.length,
      submissions: forms.reduce((s, f) => s + f.submissionCount, 0),
    };
  },

  /**
   * Creates a tenant (tenant) fully synced end-to-end: the tenant row,
   * its owner user (usable straight away at /login with the returned email +
   * default password) and an audit entry. Used by the platform console.
   */
  createTenant(input: {
    name: string;
    slug?: string;
    plan: DemoTenant['plan'];
    ownerName: string;
    ownerEmail: string;
  }): { tenant: DemoTenant; owner: DemoUser } {
    const now = new Date().toISOString();
    const tenant: DemoTenant = {
      id: `tenant-${randomUUID().slice(0, 8)}`,
      name: input.name.trim(),
      slug: uniqueTenantSlug(slugify(input.slug || input.name)),
      brandColor: null,
      plan: input.plan,
      status: 'active',
      createdAt: now,
      ownerEmail: input.ownerEmail.toLowerCase().trim(),
      logoUrl: null,
      seatsUsed: 1,
      seatsLimit: 5,
    };
    TENANTS.push(tenant);
    const owner: DemoUser = {
      id: `u-${randomUUID().slice(0, 8)}`,
      email: input.ownerEmail.toLowerCase().trim(),
      password: 'demo1234',
      name: input.ownerName.trim() || input.ownerEmail.split('@')[0],
      role: 'owner',
      tenantId: tenant.id,
    };
    USERS.push(owner);
    TEAM.push({
      id: `m-${randomUUID().slice(0, 6)}`,
      tenantId: tenant.id,
      name: owner.name,
      email: owner.email,
      role: 'owner',
      status: 'active',
      lastActiveAt: now,
    });
    PLATFORM_AUDIT.push({
      id: `pa-${randomUUID().slice(0, 6)}`,
      actor: 'system',
      action: 'tenant.created',
      resource: tenant.id,
      createdAt: now,
    });
    return { tenant, owner };
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
    const row: DemoTestimonial = { ...t, visible: t.visible ?? true, id: `t-${randomUUID().slice(0, 8)}`, createdAt: new Date().toISOString() };
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
  /**
   * Adds a member AND a working sign-in account (same email, demo password).
   * The demo has no outbound email, so the inviter receives the credentials
   * once; the member then signs in like any other account and can manage their
   * own profile under Account settings.
   */
  inviteTeamMember(tenantId: string, email: string, role: DemoRole, password = 'demo1234'): DemoTeamMember {
    const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const member: DemoTeamMember = {
      id: `m-${randomUUID().slice(0, 6)}`, tenantId,
      name, email, role, status: 'active',
      lastActiveAt: new Date().toISOString(),
    };
    TEAM.push(member);
    USERS.push({ id: `u-${randomUUID().slice(0, 6)}`, email, password, name, role, tenantId });
    const tenant = TENANTS.find((t) => t.id === tenantId);
    if (tenant) tenant.seatsUsed = TEAM.filter((m) => m.tenantId === tenantId).length;
    return member;
  },
  companyUserByEmail(tenantId: string, email: string): DemoUser | undefined {
    return USERS.find((u) => u.tenantId === tenantId && u.email === email);
  },
  patchTeamMember(memberId: string, patch: { role?: DemoRole; status?: 'active' | 'suspended' | 'invited' }): DemoTeamMember | undefined {
    const m = TEAM.find((x) => x.id === memberId);
    if (!m) return undefined;
    Object.assign(m, patch);
    return m;
  },
  /**
   * Re-points a tenant's owner account (tenant.ownerEmail + the owner's
   * login user + its team row) to a new email/name. Used by platform tenant
   * management so the admin email stays in sync with the sign-in account.
   */
  updateTenantOwner(tenantId: string, input: { email?: string; name?: string }): DemoTenant | undefined {
    const tenant = TENANTS.find((t) => t.id === tenantId);
    if (!tenant) return undefined;
    const email = input.email?.toLowerCase().trim();
    if (email && email !== tenant.ownerEmail) {
      if (TENANTS.some((t) => t.id !== tenantId && t.ownerEmail === email)) return undefined; // clash — caller responds 400
      const user = USERS.find((u) => u.tenantId === tenantId && u.role === 'owner' && u.email === tenant.ownerEmail);
      if (user) user.email = email;
      const member = TEAM.find((m) => m.tenantId === tenantId && m.role === 'owner' && m.email === tenant.ownerEmail);
      if (member) member.email = email;
      tenant.ownerEmail = email;
    }
    if (input.name?.trim()) {
      const user = USERS.find((u) => u.tenantId === tenantId && u.role === 'owner' && u.email === tenant.ownerEmail);
      if (user) user.name = input.name.trim();
      const member = TEAM.find((m) => m.tenantId === tenantId && m.role === 'owner' && m.email === tenant.ownerEmail);
      if (member) member.name = input.name.trim();
    }
    return tenant;
  },
  /** Renames the tenant (workspace profile setting). */
  updateTenantWorkspace(tenantId: string, name: string): DemoTenant | undefined {
    const tenant = TENANTS.find((t) => t.id === tenantId);
    if (!tenant) return undefined;
    tenant.name = name;
    return tenant;
  },
  /** Updates a tenant's visual identity (brand colour + logo) from its own workspace. */
  updateTenantIdentity(tenantId: string, input: { brandColor?: string | null; logoUrl?: string | null }): DemoTenant | undefined {
    const tenant = TENANTS.find((t) => t.id === tenantId);
    if (!tenant) return undefined;
    if (typeof input.brandColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(input.brandColor.trim())) {
      tenant.brandColor = input.brandColor.trim();
      if (tenant.theme) {
        tenant.theme.primary = input.brandColor.trim();
        tenant.theme.version += 1;
        tenant.theme.updatedAt = new Date().toISOString();
      }
    }
    if (input.logoUrl !== undefined) tenant.logoUrl = typeof input.logoUrl === 'string' && input.logoUrl.trim() ? input.logoUrl.trim().slice(0, 300) : null;
    return tenant;
  },
  /**
   * DOC-7 theme writer. Merges any provided token over the current theme,
   * writes the whole resolved set to the tenant row (single source of truth
   * for public reads), mirrors `primary` into legacy `brandColor`, and bumps
   * the version so embed caches/previews can invalidate instantly.
   */
  updateTenantTheme(
    tenantId: string,
    patch: { presetId?: string | null; primary?: string | null; accent?: string | null; radius?: ThemeRadius | null; font?: ThemeFont | null },
  ): DemoTenant | undefined {
    const tenant = TENANTS.find((t) => t.id === tenantId);
    if (!tenant) return undefined;
    const prev = tenant.theme ?? null;
    const nextPrimary =
      typeof patch.primary === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.primary)
        ? patch.primary
        : prev?.primary ?? tenant.brandColor ?? undefined;
    if (nextPrimary) tenant.brandColor = nextPrimary; // legacy mirror — workspace chrome + old payloads keep working
    tenant.theme = {
      presetId: typeof patch.presetId === 'string' ? patch.presetId : prev?.presetId ?? 'custom',
      primary: nextPrimary ?? '#1b2559',
      accent:
        typeof patch.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.accent)
          ? patch.accent
          : prev?.accent ?? '#0ea5a0',
      radius: (patch.radius as ThemeRadius | undefined) ?? prev?.radius ?? 'md',
      font: (patch.font as ThemeFont | undefined) ?? prev?.font ?? 'system',
      version: (prev?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    return tenant;
  },
  /** Resolved theme for a tenant — the single read path used by every consumer. */
  themeOfTenant(tenant: DemoTenant): ResolvedTheme {
    return resolveTheme(tenant);
  },
  themeTemplates(): ThemeTemplateRow[] {
    return THEME_TEMPLATES.map((t) => ({ ...t }));
  },
  designTemplates(): DesignTemplateRow[] {
    return DESIGN_TEMPLATES.map((t) => ({ ...t }));
  },
  designTemplateById(templateId: string): DesignTemplateRow | undefined {
    return DESIGN_TEMPLATES.find((t) => t.id === templateId);
  },
  createDesignTemplate(input: { name: string; description: string; category: string; designId: string; primary: string; accent: string; radius: ThemeRadius; font: ThemeFont }): DesignTemplateRow {
    const row: DesignTemplateRow = {
      id: `dt-${randomUUID().slice(0, 8)}`,
      name: input.name.trim().slice(0, 60),
      description: input.description.trim().slice(0, 180),
      category: input.category.trim().slice(0, 30) || 'Grid',
      designId: input.designId,
      primary: input.primary,
      accent: input.accent,
      radius: input.radius,
      font: input.font,
      builtin: false,
      useCount: 0,
    };
    DESIGN_TEMPLATES.unshift(row);
    return { ...row };
  },
  updateDesignTemplate(templateId: string, patch: Partial<DesignTemplateRow>): DesignTemplateRow | undefined {
    const row = DESIGN_TEMPLATES.find((t) => t.id === templateId);
    if (!row) return undefined;
    if (typeof patch.name === 'string') row.name = patch.name.trim().slice(0, 60) || row.name;
    if (typeof patch.description === 'string') row.description = patch.description.trim().slice(0, 180);
    if (typeof patch.category === 'string') row.category = patch.category.trim().slice(0, 30) || row.category;
    if (typeof patch.designId === 'string') row.designId = patch.designId;
    if (typeof patch.primary === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.primary)) row.primary = patch.primary;
    if (typeof patch.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.accent)) row.accent = patch.accent;
    if (patch.radius && RADIUS_IDS.includes(patch.radius)) row.radius = patch.radius;
    if (patch.font && FONT_IDS.includes(patch.font)) row.font = patch.font;
    return { ...row };
  },
  deleteDesignTemplate(templateId: string): boolean {
    const before = DESIGN_TEMPLATES.length;
    DESIGN_TEMPLATES = DESIGN_TEMPLATES.filter((t) => t.id !== templateId);
    return DESIGN_TEMPLATES.length < before;
  },
  bumpDesignTemplateUse(templateId: string): void {
    const row = DESIGN_TEMPLATES.find((t) => t.id === templateId);
    if (row) row.useCount += 1;
  },
  /** Company-wide default design (marketplace tier 2). */
  updateTenantDefaultDesign(tenantId: string, patch: { designId?: string | null; templateId?: string | null }): DemoTenant | undefined {
    const tenant = TENANTS.find((t) => t.id === tenantId);
    if (!tenant) return undefined;
    if (patch.designId !== undefined) tenant.widgetDesign = patch.designId?.trim() || null;
    if (patch.templateId !== undefined) tenant.designTemplateId = patch.templateId?.trim() || null;
    return tenant;
  },
  createThemeTemplate(input: { name: string; description: string; primary: string; accent: string; radius: ThemeRadius; font: ThemeFont }): ThemeTemplateRow {
    const row: ThemeTemplateRow = {
      id: `tpl-${randomUUID().slice(0, 8)}`,
      name: input.name.trim().slice(0, 60),
      description: input.description.trim().slice(0, 160),
      primary: input.primary,
      accent: input.accent,
      radius: input.radius,
      font: input.font,
      builtin: false,
    };
    THEME_TEMPLATES.unshift(row);
    return { ...row };
  },
  updateThemeTemplate(templateId: string, patch: Partial<ThemeTemplateRow>): ThemeTemplateRow | undefined {
    const row = THEME_TEMPLATES.find((t) => t.id === templateId);
    if (!row) return undefined;
    if (typeof patch.name === 'string') row.name = patch.name.trim().slice(0, 60) || row.name;
    if (typeof patch.description === 'string') row.description = patch.description.trim().slice(0, 160);
    if (typeof patch.primary === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.primary)) row.primary = patch.primary;
    if (typeof patch.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.accent)) row.accent = patch.accent;
    if (patch.radius && RADIUS_IDS.includes(patch.radius)) row.radius = patch.radius;
    if (patch.font && FONT_IDS.includes(patch.font)) row.font = patch.font;
    return { ...row };
  },
  deleteThemeTemplate(templateId: string): boolean {
    const before = THEME_TEMPLATES.length;
    THEME_TEMPLATES = THEME_TEMPLATES.filter((t) => t.id !== templateId);
    return THEME_TEMPLATES.length < before;
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

  platformStaffByEmail(email: string): DemoPlatformStaff | undefined {
    return PLATFORM_STAFF.find((m) => m.email === email.toLowerCase().trim());
  },
  patchPlatformStaff(id: string, patch: Partial<Pick<DemoPlatformStaff, 'name' | 'email' | 'role' | 'status' | 'password'>>): DemoPlatformStaff | undefined {
    const m = PLATFORM_STAFF.find((x) => x.id === id);
    if (!m) return undefined;
    if (patch.email && patch.email !== m.email && PLATFORM_STAFF.some((o) => o.email === patch.email)) return undefined;
    Object.assign(m, patch, { lastActiveAt: new Date().toISOString() });
    return m;
  },
  createPlatformStaff(input: { name: string; email: string; role: PlatformRole; password: string }): DemoPlatformStaff | undefined {
    if (PLATFORM_STAFF.some((o) => o.email === input.email)) return undefined;
    const m: DemoPlatformStaff = {
      id: `ps-${randomUUID().slice(0, 6)}`,
      name: input.name,
      email: input.email,
      role: input.role,
      password: input.password,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    PLATFORM_STAFF.push(m);
    return m;
  },
  deletePlatformStaff(id: string): boolean {
    const before = PLATFORM_STAFF.length;
    PLATFORM_STAFF = PLATFORM_STAFF.filter((x) => x.id !== id);
    return PLATFORM_STAFF.length < before;
  },
  appendPlatformAudit(entry: Omit<DemoAuditEntry, 'id' | 'createdAt'>): DemoAuditEntry {
    const row: DemoAuditEntry = { ...entry, id: `pa-${randomUUID().slice(0, 6)}`, createdAt: new Date().toISOString() };
    PLATFORM_AUDIT.unshift(row);
    return row;
  },
  appendTenantAudit(entry: Omit<DemoAuditEntry, 'id' | 'createdAt'> & { tenantId?: string }): DemoAuditEntry {
    const row: DemoAuditEntry = { ...entry, id: `ta-${randomUUID().slice(0, 6)}`, createdAt: new Date().toISOString(), tenantId: entry.tenantId };
    TENANT_AUDIT.unshift(row);
    return row;
  },
  /**
   * Sign-in lookup for the platform console: matches a platform staff account.
   * A matching row is also enough to prove the account exists, even when the
   * role has no direct permissions of its own (e.g. a suspended account).
   */
  platformSignIn(role: string): { account?: DemoPlatformStaff } {
    const account = PLATFORM_STAFF.find((m) => m.role === role && m.status === 'active');
    if (!account) return { account: undefined };
    return { account };
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
      activeApps: APPS.length,
      totalTestimonials: all.length,
      pendingReview: all.filter((r) => r.status === 'pending').length,
    };
  },
  tenantStatusForDetail(tenant: DemoTenant) {
    const apps = APPS.filter((a) => a.tenantId === tenant.id).map((a) => DEMO.appSummary(a));
    const rated = TESTIMONIALS.filter((r) => apps.some((a) => a.id === r.appId) && r.status === 'approved' && typeof r.rating === 'number');
    return {
      id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan, status: tenant.status,
      brandColor: tenant.brandColor ?? null,
      logoUrl: tenant.logoUrl ?? null,
      theme: resolveTheme(tenant),
      monthlyCostUsd: MONTHLY_BY_PLAN[tenant.plan],
      testimonialCount: apps.reduce((s, a) => s + a.totalTestimonials, 0),
      pendingCount: apps.reduce((s, a) => s + a.pending, 0),
      approvedCount: apps.reduce((s, a) => s + a.approved, 0),
      rejectedCount: apps.reduce((s, a) => s + a.rejected, 0),
      formsCount: apps.reduce((s, a) => s + a.forms, 0),
      submissionsCount: apps.reduce((s, a) => s + a.submissions, 0),
      avgRating: rated.length ? Number((rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length).toFixed(1)) : null,
      createdAt: tenant.createdAt, ownerEmail: tenant.ownerEmail,
      seatsUsed: TEAM.filter((m) => m.tenantId === tenant.id).length,
      seatsLimit: tenant.seatsLimit,
      trend: DEMO.trendForTenant(tenant),
      apps,
    };
  },
  /** 7-day activity trend (submissions vs approvals) for one tenant. */
  trendForTenant(tenant: DemoTenant, days = 7): Array<{ day: string; submitted: number; approved: number }> {
    const appIds = new Set(APPS.filter((a) => a.tenantId === tenant.id).map((a) => a.id));
    const rows = TESTIMONIALS.filter((r) => appIds.has(r.appId));
    const today = new Date();
    const buckets: Array<{ day: string; submitted: number; approved: number }> = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
      buckets.push({ day: d.toISOString().slice(0, 10), submitted: 0, approved: 0 });
    }
    const index = new Map(buckets.map((b, i) => [b.day, i]));
    for (const r of rows) {
      const i = index.get(r.createdAt.slice(0, 10));
      if (i === undefined) continue;
      buckets[i].submitted += 1;
      if (r.status === 'approved') buckets[i].approved += 1;
    }
    return buckets;
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

/** In-memory session id -> account email. Restart clears sessions (dev only). */
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
