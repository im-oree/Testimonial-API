/**
 * Builder — the no-code wizard.
 *
 * Four steps to a working widget: pick a product and a starting template,
 * configure what the widget does with your reviews, tune the look, then save
 * it (draft or live) and grab the embed code. The live preview on the right
 * is the exact embed component running your real reviews, updating as you
 * change anything.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { AppSummary, PublicWall, WidgetTemplateRow } from '../lib/types';
import type { StudioRecord, StudioSchema, WidgetBehavior } from '../design-studio/types';
import { DEFAULT_BEHAVIOR } from '../design-studio/types';
import { TemplateWidget } from '../widgets/TemplateWidget';
import { TemplatePreview } from '../components/TemplatePreview';
import { Breadcrumbs, Button, ErrorBanner, PageHeader } from '../components/ui';
import { Field, NumberInput, SelectField, ColorField } from '../components/fields';
import { IconCheck } from '../components/icons';

const STEPS = ['Template', 'Content', 'Style', 'Save'] as const;

interface BuilderStyle {
  canvas: string;
  card: string;
  ink: string;
  accent: string;
  radius: number;
  fontScale: number;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Derive sensible style defaults from the template itself. */
function styleOf(schema: StudioSchema): BuilderStyle {
  const card = schema.elements.find((e) => e.type === 'container' && e.style.background);
  const textish = schema.elements.find((e) => (e.type === 'heading' || e.type === 'text') && e.typography);
  const button = schema.elements.find((e) => e.type === 'button');
  return {
    canvas: schema.canvas.background,
    card: card?.style.background ?? '#ffffff',
    ink: textish?.typography?.color ?? '#1b2559',
    accent: button?.style.background ?? '#0ea5a0',
    radius: card?.style.radius ?? 16,
    fontScale: 1,
  };
}

/** Apply the builder's style choices onto a schema copy. */
function applyStyle(schema: StudioSchema, s: BuilderStyle): StudioSchema {
  schema.canvas.background = s.canvas;
  for (const el of schema.elements) {
    if (el.type === 'container' && el.style.background) {
      el.style.background = s.card;
      el.style.radius = s.radius;
      el.style.radiusTL = undefined;
      el.style.radiusTR = undefined;
      el.style.radiusBR = undefined;
      el.style.radiusBL = undefined;
    } else if (el.type === 'button') {
      el.style.background = s.accent;
    } else if ((el.type === 'heading' || el.type === 'text') && el.typography) {
      el.typography.color = s.ink;
      el.typography.fontSize = Math.max(9, Math.round(el.typography.fontSize * s.fontScale));
    }
  }
  return schema;
}

