/** Doc 4 — tenant dashboard (form editor — schema questions + publish toggle). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorState, FormBuilder, LoadingState, PageContainer, Switch } from '@testimonial-api/ui';
import { useFormDetail } from '../../../hooks/use-form-detail';
import { useFormMutations } from '../../../hooks/use-form-mutations';
import { useUiStore } from '../../../stores/ui.store';

export function FormEditorView({ formId }: { formId?: string }) {
  const router = useRouter();
  const appId = useUiStore((s) => s.activeAppId);
  const detail = useFormDetail(appId ?? undefined, formId ?? '');
  const mutations = useFormMutations();
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!appId) return <LoadingState label="Select an app…" />;
  if (formId && detail.isLoading) return <LoadingState label="Loading form…" />;
  if (formId && detail.isError) return <ErrorState title="Could not load this form" retry={() => void detail.refetch()} />;
  if (formId && !detail.data) return <EmptyState title="Not found" />;

  const questions = detail.data?.questions ?? [
    { id: 'q1', type: 'text' as const, label: 'What did you love about us?', required: true },
    { id: 'q2', type: 'rating' as const, label: 'How likely are you to recommend us?', required: true },
  ];

  const save = async (): Promise<void> => {
    setSaving(true);
    const saved = await mutations.saveForm(appId, { id: formId, name: detail.data?.name ?? 'Untitled form', slug: detail.data?.slug ?? 'untitled' }, questions);
    setSaving(false);
    router.push(`/app/forms/${saved.id}`);
  };

  const isLive = detail.data?.published ?? published;
  return (
    <PageContainer title={detail.data?.name ?? 'New form'} actions={
      <>
        <Switch checked={isLive} onCheckedChange={setPublished} />
        <Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save form'}</Button>
      </>
    }>
      <FormBuilder formName={detail.data?.name ?? 'New form'} questions={questions} />
      {isLive && <Badge tone="success">Live at /f/{detail.data?.slug ?? 'untitled'}</Badge>}
    </PageContainer>
  );
}
