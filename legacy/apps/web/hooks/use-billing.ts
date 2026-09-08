/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { BillingSummary } from '../lib/tenant-types';

export function useBilling() {
  return useQuery({
    queryKey: queryKeys.billing,
    queryFn: async () => {
      const res = await apiClient.get<BillingSummary>('/v1/billing');
      return res.data;
    },
  });
}
