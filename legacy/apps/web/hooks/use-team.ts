/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { TeamMember } from '../lib/tenant-types';

export function useTeam() {
  return useQuery({
    queryKey: queryKeys.staff.list(),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: TeamMember[] }>('/v1/team');
      return res.data.rows;
    },
  });
}
