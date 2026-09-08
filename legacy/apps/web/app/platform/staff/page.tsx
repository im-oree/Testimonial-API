/** Doc 4 — platform dashboard (Platform staff page). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useMemo } from 'react';
import { Badge, Card, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, type Column } from '@testimonial-api/ui';
import { usePlatformStaff } from '../../../hooks/use-platform-staff';

export default function PlatformstaffPage() {
  const q = usePlatformStaff();
  const rows = useMemo(() => (q.data ?? []).map((r) => ({ ...r })), [q.data]);
  const columns: Column<(typeof rows)[number]>[] = [{ key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', cell: (r) => <Badge>{r.role}</Badge> },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge> },
    { key: 'lastActiveAt', header: 'Last active', cell: (r) => r.lastActiveAt ?? '—' }];
  if (q.isLoading) return <LoadingState label="Loading platform staff…" />;
  if (q.isError) return <ErrorState title="Could not load platform staff" retry={() => void q.refetch()} />;
  return (
    <PageContainer title="Platform staff">
      {rows.length === 0 ? <EmptyState title="No staff yet" description="Platform team members appear here." /> : <Card><DataTable data={rows} columns={columns} /></Card>}
      
    </PageContainer>
  );
}
