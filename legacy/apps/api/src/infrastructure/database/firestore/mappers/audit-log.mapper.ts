import type { AuditLog } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'actorId', kind: 'stringOrNull' },
  { key: 'actorType', kind: 'string' },
  { key: 'actorLabel', kind: 'stringOrNull' },
  { key: 'action', kind: 'string' },
  { key: 'targetType', kind: 'stringOrNull' },
  { key: 'targetId', kind: 'stringOrNull' },
  { key: 'tenantId', kind: 'stringOrNull' },
  { key: 'ip', kind: 'stringOrNull' },
  { key: 'userAgent', kind: 'stringOrNull' },
  { key: 'metadata', kind: 'record' },
  { key: 'createdAt', kind: 'date' },
];

// Firestore ids are UUIDs; the BIGSERIAL SQL id maps via mapper later.
export const AuditLogFirestoreMapper = createFirestoreMapper<Omit<AuditLog, 'id'> & { id: string }>(FIELDS);
