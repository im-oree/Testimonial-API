import type { WebhookEndpoint } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'appId', column: 'app_id', kind: 'string' },
  { domain: 'url', column: 'url', kind: 'string' },
  { domain: 'secret', column: 'secret', kind: 'string' },
  { domain: 'events', column: 'events', kind: 'stringArray' },
  { domain: 'status', column: 'status', kind: 'string' },
  { domain: 'failureCount', column: 'failure_count', kind: 'number' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
];

export const WebhookEndpointPgMappers = createPgMappers<WebhookEndpoint>(SPECS);
