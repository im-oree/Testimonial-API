/**
 * Public form — no login needed. Renders a published form for visitors and
 * POSTs submissions, which arrive in the tenant's moderation queue as
 * pending testimonials.
 *
 * Modes:
 *   · Full page — the default; great for a dedicated review page.
 *   · ?embed=1  — chrome-free surface for iframes (used by the review modal
 *                 snippet from Connect & design, and by modal.js). When the
 *                 review is submitted it tells the parent so the modal can
 *                 close and the visitor stays on the site that asked.
 *
 * After submitting, the visitor sees exactly what they wrote (snapshot), what
 * happens next (moderation -> approval -> live on the wall) and a way back to
 * the product's website.
 */
import { IconCheck } from '../components/icons';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { PublicForm } from '../lib/types';
import { FONT_OPTIONS } from '../lib/theme';
import { Button, Label, RatingStars, Select, TextInput } from '../components/ui';

interface Snapshot {
  name: string;
  rating: number | null;
  text: string;
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PublicFormPage() {
  const { slug = '' } = useParams();
  const embed = new URLSearchParams(window.location.search).get('embed') === '1';
  const [form, setForm] = useState<PublicForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
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
      // Keep a snapshot of exactly what was submitted so the confirmation is
      // real, not generic.
      const ratingQ = form.questions.find((q) => q.type === 'rating');
      const textQ = form.questions.find((q) => q.type === 'text');
      const rating = ratingQ && typeof answers[ratingQ.id] === 'number' ? (answers[ratingQ.id] as number) : null;
      const text = textQ && typeof answers[textQ.id] === 'string' ? String(answers[textQ.id]).trim() : '';
      setSnap({ name: name.trim() || 'Anonymous visitor', rating, text });
      setDone(true);
      if (embed) {
        // Tell the parent (review modal) so it can close and keep the visitor
        // on the site — the review itself lives in the moderation queue.
        window.setTimeout(() => window.parent.postMessage({ zojatech: { submitted: true } }, '*'), 700);
      }
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

  const appName = form?.appName ?? form?.tenantName ?? 'the company';
  const backUrl = form?.websiteUrl ?? null;

  return (
    <div className={`public-page${embed ? ' form-embed' : ''}`} style={vars}>
      <div className="public-card">
        {!embed && (
          <div className="public-brand-row">
            {form?.logoUrl ? (
              <img src={form.logoUrl} alt={`${form.tenantName} logo`} className="public-logo" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            ) : (
              <span className="brand-dot" style={{ background: accent }} />
            )}
            <span>{form?.tenantName ?? 'Testimonial'}</span>
          </div>
        )}

        {error && (
          <div className="public-state">
            <h1>Form unavailable</h1>
            <p className="muted">{error}</p>
            {!embed ? (
              <Link className="btn btn-secondary" to="/login">
                Go to login
              </Link>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => window.parent.postMessage({ zojatech: { close: true } }, '*')}>
                Close
              </button>
            )}
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
            <h1>{snap?.name && snap.name !== 'Anonymous visitor' ? `Thank you, ${snap.name.split(' ')[0]}!` : 'Thank you!'}</h1>
            <p className="muted">
              Your review for <strong>{appName}</strong> was submitted and is now waiting in{' '}
              <strong>{form.tenantName}</strong>&apos;s moderation queue. It will appear on the public wall as soon as it is approved.
            </p>

            {snap && (snap.text || snap.rating) && (
              <div className="review-snapshot">
                {snap.rating ? <RatingStars value={snap.rating} size="sm" /> : null}
                {snap.text && <p className="wall-quote">&ldquo;{snap.text}&rdquo;</p>}
                <div className="muted small strong">
                  — {snap.name} · {todayLabel()}
                </div>
              </div>
            )}

            <div className="public-actions">
              {backUrl ? (
                <a className="btn btn-teal" href={backUrl} target="_blank" rel="noreferrer">
                  Back to {appName}
                </a>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
                  Go back
                </button>
              )}
              {!embed && (
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Submit another response
                </Button>
              )}
            </div>
            <p className="muted small" style={{ marginBottom: 0 }}>
              Review not showing after approval? Moderators can publish it from the Moderation page of {form.tenantName}&apos;s workspace.
            </p>
          </div>
        )}

        {!error && form && !done && (
          <>
            <h1>{form.name}</h1>
            <p className="muted">Share your experience — it only takes a minute. Submissions go through moderation before going live.</p>

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
