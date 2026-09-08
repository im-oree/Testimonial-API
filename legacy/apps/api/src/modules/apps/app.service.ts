import { Inject, Injectable } from '@nestjs/common';
import { generatePublicId, REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { App, CreateApp, IAppRepository } from '@testimonial-api/domain';

/**
 * AppService — Apps/Products under a tenant (README §2 hierarchy).
 * Runtime-managed security config (origins/IP/CAPTCHA) is the module's
 * differentiator; quotas are seeded from the tenant plan in Doc 2.
 */
@Injectable()
export class AppService {
  constructor(
    @Inject(REPOSITORY_TOKENS.APP) private readonly apps: IAppRepository,
  ) {}

  async findByTenant(tenantId: string): Promise<App[]> {
    return this.apps.findByTenant(tenantId);
  }

  async findById(id: string): Promise<App | null> {
    return this.apps.findById(id);
  }

  async findByPublicId(publicId: string): Promise<App | null> {
    return this.apps.findByPublicId(publicId);
  }

  async create(tenantId: string, input: CreateApp): Promise<App> {
    return this.apps.create({
      ...input,
      publicId: generatePublicId('app'),
    });
  }
}
