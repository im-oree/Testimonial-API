/** Doc 4 — platform dashboard (billing). Structural skeleton; visual pass in Doc 5. */
'use client';

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
