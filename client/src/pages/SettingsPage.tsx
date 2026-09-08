/** Company (tenant) workspace — Settings hub: theme & identity + management links. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import ThemeEditor from '../components/ThemeEditor';
import type { ResolvedTheme, ThemeSaveResponse } from '../lib/types';
import { Breadcrumbs, Card, ErrorBanner, PageHeader } from '../components/ui';

export default function SettingsPage() {
  const { tenant, refresh } = useAuth();
  const [theme, setTheme] = useState<ResolvedTheme | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    api
      .get<{ theme: ResolvedTheme; logoUrl: string | null }>('/v1/settings/theme')
      .then((res) => {
        if (!alive) return;
        setTheme(res.theme);
        setLogo(res.logoUrl);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load your theme.');
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  function onSaved(res: ThemeSaveResponse): void {
    setTheme(res.theme);
    setLogo(res.logoUrl ?? null);
    setNotice('Theme saved — your workspace chrome and every public form, wall and embed use it now.');
    void refresh(); // keep sidebar identity (brand colour/logo) in sync
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Company', to: '/app/overview' }, { label: 'Settings' }]} />
      <PageHeader title="Settings" subtitle="Make the workspace yours — theme, identity and who has access." />

      {error && <ErrorBanner message={error} onRetry={() => setTick((t) => t + 1)} />}
      {notice && <div className="banner banner-ok">✓ {notice}</div>}

      <div className="two-col" style={{ marginBottom: 14 }}>
        <Card className="stack">
          <div className="brand-id">
            {logo ? (
              <img src={logo} alt={`${tenant?.name ?? ''} logo`} className="brand-logo" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            ) : (
              <span className="ws-avatar" style={{ background: theme?.primary ?? 'var(--navy)', width: 46, height: 46, fontSize: 20 }}>
                {(tenant?.name?.[0] ?? '?').toUpperCase()}
              </span>
            )}
            <div>
              <h2 style={{ margin: 0 }}>Theme &amp; branding</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Tailwind-presets-style tokens, fully adjustable, saved server-side. Your customers see them on forms, walls and embeds.
              </p>
            </div>
          </div>

          {theme ? (
            <ThemeEditor
              endpoint="/v1/settings/theme"
              initial={theme}
              initialLogo={logo}
              onSaved={onSaved}
            />
          ) : (
            <div aria-busy="true">
              <span className="sk" style={{ display: 'block', width: '60%', height: 14 }} />
              <span className="sk" style={{ display: 'block', width: '100%', height: 30, marginTop: 10 }} />
              <span className="sk" style={{ display: 'block', width: '100%', height: 30, marginTop: 8 }} />
              <span className="sk" style={{ display: 'block', width: '70%', height: 14, marginTop: 12 }} />
            </div>
          )}
        </Card>

        <Card className="stack">
          <h2 style={{ margin: 0 }}>Management</h2>
          <Link to="/app/settings/account" className="card settings-link">
            <div className="small strong">Account</div>
            <div className="muted small">Your name, sign-in email and password.</div>
            <span className="settings-go">Open →</span>
          </Link>
          <Link to="/app/team" className="card settings-link">
            <div className="small strong">Users & Roles</div>
            <div className="muted small">Invite teammates, assign roles and view permissions.</div>
            <span className="settings-go">Open →</span>
          </Link>
          <Link to="/app/audit" className="card settings-link">
            <div className="small strong">Audit Logs</div>
            <div className="muted small">Who did what, and what the System did automatically.</div>
            <span className="settings-go">Open →</span>
          </Link>
          <p className="muted small" style={{ marginBottom: 0 }}>
            Product setup lives on the <Link to="/app/products">Products</Link> page — each product gets its own ID, review form, wall and
            embed snippets.
          </p>
        </Card>
      </div>
    </div>
  );
}
