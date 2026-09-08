import type { CollectionForm } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

// NOTE: `questions` are stored in their own `formQuestions` collection and
// joined by the repository (mirrors the SQL join) — never embedded.
const FIELDS: FieldSpec[] = [
  { key: 'appId', kind: 'string' },
  { key: 'name', kind: 'string' },
  { key: 'slug', kind: 'string' },
  { key: 'templateId', kind: 'string' },
  { key: 'status', kind: 'string' },
  { key: 'ratingType', kind: 'string' },
  { key: 'collectVideo', kind: 'boolean' },
  { key: 'collectConsent', kind: 'boolean' },
  { key: 'redirectUrlOnSuccess', kind: 'stringOrNull' },
  { key: 'styleOverrides', kind: 'stringMap' },
  { key: 'submissionCount', kind: 'number' },
  { key: 'createdAt', kind: 'date' },
  { key: 'updatedAt', kind: 'date' },
];

export const CollectionFormFirestoreMapper = createFirestoreMapper<Omit<CollectionForm, 'questions'>>(FIELDS);
