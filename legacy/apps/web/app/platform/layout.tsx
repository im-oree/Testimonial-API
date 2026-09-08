/** Doc 4 — platform dashboard ((dashboard) guard — impersonation banner + sidebar). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ImpersonationBanner, LoadingState, RealtimeIndicator, Sidebar, type NavItem, useMe, useRealtime } from '@testimonial-api/ui';
import { useImpersonationStore } from '../../stores/impersonation.store';

const NAV: Array<{ label: string; href: string }> = [
  { label: 'Overview', href: '/platform/overview' },
  { label: 'Tenants', href: '/platform/tenants' },
  { label: 'Staff', href: '/platform/staff' },
  { label: 'Billing', href: '/platform/billing' },
  { label: 'Webhooks', href: '/platform/webhooks' },
  { label: 'Audit log', href: '/platform/audit' },
  { label: 'AI', href: '/platform/ai' },
  { label: 'Settings', href: '/platform/settings' },
];

export default function PlatformDashboardLayout({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const realtime = useRealtime({ meEnabled: true });
  const impersonating = useImpersonationStore((s) => s.isImpersonating);
  const tenantName = useImpersonationStore((s) => s.tenantName);
  const endImpersonation = useImpersonationStore((s) => s.endImpersonation);

  useEffect(() => {
    if (me.isError) router.replace('/login?reason=session_expired');
  }, [me.isError, router]);

  if (me.isLoading || me.isError) return <LoadingState label="Checking your session…" />;
  const user = me.data?.user;

  const items: NavItem[] = NAV.map((n) => ({
    label: n.label,
    href: n.href,
    active: pathname === n.href || pathname.startsWith(n.href + '/'),
  }));

  return (
    <div data-testid="platform-shell">
      {impersonating && tenantName && (
        <ImpersonationBanner
          tenantName={tenantName}
          onExit={() => {
            endImpersonation();
            void me.refetch();
          }}
        />
      )}
      <Sidebar items={items} />
      <div style={{ marginLeft: 240 }}>
        <header style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: 8 }}>
          <RealtimeIndicator connected={realtime.connected} />
          <span data-testid="current-staff">{user?.name}</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
