import { Global, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import {
  ALL_REPOSITORY_TOKENS,
  buildRepositoryProviders,
  engineClientProviders,
  getDatabaseEngine,
} from './provider.factory';

/**
 * DatabaseModule — the ONLY place that knows which storage engine is live.
 *
 * Services and controllers inject repository interfaces by token
 * ('ITestimonialRepository', ...) and never import an adapter class or a
 * storage driver (enforced by eslint-plugin-repo-boundaries).
 *
 * Only repository tokens are exported to the rest of the app — the engine
 * clients themselves are internal wiring (features never touch them).
 */
@Global()
@Module({
  providers: [...engineClientProviders(), ...buildRepositoryProviders()],
  exports: [...ALL_REPOSITORY_TOKENS],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor() {
    const mode = process.env.APP_MODE ?? 'prod';
    this.logger.log(
      `Database engine bound: ${getDatabaseEngine()} (APP_MODE=${mode.toUpperCase()}${mode === 'live' ? ' — live is PostgreSQL only' : ' — prod may set DATABASE_PROVIDER=postgres'})`,
    );
  }

  onApplicationShutdown(): void {
    // Concrete clients manage their own lifecycle ($disconnect etc.).
  }
}
