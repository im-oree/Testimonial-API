/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { WidgetDetail } from '../lib/tenant-types';

export function useWidgetMutations() {
  const qc = useQueryClient();

  const saveWidget = useCallback(
    async (appId: string, widget: Partial<WidgetDetail>) => {
      const res = await apiClient.post<WidgetDetail>(
        `/v1/apps/${appId}/widgets${widget.id ? `/${widget.id}` : ''}`,
        widget,
      );
      await qc.invalidateQueries({ queryKey: queryKeys.widgets.all(appId) });
      return res.data;
    },
    [qc],
  );

  const toggleEnabled = useCallback(
    async (appId: string, widgetId: string, enabled: boolean) => {
      const res = await apiClient.patch(`/v1/apps/${appId}/widgets/${widgetId}`, { enabled });
      await qc.invalidateQueries({ queryKey: queryKeys.widgets.all(appId) });
      return res.data;
    },
    [qc],
  );

  return { saveWidget, toggleEnabled };
}
