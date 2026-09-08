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
export type ElementType = 'heading' | 'text' | 'image' | 'rating-stars' | 'button' | 'container' | 'spacer';

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
  /** Corner radius in px (all four corners). */
  radius: number;
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
}

export interface StudioCanvas {
  width: number;
  height: number;
  background: string;
}

/** One versioned, editable design — the root object the store edits. */
export interface StudioSchema {
  name: string;
  canvas: StudioCanvas;
  version: number;
  elements: StudioElement[];
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
