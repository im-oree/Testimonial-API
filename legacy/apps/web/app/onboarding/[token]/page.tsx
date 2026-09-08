/** Doc 4 — tenant dashboard (§2.2 onboarding route (Next 15: params is a Promise)). Structural skeleton; visual pass in Doc 5. */
import { OnboardingView } from './onboarding-view';
import { ForbiddenPage } from '@testimonial-api/ui';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return <ForbiddenPage />;
  return <OnboardingView token={token} />;
}
