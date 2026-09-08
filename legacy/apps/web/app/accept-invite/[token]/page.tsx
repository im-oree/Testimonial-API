/** Doc 4 — tenant dashboard (accept-invite route (Next 15: params is a Promise)). Structural skeleton; visual pass in Doc 5. */
import { AcceptInviteView } from './accept-invite-view';
import { ForbiddenPage } from '@testimonial-api/ui';

export const dynamic = 'force-dynamic';

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return <ForbiddenPage />;
  return <AcceptInviteView token={token} />;
}
