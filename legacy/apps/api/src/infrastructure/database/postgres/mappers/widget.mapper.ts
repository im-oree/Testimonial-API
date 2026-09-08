import type { Widget, WidgetFilter } from '@testimonial-api/domain';
import { createPgMappers, type PgFieldSpec } from './factory';

// SQL mirrors Widget.filter on dedicated filter_* columns; domain keeps the
// value object. Mappers compose it on the way in and decompose on the way out.
const SPECS: PgFieldSpec[] = [
  { domain: 'id', column: 'id', kind: 'string' },
  { domain: 'appId', column: 'app_id', kind: 'string' },
  { domain: 'name', column: 'name', kind: 'string' },
  { domain: 'templateId', column: 'template_id', kind: 'string' },
  { domain: 'templateVersion', column: 'template_version', kind: 'number' },
  { domain: 'layoutType', column: 'layout_type', kind: 'string' },
  { domain: 'styleOverrides', column: 'style_overrides', kind: 'raw' },
  { domain: 'embedType', column: 'embed_type', kind: 'string' },
  { domain: 'isPublished', column: 'is_published', kind: 'boolean' },
  { domain: 'createdAt', column: 'created_at', kind: 'date' },
  { domain: 'updatedAt', column: 'updated_at', kind: 'date' },
];

function filterToRow(w: { filter?: WidgetFilter }): Record<string, unknown> {
  const f = w.filter ?? { tags: [], minRating: null, featuredOnly: false, limit: 10 };
  return {
    filter_tags: f.tags,
    filter_min_rating: f.minRating,
    filter_featured_only: f.featuredOnly,
    filter_limit: f.limit,
  };
}

function rowToFilter(row: Record<string, unknown>): WidgetFilter {
  return {
    tags: Array.isArray(row.filter_tags) ? row.filter_tags.map(String) : [],
    minRating: row.filter_min_rating === null || row.filter_min_rating === undefined ? null : Number(row.filter_min_rating),
    featuredOnly: Boolean(row.filter_featured_only ?? false),
    limit: Number(row.filter_limit ?? 10),
  };
}

const base = createPgMappers<Omit<Widget, 'filter'>>(SPECS);

export const WidgetPgMappers = {
  toDomain(row: Record<string, unknown>): Widget {
    return { ...base.toDomain(row), filter: rowToFilter(row) } as Widget;
  },
  toPersistence(widget: Partial<Widget>): Record<string, unknown> {
    const { filter, ...rest } = widget;
    return { ...base.toPersistence(rest as Partial<Omit<Widget, 'filter'>>), ...(filter ? filterToRow(widget) : {}) };
  },
};
