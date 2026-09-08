/** Doc 4 — tenant dashboard ((dashboard) guard layout — useMe + useRealtime + sidebar + impersonation banner). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  applyTenantTheme,
  clearTenantTheme,
  ImpersonationBanner,
  LoadingState,
  RealtimeIndicator,
  Sidebar,
  type NavItem,
  useMe,
  useRealtime,
} from '@testimonial-api/ui';
import { useUiStore } from '../../stores/ui.store';

const NAV: Array<{ label: string; href: string; permission?: string }> = [
  { label: 'Overview', href: '/app/overview' },
  { label: 'Testimonials', href: '/app/testimonials', permission: 'testimonials.read' },
  { label: 'Moderation', href: '/app/testimonials/moderation', permission: 'testimonials.moderate' },
  { label: 'Forms', href: '/app/forms', permission: 'forms.manage' },
  { label: 'Widgets', href: '/app/widgets', permission: 'widgets.manage' },
  { label: 'Team', href: '/app/team', permission: 'team.manage' },
  { label: 'Webhooks', href: '/app/webhooks', permission: 'webhooks.manage' },
  { label: 'Audit log', href: '/app/audit' },
  { label: 'Billing', href: '/app/billing', permission: 'billing.view' },
  { label: 'Settings', href: '/app/settings', permission: 'settings.manage' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const activeAppId = useUiStore((s) => s.activeAppId);
  const setActiveApp = useUiStore((s) => s.setActiveApp);
  const realtime = useRealtime({ appId: activeAppId ?? undefined, meEnabled: true });

  useEffect(() => {
    if (me.isError) router.replace('/login?reason=session_expired');
  }, [me.isError, router]);

  // Adopt the default app from /me once known so data hooks can fetch
  // (the app switcher can change it later).
  const meAppId = me.data?.tenant?.appId;
  useEffect(() => {
    if (meAppId && !activeAppId) setActiveApp(meAppId);
  }, [meAppId, activeAppId, setActiveApp]);

  // Doc 5 §9.4 — tenant brand color re-themes the whole dashboard shell.
  const brandColor = me.data?.tenant?.brandColor;
  useEffect(() => {
    if (brandColor) applyTenantTheme(brandColor);
    else clearTenantTheme();
    return () => clearTenantTheme();
  }, [brandColor]);

  if (me.isLoading || me.isError) return <LoadingState label="Checking your session…" />;
  const user = me.data?.user;
  const tenant = me.data?.tenant;
  const permissions = me.data?.permissions ?? [];

  const items: NavItem[] = NAV.filter((n) => !n.permission || permissions.includes(n.permission)).map((n) => ({
    label: n.label,
    href: n.href,
    permission: n.permission,
    active: pathname === n.href || pathname.startsWith(n.href + '/'),
  }));

  return (
    <div data-testid="dashboard-shell">
      {me.data?.impersonating && (
        <ImpersonationBanner tenantName={me.data.impersonating.tenantName} />
      )}
      <Sidebar items={items} />
      <div style={{ marginLeft: 240 }}>
        <header style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: 8 }}>
          <RealtimeIndicator connected={realtime.connected} />
          <span data-testid="current-tenant">{tenant?.name ?? '…'}</span>
          <span data-testid="current-user">{user?.name}</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
