import { Inject, Injectable, Logger } from '@nestjs/common';
import { InvalidTransitionError, NotFoundError, REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type {
  ITestimonialRepository,
  Testimonial,
  TestimonialStatus,
} from '@testimonial-api/domain';
import { actionForStatus, canTransition, transitionNote } from '@testimonial-api/domain';
import { AuditService } from '../audit/audit.service';

/**
 * ModerationService — approve/reject/archive/reopen transitions (README §15,
 * Doc 3 §E). Enforces the state machine from domain/testimonial-state:
 *
 *   pending ↔ (approve|reject|archive) · archived → pending (reopen only)
 *   archived → approved DIRECT is invalid (422 INVALID_TRANSITION) — a
 *   testimonial must be reopened to pending first and re-approved.
 *
 * Every transition is audit-logged. Bulk actions return per-row results
 * (succeeded/failed with specific reasons) — never a blanket failure
 * (Doc 3 §E).
 */
export type BulkAction = 'approve' | 'reject' | 'archive' | 'reopen';

export interface BulkActionResult {
  action: BulkAction;
  succeeded: string[];
  failed: Array<{ id: string; code: string; reason: string }>;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @Inject(REPOSITORY_TOKENS.TESTIMONIAL) private readonly testimonials: ITestimonialRepository,
    private readonly audit: AuditService,
  ) {}

  async approve(id: string, reviewer: { id: string; label: string }): Promise<Testimonial> {
    return this.transition(id, 'approved', reviewer);
  }

  async reject(id: string, reviewer: { id: string; label: string }, rejectionReason?: string): Promise<Testimonial> {
    return this.transition(id, 'rejected', reviewer, { rejectionReason });
  }

  async archive(id: string, reviewer: { id: string; label: string }): Promise<Testimonial> {
    return this.transition(id, 'archived', reviewer);
  }

  /** archived → pending (re-enter moderation) — the ONLY way back into the queue. */
  async reopen(id: string, reviewer: { id: string; label: string }): Promise<Testimonial> {
    return this.transition(id, 'pending', reviewer);
  }

  /**
   * Enforce one legal transition. Rejects with 422 INVALID_TRANSITION
   * (from/to in details) when the state machine forbids it, 404 when missing.
   */
  async transition(
    id: string,
    to: TestimonialStatus,
    reviewer: { id: string; label: string },
    opts: { rejectionReason?: string } = {},
  ): Promise<Testimonial> {
    const current = await this.testimonials.findById(id);
    if (!current) throw new NotFoundError('Testimonial', id);
    if (!canTransition(current.status, to)) {
      throw new InvalidTransitionError('testimonial', current.status, to, transitionNote(current.status, to));
    }
    const updated = await this.testimonials.update(id, {
      status: to,
      reviewedBy: reviewer.id,
      reviewedAt: new Date(),
      rejectionReason: to === 'rejected' ? (opts.rejectionReason ?? current.rejectionReason ?? null) : null,
    });
    await this.audit.record({
      actorId: reviewer.id,
      actorType: 'tenant_staff',
      actorLabel: reviewer.label,
      action: `testimonial.${actionForStatus(to)}`,
      targetType: 'testimonial',
      targetId: id,
      metadata: {
        from: current.status,
        to,
        ...(to === 'rejected' && opts.rejectionReason ? { rejectionReason: opts.rejectionReason } : {}),
      },
    });
    this.logger.debug(`testimonial ${id}: ${current.status} → ${to} by ${reviewer.id}`);
    return updated;
  }

  /**
   * Bulk action with per-row results (Doc 3 §E): each id is validated
   * independently so one invalid row never fails the batch. Archived rows
   * that cannot be approved directly appear under `failed` with reason
   * "already archived — reopen to pending first".
   */
  async bulk(action: BulkAction, ids: string[], reviewer: { id: string; label: string }): Promise<BulkActionResult> {
    const targetStatus: TestimonialStatus =
      action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'archive' ? 'archived' : 'pending';

    const succeeded: string[] = [];
    const failed: Array<{ id: string; code: string; reason: string }> = [];
    for (const id of ids) {
      try {
        await this.transition(id, targetStatus, reviewer);
        succeeded.push(id);
      } catch (err) {
        const e = err as { code?: string; message?: string };
        const code = e.code ?? 'UNKNOWN';
        failed.push({ id, code, reason: e.message ?? 'transition failed' });
      }
    }
    return { action, succeeded, failed };
  }
}
