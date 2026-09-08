/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';

/** Invite / role change / suspend. Role changes surface everywhere via
 *  `permissions_changed` → /me refetch → sidebar re-render (Doc 4 §B/C). */
export function useTeamMutations() {
  const qc = useQueryClient();
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: queryKeys.staff.list() }), [qc]);

  const invite = useCallback(
    async (email: string, role: string) => {
      const res = await apiClient.post('/v1/team/invites', { email, role });
      await refresh();
      return res.data;
    },
    [refresh],
  );

  const changeRole = useCallback(
    async (memberId: string, role: string) => {
      const res = await apiClient.patch(`/v1/team/${memberId}`, { role });
      await refresh();
      await qc.invalidateQueries({ queryKey: queryKeys.me });
      return res.data;
    },
    [qc, refresh],
  );

  const suspend = useCallback(
    async (memberId: string, suspended: boolean) => {
      const res = await apiClient.patch(`/v1/team/${memberId}`, { status: suspended ? 'suspended' : 'active' });
      await refresh();
      return res.data;
    },
    [refresh],
  );

  return { invite, changeRole, suspend };
}
