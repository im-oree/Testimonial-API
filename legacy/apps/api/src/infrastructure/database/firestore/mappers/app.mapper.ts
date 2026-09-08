import type { App } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'publicId', kind: 'string' },
  { key: 'tenantId', kind: 'string' },
  { key: 'name', kind: 'string' },
  { key: 'description', kind: 'stringOrNull' },
  { key: 'status', kind: 'string' },
  { key: 'quotaTestimonialsPerMonth', kind: 'number' },
  { key: 'quotaWidgetsMax', kind: 'number' },
  { key: 'quotaFormsMax', kind: 'number' },
  { key: 'quotaSeatMax', kind: 'number' },
  { key: 'allowedOrigins', kind: 'stringArray' },
  { key: 'ipAllowList', kind: 'stringArrayOrNull' },
  { key: 'requireCaptchaOnForms', kind: 'boolean' },
  { key: 'archivedAt', kind: 'dateOrNull' },
  { key: 'createdAt', kind: 'date' },
  { key: 'updatedAt', kind: 'date' },
];

export const AppFirestoreMapper = createFirestoreMapper<App>(FIELDS);
