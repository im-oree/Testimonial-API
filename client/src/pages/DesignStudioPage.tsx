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
import { displayText } from '../design-studio/data-binder';
import type { AppSummary } from '../lib/types';
import type { ElementType, StudioElement, StudioRecord } from '../design-studio/types';
import { Button, ErrorBanner } from '../components/ui';
import { IconCheck, IconLayers, IconPlus, IconRefresh, IconTrash, IconX } from '../components/icons';

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
  const [gesture, setGesture] = useState<Gesture>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [productName, setProductName] = useState('');
  const [slug, setSlug] = useState<string | null>(null);

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
      applyGesture(gesture, e.clientX, e.clientY, surfaceRef, setGuides);
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
        s.deleteSelected();
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
    return (
      <div className="card">
        <div className="block-center" style={{ padding: '30px 0' }}>
          <span className="spinner" aria-hidden />
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
          <span className="chip">studio v{store.savedStudioVersion}</span>
          <span className="chip">design v{store.designVersion}</span>
          <Button variant="ghost" className="btn-xs" disabled={store.past.length === 0} title="Undo (Ctrl/Cmd+Z)" onClick={() => store.undo()}>
            <IconRefresh size={12} style={{ transform: 'scaleX(-1)' }} /> Undo
          </Button>
          <Button variant="ghost" className="btn-xs" disabled={store.future.length === 0} title="Redo (Ctrl/Cmd+Shift+Z)" onClick={() => store.redo()}>
            <IconRefresh size={12} /> Redo
          </Button>
          <div className="segmented">
            <button type="button" className={`segment ${!store.previewMode ? 'active' : ''}`} onClick={() => store.setPreviewMode(false)}>
              Edit
            </button>
            <button type="button" className={`segment ${store.previewMode ? 'active' : ''}`} onClick={() => store.setPreviewMode(true)}>
              Preview
            </button>
          </div>
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

      <div className="studio-grid">
        <aside className="studio-panel">
          <div className="studio-panel-title">Elements</div>
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
                      <span className="strong">{el.name}</span>
                      <span className="muted small">{el.binding ? `bound · ${el.binding.bindingKey}` : el.type}</span>
                    </span>
                  </span>
                  <span className="studio-layer-actions">
                    <button type="button" className="btn btn-ghost btn-xs" title="Duplicate" onClick={() => { store.select(el.id); store.duplicateSelected(); }}>
                      Copy
                    </button>
                    <button type="button" className="btn btn-ghost btn-xs" title="Delete" onClick={() => { store.select(el.id); store.deleteSelected(); }}>
                      <IconTrash size={12} />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="studio-stage">
          <div className="studio-viewport">
            <div
              ref={surfaceRef}
              className="studio-surface studio-edit-surface"
              style={{ width: schema.canvas.width, height: schema.canvas.height, background: schema.canvas.background }}
              data-testid="studio-canvas"
              onPointerDown={(e) => {
                if (!store.previewMode && e.target === e.currentTarget) store.clearSelection();
              }}
            >
              {store.previewMode ? (
                <>
                  <SchemaSurface schema={schema} record={store.records[store.previewIndex] ?? null} animate />
                  <div className="studio-previewbar">
                    <span className="muted small">
                      {store.records.length > 0 ? `Review ${store.previewIndex + 1} of ${store.records.length}` : 'Static placeholder'}
                    </span>
                    {store.records.length > 0 && (
                      <span className="studio-preview-actions">
                        <button type="button" className="btn btn-secondary btn-xs" onClick={() => store.cycleRecord(-1)}>Prev</button>
                        <button type="button" className="btn btn-secondary btn-xs" onClick={() => store.cycleRecord(1)}>Next</button>
                      </span>
                    )}
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => store.setPreviewMode(false)}>Back to edit</button>
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
        </main>

        <aside className="studio-panel">
          <PropertiesPanel />
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

  return (
    <div
      className={`studio-el-hit ${selected ? 'selected' : ''} ${hovered && !selected ? 'hovered' : ''}`}
      style={{ ...css, pointerEvents: 'auto', cursor: 'move' }}
      data-element-hit={el.id}
      onPointerDown={beginMove}
    >
      {selected && (
        <>
          <div className="studio-el-tag">{el.name}</div>
          {HANDLES.map((h) => (
            <div key={h} className="studio-handle" style={handleStyle(h)} onPointerDown={beginResize(h)} />
          ))}
        </>
      )}
    </div>
  );
}

/** One move/resize tick for the active gesture. */
function applyGesture(
  gesture: NonNullable<Gesture>,
  clientX: number,
  clientY: number,
  surfaceRef: React.RefObject<HTMLDivElement | null>,
  setGuides: (g: SnapGuide[]) => void,
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
    const rawX = gesture.baseX + (clientX - gesture.startX);
    const rawY = gesture.baseY + (clientY - gesture.startY);
    const others = schema.elements
      .filter((e) => e.id !== gesture.id)
      .map((e) => ({ id: e.id, x: e.layout.x, y: e.layout.y, width: e.layout.width, height: e.layout.height }));
    const res = snapBox({ id: gesture.id, x: rawX, y: rawY, width: el.layout.width, height: el.layout.height }, others, schema.canvas.width, schema.canvas.height);
    st.setGeometry(gesture.id, { x: res.x, y: res.y });
    setGuides(res.guides);
  } else {
    const { dir, base } = gesture;
    const dx = clientX - gesture.startX;
    const dy = clientY - gesture.startY;
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
function PropertiesPanel() {
  const schema = useEditorStore((st) => st.schema);
  const selectedIds = useEditorStore((st) => st.selectedIds);
  if (!schema) return null;
  const sel = schema.elements.filter((e) => selectedIds.includes(e.id));

  if (sel.length === 0) {
    return (
      <div className="studio-props">
        <div className="studio-panel-title">Design</div>
        <div className="stack">
          <label className="field-label">Name</label>
          <input className="text-input" value={schema.name} onChange={(e) => useEditorStore.getState().updateSchemaName(e.target.value)} />
          <div className="studio-grid2">
            <div>
              <label className="field-label">Canvas W</label>
              <input
                className="text-input"
                type="number"
                value={schema.canvas.width}
                onChange={(e) => useEditorStore.getState().updateCanvas({ width: Number(e.target.value) || schema.canvas.width })}
              />
            </div>
            <div>
              <label className="field-label">Canvas H</label>
              <input
                className="text-input"
                type="number"
                value={schema.canvas.height}
                onChange={(e) => useEditorStore.getState().updateCanvas({ height: Number(e.target.value) || schema.canvas.height })}
              />
            </div>
          </div>
          <label className="field-label">Canvas background</label>
          <input type="color" value={schema.canvas.background} onChange={(e) => useEditorStore.getState().updateCanvas({ background: e.target.value })} className="color-input" />
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>
          Pick an element from the canvas or Layers to edit its properties. Drag to move, corners resize, both snap to the grid.
        </p>
      </div>
    );
  }

  const single = sel.length === 1 ? sel[0] : null;
  const upd = (id: string, patch: Partial<StudioElement>) => useEditorStore.getState().updateElement(id, patch);

  return (
    <div className="studio-props">
      <div className="studio-panel-title">Properties</div>
      {sel.length > 1 ? (
        <>
          <p className="muted small">{sel.length} elements selected</p>
          <div className="studio-row">
            <Button variant="secondary" className="btn-sm" onClick={() => useEditorStore.getState().duplicateSelected()}>Duplicate</Button>
            <Button variant="danger" className="btn-sm" onClick={() => useEditorStore.getState().deleteSelected()}>
              <IconTrash size={13} /> Delete
            </Button>
          </div>
        </>
      ) : single ? (
        <div className="stack">
          <label className="field-label">Name</label>
          <input className="text-input" value={single.name} onChange={(e) => upd(single.id, { name: e.target.value })} />
          <span className="chip">{single.type}</span>

          <div className="studio-grid2">
            {(['x', 'y', 'width', 'height'] as const).map((k) => (
              <div key={k}>
                <label className="field-label">{k}</label>
                <input
                  className="text-input"
                  type="number"
                  value={single.layout[k]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    const layout = { ...single.layout };
                    if (k === 'x' || k === 'y') layout[k] = v;
                    else layout[k] = Math.max(MIN_SIZE, v);
                    upd(single.id, { layout });
                  }}
                />
              </div>
            ))}
          </div>

          {(single.type === 'heading' || single.type === 'text' || single.type === 'button') && (
            <>
              <label className="field-label">Text</label>
              <textarea
                className="studio-area"
                rows={3}
                value={displayText(single, null)}
                onChange={(e) => upd(single.id, { text: e.target.value, binding: null })}
              />
              <label className="field-label">Bind to a review field</label>
              <select
                className="select"
                value={single.binding?.bindingKey ?? 'none'}
                onChange={(e) => {
                  const v = e.target.value;
                  upd(single.id, v === 'none' ? { binding: null } : { binding: { bindingKey: v as 'content' | 'authorName', property: 'text' } });
                }}
              >
                <option value="none">Static text</option>
                <option value="content">Review content</option>
                <option value="authorName">Author name</option>
              </select>
            </>
          )}

          {single.typography && (
            <div className="studio-grid2">
              <div>
                <label className="field-label">Size</label>
                <input
                  className="text-input"
                  type="number"
                  value={single.typography.fontSize}
                  onChange={(e) => upd(single.id, { typography: { ...single.typography!, fontSize: Number(e.target.value) || 14 } })}
                />
              </div>
              <div>
                <label className="field-label">Weight</label>
                <select
                  className="select"
                  value={single.typography.fontWeight}
                  onChange={(e) => upd(single.id, { typography: { ...single.typography!, fontWeight: Number(e.target.value) } })}
                >
                  <option value={400}>Regular</option>
                  <option value={500}>Medium</option>
                  <option value={600}>Semibold</option>
                  <option value={700}>Bold</option>
                </select>
              </div>
            </div>
          )}

          {(single.type === 'heading' || single.type === 'text') && single.typography && (
            <div>
              <label className="field-label">Text colour</label>
              <div className="swatches">
                {PALETTE_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    className={`swatch ${single.typography!.color.toLowerCase() === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => upd(single.id, { typography: { ...single.typography!, color: c } })}
                  />
                ))}
                <label className="swatch swatch-custom">
                  <input type="color" value={single.typography.color} onChange={(e) => upd(single.id, { typography: { ...single.typography!, color: e.target.value } })} />
                  <IconPlus size={12} />
                </label>
              </div>
            </div>
          )}

          {(single.type === 'heading' || single.type === 'text') && (
            <div>
              <label className="field-label">Align</label>
              <div className="segmented">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`segment ${single.typography?.align === a ? 'active' : ''}`}
                    onClick={() => upd(single.id, { typography: { ...single.typography!, align: a } })}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {single.type === 'image' && (
            <>
              <label className="field-label">Image URL</label>
              <input className="text-input" value={single.imageUrl ?? ''} placeholder="https://example.com/picture.jpg" onChange={(e) => upd(single.id, { imageUrl: e.target.value || null })} />
            </>
          )}

          {single.type !== 'spacer' && (
            <>
              <label className="field-label">Background</label>
              <div className="swatches">
                {PALETTE_SWATCHES.slice(0, 7).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Background ${c}`}
                    className={`swatch ${single.style.background?.toLowerCase() === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => upd(single.id, { style: { ...single.style, background: c } })}
                  />
                ))}
                <button type="button" className="swatch" title="No background" onClick={() => upd(single.id, { style: { ...single.style, background: null } })}>
                  <IconX size={11} />
                </button>
              </div>
              <div className="studio-grid2">
                <div>
                  <label className="field-label">Radius</label>
                  <input className="text-input" type="number" value={single.style.radius} onChange={(e) => upd(single.id, { style: { ...single.style, radius: Number(e.target.value) || 0 } })} />
                </div>
                <div>
                  <label className="field-label">Opacity</label>
                  <input className="text-input" type="number" min={0.05} max={1} step={0.05} value={single.style.opacity} onChange={(e) => upd(single.id, { style: { ...single.style, opacity: Math.max(0.05, Math.min(1, Number(e.target.value) || 1)) } })} />
                </div>
                <div>
                  <label className="field-label">Z order</label>
                  <input className="text-input" type="number" value={single.layout.z} onChange={(e) => upd(single.id, { layout: { ...single.layout, z: Number(e.target.value) || 0 } })} />
                </div>
              </div>
            </>
          )}

          <div className="studio-row">
            <Button variant="secondary" className="btn-sm" onClick={() => useEditorStore.getState().duplicateSelected()}>Duplicate</Button>
            <Button variant="ghost" className="btn-sm" onClick={() => useEditorStore.getState().bringToFront(single.id)}>Front</Button>
            <Button variant="ghost" className="btn-sm" onClick={() => useEditorStore.getState().sendToBack(single.id)}>Back</Button>
            <Button variant="danger" className="btn-sm" onClick={() => useEditorStore.getState().deleteSelected()}>
              <IconTrash size={13} /> Delete
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
