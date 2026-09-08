/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';

export function useTestimonialTags(appId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.testimonials.all(appId ?? '__all__'), 'tags'] as const,
    queryFn: async () => {
      if (!appId) return [] as string[];
      const res = await apiClient.get<{ tags: string[] }>(`/v1/apps/${appId}/testimonials/tags`);
      return res.data.tags;
    },
    enabled: Boolean(appId),
  });
}
