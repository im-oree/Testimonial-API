/**
 * DOC 7B §7 — Data binding resolver.
 *
 * An element that shows review data does NOT carry copy of its own: it is
 * bound to a review field by its id (`reviewer_name`, `review_text`,
 * `review_rating`). While you edit, the element renders its placeholder text
 * so the layout stays readable; the moment the design goes live (and in the
 * editor's Preview mode), the template is filled with a real review record.
 *
 * `FIELD_DEFS` is the single catalogue of bindable review fields. Both the
 * canonical ids above and the legacy short names (content/authorName/rating)
 * are accepted so previously stored schemas keep resolving.
 */
import type { StudioElement, StudioRecord } from './types';

export interface ReviewFieldDef {
  id: string;
  label: string;
  /** Human sample shown in the editor when no record is loaded. */
  sample: string;
}

export const FIELD_DEFS: ReviewFieldDef[] = [
  { id: 'review_text', label: 'Review text', sample: '“The embed was live before lunch and reviews arrived the same day.”' },
  { id: 'reviewer_name', label: 'Reviewer name', sample: 'Ada Okafor' },
  { id: 'review_rating', label: 'Rating (stars)', sample: '5' },
];

export const LEGACY_TO_FIELD: Record<string, string> = {
  content: 'review_text',
  authorName: 'reviewer_name',
  rating: 'review_rating',
};

export function fieldDefOf(fieldOrKey: string | undefined | null): ReviewFieldDef {
  const id = LEGACY_TO_FIELD[fieldOrKey ?? ''] ?? fieldOrKey ?? '';
  return FIELD_DEFS.find((f) => f.id === id) ?? { id: id || 'review_text', label: id || 'Review text', sample: '' };
}

/** Resolve one field id against a review-shaped record. */
export function boundValue(bindingKey: string, record: StudioRecord | null | undefined): string | number | null {
  if (!record) return null;
  const key = LEGACY_TO_FIELD[bindingKey] ?? bindingKey;
  switch (key) {
    case 'review_text':
      return record.content ?? null;
    case 'reviewer_name':
      return record.authorName ?? null;
    case 'review_rating':
      return typeof record.rating === 'number' ? record.rating : null;
    default:
      return null;
  }
}

/** Text shown for a text-ish element: bound field value, else its literal copy. */
export function displayText(el: StudioElement, record: StudioRecord | null | undefined): string {
  if (el.binding && (el.type === 'heading' || el.type === 'text' || el.type === 'button')) {
    const v = boundValue(el.binding.bindingKey, record);
    if (v !== null) return String(v);
  }
  return el.text ?? '';
}

/** Stars value for rating elements: bound rating, else a neutral 0. */
export function displayRating(el: StudioElement, record: StudioRecord | null | undefined): number {
  if (el.binding) {
    const v = boundValue(el.binding.bindingKey, record);
    if (typeof v === 'number') return Math.max(0, Math.min(5, Math.round(v)));
  }
  return 0;
}

/** Which review field an element is bound to (canonical id), or null. */
export function boundFieldId(el: StudioElement): string | null {
  return el.binding ? (LEGACY_TO_FIELD[el.binding.bindingKey] ?? el.binding.bindingKey) : null;
}

/**
 * Non-mutating resolve used by the preview runtime for one record. When no
 * record is available (editing) bound text keeps its placeholder sample so
 * the canvas still reads like the finished wall.
 */
export function resolveFor(el: StudioElement, record: StudioRecord | null | undefined): StudioElement {
  if (!el.binding) return el;
  const next = { ...el, layout: { ...el.layout }, style: { ...el.style } };
  next.typography = el.typography ? { ...el.typography } : null;
  switch (el.type) {
    case 'heading':
    case 'text':
    case 'button':
      next.text = displayText(el, record);
      break;
    default:
      break;
  }
  return next;
}
