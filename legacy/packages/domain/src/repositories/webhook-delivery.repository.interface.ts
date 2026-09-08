import type { CreateWebhookDelivery, WebhookDelivery } from '../entities/webhook-delivery.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface IWebhookDeliveryRepository {
  findById(id: string): Promise<WebhookDelivery | null>;
  findByEndpoint(endpointId: string, pagination: PaginationParams): Promise<PaginatedResult<WebhookDelivery>>;
  /** Deliveries whose next_retry_at <= now and status in (pending, retrying) — polled by worker. */
  findDueForRetry(limit: number, now?: Date): Promise<WebhookDelivery[]>;
  create(data: CreateWebhookDelivery): Promise<WebhookDelivery>;
  update(id: string, data: Partial<WebhookDelivery>): Promise<WebhookDelivery>;
}
