/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WidgetDetail } from '../lib/tenant-types';

export function useWidgetDetail(appId: string | undefined, widgetId: string) {
  return useQuery({
    queryKey: queryKeys.widgets.detail(appId ?? '__all__', widgetId),
    queryFn: async () => {
      const res = await apiClient.get<WidgetDetail>(`/v1/apps/${appId}/widgets/${widgetId}`);
      return res.data;
    },
    enabled: Boolean(appId),
  });
}
