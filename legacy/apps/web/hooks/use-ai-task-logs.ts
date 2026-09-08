/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { AiTaskLog } from '../lib/platform-types';

export function useAiTaskLogs(filters: { page?: number; provider?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.ai.logs(filters),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: AiTaskLog[] }>('/v1/platform/ai/tasks', { params: filters });
      return res.data.rows;
    },
  });
}
