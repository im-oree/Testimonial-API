/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { OverviewData } from '../lib/tenant-types';

export function useDashboardOverview(appId?: string) {
  return useQuery({
    queryKey: ['overview', appId ?? '__all__'] as const,
    queryFn: async () => {
      const res = await apiClient.get<OverviewData>('/v1/dashboard/overview', {
        params: appId ? { appId } : undefined,
      });
      return res.data;
    },
    enabled: Boolean(appId),
  });
}
