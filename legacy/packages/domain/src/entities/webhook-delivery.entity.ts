export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface WebhookDelivery {
  id: string;
  webhookEndpointId: string;
  event: string;
  payload: unknown;
  responseStatus: number | null;
  /** Stripe-style retry policy: 1m, 5m, 30m, 2h, 12h (README §17.3). */
  attempt: number;
  status: DeliveryStatus;
  nextRetryAt: Date | null;
  createdAt: Date;
}

export type CreateWebhookDelivery = Omit<WebhookDelivery, 'id' | 'createdAt' | 'attempt' | 'status'>;
