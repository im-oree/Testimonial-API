/**
 * Layout shell — sidebar + top header.
 *
 * The sidebar is tiered so it never gets crowded:
 *   · Tenant level   : Overview · Products · Team & Roles · Audit Logs.
 *   · Product level  : the sidebar switches to that product's own pages
 *                      (Overview · Testimonials · Moderation · Forms) with a
 *                      quick product switcher above and a way back to
 *                      "All products".
 *   · Platform level : Overview · Tenants · Audit Logs.
 * A platform admin impersonating a company sees a banner with one-click exit.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../auth';
import { api } from '../lib/api';
import { initials } from '../lib/format';
import type { AppSummary, MeTenant } from '../lib/types';
import { InlineSpinner } from './ui';
import { ErrorBoundary } from './ErrorBoundary';
import { IconChevronDown } from './icons';

export interface NavItem {
  label: string;
  to: string;
  end?: boolean;
  /** Required platform/company permission; hidden when the session lacks it. */
  perm?: string;
}

export interface NavGroup {
  label?: string | null;
  items: NavItem[];
}

/** A labelled nav section that can collapse to keep the sidebar from getting crowded. */
function NavGroupBlock({ label, items }: { label?: string | null; items: NavItem[] }) {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;
  if (!label) {
    return (
      <div className="nav-group">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            {item.label}
          </NavLink>
        ))}
      </div>
    );
  }
  return (
    <div className="nav-group">
      <button
        type="button"
        className={`nav-group-toggle ${open ? '' : 'is-collapsed'}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="sidebar-section-label">{label}</span>
        <IconChevronDown size={13} />
      </button>
      {open && (
        <div className="nav-group-items">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({
  brand,
  groups,
  identity,
  extra,
}: {
  brand: string;
  groups: NavGroup[];
  identity?: Pick<MeTenant, 'name' | 'brandColor' | 'logoUrl'> | null;
  extra?: ReactNode;
}) {
  const { user, permissions, signOut } = useAuth();
  const navigate = useNavigate();

  const visible = groups
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.perm || permissions.includes(it.perm)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-dot" />
        {brand}
      </div>

      {identity && (
        <div className="ws-identity">
          {identity.logoUrl ? (
            <img
              src={identity.logoUrl}
              alt={`${identity.name} logo`}
              className="ws-logo"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          ) : (
            <span className="ws-avatar" style={{ background: identity.brandColor ?? 'var(--navy)' }}>
              {(identity.name[0] ?? '?').toUpperCase()}
            </span>
          )}
          <div className="ws-identity-text">
            <span className="strong ws-name">{identity.name}</span>
            <span className="muted small">Company workspace</span>
          </div>
        </div>
      )}

      {extra && <div className="sidebar-extra">{extra}</div>}

      <nav className="sidebar-nav">
        {visible.map((group, gi) => (
          <NavGroupBlock key={gi} label={group.label} items={group.items} />
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <span className="avatar">{initials(user.name)}</span>
            <span className="sidebar-user-text">
              <span className="strong">{user.name}</span>
              <span className="muted small">
                {user.role.startsWith('platform_owner') ? 'Super admin' : user.role.startsWith('platform') ? 'Platform team' : user.role.replace('_', ' ')}
              </span>
            </span>
          </div>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => {
            signOut();
            navigate('/login', { replace: true });
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function Shell({
  brand,
  groups,
  scopeLabel,
  identity,
  sidebarExtra,
  banner,
}: {
  brand: string;
  groups: NavGroup[];
  scopeLabel: string;
  identity?: Pick<MeTenant, 'name' | 'brandColor' | 'logoUrl'> | null;
  sidebarExtra?: ReactNode;
  banner?: ReactNode;
}) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="shell">
      <Sidebar brand={brand} groups={groups} identity={identity} extra={sidebarExtra} />
      <div className="shell-main">
        {banner}
        <header className="topbar">
          <div className="topbar-scope">
            {scopeLabel}
            {identity && <span className="topbar-scope-sub"> / Company</span>}
          </div>
          <div className="topbar-user">
            {identity ? (
              <span
                className="chip tenant-chip-brand"
                style={
                  identity.brandColor
                    ? { background: identity.brandColor, borderColor: identity.brandColor, color: '#fff' }
                    : undefined
                }
              >
                {identity.name}
              </span>
            ) : (
              <span className="chip chip-tenant">Platform</span>
            )}
            <span className="muted small">{user?.email}</span>
          </div>
        </header>
        <main className="content">
          <ErrorBoundary resetKey={pathname}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

/** Compact in-product switcher: shows the one selected product + a dropdown to change it. */
function ProductSwitcher({ activeAppId }: { activeAppId: string | null }) {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<{ rows: AppSummary[] }>('/v1/apps?perPage=200')
      .then((data) => {
        if (alive) setApps(data.rows);
      })
      .catch(() => {
        if (alive) setApps([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const current = apps?.find((a) => a.id === activeAppId) ?? null;

  return (
    <div className="sidebar-apps">
      <div className="sidebar-section-label">Selected product</div>
      {current ? (
        <div className="sidebar-current">
          <span className="ws-avatar" style={{ background: current.accentColor ?? 'var(--navy)', width: 28, height: 28, fontSize: 13 }}>
            {(current.name[0] ?? '?').toUpperCase()}
          </span>
          <div className="sidebar-current-text">
            <span className="strong small sidebar-current-name">{current.name}</span>
            <span className="muted small">{current.code}</span>
          </div>
        </div>
      ) : (
        <div className="sidebar-apps-loading">
          <InlineSpinner />
        </div>
      )}
      {apps && apps.length > 0 && (
        <select
          className="input sidebar-switch"
          aria-label="Switch product"
          value={activeAppId ?? ''}
          onChange={(e) => {
            if (e.target.value) navigate(`/app/a/${e.target.value}/overview`);
          }}
        >
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.code}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/** Banner shown while a platform admin impersonates this company. */
function ImpersonationBar() {
  const { impersonating, exitImpersonation } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!impersonating) return null;
  return (
    <div className="impersonate-banner">
      <span>
        <strong>Impersonating {impersonating.tenantName}</strong> — signed in as this tenant on behalf of {impersonating.by} (Zojatech
        platform access).
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void exitImpersonation().finally(() => setBusy(false));
        }}
      >
        {busy ? 'Leaving…' : 'Exit impersonation'}
      </button>
    </div>
  );
}

/** Company (tenant) workspace shell. */
export function AppLayout() {
  const { tenant } = useAuth();
  const { pathname } = useLocation();
  const match = pathname.match(/^\/app\/a\/([^/]+)/);
  const appId = match?.[1] ?? null;

  const workspaceManage: NavItem[] = [
    { label: 'Settings', to: '/app/settings', end: true },
    { label: 'Account', to: '/app/settings/account', end: true },
    { label: 'Team & roles', to: '/app/team', perm: 'team.manage' },
    { label: 'Audit logs', to: '/app/audit', perm: 'audit.read' },
  ];

  const groups: NavGroup[] = appId
    ? [
        { items: [{ label: 'All products', to: '/app/products' }] },
        {
          label: 'Product pages',
          items: [
            { label: 'Overview', to: `/app/a/${appId}/overview`, end: true },
            { label: 'Connect', to: `/app/a/${appId}/connect`, end: true },
            { label: 'Testimonials', to: `/app/a/${appId}/testimonials`, end: true },
            { label: 'Moderation', to: `/app/a/${appId}/testimonials/moderation` },
            { label: 'Forms', to: `/app/a/${appId}/forms` },
          ],
        },
        { label: 'Manage', items: workspaceManage },
      ]
    : [
        {
          items: [
            { label: 'Overview', to: '/app/overview', end: true },
            { label: 'Products', to: '/app/products', end: true },
          ],
        },
        { label: 'Manage', items: workspaceManage },
      ];

  return (
    <Shell
      brand="Zojatech"
      groups={groups}
      scopeLabel={tenant?.name ?? 'Company'}
      identity={tenant}
      sidebarExtra={appId ? <ProductSwitcher activeAppId={appId} /> : null}
      banner={<ImpersonationBar />}
    />
  );
}

/** Platform (super-company) shell. */
export function PlatformLayout() {
  const groups: NavGroup[] = [
    {
      label: 'Console',
      items: [
        { label: 'Overview', to: '/platform/overview', end: true },
        { label: 'Tenants', to: '/platform/tenants' },
      ],
    },
    {
      label: 'Catalogue',
      items: [{ label: 'Theme Templates', to: '/platform/templates', end: true }],
    },
    {
      label: 'Team & access',
      items: [
        { label: 'Team accounts', to: '/platform/accounts', perm: 'staff.read' },
        { label: 'Audit Logs', to: '/platform/audit', perm: 'audit.read', end: true },
      ],
    },
  ];
  return <Shell brand="Zojatech" groups={groups} scopeLabel="Platform admin · Zojatech" />;
}
