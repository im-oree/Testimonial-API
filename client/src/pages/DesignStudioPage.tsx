/**
 * Design studio — company workspace, per product (/app/a/:appId/studio).
 *
 * A compact canvas that exercises the DOC 7B engine end to end:
 *   · Zustand + Immer editor store (§1) with undo/redo snapshot history
 *   · element factory (§1.4), layout/style/typography → CSS (§2)
 *   · grid + smart-guide snapping on drag (§5)
 *   · pointer drag/resize gestures on absolutely-positioned elements
 *   · data-binding preview (§7): cycle a real approved review through the
 *     bound elements; the schema surface renderer is shared with the editor
 *   · save → PATCH /design/schema (server bumps the product's design version)
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useEditorStore } from '../design-studio/editor-store';
import { SchemaSurface } from '../design-studio/runtime';
import { snapBox, type SnapGuide } from '../design-studio/snap-engine';
import { MIN_SIZE } from '../design-studio/types';
import { elementToCSS } from '../design-studio/css';
import { boundFieldId, boundValue, displayText, FIELD_DEFS, fieldDefOf } from '../design-studio/data-binder';
import type { AppSummary } from '../lib/types';
import type { ElementType, StudioElement, StudioRecord } from '../design-studio/types';
import { Button, ErrorBanner } from '../components/ui';
import { Field, NumberInput, SelectField, TextAreaInput, TextInput } from '../components/fields';
import { IconCheck, IconLayers, IconPlus, IconRefresh, IconSidebar, IconTrash, IconX, IconZoomMinus, IconZoomPlus } from '../components/icons';

const ELEMENTS: Array<{ type: ElementType; label: string; hint: string }> = [
  { type: 'heading', label: 'Heading', hint: 'Section title' },
  { type: 'text', label: 'Text', hint: 'Paragraph or quote' },
  { type: 'image', label: 'Image', hint: 'URL-backed picture' },
  { type: 'rating-stars', label: 'Rating stars', hint: 'Binds to review rating' },
  { type: 'button', label: 'Button', hint: 'CTA block' },
  { type: 'container', label: 'Card', hint: 'Backdrop panel' },
  { type: 'spacer', label: 'Spacer', hint: 'Breathing room' },
];

const PALETTE_SWATCHES = ['#1b2559', '#0ea5a0', '#2563eb', '#7c3aed', '#e11d48', '#f59e0b', '#0f172a', '#ffffff'];
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type Handle = (typeof HANDLES)[number];

type Gesture =
  | { kind: 'move'; id: string; startX: number; startY: number; baseX: number; baseY: number }
  | { kind: 'resize'; id: string; startX: number; startY: number; dir: string; base: StudioElement['layout'] }
  | null;

export default function DesignStudioPage() {
  const { appId = '' } = useParams();
  const store = useEditorStore();
  const schema = store.schema;
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [gesture, setGesture] = useState<Gesture>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [productName, setProductName] = useState('');
  const [slug, setSlug] = useState<string | null>(null);
  // Left (elements/layers) and right (properties) rails collapse so the canvas
  // can claim the whole stage — the preview should never be squeezed.
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  // ---- Zoom: the canvas scales to fit the stage (the default) so any design
  // — the starter template included — is always fully visible, never cropped
  // behind scrollbars. The user can also pin 100% or nudge the zoom manually.
  const [zoom, setZoom] = useState<'fit' | number>('fit');
  const [fitScale, setFitScale] = useState(1);
  const scale = zoom === 'fit' ? fitScale : zoom;
  const scaleRef = useRef(1);
  scaleRef.current = scale;

  // ---- Widget contract: required components can't be deleted. A design is
  // only a widget while it renders the review text, reviewer name and rating.
  const [guardError, setGuardError] = useState<string | null>(null);
  const guardRef = useRef<() => void>(() => undefined);

  function guardedDelete(): void {
    const st = useEditorStore.getState();
    const schema = st.schema;
    if (!schema || st.selectedIds.length === 0) return;
    const doomed = new Set(st.selectedIds);
    const remaining = schema.elements.filter((e) => !doomed.has(e.id));
    const lost: string[] = [];
    for (const field of ['review_text', 'reviewer_name', 'review_rating']) {
      const hasNow = schema.elements.some((e) => boundFieldId(e) === field);
      const hasAfter = remaining.some((e) => boundFieldId(e) === field);
      if (hasNow && !hasAfter) lost.push(field);
    }
    if (lost.length > 0) {
      setGuardError(
        `Required widget components can't be removed — every widget must show ${lost.join(', ')}. Add a replacement first, or unbind nothing: pick a different template on the Widget page.`,
      );
      window.setTimeout(() => setGuardError(null), 5200);
      return;
    }
    setGuardError(null);
    st.deleteSelected();
  }
  guardRef.current = guardedDelete;

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !schema) return;
    const measure = (): void => {
      // Padding budget: the viewport's own padding + breathing room.
      const availW = Math.max(120, vp.clientWidth - 64);
      const availH = Math.max(120, vp.clientHeight - 64);
      setFitScale(Math.min(1, availW / schema.canvas.width, availH / schema.canvas.height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [schema?.canvas.width, schema?.canvas.height, showLeft, showRight]);

  // Product display name + slug (for the real review records used in preview).
  useEffect(() => {
    let alive = true;
    api
      .get<{ rows: AppSummary[] }>('/v1/apps?perPage=200')
      .then((d) => {
        if (!alive) return;
        const app = d.rows.find((a) => a.id === appId);
        if (app) {
          setProductName(app.name);
          setSlug(app.slug);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [appId]);

  // Load the schema (or a starter draft) whenever the product changes.
  useEffect(() => {
    void useEditorStore.getState().load(appId, productName || 'this product');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, productName]);

  // Real approved reviews power the preview's data bindings.
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    api
      .get<{ testimonials: StudioRecord[] }>(`/v1/public/walls/${slug}`)
      .then((w) => {
        if (alive) useEditorStore.getState().setRecords(w.testimonials);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [slug]);

  // Pointer gesture driver: window-level move/up while a gesture is active.
  useEffect(() => {
    if (!gesture) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      applyGesture(gesture, e.clientX, e.clientY, surfaceRef, setGuides, scaleRef.current);
    };
    const onUp = () => {
      setGesture(null);
      setGuides([]);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [gesture]);

  // Keyboard shortcuts (skipped while typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const s = useEditorStore.getState();
      if (s.previewMode || !s.schema) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      if (s.selectedIds.length === 0) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        guardRef.current();
      } else if (e.key === 'Escape') {
        s.clearSelection();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        s.duplicateSelected();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 8 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        s.pushHistory();
        s.selectedIds.forEach((id) => {
          const el = s.schema?.elements.find((x) => x.id === id);
          if (el) s.setGeometry(id, { x: el.layout.x + dx, y: el.layout.y + dy });
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (store.isLoading) {
    // Skeleton mirrors the real studio: toolbar, left palette, canvas, props.
    return (
      <div className="studio-page" aria-busy="true">
        <div className="studio-toolbar">
          <div className="studio-tb-left">
            <span className="sk" style={{ width: 92, height: 26, borderRadius: 8 }} />
            <span className="sk" style={{ width: 170, height: 18 }} />
          </div>
          <div className="studio-tb-right">
            <span className="sk" style={{ width: 130, height: 26, borderRadius: 8 }} />
            <span className="sk" style={{ width: 84, height: 26, borderRadius: 8 }} />
          </div>
        </div>
        <div className="studio-grid" data-left="1" data-right="1">
          <aside className="studio-panel studio-left">
            <div className="studio-panel-fixed">
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} className="sk" style={{ display: 'block', width: '92%', height: 34, borderRadius: 9, marginBottom: 6 }} />
              ))}
            </div>
          </aside>
          <main className="studio-stage">
            <div className="studio-viewport" style={{ minHeight: 340 }}>
              <span className="sk" style={{ width: '72%', height: '76%', borderRadius: 14 }} />
            </div>
          </main>
          <aside className="studio-panel studio-right">
            <div className="studio-panel-fixed">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="sk" style={{ display: 'block', width: `${88 - i * 6}%`, height: 30, borderRadius: 9, marginBottom: 8 }} />
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  }
  if (store.loadError) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <ErrorBanner message={store.loadError} onRetry={() => void useEditorStore.getState().load(appId, productName || 'this product')} />
      </div>
    );
  }
  if (!schema) return null;

  return (
    <div className="studio-page">
      <div className="studio-toolbar">
        <div className="studio-tb-left">
          <Link className="btn btn-ghost btn-xs" to={`/app/a/${appId}/connect`}>
            <IconX size={12} /> Back to connect
          </Link>
          <input
            className="studio-name-input"
            value={schema.name}
            aria-label="Design name"
            onChange={(e) => store.updateSchemaName(e.target.value)}
          />
          {store.dirty ? (
            <span className="chip chip-pending">Unsaved</span>
          ) : (
            <span className="chip chip-approved">
              <IconCheck size={11} /> Saved
            </span>
          )}
        </div>
        <div className="studio-tb-right">
          <div className="segmented" role="group" aria-label="Editor mode">
            <button type="button" className={`segment ${!store.previewMode ? 'active' : ''}`} onClick={() => store.setPreviewMode(false)}>
              Editor
            </button>
            <button type="button" className={`segment ${store.previewMode ? 'active' : ''}`} onClick={() => store.setPreviewMode(true)}>
              Preview
            </button>
          </div>
          <span className="studio-tb-sep" aria-hidden />
          <div className="segmented studio-panel-toggles" role="group" aria-label="Side panels">
            <button type="button" className={`segment ${showLeft ? 'active' : ''}`} aria-pressed={showLeft} onClick={() => setShowLeft((v) => !v)}>
              Elements
            </button>
            <button type="button" className={`segment ${showRight ? 'active' : ''}`} aria-pressed={showRight} onClick={() => setShowRight((v) => !v)}>
              Properties
            </button>
          </div>
          <span className="studio-tb-sep" aria-hidden />
          <Button variant="ghost" className="btn-xs" disabled={store.past.length === 0} title="Undo (Ctrl/Cmd+Z)" onClick={() => store.undo()}>
            <IconRefresh size={12} style={{ transform: 'scaleX(-1)' }} /> Undo
          </Button>
          <Button variant="ghost" className="btn-xs" disabled={store.future.length === 0} title="Redo (Ctrl/Cmd+Shift+Z)" onClick={() => store.redo()}>
            <IconRefresh size={12} /> Redo
          </Button>
          <span className="studio-tb-sep" aria-hidden />
          <span className="chip" title="Fixed template dimensions — the embed reserves exactly this space">
            {schema.canvas.width} × {schema.canvas.height}
          </span>
          <span className="chip" title={`Schema v${store.savedStudioVersion} · design v${store.designVersion}`}>
            v{store.savedStudioVersion}
          </span>
          <Button className="btn-sm" disabled={store.saving || !store.dirty} onClick={() => void store.save()}>
            {store.saving ? 'Saving…' : 'Save design'}
          </Button>
        </div>
      </div>
      {store.saveError && (
        <div className="banner banner-error" role="alert">
          <span>{store.saveError}</span>
        </div>
      )}
      {guardError && (
        <div className="banner banner-error" role="alert">
          <span>{guardError}</span>
        </div>
      )}

      <div className="studio-grid" data-left={showLeft ? '1' : '0'} data-right={showRight ? '1' : '0'}>
        <aside className={`studio-panel studio-left ${showLeft ? '' : 'is-hidden'}`} aria-hidden={!showLeft}>
          <div className="studio-panel-fixed">
          <div className="studio-panel-head">
            <div className="studio-panel-title" style={{ margin: 0 }}>Elements</div>
            <button type="button" className="ctx-trigger" title="Hide elements & layers" aria-label="Hide elements and layers" onClick={() => setShowLeft(false)}>
              <IconX size={14} />
            </button>
          </div>
          <div className="studio-palette">
            {ELEMENTS.map((e) => (
              <button key={e.type} type="button" className="studio-el-btn" onClick={() => store.addElement(e.type)}>
                <IconPlus size={12} />
                <span>
                  <span className="strong small">{e.label}</span>
                  <span className="muted small">{e.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="studio-panel-title" style={{ marginTop: 14 }}>
            Layers
          </div>
          <div className="studio-layers">
            {[...schema.elements].sort((a, b) => b.layout.z - a.layout.z).map((el) => {
              const sel = store.selectedIds.includes(el.id);
              return (
                <div
                  key={el.id}
                  className={`studio-layer ${sel ? 'active' : ''}`}
                  onClick={() => store.select(el.id)}
                  onMouseEnter={() => store.setHovered(el.id)}
                  onMouseLeave={() => store.setHovered(null)}
                >
                  <span className="studio-layer-name">
                    <IconLayers size={12} />
                    <span className="small">
                      {boundFieldId(el) ? (
                        <>
                          <span className="strong studio-layer-field">{boundFieldId(el)}</span>
                          <span className="muted small">{fieldDefOf(boundFieldId(el)).label} · live field</span>
                        </>
                      ) : (
                        <>
                          <span className="strong">{el.name}</span>
                          <span className="muted small">{el.type}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="studio-layer-actions">
                    <button type="button" className="btn btn-ghost btn-xs" title="Duplicate" onClick={() => { store.select(el.id); store.duplicateSelected(); }}>
                      Copy
                    </button>
                    <button type="button" className="btn btn-ghost btn-xs" title="Delete" onClick={() => { store.select(el.id); guardRef.current(); }}>
                      <IconTrash size={12} />
                    </button>
                  </span>
                </div>
              ); 
            })}
          </div>
          </div>
        </aside>

        <main className="studio-stage">
          {!showLeft && (
            <button type="button" className="studio-float-btn studio-float-left" title="Show elements & layers" onClick={() => setShowLeft(true)}>
              <IconLayers size={15} />
            </button>
          )}
          {!showRight && (
            <button type="button" className="studio-float-btn studio-float-right" title="Show properties" onClick={() => setShowRight(true)}>
              <IconSidebar size={15} />
            </button>
          )}
          <div className="studio-viewport" ref={viewportRef}>
            <div
              className="studio-scale-wrap"
              style={{ width: schema.canvas.width * scale, height: schema.canvas.height * scale }}
            >
            <div
              ref={surfaceRef}
              className="studio-surface studio-edit-surface"
              style={{
                width: schema.canvas.width,
                height: schema.canvas.height,
                background: schema.canvas.background,
                transform: `scale(${scale})`,
                transformOrigin: '0 0',
              }}
              data-testid="studio-canvas"
              onPointerDown={(e) => {
                if (!store.previewMode && e.target === e.currentTarget) store.clearSelection();
              }}
            >
              {store.previewMode ? (
                <>
                  <SchemaSurface schema={schema} record={store.records[store.previewIndex] ?? null} animate />
                  {(() => {
                    const used = [...new Set(schema.elements.map((e) => boundFieldId(e)).filter((f): f is string => Boolean(f)))];
                    const record = store.records[store.previewIndex] ?? null;
                    return used.length > 0 ? (
                      <div className="studio-fieldmap">
                        <span className="muted small strong" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>Template fields</span>
                        {used.map((id) => {
                          const def = fieldDefOf(id);
                          const val = boundValue(id, record);
                          return (
                            <span key={id} className="chip chip-tenant" title={`${def.label} — filled from the live review record`}>
                              <code>{id}</code>
                              {val !== null ? ` → ${String(val).slice(0, 26)}${String(val).length > 26 ? '…' : ''}` : ' → awaiting record'}
                            </span>
                          );
                        })}
                      </div>
                    ) : null;
                  })()}
                  <div className="studio-previewbar">
                    <span className="muted small">
                      {store.records.length > 0 ? `Live preview · review ${store.previewIndex + 1} of ${store.records.length}` : 'Static placeholder'}
                    </span>
                    {store.records.length > 0 && (
                      <span className="studio-preview-actions">
                        <button type="button" className="btn btn-secondary btn-xs" onClick={() => store.cycleRecord(-1)}>Prev review</button>
                        <button type="button" className="btn btn-secondary btn-xs" onClick={() => store.cycleRecord(1)}>Next review</button>
                      </span>
                    )}
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => store.setPreviewMode(false)}>Back to editor</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="studio-static">
                    <SchemaSurface schema={schema} />
                  </div>
                  {[...schema.elements].sort((a, b) => a.layout.z - b.layout.z).map((el) => (
                    <EditOverlay key={el.id} el={el} onGestureStart={setGesture} />
                  ))}
                  {guides.map((g, i) =>
                    g.axis === 'x' ? (
                      <div key={i} className="studio-guide studio-guide-x" style={{ left: g.position }} />
                    ) : (
                      <div key={i} className="studio-guide studio-guide-y" style={{ top: g.position }} />
                    ),
                  )}
                  <div className="studio-hint muted small">
                    Drag to move (snaps to the grid and smart guides) · drag a corner to resize · Del removes · Ctrl+Z undoes
                  </div>
                </>
              )}
            </div>
            </div>
            <div className="studio-zoom" role="group" aria-label="Canvas zoom">
              <button
                type="button"
                className="ctx-trigger"
                title="Zoom out"
                aria-label="Zoom out"
                disabled={scale <= 0.2}
                onClick={() => setZoom(Math.max(0.2, Math.round((scale - 0.1) * 100) / 100))}
              >
                <IconZoomMinus size={14} />
              </button>
              <button
                type="button"
                className={`studio-zoom-value ${zoom === 'fit' ? 'active' : ''}`}
                title="Zoom to fit"
                onClick={() => setZoom(zoom === 'fit' ? 1 : 'fit')}
              >
                {zoom === 'fit' ? `Fit · ${Math.round(fitScale * 100)}%` : `${Math.round(scale * 100)}%`}
              </button>
              <button
                type="button"
                className="ctx-trigger"
                title="Zoom in"
                aria-label="Zoom in"
                disabled={scale >= 2}
                onClick={() => setZoom(Math.min(2, Math.round((scale + 0.1) * 100) / 100))}
              >
                <IconZoomPlus size={14} />
              </button>
            </div>
          </div>
        </main>

        <aside className={`studio-panel studio-right ${showRight ? '' : 'is-hidden'}`} aria-hidden={!showRight}>
          <div className="studio-panel-fixed">
            <div className="studio-panel-head">
              <div className="studio-panel-title" style={{ margin: 0 }}>Properties</div>
              <button type="button" className="ctx-trigger" title="Hide properties" aria-label="Hide properties" onClick={() => setShowRight(false)}>
                <IconX size={14} />
              </button>
            </div>
            <PropertiesPanel onDeleteSelected={guardRef.current} />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Interaction overlay drawn on top of each element's static rendering. */
