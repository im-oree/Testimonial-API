/** Doc 4 — tenant dashboard (§7 hook, restored during 2026-09-08 single-website
 *  merge: the platform copy of use-audit-logs.ts overwrote this one; rebuilt
 *  from its consumers — AuditPage renders createdAt/actor/action/resource). */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  ip?: string;
  createdAt: string;
}

export function useAuditLogs(filters: { page?: number; actor?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(filters),
    queryFn: async () => {
      // Tenant-scoped audit trail. Exact route lands with the Doc 3 route
      // slice; prototype shape mirrors the platform hook.
      const res = await apiClient.get<{ rows: AuditLogEntry[] }>('/v1/audit-logs', { params: filters });
      return res.data.rows;
    },
  });
}
