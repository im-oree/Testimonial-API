/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TestimonialItem, TestimonialStatus } from '../lib/tenant-types';

export interface TestimonialFilters {
  page?: number;
  perPage?: number;
  status?: TestimonialStatus | 'all';
  q?: string;
  tags?: string[];
  sort?: string;
}

export function useTestimonials(appId: string | undefined, filters: TestimonialFilters = {}) {
  return useQuery({
    queryKey: queryKeys.testimonials.list(appId ?? '__all__', filters),
    queryFn: async () => {
      if (!appId) return [] as TestimonialItem[];
      const res = await apiClient.get<{ rows: TestimonialItem[]; total: number }>(
        `/v1/apps/${appId}/testimonials`,
        { params: { ...filters, page: filters.page ?? 1, perPage: filters.perPage ?? 50 } },
      );
      return res.data.rows;
    },
    enabled: Boolean(appId),
    placeholderData: (prev) => prev,
  });
}
