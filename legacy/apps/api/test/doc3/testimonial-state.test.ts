import { describe, expect, it } from 'vitest';
import {
  canTransition,
  NON_PUBLIC_STATUSES,
  PUBLIC_VISIBLE_STATUSES,
  TESTIMONIAL_TRANSITIONS,
  transitionNote,
} from '@testimonial-api/domain';

/**
 * Doc 3 §E state machine — pure rules pinned by tests:
 *  • create→pending; approve/reject/archive from pending
 *  • approved→archived; archived→pending (reopen)
 *  • archived→approved DIRECT is INVALID (must go through pending)
 *  • only 'approved' is ever public
 */
describe('Testimonial state machine (domain)', () => {
  it('pending can be approved, rejected or archived', () => {
    expect(canTransition('pending', 'approved')).toBe(true);
    expect(canTransition('pending', 'rejected')).toBe(true);
    expect(canTransition('pending', 'archived')).toBe(true);
  });

  it('approved can only be archived', () => {
    expect(TESTIMONIAL_TRANSITIONS.approved).toEqual(['archived']);
    expect(canTransition('approved', 'approved')).toBe(false);
    expect(canTransition('approved', 'rejected')).toBe(false);
  });

  it('archived can only reopen to pending — direct approved is invalid', () => {
    expect(canTransition('archived', 'pending')).toBe(true);
    expect(canTransition('archived', 'approved')).toBe(false);
    expect(canTransition('archived', 'rejected')).toBe(false);
    expect(transitionNote('archived', 'approved')).toContain('reopened');
  });

  it('rejected can reopen to pending (or be archived) but never jump straight to approved', () => {
    expect(canTransition('rejected', 'pending')).toBe(true);
    expect(canTransition('rejected', 'archived')).toBe(true);
    expect(canTransition('rejected', 'approved')).toBe(false);
  });

  it('only approved is public — pending/rejected/archived never leak', () => {
    expect(PUBLIC_VISIBLE_STATUSES).toEqual(['approved']);
    expect(NON_PUBLIC_STATUSES).toEqual(['pending', 'rejected', 'archived']);
    for (const s of NON_PUBLIC_STATUSES) expect(PUBLIC_VISIBLE_STATUSES).not.toContain(s);
  });

  it('full reopen cycle works: approved → archived → pending → approved', () => {
    expect(canTransition('approved', 'archived')).toBe(true);
    expect(canTransition('archived', 'pending')).toBe(true);
    expect(canTransition('pending', 'approved')).toBe(true);
  });
});
