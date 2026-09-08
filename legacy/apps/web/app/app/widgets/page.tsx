/** Doc 4 — tenant dashboard (widgets list + embed copy). Structural skeleton; visual pass in Doc 5. */
'use client';

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
    { key: 'name', header: 'Name', cell: (r) => <Link href={`/app/widgets/${r.id}`}>{r.name}</Link> },
    { key: 'theme', header: 'Theme' },
    { key: 'enabled', header: 'Status', cell: (r) => <Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Enabled' : 'Disabled'}</Badge> },
    { key: 'embedType', header: 'Embed' },
    { key: 'id', header: 'Embed code', cell: (r) => <Button variant="ghost" onClick={() => setEmbedFor(r.id)}>Show code</Button> },
  ];
  const embedWidget = widgets.data?.find((w) => w.id === embedFor);
  const snippet = embedWidget ? `<div data-tz-widget="${embedWidget.id}"></div>
<script async src="https://cdn.testimonialapi.com/widget.js" data-widget="${embedWidget.id}"></script>` : '';

  if (widgets.isLoading) return <LoadingState label="Loading widgets…" />;
  if (widgets.isError) return <ErrorState title="Could not load widgets" retry={() => void widgets.refetch()} />;
  if (widgets.data?.length === 0) {
    return (
      <PageContainer title="Widgets" actions={<Link href="/app/widgets/new"><Button>New widget</Button></Link>}>
        <EmptyState title="No widgets yet" description="Embed a widget to display your approved testimonials." />
      </PageContainer>
    );
  }
  return (
    <PageContainer title="Widgets" actions={<Link href="/app/widgets/new"><Button>New widget</Button></Link>}>
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
