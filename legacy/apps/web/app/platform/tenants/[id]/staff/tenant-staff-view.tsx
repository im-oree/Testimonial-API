/** Doc 4 — platform dashboard (tenant staff list). Structural skeleton; visual pass in Doc 5. */
'use client';

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
