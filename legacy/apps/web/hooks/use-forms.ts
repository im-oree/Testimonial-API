/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { FormSummary } from '../lib/tenant-types';

export function useForms(appId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.forms.all(appId ?? '__all__'),
    queryFn: async () => {
      if (!appId) return [] as FormSummary[];
      const res = await apiClient.get<{ rows: FormSummary[] }>(`/v1/apps/${appId}/forms`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });
}
