/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TenantSummary } from '../lib/platform-types';

export interface TenantFilters {
  page?: number;
  perPage?: number;
  q?: string;
  plan?: string;
  status?: string;
}

export function useTenants(filters: TenantFilters = {}) {
  return useQuery({
    queryKey: queryKeys.tenants.list(filters),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: TenantSummary[]; total: number }>('/v1/platform/tenants', {
        params: { ...filters, page: filters.page ?? 1, perPage: filters.perPage ?? 50 },
      });
      return res.data.rows;
    },
  });
}
