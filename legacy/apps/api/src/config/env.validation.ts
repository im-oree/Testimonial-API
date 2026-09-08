import { Logger } from '@nestjs/common';

// ============================================================
// Env validation. Skeleton philosophy: everything has a safe
// default so `npm run dev` works with zero env; the pieces that
// need real config fail lazily on use with descriptive errors.
// Production hardening (fail-fast on missing required secrets)
// is a Doc 6 item.
//
// Deployment mode (2026-09-08): `APP_MODE` is the env-based
// PROD/LIVE toggle.
//   • APP_MODE=prod (default) — the current product environment.
//     Engine follows DATABASE_PROVIDER: `firebase` (prototype /
//     demo — NOT ever used for live traffic) or `postgres` once
//     the SQL backend is ready for production.
//   • APP_MODE=live — the real launch environment. PostgreSQL
//     ONLY, never Firebase. Requires DATABASE_PROVIDER=postgres
//     (auto-selected when unset) AND a reachable DATABASE_URL, or
//     boot fails fast.
// ============================================================

export type AppMode = 'prod' | 'live';

export interface EnvShape {
  APP_MODE: AppMode;
  DATABASE_PROVIDER: 'firebase' | 'postgres';
  NODE_ENV: 'development' | 'test' | 'staging' | 'production';
  PORT: number;
  DATABASE_URL?: string;
  FIRESTORE_EMULATOR_HOST?: string;
  GCLOUD_PROJECT?: string;
  REDIS_URL?: string;
  GCS_BUCKET_NAME?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  JWT_SECRET?: string;
}

export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvShape {
  const logger = new Logger('EnvValidation');
  const mode = (env.APP_MODE ?? 'prod') as AppMode;
  if (mode !== 'prod' && mode !== 'live') {
    throw new Error(`APP_MODE must be "prod" or "live" (got "${env.APP_MODE}")`);
  }
  let provider = env.DATABASE_PROVIDER ?? (mode === 'live' ? 'postgres' : 'firebase');
  if (provider !== 'firebase' && provider !== 'postgres') {
    throw new Error(`DATABASE_PROVIDER must be "firebase" or "postgres" (got "${provider}")`);
  }
  if (mode === 'live' && provider !== 'postgres') {
    // The one absolute rule: Firebase is NEVER used for live traffic.
    throw new Error(
      'APP_MODE=live only supports the PostgreSQL engine. Set DATABASE_PROVIDER=postgres (Firebase is never used for live).',
    );
  }
  const nodeEnv = (env.NODE_ENV ?? 'development') as EnvShape['NODE_ENV'];
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer 1..65535 (got "${env.PORT}")`);
  }
  if (provider === 'postgres' && !env.DATABASE_URL) {
    if (mode === 'live') {
      throw new Error('APP_MODE=live requires DATABASE_URL (PostgreSQL) to be set — failing fast.');
    }
    logger.warn('DATABASE_PROVIDER=postgres but DATABASE_URL is not set — Postgres calls will fail until it is.');
  }
  return {
    APP_MODE: mode,
    DATABASE_PROVIDER: provider,
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: env.DATABASE_URL,
    FIRESTORE_EMULATOR_HOST: env.FIRESTORE_EMULATOR_HOST,
    GCLOUD_PROJECT: env.GCLOUD_PROJECT,
    REDIS_URL: env.REDIS_URL,
    GCS_BUCKET_NAME: env.GCS_BUCKET_NAME,
    RESEND_API_KEY: env.RESEND_API_KEY,
    RESEND_FROM: env.RESEND_FROM,
    JWT_SECRET: env.JWT_SECRET,
  };
}
