/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { PlatformOverviewData } from '../lib/platform-types';

export function usePlatformOverview() {
  return useQuery({
    queryKey: queryKeys.platformAnalytics('30d'),
    queryFn: async () => {
      const res = await apiClient.get<PlatformOverviewData>('/v1/platform/overview');
      return res.data;
    },
  });
}
