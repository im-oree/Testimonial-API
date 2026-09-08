import type { PaginationParams } from '@testimonial-api/domain';

/** Clamp incoming pagination params to safe bounds. */
export function normalizePagination(p: Partial<PaginationParams> | undefined): PaginationParams {
  return {
    page: Math.max(1, Math.trunc(p?.page ?? 1) || 1),
    pageSize: Math.min(100, Math.max(1, Math.trunc(p?.pageSize ?? 20) || 20)),
    sortBy: p?.sortBy,
    sortDir: p?.sortDir === 'asc' ? 'asc' : 'desc',
  };
}
