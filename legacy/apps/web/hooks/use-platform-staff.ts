/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { PlatformStaffMember } from '../lib/platform-types';

export function usePlatformStaff() {
  return useQuery({
    queryKey: queryKeys.staff.all,
    queryFn: async () => {
      const res = await apiClient.get<{ rows: PlatformStaffMember[] }>('/v1/platform/staff');
      return res.data.rows;
    },
  });
}
