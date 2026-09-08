/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { AiCostSummary } from '../lib/platform-types';

export function useAiCosts(period: string = '30d') {
  return useQuery({
    queryKey: queryKeys.ai.costs({ period }),
    queryFn: async () => {
      const res = await apiClient.get<AiCostSummary>('/v1/platform/ai/costs', { params: { period } });
      return res.data;
    },
  });
}
