import type { Template } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'type', kind: 'string' },
  { key: 'name', kind: 'string' },
  { key: 'description', kind: 'stringOrNull' },
  { key: 'previewImageUrl', kind: 'stringOrNull' },
  { key: 'isPremium', kind: 'boolean' },
  { key: 'version', kind: 'number' },
  { key: 'configSchema', kind: 'raw' },
  { key: 'componentRef', kind: 'string' },
  { key: 'status', kind: 'string' },
  { key: 'createdAt', kind: 'date' },
  { key: 'updatedAt', kind: 'date' },
];

export const TemplateFirestoreMapper = createFirestoreMapper<Template>(FIELDS);
