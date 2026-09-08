/** Doc 4 — tenant dashboard (widget builder — live preview + style overrides + embed code). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CodeBlock, EmptyState, ErrorState, LoadingState, PageContainer, Switch, WidgetBuilder } from '@testimonial-api/ui';
import { useWidgetDetail } from '../../../hooks/use-widget-detail';
import { useWidgetLivePreview } from '../../../hooks/use-widget-live-preview';
import { useWidgetMutations } from '../../../hooks/use-widget-mutations';
import { useUiStore } from '../../../stores/ui.store';

export function WidgetEditorView({ widgetId }: { widgetId?: string }) {
  const router = useRouter();
  const appId = useUiStore((s) => s.activeAppId);
  const detail = useWidgetDetail(appId ?? undefined, widgetId ?? '');
  const mutations = useWidgetMutations();
  const preview = useWidgetLivePreview({
    theme: detail.data?.theme ?? 'light',
    accentColor: detail.data?.accentColor ?? '#6366f1',
    fontFamily: detail.data?.fontFamily,
  });
  const [enabled, setEnabled] = useState(true);

  if (!appId) return <LoadingState label="Select an app…" />;
  if (widgetId && detail.isLoading) return <LoadingState label="Loading widget…" />;
  if (widgetId && detail.isError) return <ErrorState title="Could not load this widget" retry={() => void detail.refetch()} />;
  if (widgetId && !detail.data) return <EmptyState title="Not found" />;

  const embed = `<script async src="https://cdn.testimonialapi.com/widget.js" data-widget="${detail.data?.id ?? 'new'}"></script>`;

  const save = async (): Promise<void> => {
    const saved = await mutations.saveWidget(appId, { id: widgetId, ...preview.overrides });
    router.push(`/app/widgets/${saved.id}`);
  };

  return (
    <PageContainer
      title={detail.data?.name ?? 'New widget'}
      actions={
        <>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Button onClick={() => void save()}>Save widget</Button>
        </>
      }
    >
      <WidgetBuilder overrides={preview.overrides} onChange={preview.update} />
      <Card title="Embed code"><CodeBlock code={embed} language="html" /></Card>
    </PageContainer>
  );
}