export default function BuilderPage() {
  const [step, setStep] = useState(0);
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [templates, setTemplates] = useState<WidgetTemplateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [appId, setAppId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [behavior, setBehavior] = useState<WidgetBehavior>({ ...DEFAULT_BEHAVIOR });
  const [style, setStyle] = useState<BuilderStyle | null>(null);
  const [records, setRecords] = useState<StudioRecord[]>([]);
  const [busy, setBusy] = useState<'draft' | 'publish' | null>(null);
  const [done, setDone] = useState<{ mode: 'draft' | 'publish'; appId: string } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ rows: AppSummary[] }>('/v1/apps?perPage=200'),
      api.get<{ rows: WidgetTemplateRow[] }>('/v1/widget-templates'),
    ])
      .then(([a, t]) => {
        setApps(a.rows);
        setTemplates(t.rows);
        setAppId((cur) => cur || a.rows[0]?.id || '');
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the builder.'));
  }, []);

  const app = apps.find((a) => a.id === appId) ?? null;
  const template = templates?.find((t) => t.id === templateId) ?? null;

  // Real reviews for the selected product power the live preview.
  useEffect(() => {
    setRecords([]);
    if (!app) return;
    let alive = true;
    api
      .get<PublicWall>(`/v1/public/walls/${app.slug}`)
      .then((w) => {
        if (!alive) return;
        setRecords(w.testimonials.map((t) => ({ content: t.content, authorName: t.authorName ?? 'Anonymous', rating: t.rating ?? 0, createdAt: t.createdAt })));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [app?.slug]);

  /** The customized schema: template + behavior + style. */
  const schema = useMemo(() => {
    if (!template) return null;
    const s = applyStyle(clone(template.schema), style ?? styleOf(template.schema));
    s.behavior = { ...DEFAULT_BEHAVIOR, ...(s.behavior ?? {}), ...behavior };
    return s;
  }, [template, style, behavior]);

  function pickTemplate(t: WidgetTemplateRow): void {
    setTemplateId(t.id);
    const s = clone(t.schema);
    setBehavior({ ...DEFAULT_BEHAVIOR, ...(s.behavior ?? {}) });
    setStyle(styleOf(s));
    if (step === 0) setStep(1);
  }

  async function save(mode: 'draft' | 'publish'): Promise<void> {
    if (!app || !template || !schema) return;
    setBusy(mode);
    setError(null);
    try {
      if (mode === 'draft') {
        await api.post(`/v1/apps/${app.id}/widget-template/${template.id}/draft`);
        await api.patch(`/v1/dashboard/apps/${app.id}/design/draft`, { schema: clone(schema) });
      } else {
        await api.post(`/v1/apps/${app.id}/widget-template/${template.id}/apply`);
        await api.patch(`/v1/dashboard/apps/${app.id}/design/schema`, { schema: clone(schema) });
      }
      setDone({ mode, appId: app.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the widget.');
    } finally {
      setBusy(null);
    }
  }

  const canNext = step === 0 ? Boolean(app && template) : true;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Builder' }]} />
      <PageHeader
        title="Builder"
        subtitle="A working widget in four steps — no code, no design skills. The preview is the real thing, running your live reviews."
      />

      {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}

      {done ? (
        <div className="card builder-done">
          <span className="builder-done-icon"><IconCheck size={22} /></span>
          <h2 style={{ margin: '6px 0 4px' }}>
            {done.mode === 'draft' ? 'Saved as a draft' : 'Your widget is live'}
          </h2>
          <p className="muted" style={{ margin: '0 0 14px' }}>
            {done.mode === 'draft'
              ? 'Customise it further in the studio and publish when you are ready — the live embed has not changed yet.'
              : 'The embed now serves your new widget everywhere it is installed.'}
          </p>
          <div className="tpl-use-actions" style={{ justifyContent: 'center' }}>
            <Link className="btn" to={`/app/a/${done.appId}/studio`}>Open studio</Link>
            <Link className="btn btn-secondary" to={`/app/a/${done.appId}/embed`}>Get embed code</Link>
            <Button variant="ghost" onClick={() => { setDone(null); setStep(0); }}>Build another</Button>
          </div>
        </div>
      ) : (
        <div className="builder-grid">
          {/* ---- Steps -------------------------------------------------- */}
          <div className="card builder-steps">
            <ol className="builder-step-indicator" aria-label="Builder steps">
              {STEPS.map((label, i) => (
                <li key={label} className={i === step ? 'active' : i < step ? 'passed' : ''} aria-current={i === step ? 'step' : undefined}>
                  <span className="builder-step-dot">{i < step ? <IconCheck size={11} /> : i + 1}</span>
                  <span className="builder-step-label">{label}</span>
                </li>
              ))}
            </ol>

            {step === 0 && (
              <div className="builder-step">
                <Field label="Product" hint="The widget belongs to one product — that is where it collects its reviews.">
                  <SelectField size="sm" value={appId} onChange={(e) => setAppId(e.target.value)}>
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </SelectField>
                </Field>
                <div className="panel-label">Pick a starting template</div>
                {!templates ? (
                  <div className="tpl-grid tpl-grid-mini" aria-busy="true">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="card tpl-card">
                        <div className="tpl-card-preview"><span className="sk tpl-preview-sk" /></div>
                        <div className="tpl-card-body"><span className="sk" style={{ display: 'block', width: '60%', height: 13 }} /></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="tpl-grid tpl-grid-mini">
                    {templates.slice(0, 12).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`card tpl-card tpl-card-select ${templateId === t.id ? 'selected' : ''}`}
                        onClick={() => pickTemplate(t)}
                      >
                        <div className="tpl-card-preview">
                          <TemplatePreview schema={t.schema} />
                          {templateId === t.id && <span className="tpl-active-badge"><IconCheck size={11} /> Selected</span>}
                        </div>
                        <div className="tpl-card-title" style={{ padding: '8px 4px 2px' }}>
                          <span className="small strong">{t.name}</span>
                          <span className="chip">{t.category}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {templates && templates.length > 12 && (
                  <p className="muted small" style={{ margin: '8px 0 0' }}>
                    More in the <Link to="/app/templates">template gallery</Link>.
                  </p>
                )}
              </div>
            )}

            {step === 1 && schema && (
              <div className="builder-step stack">
                <Field label="Behavior" hint="What the widget does as more reviews come in.">
                  <SelectField size="sm" value={behavior.mode} onChange={(e) => setBehavior((b) => ({ ...b, mode: e.target.value as WidgetBehavior['mode'] }))}>
                    <option value="cycle">Cycle — one review at a time (cross-fade)</option>
                    <option value="carousel">Carousel — swipeable / draggable slides</option>
                    <option value="coverflow">Coverflow — 3D depth carousel</option>
                    <option value="wheel">Wheel — 3D rotating ring</option>
                    <option value="stack">Stack — swipe the top card away</option>
                    <option value="tilt">Tilt — mouse-reactive 3D card</option>
                    <option value="marquee">Marquee — continuous stream</option>
                  </SelectField>
                </Field>
                {behavior.mode === 'marquee' ? (
                  <>
                    <Field label="Direction">
                      <SelectField size="sm" value={behavior.direction} onChange={(e) => setBehavior((b) => ({ ...b, direction: e.target.value as 'left' | 'right' }))}>
                        <option value="left">Move left</option>
                        <option value="right">Move right</option>
                      </SelectField>
                    </Field>
                    <Field label={`Speed · ${behavior.speedPx}px/s`}>
                      <input className="f-range-slider" type="range" min={10} max={240} step={5} value={behavior.speedPx} onChange={(e) => setBehavior((b) => ({ ...b, speedPx: Number(e.target.value) }))} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label={`Seconds per review · ${behavior.intervalSec}s`}>
                      <input className="f-range-slider" type="range" min={2} max={20} step={1} value={behavior.intervalSec} onChange={(e) => setBehavior((b) => ({ ...b, intervalSec: Number(e.target.value) }))} />
                    </Field>
                    <Field label="Pause on hover">
                      <SelectField size="sm" value={behavior.pauseOnHover ? 'yes' : 'no'} onChange={(e) => setBehavior((b) => ({ ...b, pauseOnHover: e.target.value === 'yes' }))}>
                        <option value="yes">Yes — pauses while a visitor reads</option>
                        <option value="no">No — keeps moving</option>
                      </SelectField>
                    </Field>
                  </>
                )}
                <Field label="Reviews included" hint="0 = all approved reviews. Fewer keeps the widget light.">
                  <NumberInput size="sm" min={0} max={50} value={behavior.maxRecords} onChange={(e) => setBehavior((b) => ({ ...b, maxRecords: Math.max(0, Number(e.target.value) || 0) }))} />
                </Field>
              </div>
            )}

            {step === 2 && style && (
              <div className="builder-step stack">
                <div className="f-group f-group-2">
                  <Field label="Page background"><ColorField value={style.canvas} onChange={(v) => v && setStyle((s) => (s ? { ...s, canvas: v } : s))} /></Field>
                  <Field label="Card colour"><ColorField value={style.card} onChange={(v) => v && setStyle((s) => (s ? { ...s, card: v } : s))} /></Field>
                  <Field label="Text colour"><ColorField value={style.ink} onChange={(v) => v && setStyle((s) => (s ? { ...s, ink: v } : s))} /></Field>
                  <Field label="Accent"><ColorField value={style.accent} onChange={(v) => v && setStyle((s) => (s ? { ...s, accent: v } : s))} /></Field>
                </div>
                <Field label={`Corner radius · ${style.radius}px`}>
                  <input className="f-range-slider" type="range" min={0} max={32} step={2} value={style.radius} onChange={(e) => setStyle((s) => (s ? { ...s, radius: Number(e.target.value) } : s))} />
                </Field>
                <Field label={`Text size · ${Math.round(style.fontScale * 100)}%`}>
                  <input className="f-range-slider" type="range" min={0.8} max={1.3} step={0.05} value={style.fontScale} onChange={(e) => setStyle((s) => (s ? { ...s, fontScale: Number(e.target.value) } : s))} />
                </Field>
              </div>
            )}

            {step === 3 && app && schema && (
              <div className="builder-step stack">
                <p className="muted small" style={{ margin: 0 }}>
                  Ready for <strong>{app.name}</strong> — <strong>{template?.name}</strong> with your content and style choices.
                </p>
                <div className="tpl-use-actions" style={{ justifyContent: 'flex-start' }}>
                  <Button disabled={busy !== null} onClick={() => void save('draft')}>
                    {busy === 'draft' ? 'Saving…' : 'Save as draft'}
                  </Button>
                  <Button variant="secondary" disabled={busy !== null} onClick={() => void save('publish')}>
                    {busy === 'publish' ? 'Publishing…' : 'Save & publish live'}
                  </Button>
                </div>
                <p className="muted small" style={{ margin: 0 }}>
                  A draft is private until you publish it from the studio. Publishing switches the live embed immediately.
                </p>
              </div>
            )}

            {/* Step footer */}
            <div className="builder-footer">
              <Button variant="ghost" className="btn-sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                ← Back
              </Button>
              {step < 3 && (
                <Button className="btn-sm" disabled={!canNext} onClick={() => setStep((s) => Math.min(3, s + 1))}>
                  Next →
                </Button>
              )}
            </div>
          </div>

          {/* ---- Live preview --------------------------------------------- */}
          <aside className="builder-preview">
            <div className="panel-label">Live preview</div>
            {schema ? (
              <div className="builder-preview-frame">
                <div className="builder-preview-scaler" style={{ aspectRatio: `${schema.canvas.width} / ${schema.canvas.height}` }}>
                  <BuilderPreview schema={schema} records={records} />
                </div>
              </div>
            ) : (
              <div className="builder-preview-empty muted small">Pick a template to see it here with your live reviews.</div>
            )}
            {app && <p className="muted small" style={{ margin: '8px 0 0' }}>{records.length > 0 ? `${records.length} live reviews from ${app.name}` : `No approved reviews on ${app.name} yet — the sample content shows instead.`}</p>}
          </aside>
        </div>
      )}
    </div>
  );
}

/** The widget scaled into the preview frame — same math as the template cards. */
function BuilderPreview({ schema, records }: { schema: StudioSchema; records: StudioRecord[] }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.4);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = (): void => {
      const w = box.clientWidth;
      if (w > 0) setScale(Math.min(1, w / schema.canvas.width));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [schema.canvas.width]);

  return (
    <div ref={boxRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: schema.canvas.width, height: schema.canvas.height, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <TemplateWidget schema={schema} records={records} />
      </div>
    </div>
  );
}
