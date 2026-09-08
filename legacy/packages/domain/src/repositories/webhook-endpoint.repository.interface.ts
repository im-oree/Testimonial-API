import type { CreateWebhookEndpoint, WebhookEndpoint } from '../entities/webhook-endpoint.entity';
import type { PaginatedResult, PaginationParams } from './common.types';

export interface IWebhookEndpointRepository {
  findById(id: string): Promise<WebhookEndpoint | null>;
  findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<WebhookEndpoint>>;
  findActiveByAppAndEvent(appId: string, event: string): Promise<WebhookEndpoint[]>;
  create(data: CreateWebhookEndpoint): Promise<WebhookEndpoint>;
  update(id: string, data: Partial<WebhookEndpoint>): Promise<WebhookEndpoint>;
  delete(id: string): Promise<void>;
  incrementFailureCount(id: string): Promise<void>;
  resetFailureCount(id: string): Promise<void>;
}
