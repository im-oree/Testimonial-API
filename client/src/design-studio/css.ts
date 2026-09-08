/**
 * DOC 7B §2.3/§2.4 — Layout, style and typography → CSS converters.
 * Pure functions: a StudioElement in, a React.CSSProperties object out.
 * The canvas element wrappers and the preview runtime share these so the
 * editor's "what you see" and the public render are produced by one code path.
 */
import type { CSSProperties } from 'react';
import type { StudioElement } from './types';

export function layoutToCSS(layout: StudioElement['layout']): CSSProperties {
  return {
    position: 'absolute',
    left: layout.x,
    top: layout.y,
    width: layout.width,
    height: layout.height,
    zIndex: layout.z,
  };
}

export function styleToCSS(style: StudioElement['style']): CSSProperties {
  const css: CSSProperties = {};
  if (style.background) css.backgroundColor = style.background;
  if (style.radius > 0) css.borderRadius = style.radius;
  if (style.opacity < 1) css.opacity = style.opacity;
  return css;
}

export function typographyToCSS(t: NonNullable<StudioElement['typography']>): CSSProperties {
  return {
    fontSize: t.fontSize,
    fontWeight: t.fontWeight,
    color: t.color,
    textAlign: t.align,
    lineHeight: 1.35,
    margin: 0,
  };
}

/** Everything about an element folded into one style object. */
export function elementToCSS(el: StudioElement): CSSProperties {
  return {
    ...layoutToCSS(el.layout),
    ...styleToCSS(el.style),
    ...(el.typography ? typographyToCSS(el.typography) : {}),
  };
}
