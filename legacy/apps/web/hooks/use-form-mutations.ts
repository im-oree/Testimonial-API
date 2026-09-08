/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@testimonial-api/ui';
import type { FormDetail, FormQuestion } from '../lib/tenant-types';

export function useFormMutations() {
  const qc = useQueryClient();

  const saveForm = useCallback(
    async (appId: string, form: Partial<FormDetail>, questions: FormQuestion[]) => {
      const res = await apiClient.post<FormDetail>(`/v1/apps/${appId}/forms${form.id ? `/${form.id}` : ''}`, {
        name: form.name,
        slug: form.slug,
        questions,
      });
      await qc.invalidateQueries({ queryKey: queryKeys.forms.all(appId) });
      return res.data;
    },
    [qc],
  );

  const togglePublished = useCallback(
    async (appId: string, formId: string, published: boolean) => {
      const res = await apiClient.patch(`/v1/apps/${appId}/forms/${formId}`, { published });
      await qc.invalidateQueries({ queryKey: queryKeys.forms.all(appId) });
      return res.data;
    },
    [qc],
  );

  return { saveForm, togglePublished };
}
