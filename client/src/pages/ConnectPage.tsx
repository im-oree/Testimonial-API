/**
 * Product "Widget" — pick the template your widget is built from.
 *
 * A paginated catalogue of fixed-dimension, pre-designed widget templates
 * rendered live with sample data (6 per page). Every template already
 * contains the required rating components (review text, reviewer name,
 * rating stars) plus its own decorative extras; dimensions are fixed so a
 * developer knows exactly what space the embed occupies before it loads.
 *
 * From here: Apply now switches the live embed immediately, Preview &
 * customize starts an unpublished draft in the design studio. The embed
 * snippets and the live preview live on the Connect tab.
 */
import { IconCheck, IconEdit } from '../components/icons';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAppName } from '../lib/useAppName';
import type { AppSummary, WidgetTemplateRow } from '../lib/types';
import type { StudioRecord, StudioSchema } from '../design-studio/types';
import { SchemaSurface } from '../design-studio/runtime';
import { Breadcrumbs, Button, ErrorBanner, PageHeader } from '../components/ui';
import { ConfirmDialog } from '../components/menu';

const SAMPLE_RECORD: StudioRecord = {
  content: 'The embed was live on our site before lunch and reviews started arriving the same day.',
  authorName: 'Ada Okafor',
  rating: 5,
};

