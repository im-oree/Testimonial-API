import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { IAppRepository } from '@testimonial-api/domain';

/**
 * OriginConfigService — runtime-editable CORS whitelist per App
 * (README §9 "Runtime Config Engine"; enforced by OriginGuard).
 * PATCHing origins takes effect instantly — no redeploy.
 */
@Injectable()
export class OriginConfigService {
  constructor(
    @Inject(REPOSITORY_TOKENS.APP) private readonly apps: IAppRepository,
  ) {}

  async updateAllowedOrigins(appId: string, origins: string[]): Promise<void> {
    await this.apps.updateAllowedOrigins(appId, origins);
  }
}
