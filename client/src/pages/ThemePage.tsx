/** Company workspace — Appearance & theme (own page under Settings). */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import ThemeEditor from '../components/ThemeEditor';
import type { ResolvedTheme, ThemeSaveResponse } from '../lib/types';
import { Breadcrumbs, Card, ErrorBanner, PageHeader } from '../components/ui';

export default function ThemePage() {
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
    void refresh();
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Settings', to: '/app/settings' }, { label: 'Appearance & theme' }]} />
      <PageHeader title="Appearance & theme" subtitle="One look for your company — applied to every form, wall and widget embed." />

      {error && <ErrorBanner message={error} onRetry={() => setTick((t) => t + 1)} />}
      {notice && <div className="banner banner-ok">✓ {notice}</div>}

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
              Pick a template made by Zojatech, then fine-tune it — colours, corners and font are saved server-side and versioned.
            </p>
          </div>
        </div>

        {theme ? (
          <ThemeEditor endpoint="/v1/settings/theme" initial={theme} initialLogo={logo} onSaved={onSaved} />
        ) : (
          <div aria-busy="true">
            <span className="sk" style={{ display: 'block', width: '60%', height: 14 }} />
            <span className="sk" style={{ display: 'block', width: '100%', height: 30, marginTop: 10 }} />
            <span className="sk" style={{ display: 'block', width: '100%', height: 30, marginTop: 8 }} />
          </div>
        )}
      </Card>

      <details className="card collapse-card">
        <summary>Where does this theme show up? (and why it updates everywhere)</summary>
        <ul className="plain-list">
          <li>Every product&apos;s <strong>public review form</strong> and <strong>wall</strong> ({' '}
            <Link to="/app/products">Products</Link> → Connect) render with these tokens.
          </li>
          <li>The <strong>widget script</strong> and <strong>iframe embeds</strong> on your external sites pull the same theme on every load — change it once here and all embeds follow on their next visit. Nothing to redeploy.</li>
          <li>A single product can still <strong>override</strong> specific tokens on its own Connect &amp; design page (e.g. one website with its own accent).</li>
          <li>Zojatech can also restyle your company from its panel — you keep the final say from this page.</li>
        </ul>
      </details>
    </div>
  );
}
