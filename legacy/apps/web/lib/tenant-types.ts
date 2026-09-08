/** Doc 4 — tenant dashboard (shared entity types). Structural skeleton; visual pass in Doc 5. */
export type TestimonialStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface AppSummary {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
}

export interface TestimonialItem {
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

export interface OverviewData {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalTestimonials: number;
  conversionRate?: number;
}

export interface FormQuestion {
  id: string;
  type: 'text' | 'rating' | 'video' | 'select';
  label: string;
  required: boolean;
}

export interface FormSummary {
  id: string;
  appId: string;
  name: string;
  slug: string;
  published: boolean;
  submissionCount?: number;
  createdAt: string;
}

export interface FormDetail extends FormSummary {
  questions: FormQuestion[];
}

export interface FormStats {
  submissions: number;
  completionRate: number;
  avgRating?: number;
}

export interface WidgetSummary {
  id: string;
  appId: string;
  formId?: string | null;
  name: string;
  enabled: boolean;
  theme: 'light' | 'dark';
  accentColor: string;
  embedType: 'script' | 'iframe' | 'react';
  updatedAt: string;
}

export interface WidgetDetail extends WidgetSummary {
  fontFamily?: string;
  title?: string;
  ctaText?: string;
  embedCode?: Record<string, string>;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
  lastActiveAt?: string;
}

export interface WebhookSummary {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secretMasked?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: 'success' | 'failed' | 'retrying';
  statusCode?: number;
  attemptedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  ip?: string;
  createdAt: string;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt?: string | null;
  createdAt: string;
  scopes: string[];
}

export interface BillingSummary {
  plan: string;
  status: 'active' | 'past_due' | 'canceled';
  seatsUsed: number;
  seatsLimit: number;
  nextInvoiceAt?: string;
  monthlyCostUsd: number;
}

export interface ImportJob {
  id: string;
  fileName: string;
  status: 'queued' | 'mapping' | 'processing' | 'done' | 'failed';
  totalRows?: number;
  importedRows?: number;
  createdAt: string;
}

export interface ExportJob {
  id: string;
  format: 'csv' | 'json';
  status: 'queued' | 'processing' | 'done' | 'failed';
  downloadUrl?: string;
  createdAt: string;
}
