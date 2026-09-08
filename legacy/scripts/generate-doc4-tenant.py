#!/usr/bin/env python3
"""Doc-4 tenant-dashboard scaffold generator (apps/tenant-dashboard).

Writes the route tree (app/*), stores/ui.store.ts, lib/types.ts and the §7
hooks directory with real React Query + axios wiring and uniform
loading/empty/error page states. Styling/Radix polish: Doc 5.
Run from repo root: python3 scripts/generate-doc4-tenant.py
"""
import os

ROOT = os.path.join("apps", "tenant-dashboard")


def write(rel, src):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(src)
    print("wrote", p)


def doc(note):
    return f"/** Doc 4 — tenant dashboard ({note}). Structural skeleton; visual pass in Doc 5. */\n"


# ---------------------------------------------------------------- lib/types.ts
TYPES = doc("shared entity types") + """export type TestimonialStatus = 'pending' | 'approved' | 'rejected' | 'archived';

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
"""

# ------------------------------------------------------------ stores/ui.store.ts
UI_STORE = doc("§2.1 tenant UI store — active app + shell prefs") + """'use client';

import { create } from 'zustand';

interface UiState {
  activeAppId: string | null;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  setActiveApp: (appId: string) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

/**
 * Zustand store for shell state (Doc 4 §2). The active app scopes every
 * React Query key via queryKeys, so switching apps re-scopes all data views.
 */
export const useUiStore = create<UiState>((set) => ({
  activeAppId: null,
  sidebarCollapsed: false,
  theme: 'light',
  setActiveApp: (appId) => set({ activeAppId: appId }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
}));
"""

# --------------------------------------------------------------------- hooks
HOOKS = {
    "use-dashboard-overview.ts": {
        "exports": "OverviewData",
        "key": "['overview']",
        "path": "'/v1/dashboard/overview'",
        "isTenantRoot": True,
    },
}

# Hand-written hooks below (each real, typed, query-key-scoped).

HOOK_OVERVIEW = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { OverviewData } from '../lib/types';

export function useDashboardOverview(appId?: string) {
  return useQuery({
    queryKey: ['overview', appId ?? '__all__'] as const,
    queryFn: async () => {
      const res = await apiClient.get<OverviewData>('/v1/dashboard/overview', {
        params: appId ? { appId } : undefined,
      });
      return res.data;
    },
    enabled: Boolean(appId),
  });
}
"""

HOOK_TESTIMONIALS = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TestimonialItem, TestimonialStatus } from '../lib/types';

export interface TestimonialFilters {
  page?: number;
  perPage?: number;
  status?: TestimonialStatus | 'all';
  q?: string;
  tags?: string[];
  sort?: string;
}

export function useTestimonials(appId: string | undefined, filters: TestimonialFilters = {}) {
  return useQuery({
    queryKey: queryKeys.testimonials.list(appId ?? '__all__', filters),
    queryFn: async () => {
      if (!appId) return [] as TestimonialItem[];
      const res = await apiClient.get<{ rows: TestimonialItem[]; total: number }>(
        `/v1/apps/${appId}/testimonials`,
        { params: { ...filters, page: filters.page ?? 1, perPage: filters.perPage ?? 50 } },
      );
      return res.data.rows;
    },
    enabled: Boolean(appId),
    placeholderData: (prev) => prev,
  });
}
"""

HOOK_TESTIMONIAL_DETAIL = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TestimonialItem } from '../lib/types';

export function useTestimonialDetail(appId: string | undefined, id: string) {
  return useQuery({
    queryKey: queryKeys.testimonials.detail(appId ?? '__all__', id),
    queryFn: async () => {
      const res = await apiClient.get<TestimonialItem>(`/v1/apps/${appId}/testimonials/${id}`);
      return res.data;
    },
    enabled: Boolean(appId),
  });
}
"""

HOOK_TESTIMONIAL_MUTATIONS = doc("§7 hook") + """'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';

export type ModerateAction = 'approve' | 'reject' | 'archive';

/**
 * Moderation mutations (approve/reject/archive/bulk) — optimistic UI is
 * layered on these in Doc 5; each call invalidates the app's testimonial
 * cache so list/detail/overview stay coherent.
 */
export function useTestimonialMutations() {
  const qc = useQueryClient();

  const moderate = useCallback(
    async (appId: string, id: string, action: ModerateAction, reason?: string) => {
      const res = await apiClient.patch(`/v1/apps/${appId}/testimonials/${id}/moderation`, { action, reason });
      await qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      await qc.invalidateQueries({ queryKey: queryKeys.apps.stats(appId) });
      return res.data;
    },
    [qc],
  );

  const bulkModerate = useCallback(
    async (appId: string, ids: string[], action: ModerateAction) => {
      const res = await apiClient.post(`/v1/apps/${appId}/testimonials/bulk/moderation`, { ids, action });
      await qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      return res.data;
    },
    [qc],
  );

  const deleteTestimonial = useCallback(
    async (appId: string, id: string) => {
      const res = await apiClient.delete(`/v1/apps/${appId}/testimonials/${id}`);
      await qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      return res.data;
    },
    [qc],
  );

  const tag = useCallback(
    async (appId: string, id: string, tags: string[]) => {
      const res = await apiClient.patch(`/v1/apps/${appId}/testimonials/${id}`, { tags });
      await qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      return res.data;
    },
    [qc],
  );

  return { moderate, bulkModerate, deleteTestimonial, tag };
}
"""

HOOK_TAGS = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';

export function useTestimonialTags(appId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.testimonials.all(appId ?? '__all__'), 'tags'] as const,
    queryFn: async () => {
      if (!appId) return [] as string[];
      const res = await apiClient.get<{ tags: string[] }>(`/v1/apps/${appId}/testimonials/tags`);
      return res.data.tags;
    },
    enabled: Boolean(appId),
  });
}
"""

HOOK_IMPORT = doc("§7 hook") + """'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { ImportJob } from '../lib/types';

export function useTestimonialImport(appId: string | undefined) {
  const qc = useQueryClient();
  const importJobs = useQuery({
    queryKey: [...queryKeys.testimonials.all(appId ?? '__all__'), 'imports'] as const,
    queryFn: async () => {
      if (!appId) return [] as ImportJob[];
      const res = await apiClient.get<{ rows: ImportJob[] }>(`/v1/apps/${appId}/imports`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });

  const submitCsvImport = useCallback(
    async (appId: string, file: File, columnMapping: Record<string, string>) => {
      const form = new FormData();
      form.append('file', file);
      form.append('mapping', JSON.stringify(columnMapping));
      const res = await apiClient.post(`/v1/apps/${appId}/imports`, form);
      await qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      return res.data;
    },
    [qc],
  );

  return { ...importJobs, submitCsvImport };
}
"""

