/**
 * Public form — no login needed. Renders a published form for visitors and
 * POSTs submissions, which arrive in the tenant's moderation queue as
 * pending testimonials.
 */
import { IconCheck } from '../components/icons';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { PublicForm } from '../lib/types';
import { FONT_OPTIONS } from '../lib/theme';
import { Button, Label, RatingStars, Select, TextInput } from '../components/ui';

export default function PublicFormPage() {
  const { slug = '' } = useParams();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [name, setName] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .get<PublicForm>(`/v1/public/forms/${slug}`)
      .then((f) => {
        if (!alive) return;
        setForm(f);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 404) setError('This form does not exist or is no longer published.');
        else setError(err instanceof Error ? err.message : 'We could not load this form right now.');
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/v1/public/forms/${form.slug}/submissions`, {
        answers: { ...answers, name: name.trim() || undefined },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed — please try again.');
    } finally {
      setBusy(false);
    }
  }

  const accent = form?.brandColor ?? '#6366F1';
  const th = form?.theme ?? null;
  const vars = {
    '--brand': th?.primary ?? accent,
    '--accent': th?.accent ?? '#0ea5a0',
    '--radius': th ? `${th.radiusPx}px` : '14px',
    '--font-stack': (th && FONT_OPTIONS.find((f) => f.id === th.font)?.stack) || 'inherit',
  } as React.CSSProperties;

  return (
    <div className="public-page" style={vars}>
      <div className="public-card">
        <div className="public-brand-row">
          {form?.logoUrl ? (
            <img src={form.logoUrl} alt={`${form.tenantName} logo`} className="public-logo" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
          ) : (
            <span className="brand-dot" style={{ background: accent }} />
          )}
          <span>{form?.tenantName ?? 'Testimonial'}</span>
        </div>

        {error && (
          <div className="public-state">
            <h1>Form unavailable</h1>
            <p className="muted">{error}</p>
            <Link className="btn btn-secondary" to="/login">
              Go to login
            </Link>
          </div>
        )}

        {!error && !form && (
          <div className="public-state">
            <div className="spinner" aria-hidden />
            <p className="muted">Loading form…</p>
          </div>
        )}

        {!error && form && done && (
          <div className="public-state">
            <div className="big-check"><IconCheck size={34} /></div>
            <h1>Thank you!</h1>
            <p className="muted">
              Your feedback for <strong>{form.tenantName}</strong> was submitted successfully.
            </p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Submit another response
            </Button>
          </div>
        )}

        {!error && form && !done && (
          <>
            <h1>{form.name}</h1>
            <p className="muted">Share your experience — it only takes a minute.</p>

            <form onSubmit={submit} className="stack public-form">
              <div>
                <Label>Your name (optional)</Label>
                <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
              </div>

              {form.questions.map((q) => {
                if (q.type === 'rating') {
                  return (
                    <div key={q.id}>
                      <Label>
                        {q.label} {q.required && <span className="req">*</span>}
                      </Label>
                      <RatingStars value={typeof answers[q.id] === 'number' ? (answers[q.id] as number) : undefined} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} size="lg" />
                    </div>
                  );
                }
                if (q.type === 'select' && q.options) {
                  return (
                    <div key={q.id}>
                      <Label>
                        {q.label} {q.required && <span className="req">*</span>}
                      </Label>
                      <Select value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}>
                        <option value="">Choose one…</option>
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </Select>
                    </div>
                  );
                }
                return (
                  <div key={q.id}>
                    <Label>
                      {q.label} {q.required && <span className="req">*</span>}
                    </Label>
                    <TextInput
                      value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      placeholder="Your answer"
                    />
                  </div>
                );
              })}

              <Button type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Submit feedback'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
