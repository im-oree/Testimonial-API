/** Doc 4 — platform dashboard (tenants/[id]/settings). Structural skeleton; visual pass in Doc 5. */
import { TenantSettingsView } from './tenant-settings-view';

export const dynamic = 'force-dynamic';

export default async function TenantSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TenantSettingsView tenantId={id} />;
}
