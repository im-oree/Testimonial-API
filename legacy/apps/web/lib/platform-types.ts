/** Doc 4 — platform dashboard (shared entity types). Structural skeleton; visual pass in Doc 5. */
export type TenantStatus = 'active' | 'suspended' | 'trialing';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: TenantStatus;
  testimonialCount?: number;
  createdAt: string;
}

export interface TenantDetail extends TenantSummary {
  ownerEmail: string;
  seatsUsed: number;
  seatsLimit: number;
  apps: Array<{ id: string; name: string }>;
}

export interface TenantStaffMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
}

export interface PlatformOverviewData {
  tenants: number;
  totalTestimonials: number;
  pendingReview: number;
  activeApps: number;
  monthlyMrrUsd: number;
}

export interface PlatformStaffMember {
  id: string;
  name: string;
  email: string;
  role: 'platform_admin' | 'platform_support';
  status: 'active' | 'invited' | 'suspended';
  lastActiveAt?: string;
}

export interface InvoiceSummary {
  id: string;
  tenantName: string;
  amountUsd: number;
  status: 'paid' | 'open' | 'past_due';
  periodStart?: string;
  createdAt: string;
}

export interface WebhookSummary {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  ip?: string;
  createdAt: string;
}

export interface AiProvider {
  id: string;
  name: string;
  models: string[];
  enabled: boolean;
  defaultModel?: string;
}

export interface AiTaskLog {
  id: string;
  provider: string;
  operation: 'classify' | 'summarize' | 'flag';
  status: 'success' | 'failed' | 'skipped';
  latencyMs?: number;
  costUsd?: number;
  createdAt: string;
}

export interface AiCostRow {
  provider: string;
  usd: number;
}

export interface AiCostSummary {
  period: string;
  totalUsd: number;
  byProvider: AiCostRow[];
}
