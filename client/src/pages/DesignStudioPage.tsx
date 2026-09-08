/**
 * Design studio — company workspace, per product (/app/a/:appId/studio).
 *
 * A Figma-style editor:
 *   · infinite pan/zoom canvas — space-drag or middle-drag to pan, ⌘/Ctrl+wheel
 *     to zoom at the pointer, wheel/shift-wheel to pan, Fit / 100% shortcuts
 *   · layers-first left panel; element adding lives behind an ＋ button
 *   · floating side panels over a full-bleed canvas (the canvas fills the
 *     screen; panels can be hidden for maximum stage)
 *   · per-element per-corner radius, entrance animations, and the live
 *     widget behavior (cycle / swipe carousel / marquee) edited right here
 *   · Draft-first: Save writes an unpublished draft; Publish is the only
 *     action that changes what the live embed serves
 *   · Preview renders the REAL TemplateWidget — the exact component the
 *     embed iframe runs — so previews and live output can never drift
 *   · Zustand + Immer store with undo/redo, snap engine, data bindings,
 *     and the required-component guard (a widget must keep review text,
 *     reviewer name and rating)
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useEditorStore } from '../design-studio/editor-store';
import { SchemaSurface } from '../design-studio/runtime';
import { TemplateWidget } from '../widgets/TemplateWidget';
import { snapBox, type SnapGuide } from '../design-studio/snap-engine';
import { MIN_SIZE, SHADER_PRESETS, type ShaderPreset, type WidgetBehavior } from '../design-studio/types';
import { elementToCSS } from '../design-studio/css';
import { ANIMATION_PRESETS } from '../design-studio/animation-presets';
import { boundFieldId, boundValue, displayText, FIELD_DEFS, fieldDefOf } from '../design-studio/data-binder';
import type { AppSummary } from '../lib/types';
import type { ElementType, StudioElement, StudioRecord } from '../design-studio/types';
import { Button, ErrorBanner, Toggle } from '../components/ui';
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
  { type: 'shader', label: 'Shader', hint: 'Animated GLSL backdrop' },
];

const PALETTE_SWATCHES = ['#1b2559', '#0ea5a0', '#2563eb', '#7c3aed', '#e11d48', '#f59e0b', '#0f172a', '#ffffff'];
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type Handle = (typeof HANDLES)[number];

type Gesture =
  | { kind: 'move'; id: string; startX: number; startY: number; baseX: number; baseY: number }
  | { kind: 'resize'; id: string; startX: number; startY: number; dir: string; base: StudioElement['layout'] }
  | null;

const ZOOM_MIN = 0.05;
const ZOOM_MAX = 4;

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

  // ---- Panels float OVER the full-bleed canvas; hidden = more stage.
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  // ---- Figma-style viewport: pan {x,y} + zoom, applied to the world layer.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const spaceRef = useRef(false);
  const panRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const viewRef = useRef({ pan: { x: 0, y: 0 }, zoom: 1 });
  viewRef.current = { pan, zoom };

  // ---- Widget contract: required components can't be deleted.
  const [guardError, setGuardError] = useState<string | null>(null);
  const guardRef = useRef<() => void>(() => undefined);

  function guardedDelete(): void {
    const st = useEditorStore.getState();
    const s = st.schema;
    if (!s || st.selectedIds.length === 0) return;
    const doomed = new Set(st.selectedIds);
    const remaining = s.elements.filter((e) => !doomed.has(e.id));
    const lost: string[] = [];
    for (const field of ['review_text', 'reviewer_name', 'review_rating']) {
      if (s.elements.some((e) => boundFieldId(e) === field) && !remaining.some((e) => boundFieldId(e) === field)) lost.push(field);
    }
    if (lost.length > 0) {
      setGuardError(
        `Required widget components can't be removed — every widget must show ${lost.join(', ')}. Add a replacement first, or pick a different template on the Widget page.`,
      );
      window.setTimeout(() => setGuardError(null), 5200);
      return;
    }
    setGuardError(null);
    st.deleteSelected();
  }
  guardRef.current = guardedDelete;

  /** Center the canvas in the viewport at the largest scale that fits. */
  function fitToViewport(): void {
    const vp = viewportRef.current;
    if (!vp || !schema) return;
    const z = Math.min(1, (vp.clientWidth - 96) / schema.canvas.width, (vp.clientHeight - 96) / schema.canvas.height);
    setZoom(z);
    setPan({ x: (vp.clientWidth - schema.canvas.width * z) / 2, y: (vp.clientHeight - schema.canvas.height * z) / 2 });
  }

  /** Zoom keeping the point under the cursor anchored (Figma wheel-zoom). */
  function zoomAt(clientX: number, clientY: number, factor: number): void {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const { pan: p, zoom: z } = viewRef.current;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * factor * 100) / 100));
    if (next === z) return;
    setZoom(next);
    setPan({ x: cx - (cx - p.x) * (next / z), y: cy - (cy - p.y) * (next / z) });
  }

  // Fit whenever a design loads / the canvas size changes / the stage resizes.
  useEffect(() => {
    if (!schema) return;
    fitToViewport();
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver(() => fitToViewport());
    ro.observe(vp);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema?.canvas.width, schema?.canvas.height, store.isLoading]);

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

  // ---- Wheel: ⌘/Ctrl+wheel zooms at the cursor; wheel pans (shift swaps axes).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
        return;
      }
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      const p = viewRef.current.pan;
      setPan({ x: p.x - dx, y: p.y - dy });
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.isLoading]);

  // ---- Pan gestures: space-drag or middle-drag anywhere; plain-drag on empty
  // canvas pans too (elements stopPropagation on their own pointerdown).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const down = (e: PointerEvent): void => {
      const empty = !(e.target as HTMLElement).closest('[data-element-hit]');
      if (e.button === 0 && empty && !spaceRef.current) useEditorStore.getState().clearSelection(); // click-away deselect
      const wantsPan = e.button === 1 || spaceRef.current || (e.button === 0 && empty);
      if (!wantsPan) return;
      e.preventDefault();
      const p = viewRef.current.pan;
      panRef.current = { startX: e.clientX, startY: e.clientY, baseX: p.x, baseY: p.y };
      setPanning(true);
    };
    const move = (e: PointerEvent): void => {
      const g = panRef.current;
      if (!g) return;
      setPan({ x: g.baseX + (e.clientX - g.startX), y: g.baseY + (e.clientY - g.startY) });
    };
    const up = (): void => {
      panRef.current = null;
      setPanning(false);
    };
    vp.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      vp.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.isLoading]);

  // Element drag/resize gestures: window-level move/up while active.
  useEffect(() => {
    if (!gesture) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      applyGesture(gesture, e.clientX, e.clientY, surfaceRef, setGuides, viewRef.current.zoom);
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

  // Keyboard: shortcuts + space-tracking for pan.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.code === 'Space' && !typing) {
        e.preventDefault();
        spaceRef.current = true;
        return;
      }
      if (typing) return;
      const s = useEditorStore.getState();
      if (!s.schema) return;
      const mod = e.metaKey || e.ctrlKey;
      // Figma shortcuts: Shift+0 fit · Shift+1 100%
      if (e.shiftKey && (e.key === '!' || e.key === '1')) {
        e.preventDefault();
        setZoom(1);
        return;
      }
      if (e.shiftKey && (e.key === ')' || e.key === '0')) {
        e.preventDefault();
        fitToViewport();
        return;
      }
      if (s.previewMode) return;
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
    function onKeyUp(e: KeyboardEvent): void {
      if (e.code === 'Space') spaceRef.current = false;
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enterPreview(on: boolean): void {
    useEditorStore.getState().setPreviewMode(on);
    // Presentation mode: panels get out of the way; the stage owns the screen.
    if (on) {
      setShowLeft(false);
      setShowRight(false);
      setAddOpen(false);
      fitToViewport();
    } else {
      setShowLeft(true);
      setShowRight(true);
    }
  }

  if (store.isLoading) {
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
        <div className="studio-stage">
          <div className="studio-viewport">
            <span className="sk" style={{ width: '56%', height: '70%', borderRadius: 14, margin: 'auto' }} />
          </div>
          <aside className="studio-ov studio-ov-left" style={{ padding: 10 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className="sk" style={{ display: 'block', width: '92%', height: 30, borderRadius: 9, marginBottom: 6 }} />
            ))}
          </aside>
          <aside className="studio-ov studio-ov-right" style={{ padding: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="sk" style={{ display: 'block', width: `${88 - i * 6}%`, height: 30, borderRadius: 9, marginBottom: 8 }} />
            ))}
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

  const behavior: WidgetBehavior = { mode: 'cycle', autoPlay: true, intervalSec: 6, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 0, ...(schema.behavior ?? {}) };

  return (
    <div className="studio-page">
      <div className="studio-toolbar">
        <div className="studio-tb-left">
          <Link className="btn btn-ghost btn-xs" to={`/app/a/${appId}/connect`}>
            <IconX size={12} /> Widget
          </Link>
          <input
            className="studio-name-input"
            value={schema.name}
            aria-label="Design name"
            onChange={(e) => store.updateSchemaName(e.target.value)}
          />
          {store.isDraft ? (
            <span className="chip chip-pending" title="Your customisation is safe — publish it when you're ready">Draft · not live</span>
          ) : store.dirty ? (
            <span className="chip chip-pending">Unsaved</span>
          ) : store.publishedAt ? (
            <span className="chip chip-approved"><IconCheck size={11} /> Live</span>
          ) : (
            <span className="chip chip-approved"><IconCheck size={11} /> Saved</span>
          )}
        </div>
        <div className="studio-tb-right">
          <div className="segmented" role="group" aria-label="Editor mode">
            <button type="button" className={`segment ${!store.previewMode ? 'active' : ''}`} onClick={() => enterPreview(false)}>
              Editor
            </button>
            <button type="button" className={`segment ${store.previewMode ? 'active' : ''}`} onClick={() => enterPreview(true)}>
              Preview
            </button>
          </div>
          <span className="studio-tb-sep" aria-hidden />
          <div className="segmented studio-panel-toggles" role="group" aria-label="Side panels">
            <button type="button" className={`segment ${showLeft ? 'active' : ''}`} aria-pressed={showLeft} onClick={() => setShowLeft((v) => !v)} title="Layers panel">
              <IconLayers size={12} /> Layers
            </button>
            <button type="button" className={`segment ${showRight ? 'active' : ''}`} aria-pressed={showRight} onClick={() => setShowRight((v) => !v)} title="Properties panel">
              <IconSidebar size={12} /> Props
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
          <Button variant="secondary" className="btn-sm" disabled={store.saving || !store.dirty} onClick={() => void store.save()} title="Saves your customisation without changing the live embed">
            {store.saving ? 'Saving…' : 'Save draft'}
          </Button>
          {(store.isDraft || store.dirty) && (
            <Button className="btn-sm" disabled={store.publishing} onClick={() => void store.publish()} title="Push the saved draft live — this is what the embed will serve">
              {store.publishing ? 'Publishing…' : 'Publish'}
            </Button>
          )}
        </div>
      </div>
      {store.isDraft && !store.previewMode && (
        <div className="studio-draft-note" role="status">
          <span className="strong">Customising “{schema.name}” as a draft</span>
          <span className="muted small"> — the live embed keeps serving your published design until you hit Publish.</span>
        </div>
      )}
      {(store.saveError || store.publishError || guardError) && (
        <div className="banner banner-error" role="alert">
          <span>{store.saveError ?? store.publishError ?? guardError}</span>
        </div>
      )}

      {/* ---- The stage: full-bleed pan/zoom canvas + floating panels -------- */}
      <div className="studio-stage">
        <div
          ref={viewportRef}
          className={`studio-viewport ${panning ? 'is-panning' : ''} ${spaceRef.current ? 'is-space' : ''}`}
        >
          <div className="studio-world" style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}>
            <div
              ref={surfaceRef}
              className="studio-surface studio-edit-surface"
              style={{ width: schema.canvas.width, height: schema.canvas.height, background: schema.canvas.background }}
              data-testid="studio-canvas"
            >
              {store.previewMode ? (
                <>
                  {/* The REAL embed component — carousel / marquee / cycle all
                      behave exactly as they will on the customer's site. */}
                  <div className="studio-preview-widget">
                    <TemplateWidget schema={schema} records={store.records} />
                  </div>
                  <div className="studio-fieldmap">
                    <span className="muted small strong" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>Template fields</span>
                    {(() => {
                      const used = [...new Set(schema.elements.map((e) => boundFieldId(e)).filter((f): f is string => Boolean(f)))];
                      const record = store.records[store.previewIndex] ?? null;
                      return used.map((id) => {
                        const def = fieldDefOf(id);
                        const val = boundValue(id, record);
                        return (
                          <span key={id} className="chip chip-tenant" title={`${def.label} — filled from the live review record`}>
                            <code>{id}</code>
                            {val !== null ? ` → ${String(val).slice(0, 26)}${String(val).length > 26 ? '…' : ''}` : ' → awaiting record'}
                          </span>
                        );
                      });
                    })()}
                  </div>
                  <div className="studio-previewbar">
                    <span className="muted small">
                      {store.records.length > 0
                        ? `Live preview · ${store.records.length} review${store.records.length === 1 ? '' : 's'} · ${behavior.mode} — this is the exact embed component`
                        : 'Static placeholder — no approved reviews yet'}
                    </span>
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => enterPreview(false)}>Back to editor</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="studio-static">
                    <SchemaSurface schema={schema} />
                  </div>
                  {[...schema.elements].sort((a, b) => a.layout.z - b.layout.z).map((el) => (
                    <EditOverlay key={el.id} el={el} onGestureStart={setGesture} spaceHeld={spaceRef} />
                  ))}
                  {guides.map((g, i) =>
                    g.axis === 'x' ? (
                      <div key={i} className="studio-guide studio-guide-x" style={{ left: g.position }} />
                    ) : (
                      <div key={i} className="studio-guide studio-guide-y" style={{ top: g.position }} />
                    ),
                  )}
                </>
              )}
            </div>
          </div>

          <div className="studio-zoom" role="group" aria-label="Canvas zoom">
            <button type="button" className="ctx-trigger" title="Zoom out" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - 0.1) * 100) / 100))}>
              <IconZoomMinus size={14} />
            </button>
            <button type="button" className="studio-zoom-value" title="Zoom to fit (Shift+0)" onClick={fitToViewport}>
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="ctx-trigger" title="Zoom in" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + 0.1) * 100) / 100))}>
              <IconZoomPlus size={14} />
            </button>
            <button type="button" className="ctx-trigger" title="Actual size (Shift+1)" onClick={() => setZoom(1)}>
              1:1
            </button>
          </div>
          {!store.previewMode && (
            <div className="studio-canvas-hint muted small">
              Space / middle-drag to pan · ⌘/Ctrl+wheel to zoom · drag elements to move · Del removes · Ctrl+Z undoes
            </div>
          )}
        </div>

        {/* ---- Floating left panel: LAYERS first, ＋ add behind a button --- */}
        {!store.previewMode && (
          <>
            {!showLeft && (
              <button type="button" className="studio-float-btn studio-float-left" title="Show layers" onClick={() => setShowLeft(true)}>
                <IconLayers size={15} />
              </button>
            )}
            {!showRight && (
              <button type="button" className="studio-float-btn studio-float-right" title="Show properties" onClick={() => setShowRight(true)}>
                <IconSidebar size={15} />
              </button>
            )}

            <aside className={`studio-ov studio-ov-left ${showLeft ? '' : 'is-hidden'}`} aria-hidden={!showLeft}>
              <div className="studio-ov-head">
                <div className="studio-panel-title" style={{ margin: 0 }}>Layers</div>
                <span className="studio-ov-tools">
                  <button type="button" className="ctx-trigger" title="Add an element" aria-label="Add an element" aria-expanded={addOpen} onClick={() => setAddOpen((v) => !v)}>
                    <IconPlus size={14} />
                  </button>
                  <button type="button" className="ctx-trigger" title="Hide layers" aria-label="Hide layers" onClick={() => setShowLeft(false)}>
                    <IconX size={14} />
                  </button>
                </span>
              </div>
              {addOpen && (
                <div className="studio-add-pop">
                  {ELEMENTS.map((e) => (
                    <button
                      key={e.type}
                      type="button"
                      className="studio-el-btn"
                      onClick={() => {
                        store.addElement(e.type);
                        setAddOpen(false);
                      }}
                    >
                      <IconPlus size={12} />
                      <span>
                        <span className="strong small">{e.label}</span>
                        <span className="muted small">{e.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="studio-ov-body">
                <div className="studio-layers" style={{ maxHeight: 'none' }}>
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
                                <span className="muted small">{fieldDefOf(boundFieldId(el)).label} · live</span>
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

            {/* ---- Floating right panel: properties ------------------------ */}
            <aside className={`studio-ov studio-ov-right ${showRight ? '' : 'is-hidden'}`} aria-hidden={!showRight}>
              <div className="studio-ov-head">
                <div className="studio-panel-title" style={{ margin: 0 }}>Properties</div>
                <button type="button" className="ctx-trigger" title="Hide properties" aria-label="Hide properties" onClick={() => setShowRight(false)}>
                  <IconX size={14} />
                </button>
              </div>
              <div className="studio-ov-body">
                <PropertiesPanel onDeleteSelected={guardRef.current} />
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

/** Interaction overlay drawn on top of each element's static rendering. */
function EditOverlay({
  el,
  onGestureStart,
  spaceHeld,
}: {
  el: StudioElement;
  onGestureStart: (g: Gesture) => void;
  spaceHeld: React.MutableRefObject<boolean>;
}) {
  const selected = useEditorStore((st) => st.selectedIds.includes(el.id));
  const hovered = useEditorStore((st) => st.hoveredId === el.id);
  const css = elementToCSS(el);

  function beginMove(e: React.PointerEvent) {
    if (e.button !== 0) return;
    if (spaceHeld.current) return; // space-drag always pans, even over elements
    e.stopPropagation();
    const st = useEditorStore.getState();
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      st.select(el.id, true);
      return;
    }
    e.preventDefault();
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
        fieldId && <div className="studio-el-badge" title={`${fieldDefOf(fieldId).label} — filled from the live review record`}>{fieldId}</div>
      )}
    </div>
  );
}

/** One move/resize tick for the active gesture. Pointer deltas are divided
 * by the current canvas zoom so dragging feels 1:1 at any zoom level. */
function applyGesture(
  gesture: NonNullable<Gesture>,
  clientX: number,
  clientY: number,
  surfaceRef: React.RefObject<HTMLDivElement | null>,
  setGuides: (g: SnapGuide[]) => void,
  zoom = 1,
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
    const rawX = gesture.baseX + (clientX - gesture.startX) / zoom;
    const rawY = gesture.baseY + (clientY - gesture.startY) / zoom;
    const others = schema.elements
      .filter((e) => e.id !== gesture.id)
      .map((e) => ({ id: e.id, x: e.layout.x, y: e.layout.y, width: e.layout.width, height: e.layout.height }));
    const res = snapBox({ id: gesture.id, x: rawX, y: rawY, width: el.layout.width, height: el.layout.height }, others, schema.canvas.width, schema.canvas.height);
    st.setGeometry(gesture.id, { x: res.x, y: res.y });
    setGuides(res.guides);
  } else {
    const { dir, base } = gesture;
    const dx = (clientX - gesture.startX) / zoom;
    const dy = (clientY - gesture.startY) / zoom;
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

  // ---- Nothing selected: the widget itself (design + live behavior).
  if (sel.length === 0) {
    const st = useEditorStore.getState;
    const b = { mode: 'cycle', autoPlay: true, intervalSec: 6, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 0, ...(schema.behavior ?? {}) } as WidgetBehavior;
    const setB = (patch: Partial<WidgetBehavior>): void => st().updateBehavior(patch);
    return (
      <div className="studio-props">
        <div className="stack">
          <Field label="Design name" hint="Shown on the Widget page and in the studio.">
            <TextInput value={schema.name} onChange={(e) => st().updateSchemaName(e.target.value)} />
          </Field>
          <Field label="Template size" hint="Fixed by the template — the embed reserves exactly this space, so devs always know where it fits.">
            <div className="canvas-size-lock">
              {schema.canvas.width} × {schema.canvas.height}
              <span className="muted small">px · fixed</span>
            </div>
          </Field>
          <Field label="Canvas background" hint="The surface your widget renders on — everywhere.">
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
        <div className="studio-panel-label">Widget behavior</div>
        <p className="muted small" style={{ margin: '0 0 8px' }}>
          What the embed does as more reviews come in — this is the live widget your visitors interact with.
        </p>
        <Field label="Mode">
          <SelectField size="sm" value={b.mode} onChange={(e) => setB({ mode: e.target.value as WidgetBehavior['mode'] })}>
            <option value="cycle">Cycle — one review at a time (cross-fade)</option>
            <option value="carousel">Carousel — swipeable / draggable slides</option>
            <option value="coverflow">Coverflow — 3D depth carousel, leans with the cursor</option>
            <option value="tilt">Tilt — mouse-reactive 3D card</option>
            <option value="marquee">Marquee — continuous stream</option>
          </SelectField>
        </Field>
        {b.mode !== 'marquee' && (
          <>
            <Field label="Auto-advance">
              <span className="t-live">
                <Toggle checked={b.autoPlay} onChange={(v) => setB({ autoPlay: v })} />
                <span className={`small ${b.autoPlay ? 't-live-on' : 'muted'}`}>{b.autoPlay ? `Every ${b.intervalSec}s` : 'Manual only'}</span>
              </span>
            </Field>
            {b.autoPlay && (
              <Field label="Seconds per review">
                <NumberInput size="sm" min={2} max={60} value={b.intervalSec} onChange={(e) => setB({ intervalSec: Math.max(2, Number(e.target.value) || 6) })} />
              </Field>
            )}
          </>
        )}
        {b.mode === 'marquee' && (
          <>
            <Field label="Direction">
              <div className="segmented">
                <button type="button" className={`segment ${b.direction === 'left' ? 'active' : ''}`} onClick={() => setB({ direction: 'left' })}>
                  Move left
                </button>
                <button type="button" className={`segment ${b.direction === 'right' ? 'active' : ''}`} onClick={() => setB({ direction: 'right' })}>
                  Move right
                </button>
              </div>
            </Field>
            <Field label={`Speed · ${b.speedPx}px/s`}>
              <input className="f-range-slider" type="range" min={10} max={240} step={5} value={b.speedPx} onChange={(e) => setB({ speedPx: Number(e.target.value) })} />
            </Field>
          </>
        )}
        <Field label="Pause on hover">
          <span className="t-live">
            <Toggle checked={b.pauseOnHover} onChange={(v) => setB({ pauseOnHover: v })} />
            <span className={`small ${b.pauseOnHover ? 't-live-on' : 'muted'}`}>{b.pauseOnHover ? 'Pauses when a visitor hovers' : 'Keeps moving'}</span>
          </span>
        </Field>
        <Field label="Reviews included" hint="0 = all approved reviews. Cap it to keep the widget light.">
          <NumberInput size="sm" min={0} max={50} value={b.maxRecords} onChange={(e) => setB({ maxRecords: Math.max(0, Number(e.target.value) || 0) })} />
        </Field>

        <hr className="divider" style={{ margin: '14px 0 8px' }} />
        <p className="muted small" style={{ margin: 0 }}>
          Select an element on the canvas or in <strong>Layers</strong> to edit it. Elements bound to a review field carry their id
          (<code>reviewer_name</code>, <code>review_text</code>, <code>review_rating</code>) and fill automatically in Preview and live.
          The three bound components are <strong>required</strong> — a design without them is not a widget.
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
  const linked = single.style.radiusTL === undefined && single.style.radiusTR === undefined && single.style.radiusBR === undefined && single.style.radiusBL === undefined;

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

      {single.type === 'rating-stars' ? (
        <div className="studio-note">
          <span className="muted small">
            Bound to <code style={{ color: 'var(--navy)', fontWeight: 700 }}>review_rating</code> — the record fills the stars live. Star size
            follows the element&apos;s <strong>height</strong>: drag the bottom edge to make them bigger or smaller.
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
                    (see Preview). Switch back to static copy below if you want your own text.
                  </span>
                </div>
                <Field label="Field id">
                  <SelectField
                    size="sm"
                    value={fieldId}
                    onChange={(e) => {
                      const v = e.target.value;
                      upd(single.id, { binding: { bindingKey: v as 'review_text' | 'reviewer_name', property: 'text' } });
                    }}
                  >
                    {FIELD_DEFS.filter((f) => f.id !== 'review_rating').map((f) => (
                      <option key={f.id} value={f.id}>{f.label} ({f.id})</option>
                    ))}
                  </SelectField>
                </Field>
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

      {single.type === 'shader' && (
        <>
          <hr className="divider" style={{ margin: '8px 0' }} />
          <div className="studio-panel-label">Shader</div>
          <Field label="Preset" hint="A live GLSL animation on a WebGL canvas — the same one the embed renders.">
            <SelectField
              size="sm"
              value={single.shader?.preset ?? 'aurora'}
              onChange={(e) => upd(single.id, { shader: { preset: e.target.value as ShaderPreset, speed: single.shader?.speed ?? 1 } })}
            >
              {SHADER_PRESETS.map((s) => (
                <option key={s.id} value={s.id}>{s.label} — {s.hint}</option>
              ))}
            </SelectField>
          </Field>
          <Field label={`Speed · ${(single.shader?.speed ?? 1).toFixed(2)}×`}>
            <input
              className="f-range-slider"
              type="range"
              min={0.1}
              max={3}
              step={0.05}
              value={single.shader?.speed ?? 1}
              onChange={(e) => upd(single.id, { shader: { preset: single.shader?.preset ?? 'aurora', speed: Number(e.target.value) } })}
            />
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

          {/* ---- Corner radius: linked, or per-corner for real shapes ------ */}
          <Field label="Corner radius" hint={linked ? 'Linked — all four corners move together.' : 'Per-corner — unlinked for shaped cards.'}>
            <div className="radius-box">
              <span className="radius-corners" aria-hidden>
                <span className={`radius-dot ${linked ? '' : 'on'} r-tl`} title="Top left" />
                <span className={`radius-dot ${linked ? '' : 'on'} r-tr`} title="Top right" />
                <span className={`radius-dot ${linked ? '' : 'on'} r-br`} title="Bottom right" />
                <span className={`radius-dot ${linked ? '' : 'on'} r-bl`} title="Bottom left" />
              </span>
              {linked ? (
                <NumberInput size="sm" min={0} max={160} value={single.style.radius} onChange={(e) => upd(single.id, { style: { ...single.style, radius: Math.max(0, Number(e.target.value) || 0) } })} />
              ) : (
                <div className="f-group f-group-2" style={{ gap: 6 }}>
                  <Field label="TL">
                    <NumberInput size="sm" min={0} max={160} value={single.style.radiusTL ?? single.style.radius} onChange={(e) => upd(single.id, { style: { ...single.style, radiusTL: Math.max(0, Number(e.target.value) || 0) } })} />
                  </Field>
                  <Field label="TR">
                    <NumberInput size="sm" min={0} max={160} value={single.style.radiusTR ?? single.style.radius} onChange={(e) => upd(single.id, { style: { ...single.style, radiusTR: Math.max(0, Number(e.target.value) || 0) } })} />
                  </Field>
                  <Field label="BR">
                    <NumberInput size="sm" min={0} max={160} value={single.style.radiusBR ?? single.style.radius} onChange={(e) => upd(single.id, { style: { ...single.style, radiusBR: Math.max(0, Number(e.target.value) || 0) } })} />
                  </Field>
                  <Field label="BL">
                    <NumberInput size="sm" min={0} max={160} value={single.style.radiusBL ?? single.style.radius} onChange={(e) => upd(single.id, { style: { ...single.style, radiusBL: Math.max(0, Number(e.target.value) || 0) } })} />
                  </Field>
                </div>
              )}
              <Button
                variant="outline"
                className="btn-xs"
                title={linked ? 'Unlink corners to set each one separately' : 'Link corners back together'}
                onClick={() =>
                  upd(single.id, {
                    style: linked
                      ? { ...single.style, radiusTL: single.style.radius, radiusTR: single.style.radius, radiusBR: single.style.radius, radiusBL: single.style.radius }
                      : { ...single.style, radius: single.style.radiusTR ?? single.style.radiusTL ?? single.style.radius, radiusTL: undefined, radiusTR: undefined, radiusBR: undefined, radiusBL: undefined },
                  })
                }
              >
                {linked ? 'Unlink corners' : 'Link corners'}
              </Button>
            </div>
          </Field>

          <Field label={`Opacity ${single.style.opacity.toFixed(2)}`}>
            <input className="f-range-slider" type="range" min={0.05} max={1} step={0.05} value={single.style.opacity} onChange={(e) => upd(single.id, { style: { ...single.style, opacity: Number(e.target.value) } })} />
          </Field>
        </>
      )}

      {/* ---- Animation ---------------------------------------------------- */}
      {single.type !== 'spacer' && (
        <>
          <hr className="divider" style={{ margin: '8px 0' }} />
          <div className="studio-panel-label">Animation</div>
          <Field label="Entrance" hint="Plays each time a review slides in (Preview & live).">
            <SelectField
              size="sm"
              value={single.animation?.type ?? 'none'}
              onChange={(e) => {
                const v = e.target.value;
                upd(single.id, { animation: v === 'none' ? null : { type: v, durationMs: single.animation?.durationMs ?? 500, delayMs: single.animation?.delayMs ?? 0 } });
              }}
            >
              <option value="none">None</option>
              {Object.keys(ANIMATION_PRESETS).map((k) => (
                <option key={k} value={k}>{k.replace(/-/g, ' ')}</option>
              ))}
            </SelectField>
          </Field>
          {single.animation && (
            <div className="f-group f-group-2" style={{ gap: 6 }}>
              <Field label="Duration (ms)">
                <NumberInput size="sm" min={100} max={4000} step={50} value={single.animation.durationMs} onChange={(e) => upd(single.id, { animation: { ...single.animation!, durationMs: Number(e.target.value) || 500 } })} />
              </Field>
              <Field label="Delay (ms)">
                <NumberInput size="sm" min={0} max={4000} step={50} value={single.animation.delayMs} onChange={(e) => upd(single.id, { animation: { ...single.animation!, delayMs: Number(e.target.value) || 0 } })} />
              </Field>
            </div>
          )}
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
