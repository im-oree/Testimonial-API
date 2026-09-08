/** Company (tenant) workspace — Settings hub. Categories fan out to dedicated pages. */
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import type { MeTenant } from '../lib/types';
import { IconClipboard, IconLayers, IconLock, IconPalette, IconUsers } from '../components/icons';
import { Breadcrumbs, PageHeader } from '../components/ui';

interface Cat {
  key: string;
  icon: 'palette' | 'lock' | 'users' | 'clipboard' | 'layers';
  title: string;
  desc: string;
  to: string;
  note?: string;
}

function SwatchDots({ t }: { t: MeTenant }) {
  const c = t.theme?.primary ?? t.brandColor ?? '#1b2559';
  const a = t.theme?.accent ?? '#0ea5a0';
  return (
    <span className="cat-dots">
      <i style={{ background: c }} />
      <i style={{ background: a }} />
    </span>
  );
}

export default function SettingsPage() {
  const { tenant } = useAuth();

  const cats: Cat[] = [
    { key: 'theme', icon: 'palette', title: 'Appearance & theme', desc: 'Template + colours, corners, font and logo for your public surfaces.', to: '/app/settings/theme' },
    { key: 'account', icon: 'lock', title: 'Account & security', desc: 'Your name, sign-in email and password.', to: '/app/settings/account' },
    { key: 'team', icon: 'users', title: 'Users & roles', desc: 'Members, invites, role permissions.', to: '/app/team' },
    { key: 'audit', icon: 'clipboard', title: 'Audit & activity', desc: 'Who did what across the workspace.', to: '/app/audit' },
    { key: 'products', icon: 'layers', title: 'Products & embedding', desc: 'Create products, collect reviews, connect walls to your sites.', to: '/app/products' },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Settings', to: '/app/settings' }]} />
      <PageHeader title="Settings" subtitle="Everything is split into focused pages so each one stays short and manageable." />

      <div className="cat-grid">
        {cats.map((c) => (
          <Link key={c.key} to={c.to} className="card cat-card">
            <div className="cat-card-head">
              <span className="cat-icon">
              {c.icon === 'palette' && <IconPalette />}
              {c.icon === 'lock' && <IconLock />}
              {c.icon === 'users' && <IconUsers />}
              {c.icon === 'clipboard' && <IconClipboard />}
              {c.icon === 'layers' && <IconLayers />}
            </span>
              {c.key === 'theme' && tenant && <SwatchDots t={tenant} />}
            </div>
            <div className="strong">{c.title}</div>
            <div className="muted small">{c.desc}</div>
            <span className="cat-go">Open →</span>
          </Link>
        ))}
      </div>

      <details className="card collapse-card" open={false}>
        <summary>About this workspace (collapsed for tidiness)</summary>
        <p className="muted small" style={{ margin: '6px 0 0' }}>
          <strong>Tenant:</strong> {tenant?.name} · slug <code>{tenant?.slug}</code> · products live on the Products page and each product owns its
          testimonials, forms, wall and embed snippets. Billing is not part of this demo. Zojatech (platform side) manages plans, status and can
          impersonate your workspace.
        </p>
      </details>
    </div>
  );
}
