/** Doc 4 — platform dashboard (Tenants page). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useMemo } from 'react';
import { Badge, Card, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, type Column } from '@testimonial-api/ui';
import { useTenants } from '../../../hooks/use-tenants';

export default function TenantsPage() {
  const q = useTenants();
  const rows = useMemo(() => (q.data ?? []).map((r) => ({ ...r })), [q.data]);
  const columns: Column<(typeof rows)[number]>[] = [{ key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    { key: 'plan', header: 'Plan' },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={r.status === 'active' ? 'success' : r.status === 'suspended' ? 'danger' : 'warning'}>{r.status}</Badge> },
    { key: 'testimonialCount', header: 'Testimonials', cell: (r) => String(r.testimonialCount ?? 0) }];
  if (q.isLoading) return <LoadingState label="Loading tenants…" />;
  if (q.isError) return <ErrorState title="Could not load tenants" retry={() => void q.refetch()} />;
  return (
    <PageContainer title="Tenants">
      {rows.length === 0 ? <EmptyState title="No tenants yet" description="New sign-ups will appear here." /> : <Card><DataTable data={rows} columns={columns} /></Card>}
      
    </PageContainer>
  );
}
