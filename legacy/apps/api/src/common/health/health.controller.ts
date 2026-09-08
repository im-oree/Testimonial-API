import { Controller, Get, Inject } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { IAppStatsRepository, ITestimonialRepository } from '@testimonial-api/domain';
import { RuntimeConfigService } from '../../config/runtime-config.service';

/** Operational liveness endpoint — GET /v1/health. */
@Controller('health')
export class HealthController {
  constructor(
    private readonly config: RuntimeConfigService,
    @Inject(REPOSITORY_TOKENS.TESTIMONIAL) private readonly _testimonials: ITestimonialRepository,
    @Inject(REPOSITORY_TOKENS.APP_STATS) private readonly _appStats: IAppStatsRepository,
  ) {}

  @Get()
  health(): { status: string; service: string; environment: string; databaseEngine: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'testimonial-api',
      environment: this.config.appMode,
      databaseEngine: this.config.databaseEngine,
      timestamp: new Date().toISOString(),
    };
  }
}
