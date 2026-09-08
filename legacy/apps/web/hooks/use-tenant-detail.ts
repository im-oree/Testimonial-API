/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TenantDetail } from '../lib/platform-types';

export function useTenantDetail(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.tenants.detail(tenantId),
    queryFn: async () => {
      const res = await apiClient.get<TenantDetail>(`/v1/platform/tenants/${tenantId}`);
      return res.data;
    },
    enabled: Boolean(tenantId),
  });
}
