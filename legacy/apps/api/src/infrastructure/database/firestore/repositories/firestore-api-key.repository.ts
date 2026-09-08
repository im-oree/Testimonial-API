import { Injectable } from '@nestjs/common';
import type {
  ApiKey,
  ApiKeyEnvironment,
  CreateApiKey,
  IApiKeyRepository,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { ApiKeyFirestoreMapper } from '../mappers/api-key.mapper';

@Injectable()
export class FirestoreApiKeyRepository extends FirestoreBaseRepository<ApiKey> implements IApiKeyRepository {
  protected readonly collectionName = 'apiKeys';
  protected readonly mapper = ApiKeyFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(_e: Partial<ApiKey>): Partial<ApiKey> {
    return { status: 'active', version: 1 };
  }

  findByHash(hash: string): Promise<ApiKey | null> {
    return this.findByField('keyHash', hash);
  }

  findByPublicValue(value: string): Promise<ApiKey | null> {
    return this.findByField('plainValue', value);
  }

  async findByApp(appId: string): Promise<ApiKey[]> {
    const all = await this.fetchAll('appId', appId);
    return all.sort((a, b) => b.version - a.version);
  }

  async findActiveSecret(appId: string, environment: ApiKeyEnvironment): Promise<ApiKey | null> {
    const all = await this.fetchAll('appId', appId);
    return (
      all.find(
        (k) => k.type === 'secret' && k.environment === environment && k.status === 'active',
      ) ?? null
    );
  }

  override create(data: CreateApiKey): Promise<ApiKey> {
    return super.create(data as Partial<ApiKey>);
  }

  async revoke(id: string): Promise<void> {
    await this.col().doc(id).update({ status: 'revoked', revokedAt: new Date() });
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.col().doc(id).update({ lastUsedAt: new Date() });
  }
}
