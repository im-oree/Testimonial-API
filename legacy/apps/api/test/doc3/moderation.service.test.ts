import { describe, expect, it, beforeEach } from 'vitest';
import {
  InvalidTransitionError,
  NotFoundError,
  DuplicateError,
  type Testimonial,
} from '@testimonial-api/domain';
import { ModerationService } from '../../src/modules/testimonials/moderation.service';
import { TestimonialService } from '../../src/modules/testimonials/testimonial.service';
import { FakeTestimonialRepo, fakeAudit, makeTestimonial } from './lifecycle-fakes';

/**
 * Doc 3 §E lifecycle via the real services (no DB — in-memory repo):
 * create → pending → approve/reject/archive → public gating; archived →
 * approved direct = 422; bulk approve = per-row succeed/fail; duplicate
 * create = 409 DUPLICATE + existing id.
 */
let repo: FakeTestimonialRepo;
let moderation: ModerationService;
const reviewer = { id: 'staff-1', label: 'Zainab (reviewer)' };

beforeEach(() => {
  repo = new FakeTestimonialRepo();
  moderation = new ModerationService(repo, fakeAudit() as never);
});

describe('ModerationService full lifecycle', () => {
  it('approves a pending testimonial (audit + reviewed fields)', async () => {
    const t = makeTestimonial({ id: 't1', status: 'pending' });
    repo.seed(t);
    const updated = await moderation.approve('t1', reviewer);
    expect(updated.status).toBe('approved');
    expect(updated.reviewedBy).toBe('staff-1');
    expect(updated.reviewedAt).toBeInstanceOf(Date);
  });

  it('rejects a pending testimonial with a reason', async () => {
    const t = makeTestimonial({ id: 't2', status: 'pending' });
    repo.seed(t);
    const updated = await moderation.reject('t2', reviewer, 'offensive language');
    expect(updated.status).toBe('rejected');
    expect(updated.rejectionReason).toBe('offensive language');
  });

  it('approved → archived → pending (reopen) → approved works end-to-end', async () => {
    const t = makeTestimonial({ id: 't3', status: 'approved' });
    repo.seed(t);
    await moderation.archive('t3', reviewer);
    expect(repo.rows[0].status).toBe('archived');
    await moderation.reopen('t3', reviewer);
    expect(repo.rows[0].status).toBe('pending');
    const reapproved = await moderation.approve('t3', reviewer);
    expect(reapproved.status).toBe('approved');
  });

  it('archived → approved directly returns 422 INVALID_TRANSITION', async () => {
    const t = makeTestimonial({ id: 't4', status: 'archived' });
    repo.seed(t);
    const err = await moderation.approve('t4', reviewer).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(InvalidTransitionError);
    const domainErr = err as InvalidTransitionError;
    expect(domainErr.code).toBe('INVALID_TRANSITION');
    expect(domainErr.httpStatus).toBe(422);
    expect((domainErr.details as { from: string }).from).toBe('archived');
  });

  it('missing testimonial → 404 NOT_FOUND', async () => {
    await expect(moderation.approve('nope', reviewer)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ModerationService.bulk approve — per-row results', () => {
  it('succeeds 8 / fails 2 (archived) with specific reasons — not a blanket failure', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      const id = `ok-${i}`;
      ids.push(id);
      repo.seed(makeTestimonial({ id, status: 'pending' }));
    }
    repo.seed(makeTestimonial({ id: 'arch-1', status: 'archived' }));
    repo.seed(makeTestimonial({ id: 'arch-2', status: 'archived' }));
    const idsWithArchived = [...ids, 'arch-1', 'arch-2'];

    const result = await moderation.bulk('approve', idsWithArchived, reviewer);

    expect(result.succeeded).toHaveLength(8);
    expect(result.failed).toHaveLength(2);
    expect(result.failed.map((f) => f.id).sort()).toEqual(['arch-1', 'arch-2']);
    for (const f of result.failed) {
      expect(f.code).toBe('INVALID_TRANSITION');
      expect(f.reason).toMatch(/archived/);
    }
    // every successful row really is approved now
    for (const id of ids) {
      expect(repo.rows.find((r) => r.id === id)?.status).toBe('approved');
    }
    expect(repo.rows.find((r) => r.id === 'arch-1')?.status).toBe('archived');
  });
});

describe('TestimonialService duplicate fingerprint', () => {
  it('returns 409 DUPLICATE with the existing testimonial id in details', async () => {
    const existing = makeTestimonial({ id: 't-orig', fingerprint: 'fp-abc', appId: 'app-1' });
    repo.seed(existing);
    const audit = fakeAudit();
    const service = new TestimonialService(repo, audit as never);

    const err = await service
      .create('app-1', { appId: 'app-1', fingerprint: 'fp-abc', message: 'same', authorName: 'Ada' } as never)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DuplicateError);
    const dup = err as DuplicateError;
    expect(dup.code).toBe('DUPLICATE');
    expect(dup.httpStatus).toBe(409);
    expect((dup.details as { existingId: string }).existingId).toBe('t-orig');
    // no new row was inserted
    expect(repo.rows).toHaveLength(1);
  });
});
