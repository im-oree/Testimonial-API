/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';

export type ModerateAction = 'approve' | 'reject' | 'archive';

/**
 * Moderation mutations (approve/reject/archive/bulk) — optimistic UI is
 * layered on these in Doc 5; each call invalidates the app's testimonial
 * cache so list/detail/overview stay coherent.
 */
export function useTestimonialMutations() {
  const qc = useQueryClient();

  const moderate = useCallback(
    async (appId: string, id: string, action: ModerateAction, reason?: string) => {
      const res = await apiClient.patch(`/v1/apps/${appId}/testimonials/${id}/moderation`, { action, reason });
      await qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      await qc.invalidateQueries({ queryKey: queryKeys.apps.stats(appId) });
      return res.data;
    },
    [qc],
  );

  const bulkModerate = useCallback(
    async (appId: string, ids: string[], action: ModerateAction) => {
      const res = await apiClient.post(`/v1/apps/${appId}/testimonials/bulk/moderation`, { ids, action });
      await qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      return res.data;
    },
    [qc],
  );

  const deleteTestimonial = useCallback(
    async (appId: string, id: string) => {
      const res = await apiClient.delete(`/v1/apps/${appId}/testimonials/${id}`);
      await qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      return res.data;
    },
    [qc],
  );

  const tag = useCallback(
    async (appId: string, id: string, tags: string[]) => {
      const res = await apiClient.patch(`/v1/apps/${appId}/testimonials/${id}`, { tags });
      await qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      return res.data;
    },
    [qc],
  );

  return { moderate, bulkModerate, deleteTestimonial, tag };
}
