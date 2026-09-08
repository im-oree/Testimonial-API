import { Injectable } from '@nestjs/common';
import type {
  CreateIntegration,
  IIntegrationRepository,
  Integration,
  IntegrationProvider,
  PaginatedResult,
  PaginationParams,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { IntegrationFirestoreMapper } from '../mappers/integration.mapper';

@Injectable()
export class FirestoreIntegrationRepository
  extends FirestoreBaseRepository<Integration>
  implements IIntegrationRepository
{
  protected readonly collectionName = 'integrations';
  protected readonly mapper = IntegrationFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(_e: Partial<Integration>): Partial<Integration> {
    return { status: 'connected', config: {} };
  }

  async findByAppAndProvider(appId: string, provider: IntegrationProvider): Promise<Integration | null> {
    const all = await this.fetchAll('appId', appId);
    return all.find((i) => i.provider === provider) ?? null;
  }

  async findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<Integration>> {
    const all = await this.fetchAll('appId', appId);
    return this.pageInMemory(all, pagination);
  }

  override create(data: CreateIntegration): Promise<Integration> {
    return super.create(data as Partial<Integration>);
  }

  async delete(appId: string, provider: IntegrationProvider): Promise<void> {
    const existing = await this.findByAppAndProvider(appId, provider);
    if (existing) {
      await this.col().doc(existing.id).delete();
    }
  }
}
