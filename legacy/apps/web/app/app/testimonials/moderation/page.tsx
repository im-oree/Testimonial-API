/** Doc 4 — tenant dashboard (moderation queue — kanban by status). Structural skeleton; visual pass in Doc 5. */
'use client';

import { EmptyState, ErrorState, LoadingState, PageContainer, TestimonialKanban } from '@testimonial-api/ui';
import { useTestimonialMutations } from '../../../../hooks/use-testimonial-mutations';
import { useTestimonials } from '../../../../hooks/use-testimonials';
import { useUiStore } from '../../../../stores/ui.store';

export default function ModerationPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const pending = useTestimonials(appId ?? undefined, { status: 'pending', perPage: 100 });
  const approved = useTestimonials(appId ?? undefined, { status: 'approved', perPage: 100 });
  const rejected = useTestimonials(appId ?? undefined, { status: 'rejected', perPage: 100 });
  const mutations = useTestimonialMutations();

  if (pending.isLoading || approved.isLoading || rejected.isLoading || !appId) return <LoadingState label="Loading moderation queue…" />;
  if (pending.isError || approved.isError || rejected.isError) return <ErrorState title="Could not load the moderation queue" retry={() => { void pending.refetch(); void approved.refetch(); void rejected.refetch(); }} />;
  const columns = [
    { id: 'pending', title: 'Pending', items: (pending.data ?? []).map((t) => ({ id: t.id, summary: t.content.slice(0, 80), status: 'pending' })) },
    { id: 'approved', title: 'Approved', items: (approved.data ?? []).map((t) => ({ id: t.id, summary: t.content.slice(0, 80), status: 'approved' })) },
    { id: 'rejected', title: 'Rejected', items: (rejected.data ?? []).map((t) => ({ id: t.id, summary: t.content.slice(0, 80), status: 'rejected' })) },
  ];
  const empty = columns.every((c) => c.items.length === 0);
  if (empty) {
    return (
      <PageContainer title="Moderation">
        <EmptyState title="Queue is clear" description="Nothing waiting for review right now." />
      </PageContainer>
    );
  }
  return (
    <PageContainer title="Moderation">
      <TestimonialKanban columns={columns} onMove={(itemId, to) => void (to === 'approved' ? mutations.moderate(appId, itemId, 'approve') : to === 'rejected' ? mutations.moderate(appId, itemId, 'reject') : mutations.moderate(appId, itemId, 'archive'))} />
    </PageContainer>
  );
}
