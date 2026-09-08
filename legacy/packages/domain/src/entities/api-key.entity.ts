// Split into its own entity/table (not embedded in App) so we retain
// full rotation HISTORY — critical for security audit trails.

export type ApiKeyType = 'public' | 'secret';
export type ApiKeyEnvironment = 'live' | 'test';
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export interface ApiKey {
  id: string;
  appId: string;
  type: ApiKeyType;
  environment: ApiKeyEnvironment;
  /** First 12 chars, shown in UI for identification. */
  keyPrefix: string;
  /** Argon2 hash; null for public keys. */
  keyHash: string | null;
  /** Only populated for type='public' (stored plain — public by design). Secret plaintext NEVER persisted. */
  plainValue: string | null;
  status: ApiKeyStatus;
  /** Incremented on every rotation. */
  version: number;
  createdAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}

export type CreateApiKey = Omit<ApiKey, 'id' | 'createdAt' | 'revokedAt' | 'lastUsedAt' | 'version'>;