HOOK_EXPORT = doc("§7 hook") + """'use client';

import { useCallback, useState } from 'react';
import { apiClient } from '@testimonial-api/ui';

export function useTestimonialExport() {
  const [exporting, setExporting] = useState(false);
  const exportCsv = useCallback(async (appId: string, format: 'csv' | 'json' = 'csv') => {
    setExporting(true);
    try {
      const res = await apiClient.get<{ downloadUrl: string }>(`/v1/apps/${appId}/testimonials/export`, {
        params: { format },
      });
      return res.data.downloadUrl;
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportCsv, exporting };
}
"""

HOOK_FORMS = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { FormSummary } from '../lib/types';

export function useForms(appId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.forms.all(appId ?? '__all__'),
    queryFn: async () => {
      if (!appId) return [] as FormSummary[];
      const res = await apiClient.get<{ rows: FormSummary[] }>(`/v1/apps/${appId}/forms`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });
}
"""

HOOK_FORM_DETAIL = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { FormDetail } from '../lib/types';

export function useFormDetail(appId: string | undefined, formId: string) {
  return useQuery({
    queryKey: queryKeys.forms.detail(appId ?? '__all__', formId),
    queryFn: async () => {
      const res = await apiClient.get<FormDetail>(`/v1/apps/${appId}/forms/${formId}`);
      return res.data;
    },
    enabled: Boolean(appId),
  });
}
"""

HOOK_FORM_MUTATIONS = doc("§7 hook") + """'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { FormDetail, FormQuestion } from '../lib/types';

export function useFormMutations() {
  const qc = useQueryClient();

  const saveForm = useCallback(
    async (appId: string, form: Partial<FormDetail>, questions: FormQuestion[]) => {
      const res = await apiClient.post<FormDetail>(`/v1/apps/${appId}/forms${form.id ? `/${form.id}` : ''}`, {
        name: form.name,
        slug: form.slug,
        questions,
      });
      await qc.invalidateQueries({ queryKey: queryKeys.forms.all(appId) });
      return res.data;
    },
    [qc],
  );

  const togglePublished = useCallback(
    async (appId: string, formId: string, published: boolean) => {
      const res = await apiClient.patch(`/v1/apps/${appId}/forms/${formId}`, { published });
      await qc.invalidateQueries({ queryKey: queryKeys.forms.all(appId) });
      return res.data;
    },
    [qc],
  );

  return { saveForm, togglePublished };
}
"""

HOOK_FORM_STATS = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { FormStats } from '../lib/types';

export function useFormStats(appId: string | undefined, formId: string) {
  return useQuery({
    queryKey: [...queryKeys.forms.detail(appId ?? '__all__', formId), 'stats'] as const,
    queryFn: async () => {
      const res = await apiClient.get<FormStats>(`/v1/apps/${appId}/forms/${formId}/stats`);
      return res.data;
    },
    enabled: Boolean(appId),
  });
}
"""

HOOK_WIDGETS = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WidgetSummary } from '../lib/types';

export function useWidgets(appId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.widgets.all(appId ?? '__all__'),
    queryFn: async () => {
      if (!appId) return [] as WidgetSummary[];
      const res = await apiClient.get<{ rows: WidgetSummary[] }>(`/v1/apps/${appId}/widgets`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });
}
"""

HOOK_WIDGET_DETAIL = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WidgetDetail } from '../lib/types';

export function useWidgetDetail(appId: string | undefined, widgetId: string) {
  return useQuery({
    queryKey: queryKeys.widgets.detail(appId ?? '__all__', widgetId),
    queryFn: async () => {
      const res = await apiClient.get<WidgetDetail>(`/v1/apps/${appId}/widgets/${widgetId}`);
      return res.data;
    },
    enabled: Boolean(appId),
  });
}
"""

HOOK_WIDGET_MUTATIONS = doc("§7 hook") + """'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WidgetDetail } from '../lib/types';

export function useWidgetMutations() {
  const qc = useQueryClient();

  const saveWidget = useCallback(
    async (appId: string, widget: Partial<WidgetDetail>) => {
      const res = await apiClient.post<WidgetDetail>(
        `/v1/apps/${appId}/widgets${widget.id ? `/${widget.id}` : ''}`,
        widget,
      );
      await qc.invalidateQueries({ queryKey: queryKeys.widgets.all(appId) });
      return res.data;
    },
    [qc],
  );

  const toggleEnabled = useCallback(
    async (appId: string, widgetId: string, enabled: boolean) => {
      const res = await apiClient.patch(`/v1/apps/${appId}/widgets/${widgetId}`, { enabled });
      await qc.invalidateQueries({ queryKey: queryKeys.widgets.all(appId) });
      return res.data;
    },
    [qc],
  );

  return { saveWidget, toggleEnabled };
}
"""

HOOK_WIDGET_PREVIEW = doc("§7 hook") + """'use client';

import { useState } from 'react';

/**
 * Local-only live-preview state for WidgetBuilder. The actual widget renderer
 * (shared embed code) renders the preview in Doc 5; here we keep the hook
 * contract: { overrides, update, embedCode }.
 */
export interface WidgetPreviewOverrides {
  theme: 'light' | 'dark';
  accentColor: string;
  fontFamily?: string;
}

export function useWidgetLivePreview(initial: WidgetPreviewOverrides = { theme: 'light', accentColor: '#6366f1' }) {
  const [overrides, setOverrides] = useState<WidgetPreviewOverrides>(initial);
  const update = (patch: Partial<WidgetPreviewOverrides>): void => setOverrides((o) => ({ ...o, ...patch }));
  return { overrides, update };
}
"""

HOOK_TEAM = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TeamMember } from '../lib/types';

export function useTeam() {
  return useQuery({
    queryKey: queryKeys.staff.list(),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: TeamMember[] }>('/v1/team');
      return res.data.rows;
    },
  });
}
"""

HOOK_TEAM_MUTATIONS = doc("§7 hook") + """'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';

/** Invite / role change / suspend. Role changes surface everywhere via
 *  `permissions_changed` → /me refetch → sidebar re-render (Doc 4 §B/C). */
export function useTeamMutations() {
  const qc = useQueryClient();
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: queryKeys.staff.list() }), [qc]);

  const invite = useCallback(
    async (email: string, role: string) => {
      const res = await apiClient.post('/v1/team/invites', { email, role });
      await refresh();
      return res.data;
    },
    [refresh],
  );

  const changeRole = useCallback(
    async (memberId: string, role: string) => {
      const res = await apiClient.patch(`/v1/team/${memberId}`, { role });
      await refresh();
      await qc.invalidateQueries({ queryKey: queryKeys.me });
      return res.data;
    },
    [qc, refresh],
  );

  const suspend = useCallback(
    async (memberId: string, suspended: boolean) => {
      const res = await apiClient.patch(`/v1/team/${memberId}`, { status: suspended ? 'suspended' : 'active' });
      await refresh();
      return res.data;
    },
    [refresh],
  );

  return { invite, changeRole, suspend };
}
"""

