import type { TestimonialStatus } from '../entities/testimonial.entity';

/**
 * TestimonialLifecycleState — the single source of truth for the Doc-3
 * §E state machine:
 *
 *   create → pending ──approve──▶ approved  (the only status the public
 *              │   │                │         API/widgets ever serve)
 *              │   └─reject──▶ rejected (kept for audit, never shown)
 *              │
 *              └─archive──▶ archived ──reopen──▶ pending (re-enter moderation)
 *
 *   approved/rejected/pending → archived  (hidden, retained)
 *   archived → approved (DIRECT)          ✗ INVALID — must reopen to pending
 *   approved → rejected / rejected → approved (direct cross) ✗ — go through
 *   pending/archive
 *
 * These rules are enforced by ModerationService (422 INVALID_TRANSITION with
 * from/to in details). Kept pure so unit tests pin them without a database.
 */

export type LifecycleAction = 'approve' | 'reject' | 'archive' | 'reopen';

export const TESTIMONIAL_TRANSITIONS: Record<TestimonialStatus, TestimonialStatus[]> = {
  pending: ['approved', 'rejected', 'archived'],
  approved: ['archived'],
  rejected: ['pending', 'archived'],
  archived: ['pending'], // reopen only — never direct to approved/rejected
};

export const STATUS_TO_ACTION: Record<Exclude<TestimonialStatus, 'pending'>, LifecycleAction> = {
  approved: 'approve',
  rejected: 'reject',
  archived: 'archive',
};

/** The action a human performs to land on a given status. */
export function actionForStatus(status: TestimonialStatus): LifecycleAction {
  if (status === 'pending') return 'reopen';
  return STATUS_TO_ACTION[status as Exclude<TestimonialStatus, 'pending'>];
}

export function canTransition(from: TestimonialStatus, to: TestimonialStatus): boolean {
  return TESTIMONIAL_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Why a transition is rejected (used in error `details.note`). */
export function transitionNote(from: TestimonialStatus, to: TestimonialStatus): string | undefined {
  if (from === 'archived' && to === 'approved') {
    return 'archived testimonials must be reopened (archived → pending) before they can be approved again';
  }
  if (from === to) return 'testimonial is already in this status';
  return undefined;
}

/**
 * Public-visibility rule: ONLY 'approved' is ever served by
 * /v1/public/testimonials, widgets and the SDKs — pending/rejected/archived
 * rows never leak (Doc 3 §E + README §31). Environments are additionally
 * filtered by the app key (`live` vs `test`), not by status.
 */
export const PUBLIC_VISIBLE_STATUSES: readonly TestimonialStatus[] = ['approved'];

/** Every status that is never allowed to appear in a public response. */
export const NON_PUBLIC_STATUSES: readonly TestimonialStatus[] = ['pending', 'rejected', 'archived'];

/** Force-approve in one step is allowed only for trusted sources (api) — form/social never. */
export const ONE_STEP_APPROVE_SOURCES: readonly string[] = ['api', 'manual'];
