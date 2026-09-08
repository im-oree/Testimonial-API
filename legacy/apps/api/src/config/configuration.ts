import type { AppMode, EnvShape } from './env.validation';

/** Typed view of the runtime environment assembled at bootstrap. */
export interface AppConfiguration {
  env: EnvShape;
  /** Deployment tier: 'prod' (current product env) | 'live' (launch — Postgres only). */
  appMode: AppMode;
  isProduction: boolean;
  isTest: boolean;
  databaseEngine: 'firebase' | 'postgres';
  api: { port: number; prefix: string };
  security: { jwtSecret?: string };
}

export function loadConfiguration(env: EnvShape): AppConfiguration {
  return {
    env,
    appMode: env.APP_MODE,
    isProduction: env.NODE_ENV === 'production' || env.NODE_ENV === 'staging',
    isTest: env.NODE_ENV === 'test',
    databaseEngine: env.DATABASE_PROVIDER,
    api: { port: env.PORT, prefix: 'v1' },
    security: { jwtSecret: env.JWT_SECRET },
  };
}
