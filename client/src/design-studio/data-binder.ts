/**
 * DOC 7B §7 — Data binding resolver.
 *
 * Elements may declare `binding = { bindingKey, property }` (e.g. the review
 * quote card binds a text element to the review's `content`, the stars bind to
 * `rating`). `resolveFor` returns the element copy with the bound value poured
 * into the declared property so preview and the public runtime render live
 * data without touching the editable schema itself.
 */
import type { StudioElement, StudioRecord } from './types';

/** Resolve one binding key against a review-shaped record. */
export function boundValue(bindingKey: string, record: StudioRecord | null | undefined): string | number | null {
  if (!record) return null;
  switch (bindingKey) {
    case 'content':
      return record.content ?? null;
    case 'authorName':
      return record.authorName ?? null;
    case 'rating':
      return typeof record.rating === 'number' ? record.rating : null;
    default:
      return null;
  }
}

/** Text shown for a text-ish element: bound value, else its literal text. */
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

/** Non-mutating resolve used by the preview runtime for one record. */
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
