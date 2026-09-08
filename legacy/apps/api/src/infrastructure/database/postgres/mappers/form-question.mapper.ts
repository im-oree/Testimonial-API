import type { FormQuestion } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'formId', column: 'form_id', kind: 'string' },
  { domain: 'type', column: 'type', kind: 'string' },
  { domain: 'label', column: 'label', kind: 'string' },
  { domain: 'required', column: 'required', kind: 'boolean' },
  { domain: 'options', column: 'options', kind: 'stringArrayOrNull' },
  { domain: 'sortOrder', column: 'sort_order', kind: 'number' },
];

export const FormQuestionPgMappers = createPgMappers<FormQuestion>(SPECS);
