import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { IAppRepository, ITenantRepository } from '@testimonial-api/domain';

/**
 * QuotaService — plan/app quota enforcement (README §25): read-write guard
 * (QUOTA_EXCEEDED at limit, soft warn at 80%), usage meter reset at billing
 * rollover. Enforcement engine (with rate-limit + Redis tokens) is Doc 2.
 */
@Injectable()
export class QuotaService {
  constructor(
    @Inject(REPOSITORY_TOKENS.TENANT) private readonly tenants: ITenantRepository,
    @Inject(REPOSITORY_TOKENS.APP) private readonly apps: IAppRepository,
  ) {
    void this.tenants;
    void this.apps;
  }
}
