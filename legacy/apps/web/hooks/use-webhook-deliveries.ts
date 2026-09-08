/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WebhookDelivery } from '../lib/tenant-types';

export function useWebhookDeliveries(appId: string | undefined, webhookId: string) {
  return useQuery({
    queryKey: queryKeys.webhooks.deliveries(appId ?? '__all__', webhookId),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: WebhookDelivery[] }>(`/v1/apps/${appId}/webhooks/${webhookId}/deliveries`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });
}
