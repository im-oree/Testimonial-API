/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useCallback, useState } from 'react';
import { apiClient } from '@testimonial-api/ui';

export function useTestimonialExport() {
  const [exporting, setExporting] = useState(false);
  const exportCsv = useCallback(async (appId: string, format: 'csv' | 'json' = 'csv') => {
    setExporting(true);
    try {
      const res = await apiClient.get<{ downloadUrl: string }>(`/v1/apps/${appId}/testimonials/export`, {
        params: { format },
      });
      return res.data.downloadUrl;
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportCsv, exporting };
}
