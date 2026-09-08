/** Doc 4 — platform dashboard (Audit log page). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useMemo } from 'react';
import { Badge, Card, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, type Column } from '@testimonial-api/ui';
import { useAuditLogs } from '../../../hooks/use-platform-audit-logs';

export default function AuditlogPage() {
  const q = useAuditLogs();
  const rows = useMemo(() => (q.data ?? []).map((r) => ({ ...r })), [q.data]);
  const columns: Column<(typeof rows)[number]>[] = [{ key: 'createdAt', header: 'When' },
    { key: 'actor', header: 'Actor' },
    { key: 'action', header: 'Action', cell: (r) => <Badge>{r.action}</Badge> },
    { key: 'resource', header: 'Resource' }];
  if (q.isLoading) return <LoadingState label="Loading audit log…" />;
  if (q.isError) return <ErrorState title="Could not load audit log" retry={() => void q.refetch()} />;
  return (
    <PageContainer title="Audit log">
      {rows.length === 0 ? <EmptyState title="No activity yet" description="Platform audit events will appear here." /> : <Card><DataTable data={rows} columns={columns} /></Card>}
      
    </PageContainer>
  );
}
