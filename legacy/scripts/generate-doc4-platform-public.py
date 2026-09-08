#!/usr/bin/env python3
"""Doc-4 platform-dashboard + public-forms scaffold generators.

Run from repo root: python3 scripts/generate-doc4-platform-public.py
Writes the platform route tree + impersonation store + §7 hooks, and the
public-forms SSR collection pages. Styling/Radix polish: Doc 5.
"""
import os

DOC = "/** Doc 4 — {app} ({note}). Structural skeleton; visual pass in Doc 5. */\n"


def write(root, rel, src):
    p = os.path.join(root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(src)
    print("wrote", p)


# =========================================================================
# PLATFORM DASHBOARD
# =========================================================================
P_ROOT = os.path.join("apps", "platform-dashboard")

PLAT_TYPES = DOC.format(app="platform dashboard", note="shared entity types") + """export type TenantStatus = 'active' | 'suspended' | 'trialing';

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
"""

IMP_STORE = DOC.format(app="platform dashboard", note="§2.2 impersonation store") + """'use client';

import { create } from 'zustand';

export interface ImpersonationState {
  isImpersonating: boolean;
  tenantId: string | null;
  tenantName: string | null;
  byStaffId: string | null;
  startImpersonation: (tenantId: string, tenantName: string, byStaffId: string) => void;
  endImpersonation: () => void;
}

/**
 * Platform-staff → tenant impersonation. When active, the dashboard shell
 * renders <ImpersonationBanner> and the API client attaches the impersonation
 * header; ending it refetches /me (Doc 4 §B).
 */
export const useImpersonationStore = create<ImpersonationState>((set) => ({
  isImpersonating: false,
  tenantId: null,
  tenantName: null,
  byStaffId: null,
  startImpersonation: (tenantId, tenantName, byStaffId) =>
    set({ isImpersonating: true, tenantId, tenantName, byStaffId }),
  endImpersonation: () =>
    set({ isImpersonating: false, tenantId: null, tenantName: null, byStaffId: null }),
}));
"""

PLAT_HOOKS = {}

PLAT_HOOKS["use-platform-overview"] = '''"use-platform-overview";

export function usePlatformOverview() {
  return useQuery({
    queryKey: queryKeys.platformAnalytics('30d'),
    queryFn: async () => {
      const res = await apiClient.get<PlatformOverviewData>('/v1/platform/overview');
      return res.data;
    },
  });
}
'''

# Full hand-written hooks
H_OVERVIEW = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { PlatformOverviewData } from '../lib/types';

export function usePlatformOverview() {
  return useQuery({
    queryKey: queryKeys.platformAnalytics('30d'),
    queryFn: async () => {
      const res = await apiClient.get<PlatformOverviewData>('/v1/platform/overview');
      return res.data;
    },
  });
}
"""

H_TENANTS = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TenantSummary } from '../lib/types';

export interface TenantFilters {
  page?: number;
  perPage?: number;
  q?: string;
  plan?: string;
  status?: string;
}

export function useTenants(filters: TenantFilters = {}) {
  return useQuery({
    queryKey: queryKeys.tenants.list(filters),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: TenantSummary[]; total: number }>('/v1/platform/tenants', {
        params: { ...filters, page: filters.page ?? 1, perPage: filters.perPage ?? 50 },
      });
      return res.data.rows;
    },
  });
}
"""

H_TENANT_DETAIL = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TenantDetail } from '../lib/types';

export function useTenantDetail(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.tenants.detail(tenantId),
    queryFn: async () => {
      const res = await apiClient.get<TenantDetail>(`/v1/platform/tenants/${tenantId}`);
      return res.data;
    },
    enabled: Boolean(tenantId),
  });
}
"""

H_TENANT_STAFF = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TenantStaffMember } from '../lib/types';

export function useTenantStaff(tenantId: string) {
  return useQuery({
    queryKey: [...queryKeys.tenants.detail(tenantId), 'staff'] as const,
    queryFn: async () => {
      const res = await apiClient.get<{ rows: TenantStaffMember[] }>(`/v1/platform/tenants/${tenantId}/staff`);
      return res.data.rows;
    },
    enabled: Boolean(tenantId),
  });
}
"""

H_TENANT_SETTINGS = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';