function EditOverlay({ el, onGestureStart }: { el: StudioElement; onGestureStart: (g: Gesture) => void }) {
  const selected = useEditorStore((st) => st.selectedIds.includes(el.id));
  const hovered = useEditorStore((st) => st.hoveredId === el.id);
  const css = elementToCSS(el);

  function beginMove(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const st = useEditorStore.getState();
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      st.select(el.id, true);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    st.select(el.id);
    st.pushHistory();
    onGestureStart({ kind: 'move', id: el.id, startX: e.clientX, startY: e.clientY, baseX: el.layout.x, baseY: el.layout.y });
  }

  function beginResize(dir: string) {
    return (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const st = useEditorStore.getState();
      st.select(el.id);
      st.pushHistory();
      onGestureStart({ kind: 'resize', id: el.id, startX: e.clientX, startY: e.clientY, dir, base: { ...el.layout } });
    };
  }

  const handleStyle = (h: Handle): React.CSSProperties => {
    const common: React.CSSProperties = {
      top: -5,
      left: -5,
      width: 10,
      height: 10,
      background: '#fff',
      border: '1.5px solid #2563eb',
      borderRadius: 2,
      position: 'absolute',
      zIndex: 5,
    };
    switch (h) {
      case 'n': return { ...common, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize', top: -5 };
      case 'ne': return { ...common, right: -5, left: 'auto', cursor: 'nesw-resize' };
      case 'e': return { ...common, top: '50%', right: -5, left: 'auto', transform: 'translateY(-50%)', cursor: 'ew-resize' };
      case 'se': return { ...common, right: -5, bottom: -5, left: 'auto', top: 'auto', cursor: 'nwse-resize' };
      case 's': return { ...common, bottom: -5, top: 'auto', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
      case 'sw': return { ...common, bottom: -5, left: -5, top: 'auto', cursor: 'nesw-resize' };
      case 'w': return { ...common, top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'ew-resize' };
      default: return { ...common, cursor: 'nwse-resize' }; // nw
    }
  };

  const fieldId = boundFieldId(el);

  return (
    <div
      className={`studio-el-hit ${selected ? 'selected' : ''} ${hovered && !selected ? 'hovered' : ''} ${fieldId ? 'is-bound' : ''}`}
      style={{ ...css, pointerEvents: 'auto', cursor: 'move' }}
      data-element-hit={el.id}
      onPointerDown={beginMove}
    >
      {selected ? (
        <>
          <div className="studio-el-tag">{fieldId ? `${fieldId} · ${fieldDefOf(fieldId).label}` : el.name}</div>
          {HANDLES.map((h) => (
            <div key={h} className="studio-handle" style={handleStyle(h)} onPointerDown={beginResize(h)} />
          ))}
        </>
      ) : (
        // Bound elements always show the template field id they carry, so the
        // canvas reads as "this is a live field" even at a glance.
        fieldId && <div className="studio-el-badge" title={`${fieldDefOf(fieldId).label} — filled from the live review record`}>{fieldId}</div>
      )}
    </div>
  );
}

/** One move/resize tick for the active gesture. Pointer deltas are divided
 * by the current canvas scale so dragging feels 1:1 at any zoom level. */
function applyGesture(
  gesture: NonNullable<Gesture>,
  clientX: number,
  clientY: number,
  surfaceRef: React.RefObject<HTMLDivElement | null>,
  setGuides: (g: SnapGuide[]) => void,
  scale = 1,
): void {
  const surf = surfaceRef.current;
  if (!surf) return;
  const st = useEditorStore.getState();
  const schema = st.schema;
  if (!schema) return;
  const el = schema.elements.find((e) => e.id === gesture.id);
  if (!el) return;
  const grid = 8;

  if (gesture.kind === 'move') {
    const rawX = gesture.baseX + (clientX - gesture.startX) / scale;
    const rawY = gesture.baseY + (clientY - gesture.startY) / scale;
    const others = schema.elements
      .filter((e) => e.id !== gesture.id)
      .map((e) => ({ id: e.id, x: e.layout.x, y: e.layout.y, width: e.layout.width, height: e.layout.height }));
    const res = snapBox({ id: gesture.id, x: rawX, y: rawY, width: el.layout.width, height: el.layout.height }, others, schema.canvas.width, schema.canvas.height);
    st.setGeometry(gesture.id, { x: res.x, y: res.y });
    setGuides(res.guides);
  } else {
    const { dir, base } = gesture;
    const dx = (clientX - gesture.startX) / scale;
    const dy = (clientY - gesture.startY) / scale;
    let w = base.width;
    let h = base.height;
    if (dir.includes('e')) w = base.width + dx;
    if (dir.includes('s')) h = base.height + dy;
    if (dir.includes('w')) w = base.width - dx;
    if (dir.includes('n')) h = base.height - dy;
    const snap = (v: number) => Math.max(MIN_SIZE, Math.round(v / grid) * grid);
    w = snap(w);
    h = snap(h);
    const snapCoord = (v: number) => Math.round(v / grid) * grid;
    // Anchor the opposite corner for corner/edge handles.
    let x = base.x;
    let y = base.y;
    if (dir.includes('w')) x = snapCoord(base.x + base.width - w);
    if (dir.includes('n')) y = snapCoord(base.y + base.height - h);
    st.setGeometry(gesture.id, { x, y, width: w, height: h });
    setGuides([]);
  }
}

/** Right-hand properties panel. */
function PropertiesPanel({ onDeleteSelected }: { onDeleteSelected: () => void }) {
  const schema = useEditorStore((st) => st.schema);
  const selectedIds = useEditorStore((st) => st.selectedIds);
  if (!schema) return null;
  const sel = schema.elements.filter((e) => selectedIds.includes(e.id));

  if (sel.length === 0) {
    const st = useEditorStore.getState;
    return (
      <div className="studio-props">
        <div className="stack">
          <Field label="Design name" hint="Shown on the Widget page and in the studio.">
            <TextInput value={schema.name} onChange={(e) => st().updateSchemaName(e.target.value)} />
          </Field>
          <Field label="Template size" hint="Fixed by the template — the embed reserves exactly this space on every site, so devs always know where it fits.">
            <div className="canvas-size-lock">
              {schema.canvas.width} × {schema.canvas.height}
              <span className="muted small">px · fixed</span>
            </div>
          </Field>
          <Field label="Canvas background" hint="The surface your widget renders on — in the studio, in the embed, everywhere.">
            <div className="swatches" style={{ gap: 7 }}>
              <span className="swatch" style={{ background: schema.canvas.background }} />
              <label className="swatch swatch-custom">
                <input type="color" value={schema.canvas.background} onChange={(e) => st().updateCanvas({ background: e.target.value })} />
                <IconPlus size={12} />
              </label>
              <span className="muted small" style={{ fontFamily: 'monospace' }}>{schema.canvas.background.toUpperCase()}</span>
            </div>
          </Field>
        </div>
        <hr className="divider" style={{ margin: '14px 0 8px' }} />
        <p className="muted small" style={{ margin: 0 }}>
          Select an element on the canvas or in <strong>Layers</strong> to edit it. Drag to move, drag a corner to resize — both snap to the
          grid. Elements bound to a review field carry their field id (<code>reviewer_name</code>, <code>review_text</code>,{' '}
          <code>review_rating</code>) and fill in automatically on <strong>Preview</strong> and in the live embed. The three bound
          components are <strong>required</strong> — a design without them is not a widget.
        </p>
      </div>
    );
  }

  const single = sel.length === 1 ? sel[0] : null;
  const upd = (id: string, patch: Partial<StudioElement>) => useEditorStore.getState().updateElement(id, patch);
  const fieldId = single ? boundFieldId(single) : null;

  if (sel.length > 1) {
    return (
      <div className="studio-props stack">
        <p className="muted small" style={{ margin: 0 }}>{sel.length} elements selected</p>
        <div className="studio-row">
          <Button variant="secondary" className="btn-xs" onClick={() => useEditorStore.getState().duplicateSelected()}>Duplicate</Button>
          <Button variant="ghost" className="btn-xs" onClick={onDeleteSelected}>
            <IconTrash size={12} /> Delete
          </Button>
        </div>
      </div>
    );
  }
  if (!single) return null;

  const isText = single.type === 'heading' || single.type === 'text' || single.type === 'button';
  const def = fieldDefOf(fieldId);

  return (
    <div className="studio-props">
      <div className="studio-el-id">
        <span className="studio-el-id-chip">{single.type}</span>
        {fieldId ? (
          <div className="studio-el-id-text">
            <span className="strong small" style={{ fontFamily: 'var(--mono, SFMono-Regular, Consolas, monospace)', color: 'var(--navy)' }}>{fieldId}</span>
            <span className="muted small">{def.label} · live field</span>
          </div>
        ) : (
          <div className="studio-el-id-text">
            <span className="strong small">{single.name}</span>
            <span className="muted small">Static element</span>
          </div>
        )}
      </div>

      <div className="f-group" style={{ gap: 10 }}>
        <div className="f-group f-group-2" style={{ gap: 8 }}>
          <Field label="X">
            <NumberInput size="sm" value={single.layout.x} onChange={(e) => upd(single.id, { layout: { ...single.layout, x: Number(e.target.value) || 0 } })} />
          </Field>
          <Field label="Y">
            <NumberInput size="sm" value={single.layout.y} onChange={(e) => upd(single.id, { layout: { ...single.layout, y: Number(e.target.value) || 0 } })} />
          </Field>
          <Field label="Width">
            <NumberInput size="sm" min={MIN_SIZE} value={single.layout.width} onChange={(e) => upd(single.id, { layout: { ...single.layout, width: Math.max(MIN_SIZE, Number(e.target.value) || MIN_SIZE) } })} />
          </Field>
          <Field label="Height">
            <NumberInput size="sm" min={MIN_SIZE} value={single.layout.height} onChange={(e) => upd(single.id, { layout: { ...single.layout, height: Math.max(MIN_SIZE, Number(e.target.value) || MIN_SIZE) } })} />
          </Field>
        </div>
      </div>

      {single.type === 'rating-stars' ? (
        <div className="studio-note">
          <span className="muted small">
            Bound to <code style={{ color: 'var(--navy)', fontWeight: 700 }}>review_rating</code> — the record fills the stars live. Star size
            follows the element’s <strong>height</strong>: drag the bottom edge to make them bigger or smaller.
          </span>
        </div>
      ) : null}

      {isText && (
        <>
          <hr className="divider" style={{ margin: '8px 0' }} />
          <div className="studio-panel-label">Content</div>
          <div className="f-group">
            {fieldId ? (
              <>
                <div className="studio-note">
                  <span className="muted small">
                    Bound to <code style={{ color: 'var(--navy)', fontWeight: 700 }}>{fieldId}</code> · filled automatically from each review
                    (see Preview). To use your own copy instead, switch back to static text.
                  </span>
                </div>
                <div className="f-group f-group-2" style={{ gap: 8 }}>
                  <Field label="Field id">
                    <SelectField
                      size="sm"
                      value={fieldId}
                      onChange={(e) => {
                        const v = e.target.value;
                        upd(single.id, { binding: { bindingKey: v as StudioElement['binding'] extends { bindingKey: infer K } ? K : never, property: 'text' } });
                      }}
                    >
                      {FIELD_DEFS.filter((f) => f.id !== 'review_rating').map((f) => (
                        <option key={f.id} value={f.id}>{f.label} ({f.id})</option>
                      ))}
                    </SelectField>
                  </Field>
                </div>
              </>
            ) : (
              <>
                <Field label="Static copy" hint="Keep it on your own copy, or bind this element to a review field below.">
                  <TextAreaInput rows={3} value={displayText(single, null)} onChange={(e) => upd(single.id, { text: e.target.value, binding: null })} />
                </Field>
                <Field label="Bind to a review field" hint="The record fills the text at preview/live time; the element keeps its id.">
                  <SelectField
                    size="sm"
                    value="static"
                    onChange={(e) => {
                      const v = e.target.value;
                      upd(single.id, v === 'static' ? { binding: null } : { binding: { bindingKey: v as 'review_text' | 'reviewer_name', property: 'text' } });
                    }}
                  >
                    <option value="static">Static text (no binding)</option>
                    <option value="review_text">Review text (review_text)</option>
                    <option value="reviewer_name">Reviewer name (reviewer_name)</option>
                  </SelectField>
                </Field>
              </>
            )}
          </div>
        </>
      )}

      {single.typography && (
        <>
          <hr className="divider" style={{ margin: '8px 0' }} />
          <div className="studio-panel-label">Typography</div>
          <div className="f-group f-group-2" style={{ gap: 8 }}>
            <Field label="Size (px)">
              <NumberInput size="sm" min={8} max={160} value={single.typography.fontSize} onChange={(e) => upd(single.id, { typography: { ...single.typography!, fontSize: Number(e.target.value) || 14 } })} />
            </Field>
            <Field label="Weight">
              <SelectField size="sm" value={String(single.typography.fontWeight)} onChange={(e) => upd(single.id, { typography: { ...single.typography!, fontWeight: Number(e.target.value) } })}>
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
              </SelectField>
            </Field>
          </div>
          {(single.type === 'heading' || single.type === 'text') && (
            <>
              <Field label="Text colour">
                <div className="swatches" style={{ gap: 6 }}>
                  {PALETTE_SWATCHES.map((c) => (
                    <button key={c} type="button" aria-label={`Colour ${c}`} className={`swatch ${single.typography!.color.toLowerCase() === c ? 'active' : ''}`} style={{ background: c }} onClick={() => upd(single.id, { typography: { ...single.typography!, color: c } })} />
                  ))}
                  <label className="swatch swatch-custom">
                    <input type="color" value={single.typography.color} onChange={(e) => upd(single.id, { typography: { ...single.typography!, color: e.target.value } })} />
                    <IconPlus size={12} />
                  </label>
                </div>
              </Field>
              <Field label="Align">
                <div className="segmented">
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button key={a} type="button" className={`segment ${single.typography?.align === a ? 'active' : ''}`} onClick={() => upd(single.id, { typography: { ...single.typography!, align: a } })}>
                      {a}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}
        </>
      )}

      {single.type === 'image' && (
        <>
          <hr className="divider" style={{ margin: '8px 0' }} />
          <div className="studio-panel-label">Image</div>
          <Field label="Image URL">
            <TextInput value={single.imageUrl ?? ''} placeholder="https://example.com/picture.jpg" onChange={(e) => upd(single.id, { imageUrl: e.target.value || null })} />
          </Field>
        </>
      )}

      {single.type !== 'spacer' && (
        <>
          <hr className="divider" style={{ margin: '8px 0' }} />
          <div className="studio-panel-label">Surface</div>
          <Field label="Background">
            <div className="swatches" style={{ gap: 6 }}>
              {PALETTE_SWATCHES.slice(0, 7).map((c) => (
                <button key={c} type="button" aria-label={`Background ${c}`} className={`swatch ${single.style.background?.toLowerCase() === c ? 'active' : ''}`} style={{ background: c }} onClick={() => upd(single.id, { style: { ...single.style, background: c } })} />
              ))}
              <button type="button" className="swatch" title="No background" onClick={() => upd(single.id, { style: { ...single.style, background: null } })}>
                <IconX size={11} />
              </button>
            </div>
          </Field>
          <div className="f-group f-group-2" style={{ gap: 8 }}>
            <Field label="Corner radius">
              <NumberInput size="sm" min={0} max={120} value={single.style.radius} onChange={(e) => upd(single.id, { style: { ...single.style, radius: Number(e.target.value) || 0 } })} />
            </Field>
            <Field label="Z order">
              <NumberInput size="sm" value={single.layout.z} onChange={(e) => upd(single.id, { layout: { ...single.layout, z: Number(e.target.value) || 0 } })} />
            </Field>
          </div>
          <Field label={`Opacity ${single.style.opacity.toFixed(2)}`}>
            <input className="f-range-slider" type="range" min={0.05} max={1} step={0.05} value={single.style.opacity} onChange={(e) => upd(single.id, { style: { ...single.style, opacity: Number(e.target.value) } })} />
          </Field>
        </>
      )}

      <hr className="divider" style={{ margin: '10px 0 8px' }} />
      <div className="studio-row" style={{ justifyContent: 'space-between' }}>
        <div className="studio-row" style={{ gap: 4 }}>
          <Button variant="ghost" className="btn-xs" onClick={() => useEditorStore.getState().bringToFront(single.id)} title="Bring to front">Front</Button>
          <Button variant="ghost" className="btn-xs" onClick={() => useEditorStore.getState().sendToBack(single.id)} title="Send to back">Back</Button>
        </div>
        <Button variant="secondary" className="btn-xs" onClick={() => useEditorStore.getState().duplicateSelected()}>Duplicate</Button>
      </div>
      <Button variant="danger" className="btn-block" style={{ marginTop: 6 }} onClick={onDeleteSelected}>
        <IconTrash size={13} /> Delete {single.type === 'container' ? 'card' : single.type.replace('-', ' ')}
      </Button>
    </div>
  );
}
