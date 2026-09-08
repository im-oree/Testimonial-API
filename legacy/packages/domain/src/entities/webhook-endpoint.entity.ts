export type WebhookStatus = 'active' | 'disabled';

export interface WebhookEndpoint {
  id: string;
  appId: string;
  url: string;
  /** HMAC signing secret — stored encrypted at rest, never returned by APIs. */
  secret: string;
  /** e.g. ['testimonial.created', 'testimonial.approved', ...] (README §17.3). */
  events: string[];
  status: WebhookStatus;
  failureCount: number;
  createdAt: Date;
}

export type CreateWebhookEndpoint = Omit<WebhookEndpoint, 'id' | 'createdAt' | 'failureCount'>;