export function useTenantSettings(tenantId: string) {
  const qc = useQueryClient();

  const suspend = useCallback(
    async (suspended: boolean) => {
      const res = await apiClient.patch(`/v1/platform/tenants/${tenantId}`, { status: suspended ? 'suspended' : 'active' });
      await qc.invalidateQueries({ queryKey: queryKeys.tenants.detail(tenantId) });
      await qc.invalidateQueries({ queryKey: queryKeys.tenants.all });
      return res.data;
    },
    [qc, tenantId],
  );

  const changePlan = useCallback(
    async (plan: string) => {
      const res = await apiClient.patch(`/v1/platform/tenants/${tenantId}`, { plan });
      await qc.invalidateQueries({ queryKey: queryKeys.tenants.detail(tenantId) });
      return res.data;
    },
    [qc, tenantId],
  );

  const deleteTenant = useCallback(
    async (confirm: string) => {
      const res = await apiClient.delete(`/v1/platform/tenants/${tenantId}`, { params: { confirm } });
      await qc.invalidateQueries({ queryKey: queryKeys.tenants.all });
      return res.data;
    },
    [qc, tenantId],
  );

  return { suspend, changePlan, deleteTenant };
}
"""

H_PLATFORM_STAFF = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { PlatformStaffMember } from '../lib/types';

export function usePlatformStaff() {
  return useQuery({
    queryKey: queryKeys.staff.all,
    queryFn: async () => {
      const res = await apiClient.get<{ rows: PlatformStaffMember[] }>('/v1/platform/staff');
      return res.data.rows;
    },
  });
}
"""

H_PLATFORM_BILLING = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { InvoiceSummary } from '../lib/types';

export interface PlatformBillingData {
  monthlyMrrUsd: number;
  invoices: InvoiceSummary[];
}

export function usePlatformBilling() {
  return useQuery({
    queryKey: queryKeys.billing,
    queryFn: async () => {
      const res = await apiClient.get<PlatformBillingData>('/v1/platform/billing');
      return res.data;
    },
  });
}
"""

H_AUDIT = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { AuditLogEntry } from '../lib/types';

export function useAuditLogs(filters: { page?: number; actor?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(filters),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: AuditLogEntry[] }>('/v1/platform/audit-logs', { params: filters });
      return res.data.rows;
    },
  });
}
"""

H_AI_PROVIDERS = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { AiProvider } from '../lib/types';

export function useAiProviders() {
  const qc = useQueryClient();
  const providers = useQuery({
    queryKey: queryKeys.ai.providers,
    queryFn: async () => {
      const res = await apiClient.get<{ rows: AiProvider[] }>('/v1/platform/ai/providers');
      return res.data.rows;
    },
  });

  const setEnabled = useCallback(
    async (providerId: string, enabled: boolean) => {
      const res = await apiClient.patch(`/v1/platform/ai/providers/${providerId}`, { enabled });
      await qc.invalidateQueries({ queryKey: queryKeys.ai.providers });
      return res.data;
    },
    [qc],
  );

  return { ...providers, setEnabled };
}
"""

H_AI_TASKS = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { AiTaskLog } from '../lib/types';

export function useAiTaskLogs(filters: { page?: number; provider?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.ai.logs(filters),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: AiTaskLog[] }>('/v1/platform/ai/tasks', { params: filters });
      return res.data.rows;
    },
  });
}
"""

H_AI_COSTS = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { AiCostSummary } from '../lib/types';

export function useAiCosts(period: string = '30d') {
  return useQuery({
    queryKey: queryKeys.ai.costs({ period }),
    queryFn: async () => {
      const res = await apiClient.get<AiCostSummary>('/v1/platform/ai/costs', { params: { period } });
      return res.data;
    },
  });
}
"""

H_WEBHOOKS = DOC.format(app="platform dashboard", note="§7 hook") + """'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WebhookSummary } from '../lib/types';

export function usePlatformWebhooks() {
  return useQuery({
    queryKey: queryKeys.webhooks.all('__platform__'),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: WebhookSummary[] }>('/v1/platform/webhooks');
      return res.data.rows;
    },
  });
}
"""

PLAT_HOOK_FILES = [
    ("hooks/use-platform-overview.ts", H_OVERVIEW),
    ("hooks/use-tenants.ts", H_TENANTS),
    ("hooks/use-tenant-detail.ts", H_TENANT_DETAIL),
    ("hooks/use-tenant-staff.ts", H_TENANT_STAFF),
    ("hooks/use-tenant-settings.ts", H_TENANT_SETTINGS),
    ("hooks/use-platform-staff.ts", H_PLATFORM_STAFF),
    ("hooks/use-platform-billing.ts", H_PLATFORM_BILLING),
    ("hooks/use-audit-logs.ts", H_AUDIT),
    ("hooks/use-ai-providers.ts", H_AI_PROVIDERS),
    ("hooks/use-ai-task-logs.ts", H_AI_TASKS),
    ("hooks/use-ai-costs.ts", H_AI_COSTS),
    ("hooks/use-platform-webhooks.ts", H_WEBHOOKS),
]

PLAT_ROOT_LAYOUT = DOC.format(app="platform dashboard", note="app root layout") + """import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@testimonial-api/ui';
import './globals.css';

