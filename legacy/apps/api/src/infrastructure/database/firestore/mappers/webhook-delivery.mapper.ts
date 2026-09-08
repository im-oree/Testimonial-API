import type { WebhookDelivery } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'webhookEndpointId', kind: 'string' },
  { key: 'event', kind: 'string' },
  { key: 'payload', kind: 'jsonRaw' },
  { key: 'responseStatus', kind: 'numberOrNull' },
  { key: 'attempt', kind: 'number' },
  { key: 'status', kind: 'string' },
  { key: 'nextRetryAt', kind: 'dateOrNull' },
  { key: 'createdAt', kind: 'date' },
];

export const WebhookDeliveryFirestoreMapper = createFirestoreMapper<WebhookDelivery>(FIELDS);
