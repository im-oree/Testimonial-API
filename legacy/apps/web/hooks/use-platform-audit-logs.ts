/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { AuditLogEntry } from '../lib/platform-types';

export function useAuditLogs(filters: { page?: number; actor?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(filters),
    queryFn: async () => {
      const res = await apiClient.get<{ rows: AuditLogEntry[] }>('/v1/platform/audit-logs', { params: filters });
      return res.data.rows;
    },
  });
}
