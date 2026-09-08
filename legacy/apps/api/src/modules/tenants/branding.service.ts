import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { ITenantRepository, Tenant } from '@testimonial-api/domain';

/**
 * BrandingService — logo, brandColor, custom domain (README §22 Branding).
 * brandColor is injected as --brand-color CSS var by the dashboards (Doc 5).
 * DNS verification flow is Doc 2.
 */
@Injectable()
export class BrandingService {
  constructor(
    @Inject(REPOSITORY_TOKENS.TENANT) private readonly tenants: ITenantRepository,
  ) {}

  async updateBranding(tenantId: string, patch: Partial<Pick<Tenant, 'logoUrl' | 'brandColor' | 'customDomain'>>) {
    return this.tenants.update(tenantId, patch);
  }
}
