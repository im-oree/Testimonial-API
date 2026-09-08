import { Injectable, Logger } from '@nestjs/common';
import { loadConfiguration, type AppConfiguration } from './configuration';
import { validateEnv, type EnvShape } from './env.validation';
// Value import: Nest resolves constructor DI tokens from runtime metadata,
// so an injected class must be imported as a value (type-only → Function token).
import { CacheServiceImpl } from '../infrastructure/cache/cache.service';

/**
 * RuntimeConfigService — immutable view of validated env at boot plus a
 * runtime-overridable feature/flag surface (README §9 "Runtime Config
 * Engine": origins, rate limits, IP rules, feature flags live-editable
 * without redeploys). The distributed (Redis) propagation mechanics are a
 * Doc 2 deliverable; today the service exposes the typed configuration
 * object that modules consume.
 */
@Injectable()
export class RuntimeConfigService {
  private readonly logger = new Logger(RuntimeConfigService.name);
  private readonly config: AppConfiguration;
  private readonly env: EnvShape;

  constructor(private readonly cache: CacheServiceImpl) {
    this.env = validateEnv();
    this.config = loadConfiguration(this.env);
    this.logger.log(
      `RuntimeConfig loaded — APP_MODE=${this.env.APP_MODE.toUpperCase()} (${this.env.APP_MODE === 'live' ? 'PostgreSQL only, never Firebase' : `engine ${this.env.DATABASE_PROVIDER}`}) / NODE_ENV=${this.env.NODE_ENV}`,
    );
  }

  get snapshot(): AppConfiguration {
    return this.config;
  }

  get appMode(): 'prod' | 'live' {
    return this.config.appMode;
  }

  get databaseEngine(): 'firebase' | 'postgres' {
    return this.config.databaseEngine;
  }

  get isProduction(): boolean {
    return this.config.isProduction;
  }

  /** Overridable flags (defaults from env). Redis-backed propagation lands in Doc 2. */
  async getFlag(key: string): Promise<string | null> {
    return this.cache.get(`flag:${key}`);
  }
}
