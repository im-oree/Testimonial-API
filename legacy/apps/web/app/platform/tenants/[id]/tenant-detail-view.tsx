/** Doc 4 — platform dashboard (tenant detail). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  Select,
  StatCard,
  Switch,
} from '@testimonial-api/ui';
import { useTenantDetail } from '../../../../hooks/use-tenant-detail';
import { useTenantSettings } from '../../../../hooks/use-tenant-settings';
import { useImpersonationStore } from '../../../../stores/impersonation.store';
import { useMe } from '@testimonial-api/ui';

const PLAN_OPTIONS = [
  { label: 'Free', value: 'free' },
  { label: 'Starter', value: 'starter' },
  { label: 'Growth', value: 'growth' },
  { label: 'Enterprise', value: 'enterprise' },
];

export function TenantDetailView({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const me = useMe();
  const detail = useTenantDetail(tenantId);
  const settings = useTenantSettings(tenantId);
  const startImpersonation = useImpersonationStore((s) => s.startImpersonation);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);

  if (detail.isLoading) return <LoadingState label="Loading tenant…" />;
  if (detail.isError) return <ErrorState title="Could not load this tenant" retry={() => void detail.refetch()} />;
  const t = detail.data;
  if (!t) return <EmptyState title="Not found" description="This tenant does not exist." />;

  return (
    <PageContainer
      title={t.name}
      actions={
        <>
          <Button onClick={() => setImpersonateOpen(true)}>Impersonate</Button>
          <Button variant="destructive" onClick={() => setSuspendOpen(true)}>{t.status === 'suspended' ? 'Unsuspend' : 'Suspend'}</Button>
        </>
      }
    >
      <StatCard label="Plan" value={t.plan} />
      <StatCard label="Seats" value={`${t.seatsUsed} / ${t.seatsLimit}`} />
      <StatCard label="Testimonials" value={t.testimonialCount ?? 0} />
      <Card title="Owner">
        <p>{t.ownerEmail}</p>
      </Card>
      <Card title="Plan management">
        <Select options={PLAN_OPTIONS} value={t.plan} onChange={(v) => void settings.changePlan(v)} />
        <Switch checked={t.status !== 'suspended'} onCheckedChange={(v) => void settings.suspend(!v)} />
      </Card>
      <Card title="Applications">
        {t.apps.map((a) => (
          <p key={a.id}>• {a.name} ({a.id})</p>
        ))}
      </Card>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button onClick={() => router.push(`/platform/tenants/${tenantId}/staff`)}>Manage staff</Button>
        <Button onClick={() => router.push(`/platform/tenants/${tenantId}/settings`)}>Tenant settings</Button>
      </div>

      <Dialog open={impersonateOpen} onOpenChange={setImpersonateOpen} title="Impersonate tenant">
        <p>You will act as {t.name} until you end the session.</p>
        <Button
          variant="primary"
          onClick={() => {
            startImpersonation(tenantId, t.name, me.data?.user.id ?? '');
            setImpersonateOpen(false);
          }}
        >
          Start impersonation
        </Button>
      </Dialog>
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen} title={t.status === 'suspended' ? 'Unsuspend tenant' : 'Suspend tenant'}>
        <p>Staff at this tenant will lose access immediately.</p>
        <Button variant="destructive" onClick={() => void settings.suspend(t.status !== 'suspended').then(() => setSuspendOpen(false))}>
          Confirm
        </Button>
      </Dialog>
    </PageContainer>
  );
}
