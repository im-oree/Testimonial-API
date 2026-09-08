import type { WebhookDelivery } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'webhookEndpointId', column: 'webhook_endpoint_id', kind: 'string' },
  { domain: 'event', column: 'event', kind: 'string' },
  { domain: 'payload', column: 'payload', kind: 'raw' },
  { domain: 'responseStatus', column: 'response_status', kind: 'numberOrNull' },
  { domain: 'attempt', column: 'attempt', kind: 'number' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'nextRetryAt', column: 'next_retry_at', kind: 'dateOrNull' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
];

export const WebhookDeliveryPgMappers = createPgMappers<WebhookDelivery>(SPECS);
