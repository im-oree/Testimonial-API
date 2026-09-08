/**
 * Company workspace — Design template marketplace (DOC 7 chunk 3).
 *
 * Zojatech's curated tier-1 catalogue, browsed here by every company:
 *   - "Use for company"   adopts a template company-wide (tier 2) — it applies
 *     the template's visual preset AND widget design as the default that every
 *     product without its own per-product design inherits.
 *   - "Copy to a product" applies the template onto one product (tier 3),
 *     which bumps that product's design version so its public wall and embeds
 *     refresh on their next load.
 *
 * Every card previews the template by rendering the REAL widget design from the
 * shared registry with the template's tokens — no mock screenshots.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { RADIUS_OPTIONS, softOf } from '../lib/theme';
import type { AppSummary, CompanyDesignDefault, DesignTemplateRow } from '../lib/types';
import { Button, Breadcrumbs, EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { IconCheck, IconChevronRight, IconSearch } from '../components/icons';
import { getWidgetDesign, SAMPLE_ITEMS, type WidgetTokens } from '../widgets';

interface MarketResponse {
  rows: Array<DesignTemplateRow & { active: boolean }>;
  current: CompanyDesignDefault;
}

export default function ThemeMarketplacePage() {
  const [rows, setRows] = useState<Array<DesignTemplateRow & { active: boolean }> | null>(null);
  const [current, setCurrent] = useState<CompanyDesignDefault | null>(null);
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copierId, setCopierId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    Promise.all([
      api.get<MarketResponse>('/v1/settings/theme/marketplace'),
      api.get<{ rows: AppSummary[] }>('/v1/apps?perPage=200'),
    ])
      .then(([market, list]) => {
        if (!alive) return;
        setRows(market.rows);
        setCurrent(market.current);
        setApps(list.rows);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load the template marketplace.');
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  const categories = useMemo(() => {
    const set = new Set<string>((rows ?? []).map((r) => r.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) => (category === 'All' || r.category === category) && (!q || `${r.name} ${r.description} ${r.designId}`.toLowerCase().includes(q)),
    );
  }, [rows, category, query]);

  async function adoptCompany(row: DesignTemplateRow): Promise<void> {
    if (busyId) return;
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    try {
      await api.post(`/v1/settings/theme/templates/${row.id}/apply`, {});
      setNotice(`"${row.name}" is now your company default — products without a per-product design inherit ${getWidgetDesign(row.designId).meta.name}.`);
      setRows(null);
      setTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply that template.');
    } finally {
      setBusyId(null);
    }
  }

  async function copyToProduct(row: DesignTemplateRow, app: AppSummary): Promise<void> {
    if (busyId) return;
    setBusyId(`${row.id}:${app.id}`);
    setError(null);
    setNotice(null);
    try {
      const res = await api.patch<{ app: AppSummary }>(`/v1/apps/${app.id}`, {
        widgetDesign: row.designId,
        accentColor: row.primary,
        themeAccent: row.accent,
        themeRadius: row.radius,
        themeFont: row.font,
        designTemplateId: row.id,
      });
      setApps((prev) => prev.map((a) => (a.id === app.id ? res.app : a)));
      setNotice(
        `"${row.name}" applied to ${app.name} (design v${res.app.designVersion ?? 1}). Its public wall and embeds pick it up on their next load.`,
      );
      setCopierId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the template to that product.');
    } finally {
      setBusyId(null);
    }
  }

  const fallbackName = getWidgetDesign('classic').meta.name;
  const currentTemplate = current ? rows?.find((r) => r.id === current.template?.id) : undefined;
  const currentDesignName = current?.widgetDesign ? getWidgetDesign(current.widgetDesign).meta.name : fallbackName;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Settings', to: '/app/settings' },
          { label: 'Appearance & theme', to: '/app/settings/theme' },
          { label: 'Design templates' },
        ]}
      />
      <PageHeader
        title="Design templates"
        subtitle="Zojatech's curated template gallery. Adopt one for your whole company, or copy a template onto a single product."
        actions={
          <Link className="btn btn-secondary" to="/app/settings/theme">
            Back to Appearance
          </Link>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => setTick((t) => t + 1)} />}
      {notice && (
        <div className="banner banner-ok">
          <IconCheck size={13} /> {notice}
        </div>
      )}

      <div className="theme-status-strip">
        <span className="theme-status-item">
          <span className="muted small">Company default</span>
          <span className="strong">
            {currentTemplate ? currentTemplate.name : current?.widgetDesign ? currentDesignName : `${fallbackName} (fallback)`}
            {currentTemplate && <span className="chip chip-approved" style={{ marginLeft: 8 }}>{currentDesignName}</span>}
          </span>
        </span>
        <span className="theme-status-item">
          <span className="muted small">Scope</span>
          <span className="strong">All products inherit — unless they override on their Connect &amp; design page</span>
        </span>
        <span className="theme-status-item">
          <span className="muted small">Templates</span>
          <span className="strong">{rows?.length ?? 0} curated by Zojatech</span>
        </span>
      </div>

      <div className="market-toolbar">
        <div className="chip-row" role="tablist" aria-label="Filter by layout category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              className={`chip chip-btn ${category === c ? 'chip-btn-active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="search-box" style={{ marginLeft: 'auto' }}>
          <IconSearch size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates"
            aria-label="Search templates"
          />
        </label>
      </div>

      {!rows ? (
        <div className="tpl-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card tpl-card">
              <span className="sk" style={{ display: 'block', height: 168, borderRadius: 0 }} />
              <span className="sk" style={{ display: 'block', width: '55%', height: 13, margin: 14 }} />
              <span className="sk" style={{ display: 'block', width: '85%', height: 10, margin: '0 14px 16px' }} />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState title="No templates match" hint="Try another layout category or clear the search." />
        </div>
      ) : (
        <div className="tpl-grid">
          {visible.map((row) => {
            const design = getWidgetDesign(row.designId);
            const active = row.active;
            return (
              <div key={row.id} className={`card tpl-card${active ? ' tpl-card-active' : ''}`}>
                <TemplateCover row={row} designLabel={design.meta.name} />
                {active && (
                  <span className="chip chip-approved tpl-active-tag">
                    <IconCheck size={11} /> Company default
                  </span>
                )}
                <div className="tpl-body">
                  <div className="tpl-title-row">
                    <span className="strong" title={row.name}>{row.name}</span>
                    <span className="chip">{design.meta.category}</span>
                  </div>
                  <p className="muted small tpl-desc">{row.description}</p>
                  <div className="tpl-actions">
                    <Button className="btn-sm" disabled={busyId !== null || active} onClick={() => void adoptCompany(row)}>
                      {busyId === row.id ? 'Applying…' : active ? 'Applied' : 'Use for company'}
                    </Button>
                    <Button variant="secondary" className="btn-sm" disabled={busyId !== null} onClick={() => setCopierId(copierId === row.id ? null : row.id)}>
                      Copy to a product
                      <IconChevronRight size={12} />
                    </Button>
                  </div>

                  {copierId === row.id && (
                    <div className="tpl-app-picker">
                      <p className="muted small" style={{ margin: '0 0 4px' }}>Apply to one product (keeps others untouched):</p>
                      {apps.length === 0 ? (
                        <p className="muted small">No products yet — create one under Products first.</p>
                      ) : (
                        apps.map((app) => {
                          const inherited = !app.widgetDesign;
                          const label = getWidgetDesign(app.widgetDesign ?? current?.widgetDesign ?? 'classic').meta.name;
                          const applied = app.widgetDesign === row.designId && app.designTemplateId === row.id;
                          return (
                            <button
                              key={app.id}
                              type="button"
                              className="tpl-app-row"
                              disabled={busyId !== null || applied}
                              onClick={() => void copyToProduct(row, app)}
                            >
                              <span>
                                <span className="strong small">{app.name}</span>
                                <span className="muted small">
                                  {applied ? 'Uses this template' : `${label}${inherited ? ' (inherited)' : ' (per-product)'}`}
                                </span>
                              </span>
                              {applied ? (
                                <IconCheck size={13} style={{ color: 'var(--good)' }} />
                              ) : (
                                <Button variant="ghost" className="btn-xs" disabled={busyId !== null}>Apply</Button>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <details className="card collapse-card" style={{ marginTop: 16 }}>
        <summary>How templates flow through your workspace</summary>
        <ul className="plain-list">
          <li>
            <strong>Tier 1 — Curated gallery</strong>: Zojatech maintains this catalogue. New templates appear here automatically, no
            update needed on your side.
          </li>
          <li>
            <strong>Tier 2 — Company default</strong>: "Use for company" applies the template's palette and widget design everywhere.
            It sets your Appearance theme and the design that products inherit.
          </li>
          <li>
            <strong>Tier 3 — Per product</strong>: "Copy to a product" pins the template onto one product and bumps its design version.
            That product no longer follows company-wide design changes unless you copy it again.
          </li>
          <li>
            <strong>Fine-tuning</strong>: after adopting, open <Link to="/app/settings/theme">Appearance &amp; theme</Link> to adjust
            colours, radius and font, or visit a product's Connect &amp; design page for per-product content options.
          </li>
        </ul>
      </details>
    </div>
  );
}

/** Live cover: the actual widget design rendering with the template's tokens. */
function TemplateCover({ row, designLabel }: { row: DesignTemplateRow; designLabel: string }) {
  const { component: W } = getWidgetDesign(row.designId);
  const tokens: WidgetTokens = {
    primary: row.primary,
    soft: softOf(row.primary),
    accent: row.accent,
    radiusPx: RADIUS_OPTIONS.find((r) => r.id === row.radius)?.px ?? 12,
    font: row.font,
  };
  return (
    <div className="tpl-frame">
      <div className="tpl-frame-bar">
        <i /><i /><i />
        <span>preview · {designLabel}</span>
      </div>
      <div className="tpl-frame-body">
        <W items={SAMPLE_ITEMS.slice(0, 3)} tokens={tokens} cta={null} />
      </div>
    </div>
  );
}