/** A template preview scaled to fit its card — true live rendering, tiny size. */
function TemplatePreview({ schema }: { schema: StudioSchema }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = (): void => {
      const w = box.clientWidth;
      if (w > 0) setScale(w / schema.canvas.width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [schema.canvas.width]);

  return (
    <div ref={boxRef} className="tpl-preview" style={{ aspectRatio: `${schema.canvas.width} / ${schema.canvas.height}` }}>
      <div
        className="tpl-preview-inner"
        style={{
          width: schema.canvas.width,
          height: schema.canvas.height,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <SchemaSurface schema={schema} record={SAMPLE_RECORD} />
      </div>
    </div>
  );
}

export default function ConnectPage() {
  const { appId = '' } = useParams();
  const appName = useAppName(appId);
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<WidgetTemplateRow[] | null>(null);
  const [app, setApp] = useState<AppSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmApply, setConfirmApply] = useState<WidgetTemplateRow | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    Promise.all([
      api.get<{ rows: WidgetTemplateRow[] }>('/v1/widget-templates'),
      api.get<{ rows: AppSummary[] }>('/v1/apps?perPage=200').then((d) => d.rows.find((a) => a.id === appId) ?? null),
    ])
      .then(([tpls, appRow]) => {
        setTemplates(tpls.rows);
        setApp(appRow);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the widget catalogue.'));
  }, [appId]);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string): void {
    setNote(msg);
    window.setTimeout(() => setNote((cur) => (cur === msg ? null : cur)), 2600);
  }

  async function applyTemplate(t: WidgetTemplateRow): Promise<void> {
    setBusyId(t.id);
    setError(null);
    try {
      const res = await api.post<{ app: AppSummary }>(`/v1/apps/${appId}/widget-template/${t.id}/apply`);
      setApp(res.app);
      setConfirmApply(null);
      flash(`${t.name} applied — your widget now uses it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the template.');
    } finally {
      setBusyId(null);
    }
  }

  /** Preview & customise WITHOUT applying: starts an unpublished draft from
   *  the template and opens the studio. The live embed is untouched until the
   *  draft is published from the studio. */
  async function customizeTemplate(t: WidgetTemplateRow): Promise<void> {
    setBusyId(t.id);
    setError(null);
    try {
      await api.post(`/v1/apps/${appId}/widget-template/${t.id}/draft`);
      navigate(`/app/a/${appId}/studio`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start a draft from this template.');
      setBusyId(null);
    }
  }

  async function discardDraft(): Promise<void> {
    setBusyId('discard');
    setError(null);
    try {
      const res = await api.del<{ app: AppSummary }>(`/v1/dashboard/apps/${appId}/design/draft`);
      setApp(res.app);
      flash('Draft discarded — the live design stays as it is.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not discard the draft.');
    } finally {
      setBusyId(null);
    }
  }

  function requestApply(t: WidgetTemplateRow): void {
    // Switching templates replaces the product's current design; confirm when
    // there is something to lose (an applied template or studio customisation).
    if ((app?.studioVersion ?? 0) > 0) setConfirmApply(t);
    else void applyTemplate(t);
  }

  const activeTemplateId = app?.designTemplateId ?? null;
  const activeTemplate = templates?.find((t) => t.id === activeTemplateId) ?? null;
  const hasCustomDesign = (app?.studioVersion ?? 0) > 0;

  // Pagination: 6 templates per page. Land on the page holding the active
  // template so the current choice is what you see first.
  const PAGE_SIZE = 6;
  const pages = Math.max(1, Math.ceil((templates?.length ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = templates?.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) ?? null;

  // First render with templates loaded: open on the active template's page.
  useEffect(() => {
    if (!templates || !activeTemplate) return;
    setPage(Math.floor(templates.indexOf(activeTemplate) / PAGE_SIZE) + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, activeTemplate?.id]);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', to: '/app/products' },
          { label: appName ?? appId, to: `/app/a/${appId}/overview` },
          { label: 'Widget' },
        ]}
      />
      <PageHeader
        title="Widget"
        subtitle="Pick the template your widget is built from — customise it in the studio, connect it on the Connect tab."
        actions={
          <>
            <Link className="btn btn-outline" to={`/app/a/${appId}/embed`}>
              Connect it →
            </Link>
            <Link className="btn btn-outline" to={`/app/a/${appId}/studio`}>
              <IconEdit size={13} /> Customize in studio
            </Link>
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}
      {note && (
        <div className="banner banner-ok" role="status">
          <span>
            <IconCheck size={13} /> {note}
          </span>
        </div>
      )}

      {app?.designDraft && (
        <div className="draft-banner" role="status">
          <span className="strong small">
            Draft in progress{app.designDraft.templateId ? ` — ${templates?.find((t) => t.id === app.designDraft?.templateId)?.name ?? app.designDraft.templateId}` : ''}
          </span>
          <span className="muted small">Customising without applying: the live embed keeps serving your published design until you publish from the studio.</span>
          <span className="draft-banner-actions">
            <Link className="btn btn-secondary btn-xs" to={`/app/a/${appId}/studio`}>
              <IconEdit size={12} /> Open studio
            </Link>
            <Button variant="ghost" className="btn-xs" disabled={busyId === 'discard'} onClick={() => void discardDraft()}>
              Discard draft
            </Button>
          </span>
        </div>
      )}

      {/* ---- 1 · Pick a template ------------------------------------------ */}
      <section className="tpl-section">
        <div className="section-head">
          <div>
            <h2 style={{ margin: 0 }}>Pick a template</h2>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              Every template ships with the required rating components — review text, reviewer name and stars — plus its
              own extras. Dimensions are fixed, so you always know where it fits.
            </p>
          </div>
        </div>

        {!templates && (
          <div className="tpl-grid" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card tpl-card">
                <span className="sk tpl-preview-sk" />
                <span className="sk" style={{ display: 'block', width: '55%', height: 15, marginTop: 12 }} />
                <span className="sk" style={{ display: 'block', width: '80%', height: 10, marginTop: 7 }} />
                <span className="sk" style={{ display: 'block', width: '40%', height: 10, marginTop: 5 }} />
              </div>
            ))}
          </div>
        )}

        {rows && (
          <div className="tpl-grid">
            {rows.map((t) => {
              const active = t.id === activeTemplateId && hasCustomDesign;
              return (
                <div key={t.id} className={`card tpl-card ${active ? 'active' : ''}`}>
                  <div className="tpl-card-preview">
                    <TemplatePreview schema={t.schema} />
                    {active && <span className="tpl-active-badge"><IconCheck size={11} /> In use</span>}
                    <span className="tpl-dims-badge">{t.width} × {t.height}</span>
                  </div>
                  <div className="tpl-card-body">
                    <div className="tpl-card-title">
                      <span className="strong">{t.name}</span>
                      <span className="chip">{t.category}</span>
                    </div>
                    <p className="muted small tpl-card-desc">{t.description}</p>
                    <div className="tpl-card-features">
                      {t.features.map((f) => (
                        <span key={f} className="chip chip-tag">{f}</span>
                      ))}
                    </div>
                    <div className="tpl-card-actions">
                      {active ? (
                        <Link className="btn btn-secondary btn-sm" to={`/app/a/${appId}/studio`}>
                          <IconEdit size={13} /> Customize
                        </Link>
                      ) : (
                        <>
                          <Button className="btn-sm" disabled={busyId === t.id} onClick={() => requestApply(t)} title="Apply now — the embed switches to this template immediately">
                            {busyId === t.id ? 'Applying…' : 'Apply now'}
                          </Button>
                          <Button variant="secondary" className="btn-sm" disabled={busyId === t.id} onClick={() => void customizeTemplate(t)} title="Preview & customise it in the studio first — nothing goes live until you publish">
                            Preview &amp; customize
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <nav className="tpl-pager" aria-label="Template pages">
            <button type="button" className="btn btn-ghost btn-xs" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              ‹ Prev
            </button>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-current={safePage === i + 1 ? 'page' : undefined}
                className={`tpl-page-btn ${safePage === i + 1 ? 'active' : ''}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button type="button" className="btn btn-ghost btn-xs" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>
              Next ›
            </button>
            <span className="muted small" style={{ marginLeft: 6 }}>
              {templates?.length ?? 0} templates
            </span>
          </nav>
        )}
      </section>

      <ConfirmDialog
        open={confirmApply !== null}
        title={`Switch to ${confirmApply?.name ?? 'this template'}?`}
        body={
          <p className="muted" style={{ margin: 0 }}>
            Applying <strong>{confirmApply?.name}</strong> replaces this product&apos;s current widget design with a
            fresh copy of the template. Your reviews, forms and moderation queue are untouched.
          </p>
        }
        confirmLabel="Apply template"
        busy={busyId === confirmApply?.id}
        onConfirm={() => confirmApply && void applyTemplate(confirmApply)}
        onCancel={() => setConfirmApply(null)}
      />
    </div>
  );
}
