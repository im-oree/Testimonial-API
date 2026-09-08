import type { ApiKey, CreateApiKey } from '../entities/api-key.entity';

export interface IApiKeyRepository {
  findByHash(hash: string): Promise<ApiKey | null>;
  findByPublicValue(value: string): Promise<ApiKey | null>;
  findByApp(appId: string): Promise<ApiKey[]>;
  findActiveSecret(appId: string, environment: 'live' | 'test'): Promise<ApiKey | null>;
  create(data: CreateApiKey): Promise<ApiKey>;
  revoke(id: string): Promise<void>;
  /** Bump lastUsedAt on every authenticated request (throttled by caller). */
  touchLastUsed(id: string): Promise<void>;
}
