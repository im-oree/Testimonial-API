/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WebhookSummary } from '../lib/platform-types';

export function usePlatformWebhooks() {
  return useQuery({
    queryKey: queryKeys.webhooks.all('__platform__'),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: WebhookSummary[] }>('/v1/platform/webhooks');
      return res.data.rows;
    },
  });
}
