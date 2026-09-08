/** Doc 4 — platform dashboard (Webhooks page). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useMemo } from 'react';
import { Badge, Card, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, type Column } from '@testimonial-api/ui';
import { usePlatformWebhooks } from '../../../hooks/use-platform-webhooks';

export default function WebhooksPage() {
  const q = usePlatformWebhooks();
  const rows = useMemo(() => (q.data ?? []).map((r) => ({ ...r })), [q.data]);
  const columns: Column<(typeof rows)[number]>[] = [{ key: 'name', header: 'Name' },
    { key: 'url', header: 'URL' },
    { key: 'events', header: 'Events', cell: (r) => r.events.join(', ') },
    { key: 'enabled', header: 'Status', cell: (r) => <Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Enabled' : 'Disabled'}</Badge> }];
  if (q.isLoading) return <LoadingState label="Loading webhooks…" />;
  if (q.isError) return <ErrorState title="Could not load webhooks" retry={() => void q.refetch()} />;
  return (
    <PageContainer title="Webhooks">
      {rows.length === 0 ? <EmptyState title="No webhooks" description="Platform-level event endpoints are configured here." /> : <Card><DataTable data={rows} columns={columns} /></Card>}
      
    </PageContainer>
  );
}
