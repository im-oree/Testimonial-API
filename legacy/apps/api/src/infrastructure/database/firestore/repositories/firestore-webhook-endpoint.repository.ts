import { Injectable } from '@nestjs/common';
import type {
  CreateWebhookEndpoint,
  IWebhookEndpointRepository,
  PaginatedResult,
  PaginationParams,
  WebhookEndpoint,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { WebhookEndpointFirestoreMapper } from '../mappers/webhook-endpoint.mapper';

@Injectable()
export class FirestoreWebhookEndpointRepository
  extends FirestoreBaseRepository<WebhookEndpoint>
  implements IWebhookEndpointRepository
{
  protected readonly collectionName = 'webhookEndpoints';
  protected readonly mapper = WebhookEndpointFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(_e: Partial<WebhookEndpoint>): Partial<WebhookEndpoint> {
    return { status: 'active', events: [], failureCount: 0 };
  }

  async findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<WebhookEndpoint>> {
    const all = await this.fetchAll('appId', appId);
    return this.pageInMemory(all, pagination);
  }

  async findActiveByAppAndEvent(appId: string, event: string): Promise<WebhookEndpoint[]> {
    const all = await this.fetchAll('appId', appId);
    return all.filter((w) => w.status === 'active' && w.events.includes(event));
  }

  override create(data: CreateWebhookEndpoint): Promise<WebhookEndpoint> {
    return super.create(data as Partial<WebhookEndpoint>);
  }

  delete(id: string): Promise<void> {
    return this.deleteHard(id);
  }

  async incrementFailureCount(id: string): Promise<void> {
    const snap = await this.col().doc(id).get();
    const current = Number((snap.data() ?? {}).failureCount ?? 0);
    await this.col().doc(id).update({ failureCount: current + 1 });
  }

  async resetFailureCount(id: string): Promise<void> {
    await this.col().doc(id).update({ failureCount: 0 });
  }
}
