/** Doc 4 — tenant dashboard (testimonial detail — full record + moderation actions + tags). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  DestructiveConfirmDialog,
  EmptyState,
  ErrorState,
  JsonViewer,
  LoadingState,
  PageContainer,
  TagInput,
} from '@testimonial-api/ui';
import { useTestimonialDetail } from '../../../../hooks/use-testimonial-detail';
import { useTestimonialMutations } from '../../../../hooks/use-testimonial-mutations';
import { useUiStore } from '../../../../stores/ui.store';

export function TestimonialDetailView({ id }: { id: string }) {
  const router = useRouter();
  const appId = useUiStore((s) => s.activeAppId);
  const detail = useTestimonialDetail(appId ?? undefined, id);
  const mutations = useTestimonialMutations();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!appId) return <LoadingState label="Select an app…" />;
  if (detail.isLoading) return <LoadingState label="Loading testimonial…" />;
  if (detail.isError) return <ErrorState title="Could not load this testimonial" retry={() => void detail.refetch()} />;
  const t = detail.data;
  if (!t) return <EmptyState title="Not found" description="This testimonial does not exist." />;

  return (
    <PageContainer title="Testimonial detail">
      <article data-testid="testimonial-detail">
        <blockquote>{t.content}</blockquote>
        <p>— {t.authorName ?? 'Anonymous'} · <Badge tone={t.status === 'approved' ? 'success' : t.status === 'rejected' ? 'danger' : 'warning'}>{t.status}</Badge></p>
        <TagInput value={t.tags} />
        {t.mediaUrl && <p><a href={t.mediaUrl}>View attached media</a></p>}
        <JsonViewer value={{ id: t.id, rating: t.rating, createdAt: t.createdAt }} />
      </article>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={() => void mutations.moderate(appId, id, 'approve')}>Approve</Button>
        <Button onClick={() => void mutations.moderate(appId, id, 'reject')}>Reject</Button>
        <Button onClick={() => void mutations.moderate(appId, id, 'archive')}>Archive</Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
      </div>
      <DestructiveConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete testimonial"
        description="This permanently removes the record."
        confirmText="DELETE"
        onConfirm={() => void mutations.deleteTestimonial(appId, id).then(() => router.push('/app/testimonials'))}
      />
    </PageContainer>
  );
}
