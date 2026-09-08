import { Inject, Injectable } from '@nestjs/common';
import { DuplicateError, REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type {
  CreateTestimonial,
  ITestimonialRepository,
  Testimonial,
  TestimonialFilters,
} from '@testimonial-api/domain';
import { AuditService } from '../audit/audit.service';

/**
 * TestimonialService — testimonial lifecycle (README §15): create always
 * enters moderation (status=pending) unless an authorized reviewer approves
 * in one step; dedupe via fingerprint; every transition audit-logged.
 * Moderation engine internals: Doc 2.
 */
@Injectable()
export class TestimonialService {
  constructor(
    @Inject(REPOSITORY_TOKENS.TESTIMONIAL) private readonly testimonials: ITestimonialRepository,
    private readonly audit: AuditService,
  ) {}

  async findMany(appId: string, filters: TestimonialFilters, pagination: { page: number; pageSize: number }) {
    return this.testimonials.findMany({ ...filters, appId }, pagination);
  }

  async findById(id: string): Promise<Testimonial | null> {
    return this.testimonials.findById(id);
  }

  /** Create with dedupe. `fingerprint` is computed upstream (author+message hash). */
  async create(appId: string, input: CreateTestimonial & { fingerprint: string }): Promise<Testimonial> {
    const existing = await this.testimonials.findByFingerprint(appId, input.fingerprint);
    if (existing) {
      // Doc 3 §E: 409 DUPLICATE with the existing testimonial id in details.
      throw new DuplicateError(
        'A testimonial with the same author + message already exists for this app',
        existing.id,
        { appId },
      );
    }
    const created = await this.testimonials.create({ ...input, appId });
    await this.audit.record({
      actorId: input.authorEmail ?? null,
      actorType: 'system',
      action: 'testimonial.created',
      targetType: 'testimonial',
      targetId: created.id,
      tenantId: null, // resolved via app → tenant by caller when known
      metadata: { source: input.source, environment: input.environment },
    });
    return created;
  }
}
