/** Doc 4 — platform dashboard (tenants/[id]/staff). Structural skeleton; visual pass in Doc 5. */
import { TenantStaffView } from './tenant-staff-view';

export const dynamic = 'force-dynamic';

export default async function TenantStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TenantStaffView tenantId={id} />;
}
