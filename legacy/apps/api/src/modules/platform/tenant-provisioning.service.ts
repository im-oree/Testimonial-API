import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS, type IAppRepository, type IAppStatsRepository } from '@testimonial-api/domain';
import { TenantService } from '../tenants/tenant.service';

/**
 * TenantProvisioningService — platform-side onboarding (README §26.1):
 * platform admin creates a tenant + owner invite (email), tenant becomes
 * active when the owner completes setup.
 */
@Injectable()
export class TenantProvisioningService {
  constructor(
    private readonly tenants: TenantService,
    @Inject(REPOSITORY_TOKENS.APP) private readonly apps: IAppRepository,
    @Inject(REPOSITORY_TOKENS.APP_STATS) private readonly appStats: IAppStatsRepository,
  ) {
    void this.apps;
    void this.appStats;
  }
}
