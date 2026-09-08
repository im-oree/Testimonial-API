/** Doc 4 — platform dashboard (overview). Structural skeleton; visual pass in Doc 5. */
'use client';

import { EmptyState, ErrorState, LoadingState, PageContainer, StatCard } from '@testimonial-api/ui';
import { usePlatformOverview } from '../../../hooks/use-platform-overview';

export default function PlatformOverviewPage() {
  const q = usePlatformOverview();
  if (q.isLoading) return <LoadingState label="Loading platform overview…" />;
  if (q.isError) return <ErrorState title="Could not load platform overview" retry={() => void q.refetch()} />;
  if (!q.data) return <EmptyState title="No platform data yet" />;
  return (
    <PageContainer title="Platform overview">
      <StatCard label="Tenants" value={q.data.tenants} />
      <StatCard label="Active apps" value={q.data.activeApps} />
      <StatCard label="Total testimonials" value={q.data.totalTestimonials} />
      <StatCard label="Pending review" value={q.data.pendingReview} />
      <StatCard label="MRR" value={`$${q.data.monthlyMrrUsd}`} />
    </PageContainer>
  );
}
