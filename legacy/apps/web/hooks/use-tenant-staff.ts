/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TenantStaffMember } from '../lib/platform-types';

export function useTenantStaff(tenantId: string) {
  return useQuery({
    queryKey: [...queryKeys.tenants.detail(tenantId), 'staff'] as const,
    queryFn: async () => {
      const res = await apiClient.get<{ rows: TenantStaffMember[] }>(`/v1/platform/tenants/${tenantId}/staff`);
      return res.data.rows;
    },
    enabled: Boolean(tenantId),
  });
}
