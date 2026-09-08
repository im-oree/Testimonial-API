/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WebhookSummary } from '../lib/tenant-types';

export function useWebhooks(appId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.webhooks.all(appId ?? '__all__'),
    queryFn: async () => {
      if (!appId) return [] as WebhookSummary[];
      const res = await apiClient.get<{ rows: WebhookSummary[] }>(`/v1/apps/${appId}/webhooks`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });
}
