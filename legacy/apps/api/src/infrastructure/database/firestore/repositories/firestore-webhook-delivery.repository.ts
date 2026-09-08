import { Injectable } from '@nestjs/common';
import type {
  CreateWebhookDelivery,
  IWebhookDeliveryRepository,
  PaginatedResult,
  PaginationParams,
  WebhookDelivery,
} from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { WebhookDeliveryFirestoreMapper } from '../mappers/webhook-delivery.mapper';

@Injectable()
export class FirestoreWebhookDeliveryRepository
  extends FirestoreBaseRepository<WebhookDelivery>
  implements IWebhookDeliveryRepository
{
  protected readonly collectionName = 'webhookDeliveries';
  protected readonly mapper = WebhookDeliveryFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  async findByEndpoint(
    endpointId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<WebhookDelivery>> {
    const all = await this.fetchAll('webhookEndpointId', endpointId);
    return this.pageInMemory(all, pagination);
  }

  async findDueForRetry(limit: number, now: Date = new Date()): Promise<WebhookDelivery[]> {
    const snap = await this.col()
      .where('status', 'in', ['pending', 'retrying'])
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => this.mapper.toDomain({ id: d.id, data: d.data() }))
      .filter((d) => (d.nextRetryAt ? d.nextRetryAt <= now : true));
  }

  override create(data: CreateWebhookDelivery): Promise<WebhookDelivery> {
    return super.create(data as Partial<WebhookDelivery>);
  }
}