HOOK_WEBHOOKS = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WebhookSummary } from '../lib/types';

export function useWebhooks(appId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.webhooks.all(appId ?? '__all__'),
    queryFn: async () => {
      if (!appId) return [] as WebhookSummary[];
      const res = await apiClient.get<{ rows: WebhookSummary[] }>(`/v1/apps/${appId}/webhooks`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });
}
"""

HOOK_WEBHOOK_DELIVERIES = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WebhookDelivery } from '../lib/types';

export function useWebhookDeliveries(appId: string | undefined, webhookId: string) {
  return useQuery({
    queryKey: queryKeys.webhooks.deliveries(appId ?? '__all__', webhookId),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: WebhookDelivery[] }>(`/v1/apps/${appId}/webhooks/${webhookId}/deliveries`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });
}
"""

HOOK_AUDIT = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { AuditLogEntry } from '../lib/types';

export function useAuditLogs(filters: { page?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(filters),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: AuditLogEntry[] }>('/v1/audit-logs', { params: filters });
      return res.data.rows;
    },
  });
}
"""

HOOK_API_KEYS = doc("§7 hook") + """'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@testimonial-api/ui';
import type { ApiKeySummary } from '../lib/types';

export function useApiKeys(appId: string | undefined) {
  const qc = useQueryClient();
  const keys = useQuery({
    queryKey: ['api-keys', appId ?? '__all__'] as const,
    queryFn: async () => {
      if (!appId) return [] as ApiKeySummary[];
      const res = await apiClient.get<{ rows: ApiKeySummary[] }>(`/v1/apps/${appId}/api-keys`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });

  const rotateKey = useCallback(
    async (appId: string, keyId: string) => {
      const res = await apiClient.post(`/v1/apps/${appId}/api-keys/${keyId}/rotate`);
      await qc.invalidateQueries({ queryKey: ['api-keys', appId] });
      return res.data;
    },
    [qc],
  );

  const createKey = useCallback(
    async (appId: string, name: string, scopes: string[]) => {
      const res = await apiClient.post(`/v1/apps/${appId}/api-keys`, { name, scopes });
      await qc.invalidateQueries({ queryKey: ['api-keys', appId] });
      return res.data;
    },
    [qc],
  );

  return { ...keys, rotateKey, createKey };
}
"""

HOOK_BILLING = doc("§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { BillingSummary } from '../lib/types';

export function useBilling() {
  return useQuery({
    queryKey: queryKeys.billing,
    queryFn: async () => {
      const res = await apiClient.get<BillingSummary>('/v1/billing');
      return res.data;
    },
  });
}
"""

HOOK_FILES = [
    ("hooks/use-dashboard-overview.ts", HOOK_OVERVIEW),
    ("hooks/use-testimonials.ts", HOOK_TESTIMONIALS),
    ("hooks/use-testimonial-detail.ts", HOOK_TESTIMONIAL_DETAIL),
    ("hooks/use-testimonial-mutations.ts", HOOK_TESTIMONIAL_MUTATIONS),
    ("hooks/use-testimonial-tags.ts", HOOK_TAGS),
    ("hooks/use-testimonial-import.ts", HOOK_IMPORT),
    ("hooks/use-testimonial-export.ts", HOOK_EXPORT),
    ("hooks/use-forms.ts", HOOK_FORMS),
    ("hooks/use-form-detail.ts", HOOK_FORM_DETAIL),
    ("hooks/use-form-mutations.ts", HOOK_FORM_MUTATIONS),
    ("hooks/use-form-stats.ts", HOOK_FORM_STATS),
    ("hooks/use-widgets.ts", HOOK_WIDGETS),
    ("hooks/use-widget-detail.ts", HOOK_WIDGET_DETAIL),
    ("hooks/use-widget-mutations.ts", HOOK_WIDGET_MUTATIONS),
    ("hooks/use-widget-live-preview.ts", HOOK_WIDGET_PREVIEW),
    ("hooks/use-team.ts", HOOK_TEAM),
    ("hooks/use-team-mutations.ts", HOOK_TEAM_MUTATIONS),
    ("hooks/use-webhooks.ts", HOOK_WEBHOOKS),
    ("hooks/use-webhook-deliveries.ts", HOOK_WEBHOOK_DELIVERIES),
    ("hooks/use-audit-logs.ts", HOOK_AUDIT),
    ("hooks/use-api-keys.ts", HOOK_API_KEYS),
    ("hooks/use-billing.ts", HOOK_BILLING),
]

# ------------------------------------------------------------------- layouts
ROOT_LAYOUT = doc("app root layout — QueryClient provider") + """import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@testimonial-api/ui';
import './globals.css';

export const metadata = {
  title: 'Testimonial API — Dashboard',
  description: 'Collect and manage video and text testimonials.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}
"""

GLOBALS = """/** Doc 4 structural CSS — visual design system arrives in Doc 5. */
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }

:root {
  --tui-bg: #ffffff;
  --tui-fg: #18181b;
  --tui-border: #e4e4e7;
  --tui-primary: #4f46e5;
  --tui-danger: #dc2626;
  --tui-success: #16a34a;
  --tui-warning: #d97706;
}

[data-tone='success'] { color: var(--tui-success); }
[data-tone='warning'] { color: var(--tui-warning); }
[data-tone='danger'] { color: var(--tui-danger); }

table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid var(--tui-border); padding: 6px 8px; text-align: left; }
button { cursor: pointer; }
"""

DASH_LAYOUT = doc("(dashboard) guard layout — useMe + useRealtime + sidebar + impersonation banner") + """'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ImpersonationBanner,
  LoadingState,
  RealtimeIndicator,
  Sidebar,
  type NavItem,
  useMe,
  useRealtime,
} from '@testimonial-api/ui';
import { useUiStore } from '../../stores/ui.store';

const NAV: Array<{ label: string; href: string; permission?: string }> = [
  { label: 'Overview', href: '/overview' },
  { label: 'Testimonials', href: '/testimonials', permission: 'testimonials.read' },
  { label: 'Moderation', href: '/testimonials/moderation', permission: 'testimonials.moderate' },
  { label: 'Forms', href: '/forms', permission: 'forms.manage' },
  { label: 'Widgets', href: '/widgets', permission: 'widgets.manage' },
  { label: 'Team', href: '/team', permission: 'team.manage' },
  { label: 'Webhooks', href: '/webhooks', permission: 'webhooks.manage' },
  { label: 'Audit log', href: '/audit' },
  { label: 'Billing', href: '/billing', permission: 'billing.view' },
  { label: 'Settings', href: '/settings', permission: 'settings.manage' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const activeAppId = useUiStore((s) => s.activeAppId);
  const realtime = useRealtime({ appId: activeAppId ?? undefined, meEnabled: true });

  useEffect(() => {
    if (me.isError) router.replace('/login?reason=session_expired');
  }, [me.isError, router]);

  if (me.isLoading || me.isError) return <LoadingState label="Checking your session…" />;
  const user = me.data?.user;
  const tenant = me.data?.tenant;
  const permissions = me.data?.permissions ?? [];

  const items: NavItem[] = NAV.filter((n) => !n.permission || permissions.includes(n.permission)).map((n) => ({
    label: n.label,
    href: n.href,
    permission: n.permission,
    active: pathname === n.href || pathname.startsWith(n.href + '/'),
  }));

  return (
    <div data-testid="dashboard-shell">
      {me.data?.impersonating && (
        <ImpersonationBanner tenantName={me.data.impersonating.tenantName} />
      )}
      <Sidebar items={items} />
      <div style={{ marginLeft: 240 }}>
        <header style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: 8 }}>
          <RealtimeIndicator connected={realtime.connected} />
          <span data-testid="current-tenant">{tenant?.name ?? '…'}</span>
          <span data-testid="current-user">{user?.name}</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
"""

DASH_PAGE = doc("(dashboard) index → overview") + """import { redirect } from 'next/navigation';

export default function DashboardIndexPage() {
  redirect('/overview');
}
"""

MARKETING_PAGE = doc("login redirect page") + """import { redirect } from 'next/navigation';

export default function MarketingLandingPage() {
  redirect('/login');
}
"""

# ------------------------------------------------------------------ auth pages
LOGIN_PAGE = doc("§2.2 login — email/password + Google SSO + MFA hand-off") + """'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, Button, Input, Label } from '@testimonial-api/ui';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/overview';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(searchParams.get('reason'));
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ requiresMfa?: boolean; user?: { email: string } }>('/v1/auth/login', {
        email,
        password,
      });
      if (res.data.requiresMfa) {
        router.push(`/login/mfa?email=${encodeURIComponent(email)}`);
      } else {
        router.push(next);
      }
    } catch {
      setError('Invalid email or password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 380, margin: '80px auto' }}>
      <h1>Sign in</h1>
      {error && <p role="alert" data-testid="login-error">{error}</p>}
      <form onSubmit={submit}>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button variant="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <Button variant="ghost" onClick={() => window.location.assign('/v1/auth/google')}>Continue with Google</Button>
    </main>
  );
}
"""

MFA_PAGE = doc("§2.2 MFA challenge") + """'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, Button, Input, Label } from '@testimonial-api/ui';

export default function MfaPage() {
  const router = useRouter();
  const email = useSearchParams().get('email') ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient.post('/v1/auth/mfa/verify', { email, code });
      router.push('/overview');
    } catch {
      setError('That code did not work — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 380, margin: '80px auto' }}>
      <h1>Two-factor authentication</h1>
      <p>Enter the 6-digit code from your authenticator app.</p>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submit}>
        <Label htmlFor="code">Code</Label>
        <Input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
        <Button variant="primary" disabled={busy || code.length < 6}>Verify</Button>
      </form>
    </main>
  );
}
"""

ONBOARDING_VIEW = doc("§2.2 onboarding — invite token → set password → staff record") + """'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Button, Input, Label } from '@testimonial-api/ui';

export function OnboardingView({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient.post('/v1/auth/onboarding', { token, name, password });
      router.replace('/login?onboarded=1');
    } catch {
      setError('This invite link is invalid or expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: '80px auto' }}>
      <h1>Set up your account</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submit}>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button variant="primary" disabled={busy}>Create account</Button>
      </form>
    </main>
  );
}
"""

ONBOARDING_PAGE = doc("§2.2 onboarding route (Next 15: params is a Promise)") + """import { OnboardingView } from './onboarding-view';
import { ForbiddenPage } from '@testimonial-api/ui';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return <ForbiddenPage />;
  return <OnboardingView token={token} />;
}
"""

ACCEPT_INVITE_VIEW = doc("accept invite → staff record") + """'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Button, Input, Label } from '@testimonial-api/ui';

export function AcceptInviteView({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient.post('/v1/auth/invites/accept', { token, name, password });
      router.replace('/login?invite=accepted');
    } catch {
      setError('This invite is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: '80px auto' }}>
      <h1>Join your team</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submit}>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button variant="primary" disabled={busy}>Accept invite</Button>
      </form>
    </main>
  );
}
"""

ACCEPT_PAGE = doc("accept-invite route (Next 15: params is a Promise)") + """import { AcceptInviteView } from './accept-invite-view';
import { ForbiddenPage } from '@testimonial-api/ui';

export const dynamic = 'force-dynamic';

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return <ForbiddenPage />;
  return <AcceptInviteView token={token} />;
}
"""

# ------------------------------------------------------------- data view pages
def states_block(hook_expression, loading_label):
    return f"""  const view = {hook_expression};
  if (view.isLoading) return <LoadingState label="{loading_label}" />;
  if (view.isError) return <ErrorState title="Could not load data" retry={{{{ () => void view.refetch() }}}} />;
"""

OVERVIEW_PAGE = doc("overview — stat cards + trend chart (Recharts in Doc 5)") + """'use client';

import { EmptyState, ErrorState, LoadingState, PageContainer, StatCard } from '@testimonial-api/ui';
import { useDashboardOverview } from '../../../hooks/use-dashboard-overview';
import { useUiStore } from '../../../stores/ui.store';

export default function OverviewPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const overview = useDashboardOverview(appId ?? undefined);
  if (overview.isLoading || !appId) return <LoadingState label="Loading overview…" />;
  if (overview.isError) return <ErrorState title="Could not load overview" retry={() => void overview.refetch()} />;
  const data = overview.data;
  if (!data || data.totalTestimonials === 0) {
    return (
      <PageContainer title="Overview">
        <EmptyState title="No testimonials yet" description="Publish a form or widget to start collecting feedback." />
      </PageContainer>
    );
  }
  return (
    <PageContainer title="Overview">
      <StatCard label="Pending review" value={data.totalPending} />
      <StatCard label="Approved" value={data.totalApproved} />
      <StatCard label="Rejected" value={data.totalRejected} />
      <StatCard label="Total" value={data.totalTestimonials} />
    </PageContainer>
  );
}
"""

TESTIMONIALS_PAGE = doc("testimonials — table + filters + bulk actions + import dialog + export") + """'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  BulkActionBar,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  ImportCsvDialog,
  Input,
  LoadingState,
  PageContainer,
  Select,
  type Column,
} from '@testimonial-api/ui';
import { useTestimonialImport } from '../../../hooks/use-testimonial-import';
import { useTestimonialExport } from '../../../hooks/use-testimonial-export';
import { useTestimonialMutations } from '../../../hooks/use-testimonial-mutations';
import { useTestimonials, type TestimonialFilters } from '../../../hooks/use-testimonials';
import { useUiStore } from '../../../stores/ui.store';

const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Archived', value: 'archived' },
];

export default function TestimonialsPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const [filters, setFilters] = useState<TestimonialFilters>({ status: 'all', page: 1, perPage: 50 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const testimonials = useTestimonials(appId ?? undefined, filters);
  const mutations = useTestimonialMutations();
  const importApi = useTestimonialImport(appId ?? undefined);
  const exportApi = useTestimonialExport();

  const rows = useMemo(() => (testimonials.data ?? []).map((t) => ({ ...t })), [testimonials.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'authorName', header: 'Author', cell: (r) => r.authorName ?? 'Anonymous' },
    { key: 'content', header: 'Content', cell: (r) => (r.content.length > 120 ? `${r.content.slice(0, 120)}…` : r.content) },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>{r.status}</Badge> },
    { key: 'createdAt', header: 'Received' },
  ];

  if (testimonials.isLoading) return <LoadingState label="Loading testimonials…" />;
  if (testimonials.isError) return <ErrorState title="Could not load testimonials" retry={() => void testimonials.refetch()} />;
  if (testimonials.data && testimonials.data.length === 0 && filters.status === 'all' && !filters.q) {
    return (
      <PageContainer title="Testimonials">
        <EmptyState title="No testimonials yet" action={<Button onClick={() => setImportOpen(true)}>Import CSV</Button>} />
        <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Testimonials"
      actions={
        <>
          <Button onClick={() => setImportOpen(true)}>Import CSV</Button>
          <Button onClick={() => void exportApi.exportCsv(appId ?? '')} disabled={exportApi.exporting}>Export</Button>
        </>
      }
    >
      <Card>
        <Select options={STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v as TestimonialFilters['status'] }))} />
        <Input placeholder="Search testimonials…" onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        <BulkActionBar
          count={selected.size}
          busy={false}
          onApprove={() => void (appId && selected.size && mutations.bulkModerate(appId, [...selected], 'approve').then(() => setSelected(new Set())))}
          onReject={() => void (appId && selected.size && mutations.bulkModerate(appId, [...selected], 'reject').then(() => setSelected(new Set())))}
          onDelete={() => void (appId && selected.size && Promise.all([...selected].map((id) => mutations.deleteTestimonial(appId, id))).then(() => setSelected(new Set())))}
        />
        <DataTable
          data={rows}
          columns={columns}
          selectable
          selectedKeys={selected}
          onToggleRow={(row, checked) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (checked) next.add(String(row.id));
              else next.delete(String(row.id));
              return next;
            })
          }
        />
      </Card>
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      {importApi.data && importApi.data.length > 0 && (
        <p data-testid="import-jobs">{importApi.data.length} import job(s) recently</p>
      )}
    </PageContainer>
  );
}
"""

TESTIMONIAL_DETAIL_VIEW = doc("testimonial detail — full record + moderation actions + tags") + """'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  DestructiveConfirmDialog,
  EmptyState,
  ErrorState,
  JsonViewer,
  LoadingState,
  PageContainer,
  TagInput,
} from '@testimonial-api/ui';
import { useTestimonialDetail } from '../../../../hooks/use-testimonial-detail';
import { useTestimonialMutations } from '../../../../hooks/use-testimonial-mutations';
import { useUiStore } from '../../../../stores/ui.store';

export function TestimonialDetailView({ id }: { id: string }) {
  const router = useRouter();
  const appId = useUiStore((s) => s.activeAppId);
  const detail = useTestimonialDetail(appId ?? undefined, id);
  const mutations = useTestimonialMutations();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!appId) return <LoadingState label="Select an app…" />;
  if (detail.isLoading) return <LoadingState label="Loading testimonial…" />;
  if (detail.isError) return <ErrorState title="Could not load this testimonial" retry={() => void detail.refetch()} />;
  const t = detail.data;
  if (!t) return <EmptyState title="Not found" description="This testimonial does not exist." />;

  return (
    <PageContainer title="Testimonial detail">
      <article data-testid="testimonial-detail">
        <blockquote>{t.content}</blockquote>
        <p>— {t.authorName ?? 'Anonymous'} · <Badge tone={t.status === 'approved' ? 'success' : t.status === 'rejected' ? 'danger' : 'warning'}>{t.status}</Badge></p>
        <TagInput value={t.tags} />
        {t.mediaUrl && <p><a href={t.mediaUrl}>View attached media</a></p>}
        <JsonViewer value={{ id: t.id, rating: t.rating, createdAt: t.createdAt }} />
      </article>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={() => void mutations.moderate(appId, id, 'approve')}>Approve</Button>
        <Button onClick={() => void mutations.moderate(appId, id, 'reject')}>Reject</Button>
        <Button onClick={() => void mutations.moderate(appId, id, 'archive')}>Archive</Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
      </div>
      <DestructiveConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete testimonial"
        description="This permanently removes the record."
        confirmText="DELETE"
        onConfirm={() => void mutations.deleteTestimonial(appId, id).then(() => router.push('/testimonials'))}
      />
    </PageContainer>
  );
}
"""
TESTIMONIAL_DETAIL_PAGE = doc("testimonials/[id] route") + """import { TestimonialDetailView } from './testimonial-detail-view';

export const dynamic = 'force-dynamic';

export default async function TestimonialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestimonialDetailView id={id} />;
}
"""

MODERATION_PAGE = doc("moderation queue — kanban by status") + """'use client';

import { EmptyState, ErrorState, LoadingState, PageContainer, TestimonialKanban } from '@testimonial-api/ui';
import { useTestimonialMutations } from '../../../../hooks/use-testimonial-mutations';
import { useTestimonials } from '../../../../hooks/use-testimonials';
import { useUiStore } from '../../../../stores/ui.store';

export default function ModerationPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const pending = useTestimonials(appId ?? undefined, { status: 'pending', perPage: 100 });
  const approved = useTestimonials(appId ?? undefined, { status: 'approved', perPage: 100 });
  const rejected = useTestimonials(appId ?? undefined, { status: 'rejected', perPage: 100 });
  const mutations = useTestimonialMutations();

  if (pending.isLoading || approved.isLoading || rejected.isLoading || !appId) return <LoadingState label="Loading moderation queue…" />;
  if (pending.isError || approved.isError || rejected.isError) return <ErrorState title="Could not load the moderation queue" retry={() => { void pending.refetch(); void approved.refetch(); void rejected.refetch(); }} />;
  const columns = [
    { id: 'pending', title: 'Pending', items: (pending.data ?? []).map((t) => ({ id: t.id, summary: t.content.slice(0, 80), status: 'pending' })) },
    { id: 'approved', title: 'Approved', items: (approved.data ?? []).map((t) => ({ id: t.id, summary: t.content.slice(0, 80), status: 'approved' })) },
    { id: 'rejected', title: 'Rejected', items: (rejected.data ?? []).map((t) => ({ id: t.id, summary: t.content.slice(0, 80), status: 'rejected' })) },
  ];
  const empty = columns.every((c) => c.items.length === 0);
  if (empty) {
    return (
      <PageContainer title="Moderation">
        <EmptyState title="Queue is clear" description="Nothing waiting for review right now." />
      </PageContainer>
    );
  }
  return (
    <PageContainer title="Moderation">
      <TestimonialKanban columns={columns} onMove={(itemId, to) => void (to === 'approved' ? mutations.moderate(appId, itemId, 'approve') : to === 'rejected' ? mutations.moderate(appId, itemId, 'reject') : mutations.moderate(appId, itemId, 'archive'))} />
    </PageContainer>
  );
}
"""

FORMS_PAGE = doc("forms list") + """'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, type Column } from '@testimonial-api/ui';
import { useForms } from '../../../hooks/use-forms';
import { useUiStore } from '../../../stores/ui.store';

export default function FormsPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const forms = useForms(appId ?? undefined);
  const rows = useMemo(() => (forms.data ?? []).map((f) => ({ ...f })), [forms.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Name', cell: (r) => <Link href={`/forms/${r.id}`}>{r.name}</Link> },
    { key: 'slug', header: 'Slug', cell: (r) => `/f/${r.slug}` },
    { key: 'published', header: 'Status', cell: (r) => <Badge tone={r.published ? 'success' : 'neutral'}>{r.published ? 'Published' : 'Draft'}</Badge> },
    { key: 'submissionCount', header: 'Submissions', cell: (r) => String(r.submissionCount ?? 0) },
  ];
  if (forms.isLoading) return <LoadingState label="Loading forms…" />;
  if (forms.isError) return <ErrorState title="Could not load forms" retry={() => void forms.refetch()} />;
  if (forms.data?.length === 0) {
    return (
      <PageContainer title="Forms" actions={<Link href="/forms/new"><Button>New form</Button></Link>}>
        <EmptyState title="No forms yet" description="Create a form to start collecting testimonials on your site." />
      </PageContainer>
    );
  }
  return (
    <PageContainer title="Forms" actions={<Link href="/forms/new"><Button>New form</Button></Link>}>
      <Card><DataTable data={rows} columns={columns} /></Card>
    </PageContainer>
  );
}
"""

FORM_EDIT_VIEW = doc("form editor — schema questions + publish toggle") + """'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorState, FormBuilder, LoadingState, PageContainer, Switch } from '@testimonial-api/ui';
import { useFormDetail } from '../../../hooks/use-form-detail';
import { useFormMutations } from '../../../hooks/use-form-mutations';
import { useUiStore } from '../../../stores/ui.store';

export function FormEditorView({ formId }: { formId?: string }) {
  const router = useRouter();
  const appId = useUiStore((s) => s.activeAppId);
  const detail = useFormDetail(appId ?? undefined, formId ?? '');
  const mutations = useFormMutations();
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!appId) return <LoadingState label="Select an app…" />;
  if (formId && detail.isLoading) return <LoadingState label="Loading form…" />;
  if (formId && detail.isError) return <ErrorState title="Could not load this form" retry={() => void detail.refetch()} />;
  if (formId && !detail.data) return <EmptyState title="Not found" />;

  const questions = detail.data?.questions ?? [
    { id: 'q1', type: 'text' as const, label: 'What did you love about us?', required: true },
    { id: 'q2', type: 'rating' as const, label: 'How likely are you to recommend us?', required: true },
  ];

  const save = async (): Promise<void> => {
    setSaving(true);
    const saved = await mutations.saveForm(appId, { id: formId, name: detail.data?.name ?? 'Untitled form', slug: detail.data?.slug ?? 'untitled' }, questions);
    setSaving(false);
    router.push(`/forms/${saved.id}`);
  };

  const isLive = detail.data?.published ?? published;
  return (
    <PageContainer title={detail.data?.name ?? 'New form'} actions={
      <>
        <Switch checked={isLive} onCheckedChange={setPublished} />
        <Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save form'}</Button>
      </>
    }>
      <FormBuilder formName={detail.data?.name ?? 'New form'} questions={questions} />
      {isLive && <Badge tone="success">Live at /f/{detail.data?.slug ?? 'untitled'}</Badge>}
    </PageContainer>
  );
}
"""
FORM_NEW_PAGE = doc("forms/new") + """import { FormEditorView } from '../form-editor-view';

export default function NewFormPage() {
  return <FormEditorView />;
}
"""

FORM_DETAIL_PAGE = doc("forms/[id]") + """import { FormEditorView } from '../form-editor-view';

export const dynamic = 'force-dynamic';

export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FormEditorView formId={id} />;
}
"""

WIDGETS_PAGE = doc("widgets list + embed copy") + """'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CodeBlock, CopyButton, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, type Column } from '@testimonial-api/ui';
import { useWidgets } from '../../../hooks/use-widgets';
import { useUiStore } from '../../../stores/ui.store';

export default function WidgetsPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const widgets = useWidgets(appId ?? undefined);
  const [embedFor, setEmbedFor] = useState<string | null>(null);
  const rows = useMemo(() => (widgets.data ?? []).map((w) => ({ ...w })), [widgets.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Name', cell: (r) => <Link href={`/widgets/${r.id}`}>{r.name}</Link> },
    { key: 'theme', header: 'Theme' },
    { key: 'enabled', header: 'Status', cell: (r) => <Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Enabled' : 'Disabled'}</Badge> },
    { key: 'embedType', header: 'Embed' },
    { key: 'id', header: 'Embed code', cell: (r) => <Button variant="ghost" onClick={() => setEmbedFor(r.id)}>Show code</Button> },
  ];
  const embedWidget = widgets.data?.find((w) => w.id === embedFor);
  const snippet = embedWidget ? `<div data-tz-widget="${embedWidget.id}"></div>\n<script async src="https://cdn.testimonialapi.com/widget.js" data-widget="${embedWidget.id}"></script>` : '';

  if (widgets.isLoading) return <LoadingState label="Loading widgets…" />;
  if (widgets.isError) return <ErrorState title="Could not load widgets" retry={() => void widgets.refetch()} />;
  if (widgets.data?.length === 0) {
    return (
      <PageContainer title="Widgets" actions={<Link href="/widgets/new"><Button>New widget</Button></Link>}>
        <EmptyState title="No widgets yet" description="Embed a widget to display your approved testimonials." />
      </PageContainer>
    );
  }
  return (
    <PageContainer title="Widgets" actions={<Link href="/widgets/new"><Button>New widget</Button></Link>}>
      <Card><DataTable data={rows} columns={columns} /></Card>
      {embedWidget && (
        <Card title="Embed code">
          <CodeBlock code={snippet} language="html" />
          <CopyButton text={snippet} />
        </Card>
      )}
    </PageContainer>
  );
}
"""

WIDGET_EDIT_VIEW = doc("widget builder — live preview + style overrides + embed code") + """'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CodeBlock, EmptyState, ErrorState, LoadingState, PageContainer, Switch, WidgetBuilder } from '@testimonial-api/ui';
import { useWidgetDetail } from '../../../hooks/use-widget-detail';
import { useWidgetLivePreview } from '../../../hooks/use-widget-live-preview';
import { useWidgetMutations } from '../../../hooks/use-widget-mutations';
import { useUiStore } from '../../../stores/ui.store';

export function WidgetEditorView({ widgetId }: { widgetId?: string }) {
  const router = useRouter();
  const appId = useUiStore((s) => s.activeAppId);
  const detail = useWidgetDetail(appId ?? undefined, widgetId ?? '');
  const mutations = useWidgetMutations();
  const preview = useWidgetLivePreview({
    theme: detail.data?.theme ?? 'light',
    accentColor: detail.data?.accentColor ?? '#6366f1',
    fontFamily: detail.data?.fontFamily,
  });
  const [enabled, setEnabled] = useState(true);

  if (!appId) return <LoadingState label="Select an app…" />;
  if (widgetId && detail.isLoading) return <LoadingState label="Loading widget…" />;
  if (widgetId && detail.isError) return <ErrorState title="Could not load this widget" retry={() => void detail.refetch()} />;
  if (widgetId && !detail.data) return <EmptyState title="Not found" />;

  const embed = `<script async src="https://cdn.testimonialapi.com/widget.js" data-widget="${detail.data?.id ?? 'new'}"></script>`;

  const save = async (): Promise<void> => {
    const saved = await mutations.saveWidget(appId, { id: widgetId, ...preview.overrides });
    router.push(`/widgets/${saved.id}`);
  };

  return (
    <PageContainer
      title={detail.data?.name ?? 'New widget'}
      actions={
        <>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Button onClick={() => void save()}>Save widget</Button>
        </>
      }
    >
      <WidgetBuilder overrides={preview.overrides} onChange={preview.update} />
      <Card title="Embed code"><CodeBlock code={embed} language="html" /></Card>
    </PageContainer>
  );
}
"""
WIDGET_NEW_PAGE = doc("widgets/new") + """import { WidgetEditorView } from '../widget-editor-view';

export default function NewWidgetPage() {
  return <WidgetEditorView />;
}
"""

WIDGET_DETAIL_PAGE = doc("widgets/[id]") + """import { WidgetEditorView } from '../widget-editor-view';

export const dynamic = 'force-dynamic';

export default async function WidgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WidgetEditorView widgetId={id} />;
}
"""

TEAM_PAGE = doc("team — roles + invites + permission_changed realtime effect") + """'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Card, DataTable, Dialog, EmptyState, ErrorState, Input, LoadingState, PageContainer, Select, type Column } from '@testimonial-api/ui';
import { useTeam } from '../../../hooks/use-team';
import { useTeamMutations } from '../../../hooks/use-team-mutations';
import { useMe } from '@testimonial-api/ui';

const ROLE_OPTIONS = [
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

export default function TeamPage() {
  const me = useMe();
  const team = useTeam();
  const mutations = useTeamMutations();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const rows = useMemo(() => (team.data ?? []).map((m) => ({ ...m })), [team.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', cell: (r) => <Select options={ROLE_OPTIONS} value={r.role} onChange={(v) => void mutations.changeRole(r.id, v)} /> },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge> },
  ];

  if (team.isLoading) return <LoadingState label="Loading team…" />;
  if (team.isError) return <ErrorState title="Could not load the team" retry={() => void team.refetch()} />;

  return (
    <PageContainer title="Team" actions={<Button onClick={() => setInviteOpen(true)}>Invite member</Button>}>
      <Card><DataTable data={rows} columns={columns} /></Card>
      {team.data?.length === 0 && <EmptyState title="No team members" description="Invite your first teammate to collaborate." />}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen} title="Invite a teammate">
        <Input type="email" placeholder="teammate@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
        <Select options={ROLE_OPTIONS} value={inviteRole} onChange={setInviteRole} />
        <Button onClick={() => void mutations.invite(inviteEmail, inviteRole).then(() => setInviteOpen(false))}>Send invite</Button>
      </Dialog>
      <p data-testid="current-role">You are a {me.data?.user.role ?? '…'}.</p>
    </PageContainer>
  );
}
"""

WEBHOOKS_PAGE = doc("webhooks + deliveries") + """'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Card, DataTable, Dialog, EmptyState, ErrorState, Input, LoadingState, PageContainer, Tabs, type Column } from '@testimonial-api/ui';
import { useWebhookDeliveries } from '../../../hooks/use-webhook-deliveries';
import { useWebhooks } from '../../../hooks/use-webhooks';
import { useUiStore } from '../../../stores/ui.store';

export default function WebhooksPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const webhooks = useWebhooks(appId ?? undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const deliveries = useWebhookDeliveries(appId ?? undefined, selected ?? '');
  const rows = useMemo(() => (webhooks.data ?? []).map((w) => ({ ...w })), [webhooks.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Name', cell: (r) => <button type="button" onClick={() => setSelected(r.id)}>{r.name}</button> },
    { key: 'url', header: 'URL' },
    { key: 'events', header: 'Events', cell: (r) => r.events.join(', ') },
    { key: 'enabled', header: 'Status', cell: (r) => <Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Enabled' : 'Disabled'}</Badge> },
  ];

  if (webhooks.isLoading) return <LoadingState label="Loading webhooks…" />;
  if (webhooks.isError) return <ErrorState title="Could not load webhooks" retry={() => void webhooks.refetch()} />;

  return (
    <PageContainer title="Webhooks" actions={<Button onClick={() => setCreateOpen(true)}>Add endpoint</Button>}>
      <Card><DataTable data={rows} columns={columns} /></Card>
      {webhooks.data?.length === 0 && <EmptyState title="No webhooks" description="Receive events when testimonials are created or change status." />}
      {selected && (
        <Card title="Recent deliveries">
          <Tabs tabs={[{ label: 'Deliveries', value: 'd', active: true }]} />
          {deliveries.data?.map((d) => (
            <p key={d.id}>{d.event} — <Badge tone={d.status === 'success' ? 'success' : 'danger'}>{d.status}</Badge> ({d.statusCode ?? '-'})</p>
          ))}
          {deliveries.isError && <ErrorState title="Could not load deliveries" retry={() => void deliveries.refetch()} />}
        </Card>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen} title="New webhook">
        <Input placeholder="Endpoint name" />
        <Input placeholder="https://your-app.com/hooks/testimonial" />
        <Button>Create</Button>
      </Dialog>
    </PageContainer>
  );
}
"""

AUDIT_PAGE = doc("audit log") + """'use client';

import { useMemo } from 'react';
import { Badge, Card, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, type Column } from '@testimonial-api/ui';
import { useAuditLogs } from '../../../hooks/use-audit-logs';

export default function AuditPage() {
  const audit = useAuditLogs({});
  const rows = useMemo(() => (audit.data ?? []).map((a) => ({ ...a })), [audit.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'createdAt', header: 'When' },
    { key: 'actor', header: 'Actor' },
    { key: 'action', header: 'Action', cell: (r) => <Badge>{r.action}</Badge> },
    { key: 'resource', header: 'Resource' },
  ];
  if (audit.isLoading) return <LoadingState label="Loading audit log…" />;
  if (audit.isError) return <ErrorState title="Could not load the audit log" retry={() => void audit.refetch()} />;
  return (
    <PageContainer title="Audit log">
      {audit.data?.length ? <Card><DataTable data={rows} columns={columns} /></Card> : <EmptyState title="No activity yet" />}
    </PageContainer>
  );
}
"""

BILLING_PAGE = doc("billing — plan + usage + invoices") + """'use client';

import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageContainer, StatCard } from '@testimonial-api/ui';
import { useBilling } from '../../../hooks/use-billing';

export default function BillingPage() {
  const billing = useBilling();
  if (billing.isLoading) return <LoadingState label="Loading billing…" />;
  if (billing.isError) return <ErrorState title="Could not load billing" retry={() => void billing.refetch()} />;
  if (!billing.data) return <EmptyState title="No billing information" />;
  return (
    <PageContainer title="Billing" actions={<Button>Manage plan</Button>}>
      <StatCard label="Plan" value={billing.data.plan} />
      <StatCard label="Seats" value={`${billing.data.seatsUsed} / ${billing.data.seatsLimit}`} />
      <StatCard label="Monthly cost" value={`$${billing.data.monthlyCostUsd}`} />
      <Card title="Status"><Badge tone={billing.data.status === 'active' ? 'success' : 'warning'}>{billing.data.status}</Badge></Card>
    </PageContainer>
  );
}
"""

SETTINGS_PAGE = doc("settings — branding (ColorPicker) + API keys (rotate) + notification prefs") + """'use client';

import { useState } from 'react';
import { Badge, Button, Card, ColorPicker, EmptyState, ErrorState, Input, LoadingState, PageContainer, Switch, Textarea } from '@testimonial-api/ui';
import { useApiKeys } from '../../../hooks/use-api-keys';
import { useUiStore } from '../../../stores/ui.store';

export default function SettingsPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const apiKeys = useApiKeys(appId ?? undefined);
  const [brandColor, setBrandColor] = useState('#4f46e5');
  const [tenantName, setTenantName] = useState('');
  const [saved, setSaved] = useState(false);

  if (apiKeys.isLoading) return <LoadingState label="Loading settings…" />;
  if (apiKeys.isError) return <ErrorState title="Could not load settings" retry={() => void apiKeys.refetch()} />;

  return (
    <PageContainer title="Settings">
      <Card title="Branding">
        <Input placeholder="Workspace name" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
        <ColorPicker value={brandColor} onChange={(v) => { setBrandColor(v); setSaved(false); }} />
        <Button onClick={() => setSaved(true)} disabled={saved}>Save branding</Button>
        {saved && <Badge tone="success">Saved</Badge>}
      </Card>
      <Card title="Public note (optional)" />
      <Card title="API keys">
        {apiKeys.data?.map((k) => (
          <p key={k.id}>{k.name} — {k.prefix}… <Badge>{k.scopes.join(', ')}</Badge>
            <Button variant="ghost" onClick={() => void apiKeys.rotateKey(appId ?? '', k.id)}>Rotate</Button>
          </p>
        ))}
        {apiKeys.data?.length === 0 && <EmptyState title="No API keys" description="Widget/embed tokens are managed here." />}
      </Card>
      <Card title="Notifications">
        <Switch checked={true} />
      </Card>
      <Textarea placeholder="Extra settings text (Doc 5 wiring)" />
    </PageContainer>
  );
}
"""

# ---------------------------------------------------------------- emit
def main():
    write("lib/types.ts", TYPES)
    write("stores/ui.store.ts", UI_STORE)
    for rel, src in HOOK_FILES:
        write(rel, src)

    write("app/layout.tsx", ROOT_LAYOUT)
    write("app/globals.css", GLOBALS)
    write("app/(marketing)/page.tsx", MARKETING_PAGE)
    write("app/login/page.tsx", LOGIN_PAGE)
    write("app/login/mfa/page.tsx", MFA_PAGE)
    write("app/onboarding/[token]/page.tsx", ONBOARDING_PAGE)
    write("app/onboarding/[token]/onboarding-view.tsx", ONBOARDING_VIEW)
    write("app/accept-invite/[token]/page.tsx", ACCEPT_PAGE)
    write("app/accept-invite/[token]/accept-invite-view.tsx", ACCEPT_INVITE_VIEW)

    write("app/(dashboard)/layout.tsx", DASH_LAYOUT)
    write("app/(dashboard)/page.tsx", DASH_PAGE)
    write("app/(dashboard)/overview/page.tsx", OVERVIEW_PAGE)
    write("app/(dashboard)/testimonials/page.tsx", TESTIMONIALS_PAGE)
    write("app/(dashboard)/testimonials/[id]/page.tsx", TESTIMONIAL_DETAIL_PAGE)
    write("app/(dashboard)/testimonials/[id]/testimonial-detail-view.tsx", TESTIMONIAL_DETAIL_VIEW)
    write("app/(dashboard)/testimonials/moderation/page.tsx", MODERATION_PAGE)
    write("app/(dashboard)/forms/page.tsx", FORMS_PAGE)
    write("app/(dashboard)/forms/new/page.tsx", FORM_NEW_PAGE)
    write("app/(dashboard)/forms/[id]/page.tsx", FORM_DETAIL_PAGE)
    write("app/(dashboard)/forms/form-editor-view.tsx", FORM_EDIT_VIEW)
    write("app/(dashboard)/widgets/page.tsx", WIDGETS_PAGE)
    write("app/(dashboard)/widgets/new/page.tsx", WIDGET_NEW_PAGE)
    write("app/(dashboard)/widgets/[id]/page.tsx", WIDGET_DETAIL_PAGE)
    write("app/(dashboard)/widgets/widget-editor-view.tsx", WIDGET_EDIT_VIEW)
    write("app/(dashboard)/team/page.tsx", TEAM_PAGE)
    write("app/(dashboard)/webhooks/page.tsx", WEBHOOKS_PAGE)
    write("app/(dashboard)/audit/page.tsx", AUDIT_PAGE)
    write("app/(dashboard)/billing/page.tsx", BILLING_PAGE)
    write("app/(dashboard)/settings/page.tsx", SETTINGS_PAGE)
    print("tenant-dashboard scaffold done")


if __name__ == "__main__":
    main()
