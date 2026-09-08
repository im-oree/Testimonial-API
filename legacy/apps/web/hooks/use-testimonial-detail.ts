/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TestimonialItem } from '../lib/tenant-types';

export function useTestimonialDetail(appId: string | undefined, id: string) {
  return useQuery({
    queryKey: queryKeys.testimonials.detail(appId ?? '__all__', id),
    queryFn: async () => {
      const res = await apiClient.get<TestimonialItem>(`/v1/apps/${appId}/testimonials/${id}`);
      return res.data;
    },
    enabled: Boolean(appId),
  });
}
