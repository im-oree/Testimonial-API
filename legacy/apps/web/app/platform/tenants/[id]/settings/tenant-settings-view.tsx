/** Doc 4 — platform dashboard (tenant settings — suspend/delete). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  DestructiveConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  Switch,
} from '@testimonial-api/ui';
import { useTenantDetail } from '../../../../../hooks/use-tenant-detail';
import { useTenantSettings } from '../../../../../hooks/use-tenant-settings';

export function TenantSettingsView({ tenantId }: { tenantId: string }) {
  const detail = useTenantDetail(tenantId);
  const settings = useTenantSettings(tenantId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (detail.isLoading) return <LoadingState label="Loading tenant settings…" />;
  if (detail.isError) return <ErrorState title="Could not load tenant settings" retry={() => void detail.refetch()} />;
  const t = detail.data;
  if (!t) return <EmptyState title="Not found" description="This tenant does not exist." />;

  return (
    <PageContainer title={`${t.name} — settings`}>
      <Card title="Access">
        <Switch checked={t.status !== 'suspended'} onCheckedChange={(v) => void settings.suspend(!v)} />
      </Card>
      <Card title="Danger zone">
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete tenant</Button>
      </Card>
      <DestructiveConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete tenant"
        description="Permanently deletes the tenant, its apps, forms and testimonials. This cannot be undone."
        confirmText={t.slug.toUpperCase()}
      />
    </PageContainer>
  );
}
