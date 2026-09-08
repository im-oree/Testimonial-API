/** Doc 4 — tenant dashboard (audit log). Structural skeleton; visual pass in Doc 5. */
'use client';

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
