/** Doc 4 — platform dashboard (tenants/[id] route). Structural skeleton; visual pass in Doc 5. */
import { TenantDetailView } from './tenant-detail-view';

export const dynamic = 'force-dynamic';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TenantDetailView tenantId={id} />;
}
