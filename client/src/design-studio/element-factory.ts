/**
 * DOC 7B §1.4 — Default element factory.
 * `createDefaultElement(type)` returns a fully populated StudioElement with
 * sane defaults so the canvas never has to guard against missing fields.
 */
import type { ElementType, StudioElement, StudioSchema } from './types';

let seq = 0;
export function newElementId(): string {
  seq += 1;
  return `el_${Date.now().toString(36)}_${seq}`;
}

const TYPE_DEFAULTS: Record<
  ElementType,
  { name: string; text: string | null; w: number; h: number; fontSize: number; fontWeight: number; color: string; bg: string | null; radius: number }
> = {
  heading: { name: 'Heading', text: 'Heading', w: 380, h: 42, fontSize: 26, fontWeight: 700, color: '#1b2559', bg: null, radius: 0 },
  text: { name: 'Text', text: 'Write something your customers will read.', w: 420, h: 120, fontSize: 16, fontWeight: 400, color: '#475569', bg: null, radius: 0 },
  image: { name: 'Image', text: null, w: 220, h: 160, fontSize: 12, fontWeight: 400, color: '#94a3b8', bg: null, radius: 12 },
  'rating-stars': { name: 'Rating stars', text: null, w: 132, h: 26, fontSize: 12, fontWeight: 400, color: '#f59e0b', bg: null, radius: 0 },
  button: { name: 'Button', text: 'Add a review', w: 220, h: 44, fontSize: 14, fontWeight: 600, color: '#ffffff', bg: '#0ea5a0', radius: 10 },
  container: { name: 'Card', text: null, w: 360, h: 240, fontSize: 12, fontWeight: 400, color: '#0f172a', bg: '#ffffff', radius: 16 },
  spacer: { name: 'Spacer', text: null, w: 600, h: 24, fontSize: 12, fontWeight: 400, color: '#94a3b8', bg: null, radius: 0 },
};

/** New element at a position (snap applied by caller if needed). */
export function createDefaultElement(type: ElementType, x: number, y: number, z: number): StudioElement {
  const d = TYPE_DEFAULTS[type];
  return {
    id: newElementId(),
    type,
    name: d.name,
    visible: true,
    layout: { x, y, width: d.w, height: d.h, z },
    style: { background: d.bg, radius: d.radius, opacity: 1 },
    typography:
      type === 'image' || type === 'spacer' || type === 'container'
        ? null
        : { fontSize: d.fontSize, fontWeight: d.fontWeight, color: d.color, align: type === 'button' ? 'center' : type === 'heading' ? 'left' : 'left' },
    text: d.text,
    imageUrl: null,
    // Rating stars always render the record's rating — bind them up front so
    // a freshly added stars block already fills live instead of sitting empty.
    binding: type === 'rating-stars' ? { bindingKey: 'review_rating', property: 'rating' } : null,
    animation: null,
  };
}

/** The starter draft shown in the studio until a product has its own schema. */
export function starterSchema(productName: string): StudioSchema {
  const el = (partial: Partial<StudioElement> & { type: ElementType }): StudioElement => ({
    ...createDefaultElement(partial.type, 0, 0, 0),
    ...partial,
  });
  return {
    name: `${productName} quote hero`,
    canvas: { width: 720, height: 560, background: '#f6f7fc' },
    version: 0,
    elements: [
      el({
        id: 'el_seed_heading',
        type: 'heading',
        name: 'Wall heading',
        text: 'Trusted by happy customers',
        layout: { x: 60, y: 44, width: 600, height: 40, z: 10 },
        typography: { fontSize: 26, fontWeight: 700, color: '#1b2559', align: 'center' },
      }),
      el({
        id: 'el_seed_heading_2',
        type: 'text',
        name: 'Intro line',
        text: 'Real reviews from real customers, shown on your own site.',
        layout: { x: 100, y: 88, width: 520, height: 26, z: 10 },
        typography: { fontSize: 14, fontWeight: 400, color: '#64748b', align: 'center' },
      }),
      el({
        id: 'el_seed_card',
        type: 'container',
        name: 'Quote card',
        layout: { x: 60, y: 140, width: 600, height: 320, z: 1 },
        style: { background: '#ffffff', radius: 18, opacity: 1 },
      }),
      el({
        id: 'el_seed_author',
        type: 'heading',
        name: 'Author (bound)',
        text: 'Ada Okafor',
        binding: { bindingKey: 'reviewer_name', property: 'text' },
        layout: { x: 100, y: 176, width: 420, height: 26, z: 10 },
        typography: { fontSize: 18, fontWeight: 700, color: '#1b2559', align: 'left' },
      }),
      el({
        id: 'el_seed_rating',
        type: 'rating-stars',
        name: 'Rating (bound)',
        binding: { bindingKey: 'review_rating', property: 'rating' },
        layout: { x: 100, y: 212, width: 132, height: 26, z: 10 },
      }),
      el({
        id: 'el_seed_quote',
        type: 'text',
        name: 'Review (bound)',
        text: 'The embed was live on our site before lunch and reviews started arriving the same day.',
        binding: { bindingKey: 'review_text', property: 'text' },
        layout: { x: 100, y: 252, width: 520, height: 120, z: 10 },
        typography: { fontSize: 16, fontWeight: 400, color: '#475569', align: 'left' },
      }),
      el({
        id: 'el_seed_cta',
        type: 'button',
        name: 'CTA',
        text: 'Add a review',
        layout: { x: 60, y: 486, width: 240, height: 46, z: 10 },
        typography: { fontSize: 15, fontWeight: 600, color: '#ffffff', align: 'center' },
        style: { background: '#0ea5a0', radius: 12, opacity: 1 },
      }),
    ],
  };
}

/** Deep-clone helper used by the store for history snapshots. */
export function cloneSchema<T>(schema: T): T {
  return JSON.parse(JSON.stringify(schema)) as T;
}
