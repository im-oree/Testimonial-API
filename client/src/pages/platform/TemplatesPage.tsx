/**
 * Platform — the global widget template catalogue.
 *
 * Every template Zojatech ships, exactly as tenants see it in their
 * Templates gallery: live previews, categories, fixed dimensions. Read-only
 * — templates are versioned with the platform.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { WidgetTemplateRow } from '../../lib/types';
import { TemplatePreview } from '../../components/TemplatePreview';
import { Breadcrumbs, ErrorBanner, PageHeader } from '../../components/ui';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WidgetTemplateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('All');

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ rows: WidgetTemplateRow[] }>('/v1/platform/widget-templates')
      .then((d) => setTemplates(d.rows))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the template catalogue.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const t of templates ?? []) set.add(t.category);
    return [...set];
  }, [templates]);

  const rows = useMemo(
    () => (templates ?? []).filter((t) => category === 'All' || t.category === category),
    [templates, category],
  );

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Templates' }]} />
      <PageHeader
        title="Templates"
        subtitle="The global widget template catalogue every tenant can use — free, fixed-dimension, always in sync with the platform."
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="market-toolbar">
        <div className="chip-row" role="tablist" aria-label="Template categories">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              className={`tpl-cat-pill ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {!templates && (
        <div className="tpl-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card tpl-card">
              <span className="sk tpl-preview-sk" />
              <span className="sk" style={{ display: 'block', width: '55%', height: 15, marginTop: 12 }} />
            </div>
          ))}
        </div>
      )}

      {templates && (
        <div className="tpl-grid">
          {rows.map((t) => (
            <div key={t.id} className="card tpl-card">
              <div className="tpl-card-preview">
                <TemplatePreview schema={t.schema} />
                <span className="tpl-dims-badge">{t.width} × {t.height}</span>
              </div>
              <div className="tpl-card-body">
                <div className="tpl-card-title">
                  <span className="strong">{t.name}</span>
                  <span className="chip">{t.category}</span>
                </div>
                <p className="muted small tpl-card-desc">{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
