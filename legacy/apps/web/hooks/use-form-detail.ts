/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { FormDetail } from '../lib/tenant-types';

export function useFormDetail(appId: string | undefined, formId: string) {
  return useQuery({
    queryKey: queryKeys.forms.detail(appId ?? '__all__', formId),
    queryFn: async () => {
      const res = await apiClient.get<FormDetail>(`/v1/apps/${appId}/forms/${formId}`);
      return res.data;
    },
    enabled: Boolean(appId),
  });
}
