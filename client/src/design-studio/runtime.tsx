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
import { elementToCSS, radiusOf } from './css';
import { displayRating, displayText, resolveFor } from './data-binder';
import { animationCssFor } from './animation-presets';
import type { StudioElement, StudioRecord, StudioSchema } from './types';

interface Props {
  schema: StudioSchema;
  record?: StudioRecord | null;
  /** Apply entrance animations declared on elements (preview/public render). */
  animate?: boolean;
  /**
   * When set, button elements act as links to this href (used by the live
   * embed so a template's CTA opens the public review form in a new tab).
   */
  ctaHref?: string | null;
}

function Star({ on, size }: { on: boolean; size: number }) {
  return (
    <span className="studio-star" style={{ color: on ? '#f59e0b' : '#dbe1ec', fontSize: size }} aria-hidden>
      <IconStar />
    </span>
  );
}

function ElementView({ el, record, animate, ctaHref }: { el: StudioElement; record?: StudioRecord | null; animate: boolean; ctaHref?: string | null }) {
  const resolved = resolveFor(el, record);
  const css = elementToCSS(resolved);
  const animCss = animate && resolved.animation ? animationCssFor(resolved.id, resolved.animation) : '';
  const isCta = el.type === 'button' && Boolean(ctaHref);

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
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: radiusOf(el.style) }}
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      ) : (
        <span className="studio-el-empty" style={{ opacity: 0.6 }}>Image</span>
      );
      break;
    case 'rating-stars': {
      const value = record ? displayRating(el, record) : 0;
      // Stars scale with the element: its height drives the glyph size so a
      // taller rating block produces bigger stars instead of whitespace.
      const starSize = Math.max(11, Math.min(46, Math.round((el.layout.height - 4) * 0.72)));
      inner = (
        <span style={{ display: 'inline-flex', gap: Math.max(2, Math.round(starSize * 0.16)), alignItems: 'center', height: '100%' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} on={n <= value} size={starSize} />
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
    <div
      style={css}
      className={`studio-el ${el.type === 'button' ? 'studio-el-button' : ''}`}
      data-element-id={el.id}
      {...(isCta
        ? {
            role: 'link',
            tabIndex: 0,
            onClick: () => window.open(ctaHref as string, '_blank', 'noopener'),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') window.open(ctaHref as string, '_blank', 'noopener');
            },
          }
        : {})}
    >
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
export function SchemaSurface({ schema, record = null, animate = false, ctaHref = null }: Props) {
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
        <ElementView key={el.id} el={el} record={animate ? record : undefined} animate={animate} ctaHref={ctaHref} />
      ))}
    </div>
  );
}
