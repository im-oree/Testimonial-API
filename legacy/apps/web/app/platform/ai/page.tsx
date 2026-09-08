/** Doc 4 — platform dashboard (AI ops — providers/tasks/costs). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState } from 'react';
import { Badge, Card, EmptyState, ErrorState, LoadingState, PageContainer, StatCard, Switch, Tabs } from '@testimonial-api/ui';
import { useAiCosts } from '../../../hooks/use-ai-costs';
import { useAiProviders } from '../../../hooks/use-ai-providers';
import { useAiTaskLogs } from '../../../hooks/use-ai-task-logs';

export default function AiOpsPage() {
  const [tab, setTab] = useState('providers');
  const providers = useAiProviders();
  const tasks = useAiTaskLogs({});
  const costs = useAiCosts('30d');

  return (
    <PageContainer title="AI operations">
      <Tabs
        tabs={[
          { label: 'Providers', value: 'providers', active: tab === 'providers', onSelect: setTab },
          { label: 'Task logs', value: 'tasks', active: tab === 'tasks', onSelect: setTab },
          { label: 'Costs', value: 'costs', active: tab === 'costs', onSelect: setTab },
        ]}
      />
      {tab === 'providers' && (
        <>
          {providers.isLoading && <LoadingState label="Loading providers…" />}
          {providers.isError && <ErrorState title="Could not load AI providers" retry={() => void providers.refetch()} />}
          {providers.data?.length === 0 && <EmptyState title="No providers configured" />}
          {providers.data?.map((p) => (
            <Card key={p.id} title={p.name} actions={<Switch checked={p.enabled} onCheckedChange={(v) => void providers.setEnabled(p.id, v)} />}>
              <p>{p.models.join(', ')}</p>
            </Card>
          ))}
        </>
      )}
      {tab === 'tasks' && (
        <>
          {tasks.isLoading && <LoadingState label="Loading task logs…" />}
          {tasks.isError && <ErrorState title="Could not load task logs" retry={() => void tasks.refetch()} />}
          {tasks.data?.length === 0 && <EmptyState title="No AI tasks yet" description="Tasks from classify/summarize operations will appear here." />}
          {tasks.data?.map((t) => (
            <p key={t.id}>
              <Badge>{t.operation}</Badge> via {t.provider} — <Badge tone={t.status === 'success' ? 'success' : t.status === 'failed' ? 'danger' : 'warning'}>{t.status}</Badge>{' '}
              {t.latencyMs !== undefined && `(${t.latencyMs}ms)`}{t.costUsd !== undefined && ` · $${t.costUsd}`}
            </p>
          ))}
        </>
      )}
      {tab === 'costs' && (
        <>
          {costs.isLoading && <LoadingState label="Loading costs…" />}
          {costs.isError && <ErrorState title="Could not load costs" retry={() => void costs.refetch()} />}
          {costs.data && (
            <>
              <StatCard label={`AI spend — ${costs.data.period}`} value={`$${costs.data.totalUsd}`} />
              {costs.data.byProvider.map((c) => (
                <StatCard key={c.provider} label={c.provider} value={`$${c.usd}`} />
              ))}
            </>
          )}
        </>
      )}
    </PageContainer>
  );
}
