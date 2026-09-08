/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WidgetSummary } from '../lib/tenant-types';

export function useWidgets(appId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.widgets.all(appId ?? '__all__'),
    queryFn: async () => {
      if (!appId) return [] as WidgetSummary[];
      const res = await apiClient.get<{ rows: WidgetSummary[] }>(`/v1/apps/${appId}/widgets`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });
}
