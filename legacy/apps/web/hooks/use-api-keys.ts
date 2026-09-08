/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@testimonial-api/ui';
import type { ApiKeySummary } from '../lib/tenant-types';

export function useApiKeys(appId: string | undefined) {
  const qc = useQueryClient();
  const keys = useQuery({
    queryKey: ['api-keys', appId ?? '__all__'] as const,
    queryFn: async () => {
      if (!appId) return [] as ApiKeySummary[];
      const res = await apiClient.get<{ rows: ApiKeySummary[] }>(`/v1/apps/${appId}/api-keys`);
      return res.data.rows;
    },
    enabled: Boolean(appId),
  });

  const rotateKey = useCallback(
    async (appId: string, keyId: string) => {
      const res = await apiClient.post(`/v1/apps/${appId}/api-keys/${keyId}/rotate`);
      await qc.invalidateQueries({ queryKey: ['api-keys', appId] });
      return res.data;
    },
    [qc],
  );

  const createKey = useCallback(
    async (appId: string, name: string, scopes: string[]) => {
      const res = await apiClient.post(`/v1/apps/${appId}/api-keys`, { name, scopes });
      await qc.invalidateQueries({ queryKey: ['api-keys', appId] });
      return res.data;
    },
    [qc],
  );

  return { ...keys, rotateKey, createKey };
}
