import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { ITenantRepository } from '@testimonial-api/domain';

/**
 * PlatformAnalyticsService — Recharts-ready platform aggregates (README §21
 * Overview): tenant growth, MRR, testimonial volume across platform.
 * BigQuery export is a Doc 4 roadmap item; v1 queries repos directly.
 */
@Injectable()
export class PlatformAnalyticsService {
  constructor(
    @Inject(REPOSITORY_TOKENS.TENANT) private readonly tenants: ITenantRepository,
  ) {
    void this.tenants;
  }
}
