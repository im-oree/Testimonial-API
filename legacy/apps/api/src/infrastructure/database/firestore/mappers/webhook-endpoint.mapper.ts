import type { WebhookEndpoint } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'appId', kind: 'string' },
  { key: 'url', kind: 'string' },
  { key: 'secret', kind: 'string' },
  { key: 'events', kind: 'stringArray' },
  { key: 'status', kind: 'string' },
  { key: 'failureCount', kind: 'number' },
  { key: 'createdAt', kind: 'date' },
];

export const WebhookEndpointFirestoreMapper = createFirestoreMapper<WebhookEndpoint>(FIELDS);
