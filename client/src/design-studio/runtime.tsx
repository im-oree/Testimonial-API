/**
 * DOC 7B §2 — Schema surface renderer.
 *
 * Renders a StudioSchema the same way the public wall will: DOM nodes
 * positioned/styled by the CSS converters (§2.3/§2.4), text resolved through
 * the data binder (§7). The canvas editor and the preview toggle share this
 * component, so editing and rendering can never drift apart.
 */
import { type ReactNode } from 'react';
import { IconStar } from '../components/icons';
import { elementToCSS } from './css';
import { displayRating, displayText, resolveFor } from './data-binder';
import { animationCssFor } from './animation-presets';
import type { StudioElement, StudioRecord, StudioSchema } from './types';

interface Props {
  schema: StudioSchema;
  record?: StudioRecord | null;
  /** Apply entrance animations declared on elements (preview/public render). */
  animate?: boolean;
}

function Star({ on }: { on: boolean }) {
  return (
    <span className="studio-star" style={{ color: on ? '#f59e0b' : '#dbe1ec' }} aria-hidden>
      <IconStar size={18} />
    </span>
  );
}

function ElementView({ el, record, animate }: { el: StudioElement; record?: StudioRecord | null; animate: boolean }) {
  const resolved = resolveFor(el, record);
  const css = elementToCSS(resolved);
  const animCss = animate && resolved.animation ? animationCssFor(resolved.id, resolved.animation) : '';

  let inner: ReactNode = null;
  switch (el.type) {
    case 'heading':
    case 'text':
    case 'button':
      inner = <span style={el.type === 'text' ? { whiteSpace: 'pre-wrap' } : undefined}>{displayText(resolved, record)}</span>;
      break;
    case 'image':
      inner = el.imageUrl ? (
        <img
          src={el.imageUrl}
          alt={el.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: el.style.radius || 0 }}
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      ) : (
        <span className="studio-el-empty" style={{ opacity: 0.6 }}>Image</span>
      );
      break;
    case 'rating-stars': {
      const value = record ? displayRating(el, record) : 0;
      inner = (
        <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', height: '100%' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} on={n <= value} />
          ))}
        </span>
      );
      break;
    }
    case 'container':
      inner = null;
      break;
    case 'spacer':
      inner = null;
      break;
  }

  return (
    <div style={css} className={`studio-el ${el.type === 'button' ? 'studio-el-button' : ''}`} data-element-id={el.id}>
      {animCss && <style>{animCss}</style>}
      {inner}
    </div>
  );
}

/**
 * Full schema render. `interactive` is false when used as the public-style
 * preview so nothing intercepts clicks; the studio canvas supplies its own
 * edit overlays around each element instead of using this wrapper.
 */
export function SchemaSurface({ schema, record = null, animate = false }: Props) {
  const sorted = [...schema.elements].filter((e) => e.visible).sort((a, b) => a.layout.z - b.layout.z);
  return (
    <div
      className="studio-surface"
      style={{
        width: schema.canvas.width,
        height: schema.canvas.height,
        background: schema.canvas.background,
        position: 'relative',
        overflow: 'hidden',
        flex: 'none',
      }}
      data-testid="studio-surface"
    >
      {sorted.map((el) => (
        <ElementView key={el.id} el={el} record={animate ? record : undefined} animate={animate} />
      ))}
    </div>
  );
}
