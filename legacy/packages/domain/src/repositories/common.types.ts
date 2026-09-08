// ============================================================
// Shared shapes for every repository port (docs/01-skeleton.md §4)
// ============================================================

export interface PaginationParams {
  /** 1-based. */
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGINATION: PaginationParams = { page: 1, pageSize: 20, sortDir: 'desc' };

export interface TimeRangeFilter {
  from?: Date;
  to?: Date;
}
