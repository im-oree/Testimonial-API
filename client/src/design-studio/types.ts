/**
 * DOC 7B — Visual editor engine types (demo slice).
 *
 * These are the concrete, trimmed versions of the DOC 7B DesignElement types
 * that the current editor implements. Full 7A shapes add flex/grid layout,
 * per-side borders, filters, transforms and animation keyframes; each of those
 * will land as the visual editor milestone grows — the converters and store are
 * written so new fields extend the interfaces without breaking call sites.
 */

/** Element kinds the canvas + preview runtime can render today. */
export type ElementType = 'heading' | 'text' | 'image' | 'rating-stars' | 'button' | 'container' | 'spacer' | 'shader';

/** Built-in GLSL shader presets for `shader` elements (see ShaderElement). */
export type ShaderPreset = 'aurora' | 'plasma' | 'mesh' | 'stars';

export const SHADER_PRESETS: Array<{ id: ShaderPreset; label: string; hint: string }> = [
  { id: 'aurora', label: 'Aurora', hint: 'Soft flowing northern-lights waves' },
  { id: 'plasma', label: 'Plasma', hint: 'Liquid colour blobs blending' },
  { id: 'mesh', label: 'Mesh', hint: 'Slow gradient-mesh drift' },
  { id: 'stars', label: 'Starfield', hint: 'Drifting star specks' },
];

export type TextAlign = 'left' | 'center' | 'right';

export interface ElementLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Stacking order; higher renders on top. */
  z: number;
}

export interface ElementStyle {
  /** Hex/rgb/gradient string or null for transparent. */
  background: string | null;
  /** Corner radius in px — used for all four corners. */
  radius: number;
  /**
   * Per-corner radius overrides (top-left, top-right, bottom-right, bottom-left).
   * When any is set it wins over `radius` for that corner, so a card can be
   * square on top and fully rounded at the bottom. Undefined = linked.
   */
  radiusTL?: number;
  radiusTR?: number;
  radiusBR?: number;
  radiusBL?: number;
  /** 0..1 */
  opacity: number;
}

export interface Typography {
  fontSize: number;
  fontWeight: number;
  color: string;
  align: TextAlign;
}

/**
 * Data binding (DOC 7B §7): `bindingKey` is the id of the review field this
 * element renders (`reviewer_name`, `review_text`, `review_rating` — legacy
 * short names content/authorName/rating also resolve). The element never
 * carries its own copy; the record fills it in at preview/live time.
 * `property` says where the value lands.
 */
export type ReviewFieldKey = 'review_text' | 'reviewer_name' | 'review_rating' | 'content' | 'authorName' | 'rating';

export interface DataBinding {
  bindingKey: ReviewFieldKey;
  property: string;
}

export interface StudioElement {
  id: string;
  type: ElementType;
  name: string;
  visible: boolean;
  layout: ElementLayout;
  style: ElementStyle;
  typography: Typography | null;
  /** Literal text for heading/text/button (null when fully data-bound). */
  text: string | null;
  imageUrl: string | null;
  binding: DataBinding | null;
  /** Optional entrance animation; keyframes come from the preset engine. */
  animation: { type: string; durationMs: number; delayMs: number } | null;
  /** GLSL backdrop config (shader elements only). */
  shader: { preset: ShaderPreset; speed: number } | null;
}

export interface StudioCanvas {
  width: number;
  height: number;
  background: string;
}

/**
 * How the live widget presents MANY reviews inside its fixed frame. Set in the
 * studio (canvas properties) and consumed by the embed's TemplateWidget — this
 * is the answer to "what happens when more reviews come in".
 */
export interface WidgetBehavior {
  /**
   * cycle = one at a time cross-fade · carousel = swipeable slides ·
   * marquee = continuous stream · coverflow = 3D depth carousel with
   * mouse-parallax · tilt = single mouse-reactive 3D card ·
   * wheel = 3D rotating ring of cards · stack = swipe the top card away.
   */
  mode: 'cycle' | 'carousel' | 'marquee' | 'coverflow' | 'tilt' | 'wheel' | 'stack';
  /** Auto-advance (every mode except marquee). */
  autoPlay: boolean;
  /** Seconds each review stays on screen. */
  intervalSec: number;
  /** Pause the motion while a visitor hovers. */
  pauseOnHover: boolean;
  /** Marquee direction and speed (px per second). */
  direction: 'left' | 'right';
  speedPx: number;
  /** How many reviews the widget includes (0 = all). */
  maxRecords: number;
  /** Coverflow: card gap as a share of the card width (0.15–0.8). */
  spacing: number;
  /** Coverflow: z-depth each step is pushed back, px. */
  depth: number;
  /** Coverflow: maximum side rotation, degrees. */
  angle: number;
}

/** Sensible defaults for designs saved before behaviors existed. */
export const DEFAULT_BEHAVIOR: WidgetBehavior = {
  mode: 'cycle',
  autoPlay: true,
  intervalSec: 6,
  pauseOnHover: true,
  direction: 'left',
  speedPx: 60,
  maxRecords: 0,
  spacing: 0.42,
  depth: 190,
  angle: 48,
};

/** One versioned, editable design — the root object the store edits. */
export interface StudioSchema {
  name: string;
  canvas: StudioCanvas;
  version: number;
  elements: StudioElement[];
  /** Live multi-review behavior of the embedded widget. */
  behavior?: WidgetBehavior;
}

/** Review-shaped record the binder and preview resolve against. */
export interface StudioRecord {
  content: string;
  authorName: string;
  rating: number;
  createdAt?: string;
}

/** Server response for GET/PATCH /v1/dashboard/apps/:appId/design/schema. */
export interface StudioSaveResponse {
  schema: StudioSchema | null;
  studioVersion: number;
  updatedAt: string | null;
  designVersion: number;
}

export const CANVAS_SNAP = 8;
export const MIN_SIZE = 16;
