/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { ImportJob } from '../lib/tenant-types';

export function useTestimonialImport(appId: string | undefined) {
  const qc = useQueryClient();
  const importJobs = useQuery({
    queryKey: [...queryKeys.testimonials.all(appId ?? '__all__'), 'imports'] as const,
    queryFn: async () => {
      if (!appId) return [] as ImportJob[];
      const res = await apiClient.get<{ rows: ImportJob[] }>(`/v1/apps/${appId}/imports`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });

  const submitCsvImport = useCallback(
    async (appId: string, file: File, columnMapping: Record<string, string>) => {
      const form = new FormData();
      form.append('file', file);
      form.append('mapping', JSON.stringify(columnMapping));
      const res = await apiClient.post(`/v1/apps/${appId}/imports`, form);
      await qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      return res.data;
    },
    [qc],
  );

  return { ...importJobs, submitCsvImport };
}
