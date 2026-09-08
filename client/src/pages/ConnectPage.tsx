/**
 * Product "Widget" — the heart of the product's output.
 *
 * This page is where a widget gets made:
 *   1. PICK A TEMPLATE  — a visual grid of fixed-dimension, pre-designed
 *      widget templates rendered live with sample data. Every template
 *      already contains the required rating components (review text,
 *      reviewer name, rating stars) plus its own decorative extras; the
 *      dimensions are fixed so a developer knows exactly what space the
 *      embed occupies before it loads.
 *   2. EMBED EVERYWHERE  — the main output: the iframe / script snippets and
 *      the public wall URL, sized to the template. The embed renders the
 *      product's customized template with its live reviews.
 *
 * Customisation happens in the design studio (Widget → Customize): applying a
 * template here drops a fresh copy of it onto the product, ready to edit.
 */
import { IconCheck, IconCopy, IconEdit, IconExternal } from '../components/icons';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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

  const [templates, setTemplates] = useState<WidgetTemplateRow[] | null>(null);
  const [app, setApp] = useState<AppSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmApply, setConfirmApply] = useState<WidgetTemplateRow | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

  function requestApply(t: WidgetTemplateRow): void {
    // Switching templates replaces the product's current design; confirm when
    // there is something to lose (an applied template or studio customisation).
    if ((app?.studioVersion ?? 0) > 0) setConfirmApply(t);
    else void applyTemplate(t);
  }

  async function copy(key: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((cur) => (cur === key ? null : cur)), 1600);
    } catch {
      window.prompt('Copy this snippet:', text);
    }
  }

  const activeTemplateId = app?.designTemplateId ?? null;
  const activeTemplate = templates?.find((t) => t.id === activeTemplateId) ?? null;
  const hasCustomDesign = (app?.studioVersion ?? 0) > 0;
  const slug = app?.slug ?? '';
  const origin = window.location.origin;

  const iframeSnippet = `<iframe src="${origin}/wall/${slug}?embed=1" width="${activeTemplate?.width ?? 720}" height="${activeTemplate?.height ?? 560}" style="border:0;border-radius:14px;max-width:100%" title="Customer reviews" loading="lazy"></iframe>`;
  const scriptSnippet = `<div id="zojatech-wall-${slug}"></div>\n<script src="${origin}/widget/embed.js" data-app="${slug}" async></script>`;
  const wallUrl = `${origin}/wall/${slug}`;

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
        subtitle="Pick a template, customise it in the studio, then embed it anywhere with one line of code."
        actions={
          <Link className="btn btn-outline" to={`/app/a/${appId}/studio`}>
            <IconEdit size={13} /> Customize in studio
          </Link>
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

        {templates && (
          <div className="tpl-grid">
            {templates.map((t) => {
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
                        <Button className="btn-sm" disabled={busyId === t.id} onClick={() => requestApply(t)}>
                          {busyId === t.id ? 'Applying…' : 'Use this template'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- 2 · Your embed code ------------------------------------------ */}
      <section className="tpl-section">
        <div className="section-head">
          <div>
            <h2 style={{ margin: 0 }}>Your embed code</h2>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              {activeTemplate || hasCustomDesign
                ? `Sized to your design — ${activeTemplate ? `${activeTemplate.name} · ${activeTemplate.width} × ${activeTemplate.height}px` : 'your customized template'}. Paste it anywhere and your live reviews appear.`
                : 'Pick a template above, then copy the snippet onto any website.'}
            </p>
          </div>
          <Link className="btn btn-ghost btn-sm" to={`/wall/${slug}`}>
            Preview the widget <IconExternal size={13} />
          </Link>
        </div>

        <div className="embed-grid">
          <div className="card embed-card">
            <div className="embed-card-head">
              <span className="strong small">Drop-in iframe</span>
              <Button variant="ghost" className="btn-xs" onClick={() => void copy('iframe', iframeSnippet)}>
                {copied === 'iframe' ? (
                  <>
                    <IconCheck size={12} /> Copied
                  </>
                ) : (
                  <>
                    <IconCopy size={12} /> Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="embed-code">
              <code>{iframeSnippet}</code>
            </pre>
            <p className="muted small" style={{ margin: '6px 0 0' }}>
              Fixed size — reserve {activeTemplate?.width ?? 720} × {activeTemplate?.height ?? 560}px and it fits first
              time, every time.
            </p>
          </div>

          <div className="card embed-card">
            <div className="embed-card-head">
              <span className="strong small">Auto-sizing script</span>
              <Button variant="ghost" className="btn-xs" onClick={() => void copy('script', scriptSnippet)}>
                {copied === 'script' ? (
                  <>
                    <IconCheck size={12} /> Copied
                  </>
                ) : (
                  <>
                    <IconCopy size={12} /> Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="embed-code">
              <code>{scriptSnippet}</code>
            </pre>
            <p className="muted small" style={{ margin: '6px 0 0' }}>
              Sizes itself to the template and stays in sync — design edits appear on every site embedding it.
            </p>
          </div>

          <div className="card embed-card">
            <div className="embed-card-head">
              <span className="strong small">Direct link</span>
              <Button variant="ghost" className="btn-xs" onClick={() => void copy('url', wallUrl)}>
                {copied === 'url' ? (
                  <>
                    <IconCheck size={12} /> Copied
                  </>
                ) : (
                  <>
                    <IconCopy size={12} /> Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="embed-code">
              <code>{wallUrl}</code>
            </pre>
            <p className="muted small" style={{ margin: '6px 0 0' }}>
              The public wall — every approved review, full page. Share it or link it from your site.
            </p>
          </div>
        </div>
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
