/** Doc 4 — tenant dashboard (billing — plan + usage + invoices). Structural skeleton; visual pass in Doc 5. */
'use client';

import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageContainer, StatCard } from '@testimonial-api/ui';
import { useBilling } from '../../../hooks/use-billing';

export default function BillingPage() {
  const billing = useBilling();
  if (billing.isLoading) return <LoadingState label="Loading billing…" />;
  if (billing.isError) return <ErrorState title="Could not load billing" retry={() => void billing.refetch()} />;
  if (!billing.data) return <EmptyState title="No billing information" />;
  return (
    <PageContainer title="Billing" actions={<Button>Manage plan</Button>}>
      <StatCard label="Plan" value={billing.data.plan} />
      <StatCard label="Seats" value={`${billing.data.seatsUsed} / ${billing.data.seatsLimit}`} />
      <StatCard label="Monthly cost" value={`$${billing.data.monthlyCostUsd}`} />
      <Card title="Status"><Badge tone={billing.data.status === 'active' ? 'success' : 'warning'}>{billing.data.status}</Badge></Card>
    </PageContainer>
  );
}
