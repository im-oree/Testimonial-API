/** Doc 4 — tenant dashboard (testimonials/[id] route). Structural skeleton; visual pass in Doc 5. */
import { TestimonialDetailView } from './testimonial-detail-view';

export const dynamic = 'force-dynamic';

export default async function TestimonialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestimonialDetailView id={id} />;
}
