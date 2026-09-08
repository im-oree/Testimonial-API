/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';

export function useTenantSettings(tenantId: string) {
  const qc = useQueryClient();

  const suspend = useCallback(
    async (suspended: boolean) => {
      const res = await apiClient.patch(`/v1/platform/tenants/${tenantId}`, { status: suspended ? 'suspended' : 'active' });
      await qc.invalidateQueries({ queryKey: queryKeys.tenants.detail(tenantId) });
      await qc.invalidateQueries({ queryKey: queryKeys.tenants.all });
      return res.data;
    },
    [qc, tenantId],
  );

  const changePlan = useCallback(
    async (plan: string) => {
      const res = await apiClient.patch(`/v1/platform/tenants/${tenantId}`, { plan });
      await qc.invalidateQueries({ queryKey: queryKeys.tenants.detail(tenantId) });
      return res.data;
    },
    [qc, tenantId],
  );

  const deleteTenant = useCallback(
    async (confirm: string) => {
      const res = await apiClient.delete(`/v1/platform/tenants/${tenantId}`, { params: { confirm } });
      await qc.invalidateQueries({ queryKey: queryKeys.tenants.all });
      return res.data;
    },
    [qc, tenantId],
  );

  return { suspend, changePlan, deleteTenant };
}