export const metadata = {
  title: 'Testimonial API — Zojatech Admin',
  description: 'Platform operations for Testimonial API.',
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

PLAT_GLOBALS = """/** Doc 4 structural CSS — visual design system arrives in Doc 5. */
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
:root {
  --tui-bg: #ffffff; --tui-fg: #18181b; --tui-border: #e4e4e7;
  --tui-primary: #4f46e5; --tui-danger: #dc2626;
}
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid var(--tui-border); padding: 6px 8px; text-align: left; }
button { cursor: pointer; }
"""

PLAT_LOGIN = DOC.format(app="platform dashboard", note="staff login") + """'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, Button, Input, Label } from '@testimonial-api/ui';

export default function PlatformLoginPage() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/overview';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ requiresMfa?: boolean }>('/v1/platform/auth/login', { email, password });
      router.push(res.data.requiresMfa ? `/login/mfa?email=${encodeURIComponent(email)}` : next);
    } catch {
      setError('Invalid credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 380, margin: '80px auto' }}>
      <h1>Zojatech Admin</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submit}>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button variant="primary" disabled={busy}>Sign in</Button>
      </form>
    </main>
  );
}
"""

PLAT_DASH_LAYOUT = DOC.format(app="platform dashboard", note="(dashboard) guard — impersonation banner + sidebar") + """'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ImpersonationBanner, LoadingState, RealtimeIndicator, Sidebar, type NavItem, useMe, useRealtime } from '@testimonial-api/ui';
import { useImpersonationStore } from '../../stores/impersonation.store';

const NAV: Array<{ label: string; href: string }> = [
  { label: 'Overview', href: '/overview' },
  { label: 'Tenants', href: '/tenants' },
  { label: 'Staff', href: '/staff' },
  { label: 'Billing', href: '/billing' },
  { label: 'Webhooks', href: '/webhooks' },
  { label: 'Audit log', href: '/audit' },
  { label: 'AI', href: '/ai' },
  { label: 'Settings', href: '/settings' },
];

export default function PlatformDashboardLayout({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const realtime = useRealtime({ meEnabled: true });
  const impersonating = useImpersonationStore((s) => s.isImpersonating);
  const tenantName = useImpersonationStore((s) => s.tenantName);
  const endImpersonation = useImpersonationStore((s) => s.endImpersonation);

  useEffect(() => {
    if (me.isError) router.replace('/login?reason=session_expired');
  }, [me.isError, router]);

  if (me.isLoading || me.isError) return <LoadingState label="Checking your session…" />;
  const user = me.data?.user;

  const items: NavItem[] = NAV.map((n) => ({
    label: n.label,
    href: n.href,
    active: pathname === n.href || pathname.startsWith(n.href + '/'),
  }));

  return (
    <div data-testid="platform-shell">
      {impersonating && tenantName && (
        <ImpersonationBanner
          tenantName={tenantName}
          onExit={() => {
            endImpersonation();
            void me.refetch();
          }}
        />
      )}
      <Sidebar items={items} />
      <div style={{ marginLeft: 240 }}>
        <header style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: 8 }}>
          <RealtimeIndicator connected={realtime.connected} />
          <span data-testid="current-staff">{user?.name}</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
"""

PLAT_DASH_INDEX = DOC.format(app="platform dashboard", note="index → overview") + """import { redirect } from 'next/navigation';

export default function PlatformIndexPage() {
  redirect('/overview');
}
"""

PLAT_MARKETING = DOC.format(app="platform dashboard", note="landing redirect") + """import { redirect } from 'next/navigation';

export default function LandingPage() {
  redirect('/login');
}
"""


def plat_table_page(title, hook_import, hook_name, columns_src, empty_title, empty_desc, extra=None, depth=3):
    up = "../" * depth
    return f"""{DOC.format(app='platform dashboard', note=f'{title} page')}'use client';

import {{ useMemo }} from 'react';
import {{ Badge, Card, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, type Column }} from '@testimonial-api/ui';
import {{ {hook_name} }} from '{up}hooks/{hook_import}';

export default function {title.replace(' ', '')}Page() {{
  const q = {hook_name}();
  const rows = useMemo(() => (q.data ?? []).map((r) => ({{ ...r }})), [q.data]);
  const columns: Column<(typeof rows)[number]>[] = [{columns_src}];
  if (q.isLoading) return <LoadingState label="Loading {title.lower()}…" />;
  if (q.isError) return <ErrorState title="Could not load {title.lower()}" retry={{() => void q.refetch()}} />;
  return (
    <PageContainer title="{title}">
      {{rows.length === 0 ? <EmptyState title="{empty_title}" description="{empty_desc}" /> : <Card><DataTable data={{rows}} columns={{columns}} /></Card>}}
      {extra or ''}
    </PageContainer>
  );
}}
"""


def write_platform():
    write(P_ROOT, "lib/types.ts", PLAT_TYPES)
    write(P_ROOT, "stores/impersonation.store.ts", IMP_STORE)
    for rel, src in PLAT_HOOK_FILES:
        write(P_ROOT, rel, src)
    write(P_ROOT, "app/layout.tsx", PLAT_ROOT_LAYOUT)
    write(P_ROOT, "app/globals.css", PLAT_GLOBALS)
    write(P_ROOT, "app/login/page.tsx", PLAT_LOGIN)
    write(P_ROOT, "app/(marketing)/page.tsx", PLAT_MARKETING)
    write(P_ROOT, "app/(dashboard)/layout.tsx", PLAT_DASH_LAYOUT)
    write(P_ROOT, "app/(dashboard)/page.tsx", PLAT_DASH_INDEX)

    # overview
    overview = DOC.format(app="platform dashboard", note="overview") + """'use client';

import { EmptyState, ErrorState, LoadingState, PageContainer, StatCard } from '@testimonial-api/ui';
import { usePlatformOverview } from '../../../hooks/use-platform-overview';

export default function PlatformOverviewPage() {
  const q = usePlatformOverview();
  if (q.isLoading) return <LoadingState label="Loading platform overview…" />;
  if (q.isError) return <ErrorState title="Could not load platform overview" retry={() => void q.refetch()} />;
  if (!q.data) return <EmptyState title="No platform data yet" />;
  return (
    <PageContainer title="Platform overview">
      <StatCard label="Tenants" value={q.data.tenants} />
      <StatCard label="Active apps" value={q.data.activeApps} />
      <StatCard label="Total testimonials" value={q.data.totalTestimonials} />
      <StatCard label="Pending review" value={q.data.pendingReview} />
      <StatCard label="MRR" value={`$${q.data.monthlyMrrUsd}`} />
    </PageContainer>
  );
}
"""
    write(P_ROOT, "app/(dashboard)/overview/page.tsx", overview)

    tenants_cols = """{ key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    { key: 'plan', header: 'Plan' },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={r.status === 'active' ? 'success' : r.status === 'suspended' ? 'danger' : 'warning'}>{r.status}</Badge> },
    { key: 'testimonialCount', header: 'Testimonials', cell: (r) => String(r.testimonialCount ?? 0) }"""
    write(
        P_ROOT,
        "app/(dashboard)/tenants/page.tsx",
        plat_table_page("Tenants", "use-tenants", "useTenants", tenants_cols, "No tenants yet", "New sign-ups will appear here."),
    )

    # tenant detail + sub views (all under tenants/[id])
    detail_page = DOC.format(app="platform dashboard", note="tenants/[id] route") + """import { TenantDetailView } from './tenant-detail-view';

export const dynamic = 'force-dynamic';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TenantDetailView tenantId={id} />;
}
"""
    detail_view = DOC.format(app="platform dashboard", note="tenant detail") + """'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  Select,
  StatCard,
  Switch,
} from '@testimonial-api/ui';
import { useTenantDetail } from '../../../../hooks/use-tenant-detail';
import { useTenantSettings } from '../../../../hooks/use-tenant-settings';
import { useImpersonationStore } from '../../../../stores/impersonation.store';
import { useMe } from '@testimonial-api/ui';

const PLAN_OPTIONS = [
  { label: 'Free', value: 'free' },
  { label: 'Starter', value: 'starter' },
  { label: 'Growth', value: 'growth' },
  { label: 'Enterprise', value: 'enterprise' },
];

export function TenantDetailView({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const me = useMe();
  const detail = useTenantDetail(tenantId);
  const settings = useTenantSettings(tenantId);
  const startImpersonation = useImpersonationStore((s) => s.startImpersonation);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);

  if (detail.isLoading) return <LoadingState label="Loading tenant…" />;
  if (detail.isError) return <ErrorState title="Could not load this tenant" retry={() => void detail.refetch()} />;
  const t = detail.data;
  if (!t) return <EmptyState title="Not found" description="This tenant does not exist." />;

  return (
    <PageContainer
      title={t.name}
      actions={
        <>
          <Button onClick={() => setImpersonateOpen(true)}>Impersonate</Button>
          <Button variant="destructive" onClick={() => setSuspendOpen(true)}>{t.status === 'suspended' ? 'Unsuspend' : 'Suspend'}</Button>
        </>
      }
    >
      <StatCard label="Plan" value={t.plan} />
      <StatCard label="Seats" value={`${t.seatsUsed} / ${t.seatsLimit}`} />
      <StatCard label="Testimonials" value={t.testimonialCount ?? 0} />
      <Card title="Owner">
        <p>{t.ownerEmail}</p>
      </Card>
      <Card title="Plan management">
        <Select options={PLAN_OPTIONS} value={t.plan} onChange={(v) => void settings.changePlan(v)} />
        <Switch checked={t.status !== 'suspended'} onCheckedChange={(v) => void settings.suspend(!v)} />
      </Card>
      <Card title="Applications">
        {t.apps.map((a) => (
          <p key={a.id}>• {a.name} ({a.id})</p>
        ))}
      </Card>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button onClick={() => router.push(`/tenants/${tenantId}/staff`)}>Manage staff</Button>
        <Button onClick={() => router.push(`/tenants/${tenantId}/settings`)}>Tenant settings</Button>
      </div>

      <Dialog open={impersonateOpen} onOpenChange={setImpersonateOpen} title="Impersonate tenant">
        <p>You will act as {t.name} until you end the session.</p>
        <Button
          variant="primary"
          onClick={() => {
            startImpersonation(tenantId, t.name, me.data?.user.id ?? '');
            setImpersonateOpen(false);
          }}
        >
          Start impersonation
        </Button>
      </Dialog>
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen} title={t.status === 'suspended' ? 'Unsuspend tenant' : 'Suspend tenant'}>
        <p>Staff at this tenant will lose access immediately.</p>
        <Button variant="destructive" onClick={() => void settings.suspend(t.status !== 'suspended').then(() => setSuspendOpen(false))}>
          Confirm
        </Button>
      </Dialog>
    </PageContainer>
  );
}
"""
    write(P_ROOT, "app/(dashboard)/tenants/[id]/page.tsx", detail_page)
    write(P_ROOT, "app/(dashboard)/tenants/[id]/tenant-detail-view.tsx", detail_view)

    staff_page = DOC.format(app="platform dashboard", note="tenants/[id]/staff") + """import { TenantStaffView } from './tenant-staff-view';

export const dynamic = 'force-dynamic';

export default async function TenantStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TenantStaffView tenantId={id} />;
}
"""
    staff_view = DOC.format(app="platform dashboard", note="tenant staff list") + """'use client';

import { useMemo } from 'react';
import { Badge, Card, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, type Column } from '@testimonial-api/ui';
import { useTenantStaff } from '../../../../../hooks/use-tenant-staff';

export function TenantStaffView({ tenantId }: { tenantId: string }) {
  const q = useTenantStaff(tenantId);
  const rows = useMemo(() => (q.data ?? []).map((m) => ({ ...m })), [q.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', cell: (r) => <Badge>{r.role}</Badge> },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge> },
  ];
  if (q.isLoading) return <LoadingState label="Loading tenant staff…" />;
  if (q.isError) return <ErrorState title="Could not load tenant staff" retry={() => void q.refetch()} />;
  return (
    <PageContainer title="Tenant staff">
      {rows.length === 0 ? <EmptyState title="No staff members" /> : <Card><DataTable data={rows} columns={columns} /></Card>}
    </PageContainer>
  );
}
"""
    write(P_ROOT, "app/(dashboard)/tenants/[id]/staff/page.tsx", staff_page)
    write(P_ROOT, "app/(dashboard)/tenants/[id]/staff/tenant-staff-view.tsx", staff_view)

    tsettings_page = DOC.format(app="platform dashboard", note="tenants/[id]/settings") + """import { TenantSettingsView } from './tenant-settings-view';

export const dynamic = 'force-dynamic';

export default async function TenantSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TenantSettingsView tenantId={id} />;
}
"""
    tsettings_view = DOC.format(app="platform dashboard", note="tenant settings — suspend/delete") + """'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  DestructiveConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  Switch,
} from '@testimonial-api/ui';
import { useTenantDetail } from '../../../../../hooks/use-tenant-detail';
import { useTenantSettings } from '../../../../../hooks/use-tenant-settings';

export function TenantSettingsView({ tenantId }: { tenantId: string }) {
  const detail = useTenantDetail(tenantId);
  const settings = useTenantSettings(tenantId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (detail.isLoading) return <LoadingState label="Loading tenant settings…" />;
  if (detail.isError) return <ErrorState title="Could not load tenant settings" retry={() => void detail.refetch()} />;
  const t = detail.data;
  if (!t) return <EmptyState title="Not found" description="This tenant does not exist." />;

  return (
    <PageContainer title={`${t.name} — settings`}>
      <Card title="Access">
        <Switch checked={t.status !== 'suspended'} onCheckedChange={(v) => void settings.suspend(!v)} />
      </Card>
      <Card title="Danger zone">
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete tenant</Button>
      </Card>
      <DestructiveConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete tenant"
        description="Permanently deletes the tenant, its apps, forms and testimonials. This cannot be undone."
        confirmText={t.slug.toUpperCase()}
      />
    </PageContainer>
  );
}
"""
    write(P_ROOT, "app/(dashboard)/tenants/[id]/settings/page.tsx", tsettings_page)
    write(P_ROOT, "app/(dashboard)/tenants/[id]/settings/tenant-settings-view.tsx", tsettings_view)

    staff_cols = """{ key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', cell: (r) => <Badge>{r.role}</Badge> },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge> },
    { key: 'lastActiveAt', header: 'Last active', cell: (r) => r.lastActiveAt ?? '—' }"""
    write(P_ROOT, "app/(dashboard)/staff/page.tsx", plat_table_page("Platform staff", "use-platform-staff", "usePlatformStaff", staff_cols, "No staff yet", "Platform team members appear here."))

    billing_page = DOC.format(app="platform dashboard", note="billing") + """'use client';

import { useMemo } from 'react';
import { Badge, Card, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, StatCard, type Column } from '@testimonial-api/ui';
import { usePlatformBilling } from '../../../hooks/use-platform-billing';

export default function PlatformBillingPage() {
  const q = usePlatformBilling();
  const rows = useMemo(() => (q.data?.invoices ?? []).map((i) => ({ ...i })), [q.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'createdAt', header: 'Issued' },
    { key: 'tenantName', header: 'Tenant' },
    { key: 'amountUsd', header: 'Amount', cell: (r) => `$${r.amountUsd}` },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={r.status === 'paid' ? 'success' : r.status === 'past_due' ? 'danger' : 'warning'}>{r.status}</Badge> },
  ];
  if (q.isLoading) return <LoadingState label="Loading billing…" />;
  if (q.isError) return <ErrorState title="Could not load billing" retry={() => void q.refetch()} />;
  if (!q.data) return <EmptyState title="No billing data" />;
  return (
    <PageContainer title="Billing">
      <StatCard label="Monthly recurring revenue" value={`$${q.data.monthlyMrrUsd}`} />
      {rows.length === 0 ? <EmptyState title="No invoices yet" /> : <Card><DataTable data={rows} columns={columns} /></Card>}
    </PageContainer>
  );
}
"""
    write(P_ROOT, "app/(dashboard)/billing/page.tsx", billing_page)

    webhook_cols = """{ key: 'name', header: 'Name' },
    { key: 'url', header: 'URL' },
    { key: 'events', header: 'Events', cell: (r) => r.events.join(', ') },
    { key: 'enabled', header: 'Status', cell: (r) => <Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Enabled' : 'Disabled'}</Badge> }"""
    write(P_ROOT, "app/(dashboard)/webhooks/page.tsx", plat_table_page("Webhooks", "use-platform-webhooks", "usePlatformWebhooks", webhook_cols, "No webhooks", "Platform-level event endpoints are configured here."))

    audit_cols = """{ key: 'createdAt', header: 'When' },
    { key: 'actor', header: 'Actor' },
    { key: 'action', header: 'Action', cell: (r) => <Badge>{r.action}</Badge> },
    { key: 'resource', header: 'Resource' }"""
    write(P_ROOT, "app/(dashboard)/audit/page.tsx", plat_table_page("Audit log", "use-audit-logs", "useAuditLogs", audit_cols, "No activity yet", "Platform audit events will appear here."))

    ai_page = DOC.format(app="platform dashboard", note="AI ops — providers/tasks/costs") + """'use client';

import { useState } from 'react';
import { Badge, Card, EmptyState, ErrorState, LoadingState, PageContainer, StatCard, Switch, Tabs } from '@testimonial-api/ui';
import { useAiCosts } from '../../../hooks/use-ai-costs';
import { useAiProviders } from '../../../hooks/use-ai-providers';
import { useAiTaskLogs } from '../../../hooks/use-ai-task-logs';

export default function AiOpsPage() {
  const [tab, setTab] = useState('providers');
  const providers = useAiProviders();
  const tasks = useAiTaskLogs({});
  const costs = useAiCosts('30d');

  return (
    <PageContainer title="AI operations">
      <Tabs
        tabs={[
          { label: 'Providers', value: 'providers', active: tab === 'providers', onSelect: setTab },
          { label: 'Task logs', value: 'tasks', active: tab === 'tasks', onSelect: setTab },
          { label: 'Costs', value: 'costs', active: tab === 'costs', onSelect: setTab },
        ]}
      />
      {tab === 'providers' && (
        <>
          {providers.isLoading && <LoadingState label="Loading providers…" />}
          {providers.isError && <ErrorState title="Could not load AI providers" retry={() => void providers.refetch()} />}
          {providers.data?.length === 0 && <EmptyState title="No providers configured" />}
          {providers.data?.map((p) => (
            <Card key={p.id} title={p.name} actions={<Switch checked={p.enabled} onCheckedChange={(v) => void providers.setEnabled(p.id, v)} />}>
              <p>{p.models.join(', ')}</p>
            </Card>
          ))}
        </>
      )}
      {tab === 'tasks' && (
        <>
          {tasks.isLoading && <LoadingState label="Loading task logs…" />}
          {tasks.isError && <ErrorState title="Could not load task logs" retry={() => void tasks.refetch()} />}
          {tasks.data?.length === 0 && <EmptyState title="No AI tasks yet" description="Tasks from classify/summarize operations will appear here." />}
          {tasks.data?.map((t) => (
            <p key={t.id}>
              <Badge>{t.operation}</Badge> via {t.provider} — <Badge tone={t.status === 'success' ? 'success' : t.status === 'failed' ? 'danger' : 'warning'}>{t.status}</Badge>{' '}
              {t.latencyMs !== undefined && `(${t.latencyMs}ms)`}{t.costUsd !== undefined && ` · $${t.costUsd}`}
            </p>
          ))}
        </>
      )}
      {tab === 'costs' && (
        <>
          {costs.isLoading && <LoadingState label="Loading costs…" />}
          {costs.isError && <ErrorState title="Could not load costs" retry={() => void costs.refetch()} />}
          {costs.data && (
            <>
              <StatCard label={`AI spend — ${costs.data.period}`} value={`$${costs.data.totalUsd}`} />
              {costs.data.byProvider.map((c) => (
                <StatCard key={c.provider} label={c.provider} value={`$${c.usd}`} />
              ))}
            </>
          )}
        </>
      )}
    </PageContainer>
  );
}
"""
    write(P_ROOT, "app/(dashboard)/ai/page.tsx", ai_page)

    plat_settings = DOC.format(app="platform dashboard", note="platform settings") + """'use client';

import { useState } from 'react';
import { Badge, Button, Card, Input, LoadingState, PageContainer, Switch } from '@testimonial-api/ui';

export default function PlatformSettingsPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [signups, setSignups] = useState(true);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  return (
    <PageContainer title="Platform settings">
      <Card title="Profile">
        <Input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => setSaved(true)}>Save</Button>
        {saved && <Badge tone="success">Saved</Badge>}
      </Card>
      <Card title="Operations">
        <Switch checked={maintenance} onCheckedChange={setMaintenance} /> Maintenance mode
        <Switch checked={signups} onCheckedChange={setSignups} /> Allow tenant sign-ups
      </Card>
      {maintenance && <LoadingState label="Maintenance mode is on — public pages show the maintenance screen." />}
    </PageContainer>
  );
}
"""
    write(P_ROOT, "app/(dashboard)/settings/page.tsx", plat_settings)
    print("platform-dashboard scaffold done")


# =========================================================================
# PUBLIC FORMS
# =========================================================================
F_ROOT = os.path.join("apps", "public-forms")

F_ROOT_LAYOUT = DOC.format(app="public-forms", note="root layout — SSR shell") + """import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@testimonial-api/ui';
import './globals.css';

export const metadata = {
  title: 'Share your feedback',
  description: 'Public testimonial collection forms.',
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

F_GLOBALS = """/** Doc 4 structural CSS — visual design system arrives in Doc 5. */
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
:root { --tui-bg: #ffffff; --tui-fg: #18181b; --tui-primary: #4f46e5; }
"""

F_HOME = DOC.format(app="public-forms", note="landing") + """import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 560, margin: '80px auto' }}>
      <h1>Testimonial API</h1>
      <p>This app serves public collection forms.</p>
      <Link href="/forms/demo">View example form</Link>
    </main>
  );
}
"""

F_PUBLIC_TYPES = """export interface PublicFormQuestion {
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
  logoUrl?: string | null;
  brandColor: string;
  questions: PublicFormQuestion[];
}
"""

F_SLUG_PAGE = DOC.format(app="public-forms", note="§5 SSR route") + """import type { PublicForm } from './public-types';
import { PublicFormView } from './public-form-view';

