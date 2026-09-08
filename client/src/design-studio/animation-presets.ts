/**
 * DOC 7B §6 — Animation engine (demo slice).
 *
 * Preset entrance animations expressed as keyframes, plus a CSS generator that
 * emits `@keyframes` + the per-element animation shorthand. `shimmer`, `glow`,
 * `orbit`, `marquee-scroll`, `stagger-children` and `typewriter` are handled
 * inside their dedicated renderers (or JS-driven) in the full engine; the
 * animation panel milestone wires this generator onto the canvas.
 */
export interface KeyframeDecl {
  offset: number;
  opacity?: number;
  translateX?: number;
  translateY?: number;
  scale?: number;
}

export interface ElementAnimation {
  type: string;
  durationMs: number;
  delayMs: number;
}

export const ANIMATION_PRESETS: Record<string, KeyframeDecl[]> = {
  'fade-in': [
    { offset: 0, opacity: 0 },
    { offset: 1, opacity: 1 },
  ],
  'fade-in-up': [
    { offset: 0, opacity: 0, translateY: 20 },
    { offset: 1, opacity: 1, translateY: 0 },
  ],
  'fade-in-down': [
    { offset: 0, opacity: 0, translateY: -20 },
    { offset: 1, opacity: 1, translateY: 0 },
  ],
  'slide-in-left': [
    { offset: 0, opacity: 0, translateX: -60 },
    { offset: 1, opacity: 1, translateX: 0 },
  ],
  'slide-in-right': [
    { offset: 0, opacity: 0, translateX: 60 },
    { offset: 1, opacity: 1, translateX: 0 },
  ],
  'scale-in': [
    { offset: 0, opacity: 0, scale: 0.85 },
    { offset: 1, opacity: 1, scale: 1 },
  ],
  float: [
    { offset: 0, translateY: 0 },
    { offset: 0.5, translateY: -8 },
    { offset: 1, translateY: 0 },
  ],
  pulse: [
    { offset: 0, scale: 1 },
    { offset: 0.5, scale: 1.04 },
    { offset: 1, scale: 1 },
  ],
};

export function animationKeyframes(type: string, id: string): string {
  const frames = ANIMATION_PRESETS[type];
  if (!frames) return '';
  const body = frames
    .map((f) => {
      const parts: string[] = [];
      if (typeof f.opacity === 'number') parts.push(`opacity: ${f.opacity}`);
      const tr: string[] = [];
      if (f.translateX) tr.push(`translateX(${f.translateX}px)`);
      if (f.translateY) tr.push(`translateY(${f.translateY}px)`);
      if (f.scale) tr.push(`scale(${f.scale})`);
      if (tr.length) parts.push(`transform: ${tr.join(' ')}`);
      return `${Math.round(f.offset * 100)}% { ${parts.join('; ')} }`;
    })
    .join('\n');
  return `@keyframes anim-${id} {\n${body}\n}`;
}

/** Full CSS block for one element (keyframes + animation shorthand). */
export function animationCssFor(elementId: string, anim: ElementAnimation): string {
  const keyframes = animationKeyframes(anim.type, elementId);
  if (!keyframes) return '';
  return `${keyframes}\n.anim-${elementId} {\n  animation: anim-${elementId} ${anim.durationMs}ms linear ${anim.delayMs}ms 1 both;\n}`;
}
