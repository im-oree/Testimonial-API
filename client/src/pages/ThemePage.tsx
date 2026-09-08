/** Company workspace — Appearance & theme (own page under Settings).
 *
 * Organised as: a status strip up top, then the two-zone ThemeEditor
 * (template catalogue -> fine-tune tokens, with a sticky save bar), then
 * two short explainer cards. Everything here is company-wide; per-product
 * widget designs live in each product's design studio.
 */
import { IconCheck } from '../components/icons';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import ThemeEditor from '../components/ThemeEditor';
import type { ResolvedTheme, ThemeSaveResponse } from '../lib/types';
import { Breadcrumbs, ErrorBanner, PageHeader } from '../components/ui';

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
      <PageHeader
        title="Appearance & theme"
        subtitle={`One look for ${tenant?.name ?? 'your company'} — applied to every public form, wall and widget embed. Products can still layer their own design and tokens on top.`}
        actions={
          <Link className="btn btn-secondary" to="/app/products">
            Products &amp; per-product designs
          </Link>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => setTick((t) => t + 1)} />}
      {notice && <div className="banner banner-ok"><IconCheck size={13} /> {notice}</div>}

      <div className="theme-status-strip">
        <span className="theme-status-item">
          <span className="muted small">Company</span>
          <span className="strong">{tenant?.name ?? '…'}</span>
        </span>
        <span className="theme-status-item">
          <span className="muted small">Theme version</span>
          <span className="chip chip-approved">v{theme?.version ?? 0}</span>
        </span>
        <span className="theme-status-item">
          <span className="muted small">Colours</span>
          <span className="color-dots">
            <i style={{ background: theme?.primary ?? 'var(--navy)' }} />
            <i style={{ background: theme?.accent ?? 'var(--teal)' }} />
          </span>
        </span>
        <span className="theme-status-item">
          <span className="muted small">Updated by</span>
          <span className="strong">Zojatech or {tenant?.name ?? 'you'}</span>
        </span>
      </div>

      {theme ? (
        <ThemeEditor endpoint="/v1/settings/theme" initial={theme} initialLogo={logo} onSaved={onSaved} catalogueHref="/app/templates" />
      ) : (
        <div className="card" aria-busy="true">
          <div className="block-center" style={{ padding: '26px 0' }}>
            <span className="sk" style={{ display: 'block', width: '60%', height: 14, margin: '0 auto 8px' }} />
            <span className="sk" style={{ display: 'block', width: '100%', height: 30, margin: '0 auto 8px' }} />
            <span className="sk" style={{ display: 'block', width: '80%', height: 30, margin: '0 auto' }} />
          </div>
        </div>
      )}

      <div className="two-col" style={{ marginTop: 16 }}>
        <details className="card collapse-card" open>
          <summary>Where this theme shows up</summary>
          <ul className="plain-list">
            <li>
              Every product&apos;s <strong>public review form</strong> and <strong>wall</strong> (set up under{' '}
              <Link to="/app/products">Products</Link>, then Connect &amp; design) render with these tokens.
            </li>
            <li>
              The <strong>widget script</strong> and <strong>iframe embeds</strong> on external sites pull the same theme on every
              load — change it once here and all embeds follow on their next visit. Nothing to redeploy.
            </li>
            <li>Zojatech can restyle your company from its panel — you keep the final say from this page.</li>
          </ul>
        </details>

        <details className="card collapse-card" open>
          <summary>Designs, templates and overrides</summary>
          <ul className="plain-list">
            <li>
              <strong>Templates</strong>: the tiles in step 1 come from Zojatech&apos;s live template catalogue — new ones appear
              here automatically. Browse and apply widget designs in the{' '}
              <Link to="/app/templates">template gallery</Link>.
            </li>
            <li>
              <strong>Per-product design</strong>: each product builds its widget from a fixed-dimension template and customises it
              in the <Link to="/app/products">design studio</Link> — colours, typography, layouts, carousel and marquee behaviors.
            </li>
            <li>
              <strong>Versioning</strong>: every save here (and every product design save) bumps a version that public surfaces pick
              up on their next load.
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}
