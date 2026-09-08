/** Doc 4 — public-forms (client form — submission + video upload path). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { apiClient, Button, EmptyState, ErrorState, Input, LoadingState, RatingInput, Textarea } from '@testimonial-api/ui';
import type { PublicForm, PublicFormQuestion } from './public-types';

export function PublicFormView({
  slug,
  initial,
  error,
}: {
  slug: string;
  initial: PublicForm | null;
  error: string | null;
}) {
  const router = useRouter();
  const [form] = useState<PublicForm | null>(initial);
  const [loadError] = useState<string | null>(error);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loadError && !form) return <ErrorState title="Form unavailable" description={loadError} />;
  if (!form) return <LoadingState label="Loading form…" />;

  const brand = { '--brand': form.brandColor } as CSSProperties;

  const setAnswer = (q: PublicFormQuestion, value: string | number): void => {
    setAnswers((a) => ({ ...a, [q.id]: value }));
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiClient.post(`/v1/public/forms/${slug}/submissions`, {
        answers,
        // hCaptcha token resolved by the widget layer (Doc 4 §F2 + Doc 3 upload contract).
        captchaToken: '',
        videoUploadId: answers.videoUploadId as string | undefined,
      });
      router.push(`/forms/${slug}/success`);
    } catch {
      setSubmitError('We could not save your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main data-testid="public-form" style={{ maxWidth: 600, margin: '40px auto', padding: 24, ...brand } as CSSProperties}>
      <header>
        <h1>{form.name}</h1>
        <p>for {form.tenantName}</p>
      </header>
      {form.questions.length === 0 && <EmptyState title="This form has no questions yet" />}
      <form onSubmit={submit}>
        {form.questions.map((q) => (
          <fieldset key={q.id}>
            <legend>{q.label}{q.required && ' *'}</legend>
            {q.type === 'text' && <Textarea required={q.required} onChange={(e) => setAnswer(q, e.target.value)} />}
            {q.type === 'select' && (
              <select onChange={(e) => setAnswer(q, e.target.value)}>
                {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {q.type === 'rating' && <RatingInput value={Number(answers[q.id] ?? 0)} onChange={(v) => setAnswer(q, v)} />}
            {q.type === 'video' && (
              <p>
                <Input type="file" accept="video/*" aria-label="Video answer" />
                <small>Video uploads use a signed-URL flow (Doc 3 §uploads).</small>
              </p>
            )}
          </fieldset>
        ))}
        {submitError && <p role="alert">{submitError}</p>}
        {form.questions.length > 0 && (
          <Button variant="primary" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit feedback'}</Button>
        )}
      </form>
    </main>
  );
}
