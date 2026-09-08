import type { FormQuestion } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

const FIELDS: FieldSpec[] = [
  { key: 'formId', kind: 'string' },
  { key: 'type', kind: 'string' },
  { key: 'label', kind: 'string' },
  { key: 'required', kind: 'boolean' },
  { key: 'options', kind: 'stringArrayOrNull' },
  { key: 'sortOrder', kind: 'number' },
];

export const FormQuestionFirestoreMapper = createFirestoreMapper<FormQuestion>(FIELDS);
