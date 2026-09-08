/**
 * DOC 7C §12 — the AI Design Generator.
 *
 * Describe the widget you want; the generator builds it, previews it with
 * your real reviews and hands it to the studio or straight to the live
 * embed. History keeps every generation this session so nothing is lost.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { AppSummary, PublicWall } from '../lib/types';
import type { StudioRecord, StudioSchema, WidgetBehavior } from '../design-studio/types';
import { EXAMPLE_PROMPTS, generateDesign } from '../design-studio/generator';
import { TemplateWidget } from '../widgets/TemplateWidget';
import { Breadcrumbs, Button, ErrorBanner, PageHeader } from '../components/ui';
import { Field, SelectField, TextAreaInput } from '../components/fields';
import { ConfirmDialog } from '../components/menu';
import { IconRefresh } from '../components/icons';

type HistoryStatus = 'new' | 'draft' | 'live';

interface HistoryEntry {
  id: number;
  prompt: string;
  schema: StudioSchema;
  status: HistoryStatus;
}

const MODE_OPTIONS: Array<{ value: WidgetBehavior['mode'] | 'auto'; label: string }> = [
  { value: 'auto', label: 'Auto — read it from my words' },
  { value: 'cycle', label: 'Cycle — one review at a time' },
  { value: 'carousel', label: 'Carousel — swipeable slides' },
  { value: 'coverflow', label: 'Coverflow — 3D depth carousel' },
  { value: 'wheel', label: 'Wheel — 3D rotating ring' },
  { value: 'stack', label: 'Stack — swipe the top card away' },
  { value: 'tilt', label: 'Tilt — mouse-reactive 3D card' },
  { value: 'marquee', label: 'Marquee — continuous stream' },
];

let historySeq = 0;

export default function AiPage() {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<WidgetBehavior['mode'] | 'auto'>('auto');
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [appId, setAppId] = useState('');
  const [records, setRecords] = useState<StudioRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'generate' | 'draft' | 'apply' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<StudioSchema | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [refine, setRefine] = useState('');
  const [confirmApply, setConfirmApply] = useState(false);
  const nonce = useRef(0);

  useEffect(() => {
    api
      .get<{ rows: AppSummary[] }>('/v1/apps?perPage=200')
      .then((d) => {
        setApps(d.rows);
        setAppId((cur) => cur || d.rows[0]?.id || '');
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your products.'));
  }, []);

  const app = apps.find((a) => a.id === appId) ?? null;

  // Real reviews power the preview.
  useEffect(() => {
    setRecords([]);
    if (!app) return;
    let alive = true;
    api
      .get<PublicWall>(`/v1/public/walls/${app.slug}`)
      .then((w) => {
        if (alive) setRecords(w.testimonials.map((t) => ({ content: t.content, authorName: t.authorName ?? 'Anonymous', rating: t.rating ?? 0 })));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [app?.slug]);

  function run(p: string): void {
    if (!p.trim()) return;
    setBusy('generate');
    setError(null);
    setGenerating(true);
    // A beat of "thinking" — the synthesizer itself is instant.
    window.setTimeout(() => {
      nonce.current += 1;
      const out = generateDesign(p, { mode, nonce: nonce.current });
      setResult(out.schema);
      setNotes(out.notes);
      historySeq += 1;
      setHistory((h) => [{ id: historySeq, prompt: p, schema: out.schema, status: 'new' as HistoryStatus }, ...h].slice(0, 8));
      setGenerating(false);
      setBusy(null);
    }, 750);
  }

  function regenerate(): void {
    const last = history[0]?.prompt ?? prompt;
    if (last.trim()) run(last);
  }

  function applyRefine(): void {
    if (!refine.trim() || !history[0]) return;
    const merged = `${history[0].prompt}, ${refine.trim()}`;
    setPrompt(merged);
    setRefine('');
    run(merged);
  }

  /** Which history entry is on screen right now? */
  const currentId = useMemo(() => {
    if (!result) return null;
    const entry = history.find((h) => h.schema === result);
    return entry?.id ?? null;
  }, [result, history]);

  async function save(mode: 'draft' | 'apply'): Promise<void> {
    if (!app || !result) return;
    setBusy(mode);
    setError(null);
    try {
      const template = 'quote-card';
      if (mode === 'draft') {
        await api.post(`/v1/apps/${app.id}/widget-template/${template}/draft`);
        await api.patch(`/v1/dashboard/apps/${app.id}/design/draft`, { schema: JSON.parse(JSON.stringify(result)) });
      } else {
        await api.post(`/v1/apps/${app.id}/widget-template/${template}/apply`);
        await api.patch(`/v1/dashboard/apps/${app.id}/design/schema`, { schema: JSON.parse(JSON.stringify(result)) });
      }
      setHistory((h) => h.map((e) => (e.id === currentId ? { ...e, status: mode === 'draft' ? 'draft' : 'live' } : e)));
      setConfirmApply(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the design.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'AI Studio' }]} />
      <PageHeader
        title="AI Studio"
        subtitle="Describe the widget you want — the generator designs it, previews it with your live reviews, and puts it on your site."
      />

      {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}

      <div className="ai-grid">
        {/* Prompt + params ------------------------------------------------- */}
        <div className="card ai-panel">
          <Field label="Describe your widget" hint="Colours, mood, motion — plain words.">
            <TextAreaInput
              rows={4}
              value={prompt}
              maxLength={400}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. a dark midnight carousel with gold star ratings, rounded cards and a soft glow"
              aria-label="Describe your widget"
            />
          </Field>
          <div className="ai-meta-row">
            <span className="muted small">{prompt.length}/400</span>
          </div>
          <div className="f-group f-group-2">
            <Field label="Layout">
              <SelectField size="sm" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                {MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectField>
            </Field>
            <Field label="Preview with">
              <SelectField size="sm" value={appId} onChange={(e) => setAppId(e.target.value)}>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </SelectField>
            </Field>
          </div>
          <div className="tpl-use-actions">
            <Button disabled={!prompt.trim() || busy !== null || generating} onClick={() => run(prompt)}>
              {generating ? 'Designing…' : '✨ Generate design'}
            </Button>
            <Button variant="ghost" disabled={busy !== null || generating} onClick={() => { const p = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)]; setPrompt(p); run(p); }}>
              <IconRefresh size={13} /> Surprise me
            </Button>
          </div>

          {!result && !generating && (
            <div className="ai-examples">
              <div className="panel-label">Try one of these</div>
              <div className="chip-row">
                {EXAMPLE_PROMPTS.slice(0, 5).map((p) => (
                  <button key={p} type="button" className="tpl-cat-pill" onClick={() => { setPrompt(p); run(p); }}>
                    {p.length > 44 ? `${p.slice(0, 44)}…` : p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview --------------------------------------------------------- */}
        <div className="ai-preview">
          <div className="panel-label">Generated design</div>
          {generating && (
            <div className="ai-generating" aria-busy="true">
              <span className="sk" style={{ display: 'block', width: '62%', height: '70%', borderRadius: 14, margin: 'auto' }} />
              <p className="muted small" style={{ margin: '10px 0 0' }}>Designing your widget…</p>
            </div>
          )}
          {!generating && !result && (
            <div className="builder-preview-empty muted small">
              Describe what you want and the design appears here — running your real reviews.
            </div>
          )}
          {!generating && result && (
            <>
              <div className="builder-preview-frame">
                <div className="builder-preview-scaler" style={{ aspectRatio: `${result.canvas.width} / ${result.canvas.height}` }}>
                  <AiPreview schema={result} records={records} />
                </div>
              </div>
              <div className="chip-row" style={{ marginTop: 10 }}>
                {notes.map((n) => (
                  <span key={n} className="chip chip-tag">{n}</span>
                ))}
              </div>
              <div className="tpl-use-actions" style={{ marginTop: 10 }}>
                <Button disabled={!app || busy !== null} onClick={() => void save('draft')}>
                  {busy === 'draft' ? 'Saving…' : 'Customise in studio'}
                </Button>
                <Button variant="secondary" disabled={!app || busy !== null} onClick={() => setConfirmApply(true)}>
                  {busy === 'apply' ? 'Applying…' : 'Apply live'}
                </Button>
                <Button variant="ghost" disabled={busy !== null || generating} onClick={regenerate}>
                  <IconRefresh size={13} /> Regenerate
                </Button>
              </div>
              <div className="ai-refine">
                <input
                  className="f-input"
                  value={refine}
                  onChange={(e) => setRefine(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyRefine();
                  }}
                  placeholder="Refine it — “make the cards rounder, use violet”"
                  aria-label="Refine the design"
                />
                <Button className="btn-sm" variant="ghost" disabled={!refine.trim() || busy !== null} onClick={applyRefine}>
                  Refine
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* History ---------------------------------------------------------- */}
      {history.length > 0 && (
        <>
          <div className="panel-label" style={{ marginTop: 22 }}>This session</div>
          <div className="ai-history">
            {history.map((h) => (
              <div key={h.id} className={`card ai-history-item ${currentId === h.id ? 'selected' : ''}`}>
                <button type="button" className="ai-history-pick" onClick={() => { setResult(h.schema); setPrompt(h.prompt); }}>
                  <span className="small strong" style={{ display: 'block' }}>{h.schema.name}</span>
                  <span className="muted small ai-history-prompt">{h.prompt}</span>
                </button>
                <span className={`chip ${h.status === 'live' ? 'chip-live' : ''}`}>
                  {h.status === 'new' ? 'Unsaved' : h.status === 'draft' ? 'Saved as draft' : 'Live'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmApply}
        title={`Put ${result?.name ?? 'this design'} live on ${app?.name ?? 'this product'}?`}
        body={
          <p className="muted" style={{ margin: 0 }}>
            The live embed switches to the generated design immediately. Your reviews, forms and moderation queue are untouched.
          </p>
        }
        confirmLabel="Apply design"
        busy={busy === 'apply'}
        onConfirm={() => void save('apply')}
        onCancel={() => setConfirmApply(false)}
      />
    </div>
  );
}

/** The generated widget scaled into the preview frame. */
function AiPreview({ schema, records }: { schema: StudioSchema; records: StudioRecord[] }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
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
