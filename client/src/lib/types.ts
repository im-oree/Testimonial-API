/** Shared API types (shape-compatible with the Express API responses). */

/** DOC-7 theme types — shape-compatible with server ResolvedTheme / presets. */
export type ThemeRadiusId = 'sm' | 'md' | 'lg';
export type ThemeFontId = 'system' | 'serif' | 'mono';

export interface ResolvedTheme {
  presetId: string;
  primary: string;
  soft: string;
  accent: string;
  radius: ThemeRadiusId;
  radiusPx: number;
  font: ThemeFontId;
  version: number;
  updatedAt: string | null;
}

export interface ThemePresetSummary {
  id: string;
  name: string;
  description: string;
  primary: string;
  accent: string;
  radius: ThemeRadiusId;
  font: ThemeFontId;
  builtin?: boolean;
}

export interface ThemeSaveResponse {
  theme: ResolvedTheme;
  presets?: ThemePresetSummary[];
  logoUrl?: string | null;
  brandColor?: string | null;
}

export interface MeUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

export interface MeTenant {
  id: string;
  name: string;
  slug: string;
  brandColor?: string | null;
  logoUrl?: string | null;
  theme?: ResolvedTheme;
}

export interface MeImpersonating {
  by: string;
  tenantId: string;
  tenantName: string;
}

export interface MeResponse {
  user: MeUser;
  tenant: MeTenant | null;
  permissions: string[];
  permissionsVersion: number;
  impersonating: MeImpersonating | null;
}

export interface Overview {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalTestimonials: number;
  conversionRate?: number;
}

export type TestimonialStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface Testimonial {
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
}

export interface Paged<T> {
  rows: T[];
  total: number;
}

export interface FormRow {
  id: string;
  appId: string;
  name: string;
  slug: string;
  published: boolean;
  submissionCount: number;
  createdAt: string;
}

export interface FormQuestion {
  id: string;
  type: 'text' | 'rating' | 'video' | 'select';
  label: string;
  required: boolean;
  options?: string[];
}

export interface PublicForm {
  id: string;
  slug: string;
  name: string;
  tenantName: string;
  logoUrl: string | null;
  brandColor: string;
  theme?: ResolvedTheme | null;
  appName?: string;
  websiteUrl?: string | null;
  questions: FormQuestion[];
}

export interface PlatformOverview {
  monthlyMrrUsd: number;
  tenants: number;
  subCompanies: number;
  activeApps: number;
  totalTestimonials: number;
  pendingReview: number;
  byTenant: TenantMetricRow[];
}

/** One tenant row on the super-company overview (per-company metrics). */
export interface TenantMetricRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  ownerEmail: string;
  monthlyCostUsd: number;
  products: number;
  testimonials: number;
  approved: number;
  pending: number;
  forms: number;
  responses: number;
  createdAt: string;
}

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  ownerEmail: string;
  monthlyCostUsd: number;
  appCount: number;
  testimonialCount: number;
  pendingCount: number;
  createdAt: string;
}

export interface TenantTrendDay {
  /** UTC date key, e.g. "2026-09-02". */
  day: string;
  submitted: number;
  approved: number;
}

export interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'growth' | 'scale';
  status: 'active' | 'suspended' | 'trialing';
  brandColor: string | null;
  logoUrl: string | null;
  theme?: ResolvedTheme;
  trend: TenantTrendDay[];
  monthlyCostUsd: number;
  testimonialCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  formsCount: number;
  submissionsCount: number;
  avgRating: number | null;
  createdAt: string;
  ownerEmail: string;
  seatsUsed: number;
  seatsLimit: number;
  apps: AppSummary[];
}

/**
 * One product (an app = one website/collection surface a company uses to
 * gather testimonials). Products carry a display code like PRD-ATLS and are
 * fully isolated from every other product.
 */
export interface AppSummary {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  slug: string;
  websiteUrl: string | null;
  description: string | null;
  adminEmail: string | null;
  accentColor: string | null;
  themeOverride?: { primary: string | null; accent: string | null; radius: ThemeRadiusId | null; font: ThemeFontId | null } | null;
  widgetDesign?: string | null;
  status: 'active' | 'paused';
  createdAt: string;
  totalTestimonials: number;
  pending: number;
  approved: number;
  rejected: number;
  archived: number;
  avgRating: number | null;
  forms: number;
  submissions: number;
}

export interface CreateSubCompanyResponse {
  tenant: TenantDetail;
  owner: { id: string; name: string; email: string; role: string };
  credentials: { email: string; password: string };
  message: string;
}

export interface AppsTotals {
  totalTestimonials: number;
  pending: number;
  approved: number;
  rejected: number;
  forms: number;
  submissions: number;
}

export interface AppsResponse {
  rows: AppSummary[];
  total: number;
  totals: AppsTotals;
}

export interface TeamMember {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActiveAt?: string;
}

export interface AuditRow {
  id: string;
  actor: string;
  action: string;
  resource: string;
  ip?: string;
  createdAt: string;
  appId?: string;
}

export interface WallTestimonial {
  id: string;
  content: string;
  authorName: string;
  rating: number | null;
  createdAt: string;
}

export interface PublicWall {
  tenantName: string;
  tenantSlug: string;
  brandColor: string;
  logoUrl: string | null;
  theme?: ResolvedTheme | null;
  design?: string | null;
  app: { id: string; name: string; slug: string; websiteUrl: string | null };
  form: { slug: string; name: string } | null;
  testimonials: WallTestimonial[];
}

export interface LoginResponse {
  requiresMfa: boolean;
  user: { email: string };
  token?: string;
}
