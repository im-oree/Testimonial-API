/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { AiProvider } from '../lib/platform-types';

export function useAiProviders() {
  const qc = useQueryClient();
  const providers = useQuery({
    queryKey: queryKeys.ai.providers,
    queryFn: async () => {
      const res = await apiClient.get<{ rows: AiProvider[] }>('/v1/platform/ai/providers');
      return res.data.rows;
    },
  });

  const setEnabled = useCallback(
    async (providerId: string, enabled: boolean) => {
      const res = await apiClient.patch(`/v1/platform/ai/providers/${providerId}`, { enabled });
      await qc.invalidateQueries({ queryKey: queryKeys.ai.providers });
      return res.data;
    },
    [qc],
  );

  return { ...providers, setEnabled };
}