export const dynamic = 'force-dynamic';

const API = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let form: PublicForm | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(`${API}/v1/public/forms/${slug}`, { cache: 'no-store' });
    if (res.ok) {
      form = (await res.json()) as PublicForm;
    } else if (res.status === 404) {
      error = 'This form does not exist or is no longer published.';
    } else {
      error = 'We could not load this form right now. Please try again shortly.';
    }
  } catch {
    error = 'We could not reach the server. Please try again shortly.';
  }
  // The form body (schema + branding) is server-rendered in the HTML (Doc 4 §F1).
  return <PublicFormView slug={slug} initial={form} error={error} />;
}
"""

F_VIEW = DOC.format(app="public-forms", note="client form — submission + video upload path") + """'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { apiClient, Button, EmptyState, ErrorState, Input, LoadingState, RatingInput, Textarea } from '@testimonial-api/ui';
import type { PublicForm, PublicFormQuestion } from './public-types';

export function PublicFormView({
  slug,
  initial,
  error,
}: {
  slug: string;
  initial: PublicForm | null;
  error: string | null;
}) {
  const router = useRouter();
  const [form] = useState<PublicForm | null>(initial);
  const [loadError] = useState<string | null>(error);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loadError && !form) return <ErrorState title="Form unavailable" description={loadError} />;
  if (!form) return <LoadingState label="Loading form…" />;

  const brand = { '--brand': form.brandColor } as CSSProperties;

  const setAnswer = (q: PublicFormQuestion, value: string | number): void => {
    setAnswers((a) => ({ ...a, [q.id]: value }));
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiClient.post(`/v1/public/forms/${slug}/submissions`, {
        answers,
        // hCaptcha token resolved by the widget layer (Doc 4 §F2 + Doc 3 upload contract).
        captchaToken: '',
        videoUploadId: answers.videoUploadId as string | undefined,
      });
      router.push(`/forms/${slug}/success`);
    } catch {
      setSubmitError('We could not save your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main data-testid="public-form" style={{ maxWidth: 600, margin: '40px auto', padding: 24, ...brand } as CSSProperties}>
      <header>
        <h1>{form.name}</h1>
        <p>for {form.tenantName}</p>
      </header>
      {form.questions.length === 0 && <EmptyState title="This form has no questions yet" />}
      <form onSubmit={submit}>
        {form.questions.map((q) => (
          <fieldset key={q.id}>
            <legend>{q.label}{q.required && ' *'}</legend>
            {q.type === 'text' && <Textarea required={q.required} onChange={(e) => setAnswer(q, e.target.value)} />}
            {q.type === 'select' && (
              <select onChange={(e) => setAnswer(q, e.target.value)}>
                {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {q.type === 'rating' && <RatingInput value={Number(answers[q.id] ?? 0)} onChange={(v) => setAnswer(q, v)} />}
            {q.type === 'video' && (
              <p>
                <Input type="file" accept="video/*" aria-label="Video answer" />
                <small>Video uploads use a signed-URL flow (Doc 3 §uploads).</small>
              </p>
            )}
          </fieldset>
        ))}
        {submitError && <p role="alert">{submitError}</p>}
        {form.questions.length > 0 && (
          <Button variant="primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit feedback'}</Button>
        )}
      </form>
    </main>
  );
}
"""

F_SUCCESS = DOC.format(app="public-forms", note="success screen") + """import Link from 'next/link';

export default function FormSuccessPage() {
  return (
    <main style={{ maxWidth: 560, margin: '80px auto' }} data-testid="form-success">
      <h1>Thank you!</h1>
      <p>Your feedback has been submitted and is waiting for review.</p>
      <Link href="/">Back to home</Link>
    </main>
  );
}
"""


def write_public_forms():
    write(F_ROOT, "app/layout.tsx", F_ROOT_LAYOUT)
    write(F_ROOT, "app/globals.css", F_GLOBALS)
    write(F_ROOT, "app/page.tsx", F_HOME)
    write(F_ROOT, "app/forms/[slug]/public-types.ts", F_PUBLIC_TYPES)
    write(F_ROOT, "app/forms/[slug]/page.tsx", F_SLUG_PAGE)
    write(F_ROOT, "app/forms/[slug]/public-form-view.tsx", F_VIEW)
    write(F_ROOT, "app/forms/[slug]/success/page.tsx", F_SUCCESS)
    print("public-forms scaffold done")


if __name__ == "__main__":
    write_platform()
    write_public_forms()
