/** Doc 4 — tenant dashboard (overview — stat cards + trend chart (Recharts in Doc 5)). Structural skeleton; visual pass in Doc 5. */
'use client';

import { EmptyState, ErrorState, LoadingState, PageContainer, StatCard } from '@testimonial-api/ui';
import { useDashboardOverview } from '../../../hooks/use-dashboard-overview';
import { useUiStore } from '../../../stores/ui.store';

export default function OverviewPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const overview = useDashboardOverview(appId ?? undefined);
  if (overview.isLoading || !appId) return <LoadingState label="Loading overview…" />;
  if (overview.isError) return <ErrorState title="Could not load overview" retry={() => void overview.refetch()} />;
  const data = overview.data;
  if (!data || data.totalTestimonials === 0) {
    return (
      <PageContainer title="Overview">
        <EmptyState title="No testimonials yet" description="Publish a form or widget to start collecting feedback." />
      </PageContainer>
    );
  }
  return (
    <PageContainer title="Overview">
      <StatCard label="Pending review" value={data.totalPending} />
      <StatCard label="Approved" value={data.totalApproved} />
      <StatCard label="Rejected" value={data.totalRejected} />
      <StatCard label="Total" value={data.totalTestimonials} />
    </PageContainer>
  );
}
