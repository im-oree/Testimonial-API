/** Doc 4 — tenant dashboard (webhooks + deliveries). Structural skeleton; visual pass in Doc 5. */
'use client';

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
