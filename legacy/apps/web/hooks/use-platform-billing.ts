/** Doc 4 — platform dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { InvoiceSummary } from '../lib/platform-types';

export interface PlatformBillingData {
  monthlyMrrUsd: number;
  invoices: InvoiceSummary[];
}

export function usePlatformBilling() {
  return useQuery({
    queryKey: queryKeys.billing,
    queryFn: async () => {
      const res = await apiClient.get<PlatformBillingData>('/v1/platform/billing');
      return res.data;
    },
  });
}
