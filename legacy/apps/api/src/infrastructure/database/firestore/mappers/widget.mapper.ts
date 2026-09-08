import type { Widget } from '@testimonial-api/domain';
import { createFirestoreMapper, type FieldSpec } from './factory';

// Widget.filter is an embedded value object on the document (single-table
// prototype equivalent of the widget filter columns).
const FIELDS: FieldSpec[] = [
  { key: 'appId', kind: 'string' },
  { key: 'name', kind: 'string' },
  { key: 'templateId', kind: 'string' },
  { key: 'templateVersion', kind: 'number' },
  { key: 'layoutType', kind: 'string' },
  { key: 'filter', kind: 'record' },
  { key: 'styleOverrides', kind: 'record' },
  { key: 'embedType', kind: 'string' },
  { key: 'isPublished', kind: 'boolean' },
  { key: 'createdAt', kind: 'date' },
  { key: 'updatedAt', kind: 'date' },
];

export const WidgetFirestoreMapper = createFirestoreMapper<Widget>(FIELDS);
