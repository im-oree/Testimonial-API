import type { Tenant } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'name', kind: 'string' },
  { key: 'slug', kind: 'string' },
  { key: 'logoUrl', kind: 'stringOrNull' },
  { key: 'brandColor', kind: 'string' },
  { key: 'customDomain', kind: 'stringOrNull' },
  { key: 'customDomainVerified', kind: 'boolean' },
  { key: 'plan', kind: 'string' },
  { key: 'status', kind: 'string' },
  { key: 'ownerEmail', kind: 'string' },
  { key: 'stripeCustomerId', kind: 'stringOrNull' },
  { key: 'currentPeriodEnd', kind: 'dateOrNull' },
  { key: 'testimonialsThisMonth', kind: 'number' },
  { key: 'appsCount', kind: 'number' },
  { key: 'staffCount', kind: 'number' },
  { key: 'deletedAt', kind: 'dateOrNull' },
  { key: 'createdAt', kind: 'date' },
  { key: 'updatedAt', kind: 'date' },
];

export const TenantFirestoreMapper = createFirestoreMapper<Tenant>(FIELDS);
