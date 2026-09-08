import { Inject, Injectable, Logger } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type {
  IWebhookDeliveryRepository,
  IWebhookEndpointRepository,
  WebhookDelivery,
} from '@testimonial-api/domain';

/**
 * WebhookDispatchService — outbound webhooks (README §17.3): event
 * fan-out to endpoints subscribed to the event; HMAC-SHA256 signature;
 * 5 retries with exponential backoff (1m, 5m, 30m, 2h, 12h); full
 * delivery log + manual resend. The retry worker lives in apps/worker.
 * Dispatch mechanics: Doc 2.
 */
@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger(WebhookDispatchService.name);

  constructor(
    @Inject(REPOSITORY_TOKENS.WEBHOOK_ENDPOINT) private readonly endpoints: IWebhookEndpointRepository,
    @Inject(REPOSITORY_TOKENS.WEBHOOK_DELIVERY) private readonly deliveries: IWebhookDeliveryRepository,
  ) {}

  /** Enqueue deliveries for every endpoint subscribed to `event` — worker picks them up. */
  async enqueue(event: string, appId: string, payload: unknown): Promise<WebhookDelivery[]> {
    const targets = await this.endpoints.findActiveByAppAndEvent(appId, event);
    const rows: WebhookDelivery[] = [];
    for (const endpoint of targets) {
      rows.push(
        await this.deliveries.create({
          webhookEndpointId: endpoint.id,
          event,
          payload,
          status: 'pending',
          attempt: 1,
          nextRetryAt: null,
        } as never),
      );
    }
    return rows;
  }
}
