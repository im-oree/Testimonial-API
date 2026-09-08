/**
 * One app — form management (the content you collect).
 *
 * The list keeps one obvious control per row (the publish toggle) and moves
 * everything else into the ⋮ menu. "New form" opens a builder where the
 * question list and a live preview sit side by side — what you are editing is
 * always visible without scrolling: add/remove/reorder questions, change
 * types and labels, and watch the public form update as you type.
 */
import { IconCheck, IconEdit, IconExternal, IconPlus, IconTrash, IconX } from '../components/icons';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { useAppName } from '../lib/useAppName';
import { useAuth } from '../auth';
import type { FormQuestion, FormRow } from '../lib/types';
import { Breadcrumbs, Button, EmptyState, ErrorBanner, PageHeader, RatingStars, Select, Toggle } from '../components/ui';
import { Field, SelectField, TextInput } from '../components/fields';
import { KebabMenu } from '../components/menu';
import { SkeletonTable } from '../components/Skeleton';
import Modal from '../components/Modal';

type QType = 'text' | 'rating' | 'select';

interface QDraft {
  id: string;
  type: QType;
  label: string;
  required: boolean;
  options: string;
}

interface FormDraft {
  id?: string;
  name: string;
  published: boolean;
  questions: QDraft[];
}

const EMPTY_DRAFT: FormDraft = {
  name: '',
  published: false,
  questions: [
    { id: 'q1', type: 'rating', label: 'How likely are you to recommend us?', required: true, options: '' },
    { id: 'q2', type: 'text', label: 'What did we do well?', required: false, options: '' },
  ],
};

const TYPE_LABEL: Record<QType, string> = { text: 'Text answer', rating: 'Star rating', select: 'Dropdown choice' };
let qSeq = 100;

export default function FormsPage() {
  const { appId = '' } = useParams();
  const appName = useAppName(appId);
  const { permissions } = useAuth();
  const canManage = permissions.includes('forms.manage');

  const [rows, setRows] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [okNote, setOkNote] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!appId) return;
    setLoading(true);
    api
      .get<{ rows: FormRow[] }>(`/v1/apps/${appId}/forms`)
      .then((data) => {
        setRows(data.rows);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load forms.'))
      .finally(() => setLoading(false));
  }, [appId]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePublished(form: FormRow): Promise<void> {
    setBusyId(form.id);
    setError(null);
    try {
      await api.patch<FormRow>(`/v1/apps/${appId}/forms/${form.id}`, { published: !form.published });
      setRows((prev) => prev.map((f) => (f.id === form.id ? { ...f, published: !f.published } : f)));
      flash(!form.published ? 'Form is live — it accepts submissions' : 'Form unpublished — link now shows "not accepting"');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the form.');
    } finally {
      setBusyId(null);
    }
  }

  async function copyPublicLink(form: FormRow): Promise<void> {
    const url = `${window.location.origin}/forms/${form.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(form.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt('Copy the public form link:', url);
    }
  }

  function flash(msg: string): void {
    setOkNote(msg);
    window.setTimeout(() => setOkNote((cur) => (cur === msg ? null : cur)), 2200);
  }

  function editDraft(form: FormRow): void {
    // Pull the full form (questions included) then open the builder.
    api
      .get<FormRow & { questions: FormQuestion[] }>(`/v1/apps/${appId}/forms/${form.id}`)
      .then((full) => {
        setDraft({
          id: full.id,
          name: full.name,
          published: full.published,
          questions: full.questions.map((q) => ({
            id: q.id,
            type: (['text', 'rating', 'select'] as QType[]).includes(q.type as QType) ? (q.type as QType) : 'text',
            label: q.label,
            required: q.required,
            options: (q.options ?? []).join(', '),
          })),
        });
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not open the form.'));
  }

  async function saveDraft(): Promise<void> {
    if (!draft) return;
    setDraftBusy(true);
    setError(null);
    const body = {
      name: draft.name.trim() || 'Untitled form',
      published: draft.published,
      questions: draft.questions.map((q) => ({
        id: q.id,
        type: q.type,
        label: q.label,
        required: q.required,
        ...(q.type === 'select' ? { options: q.options.split(',').map((o) => o.trim()).filter(Boolean) } : {}),
      })),
    };
    try {
      if (draft.id) await api.post(`/v1/apps/${appId}/forms/${draft.id}`, body);
      else await api.post(`/v1/apps/${appId}/forms`, body);
      setDraft(null);
      flash(draft.id ? 'Form updated' : 'Form created');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the form.');
    } finally {
      setDraftBusy(false);
    }
  }

  const example = rows.find((f) => f.published) ?? rows[0];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', to: '/app/products' },
          { label: appName ?? appId, to: `/app/a/${appId}/overview` },
          { label: 'Forms' },
        ]}
      />
      <PageHeader
        title="Forms"
        subtitle="Collect testimonials on public pages. A form must be published to accept submissions."
        actions={canManage && <Button onClick={() => setDraft({ ...EMPTY_DRAFT, questions: EMPTY_DRAFT.questions.map((q) => ({ ...q })) })}><IconPlus size={14} /> New form</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}
      {okNote && (
        <div className="banner banner-ok" role="status">
          <span>
            <IconCheck size={13} /> {okNote}
          </span>
        </div>
      )}

      {loading && <SkeletonTable rows={4} cols={5} />}
      {!loading && rows.length === 0 && (
        <EmptyState
          title="No forms yet"
          hint={canManage ? 'Create a form to start collecting testimonials for this product.' : 'An editor or owner can create the first form.'}
        />
      )}

      {!loading && rows.length > 0 && (
        <div className="card table-card">
          <table className="table t-table">
            <thead>
              <tr>
                <th>Form</th>
                <th>Public link</th>
                <th>Submissions</th>
                <th>Created</th>
                <th>Status</th>
                <th>Live</th>
                {canManage && <th className="t-menu" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="strong">{f.name}</div>
                    <div className="muted small">/forms/{f.slug}</div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <a className="btn btn-ghost btn-xs" href={`/forms/${f.slug}`} target="_blank" rel="noreferrer">
                        Open <IconExternal size={13} />
                      </a>
                      <Button variant="ghost" className="btn-xs" onClick={() => void copyPublicLink(f)}>
                        {copied === f.id ? 'Copied!' : 'Copy link'}
                      </Button>
                    </div>
                  </td>
                  <td>{f.submissionCount}</td>
                  <td className="muted small">{formatDate(f.createdAt)}</td>
                  <td>
                    <span className={`chip ${f.published ? 'chip-approved' : 'chip-draft'}`}>{f.published ? 'Live' : 'Draft'}</span>
                  </td>
                  <td>
                    {canManage ? (
                      <span className="t-live">
                        <Toggle checked={f.published} disabled={busyId === f.id} onChange={() => void togglePublished(f)} />
                        <span className={`small ${f.published ? 't-live-on' : 'muted'}`}>{f.published ? 'Live' : 'Off'}</span>
                      </span>
                    ) : (
                      <span className={`chip ${f.published ? 'chip-approved' : 'chip-draft'}`}>{f.published ? 'Live' : 'Off'}</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="t-menu">
                      <KebabMenu
                        label={`Actions for ${f.name}`}
                        actions={[
                          { id: 'edit', label: 'Edit questions', icon: <IconEdit size={14} />, onSelect: () => editDraft(f) },
                          { id: 'open', label: 'Open public page', icon: <IconExternal size={14} />, onSelect: () => window.open(`/forms/${f.slug}`, '_blank') },
                          { id: 'copy', label: 'Copy public link', onSelect: () => void copyPublicLink(f) },
                          {
                            id: 'toggle',
                            label: f.published ? 'Unpublish form' : 'Publish form',
                            disabled: busyId === f.id,
                            onSelect: () => void togglePublished(f),
                          },
                        ]}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Try the full loop</h2>
        {example ? (
          <p className="muted">
            Open the public form for <strong>{example.name}</strong>, submit a testimonial, then watch it appear in{' '}
            <strong>Moderation</strong> as pending. Approve it and it moves to your testimonials list — switch it live on the wall from
            there. Unpublish a form and its public page stops accepting submissions.
          </p>
        ) : (
          <p className="muted">No forms in this product yet.</p>
        )}
      </div>

      {/* ---- Form builder: questions on the left, live preview on the right ---- */}
      <Modal open={draft !== null} onClose={() => setDraft(null)} width={860}>
        {draft && (
          <div className="form-editor">
            <div className="modal-head">
              <div>
                <h2 style={{ margin: 0 }}>{draft.id ? 'Edit form' : 'New form'}</h2>
                <p className="muted small" style={{ margin: '2px 0 0' }}>
                  Build the questions visitors answer. The preview on the right updates as you type.
                </p>
              </div>
              <Button variant="ghost" className="btn-xs" onClick={() => setDraft(null)} aria-label="Close">
                <IconX size={13} />
              </Button>
            </div>

            <div className="form-editor-body">
              <div className="form-editor-col">
                <Field label="Form name" required>
                  <TextInput value={draft.name} placeholder="e.g. Website review" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </Field>
                <Field label="Accepting submissions">
                  <span className="t-live">
                    <Toggle checked={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
                    <span className={`small ${draft.published ? 't-live-on' : 'muted'}`}>
                      {draft.published ? 'Published — public link is live' : 'Draft — link shows “not accepting”'}
                    </span>
                  </span>
                </Field>

                <div className="form-editor-qlabel">
                  <span className="strong small">Questions</span>
                  <span className="muted small">{draft.questions.length} of 20</span>
                </div>

                <div className="form-editor-questions">
                  {draft.questions.map((q, i) => (
                    <div className="fq" key={q.id}>
                      <div className="fq-head">
                        <span className="fq-num">{i + 1}</span>
                        <SelectField
                          size="sm"
                          aria-label={`Type of question ${i + 1}`}
                          value={q.type}
                          onChange={(e) => setDraft({ ...draft, questions: draft.questions.map((x) => (x.id === q.id ? { ...x, type: e.target.value as QType } : x)) })}
                        >
                          <option value="text">{TYPE_LABEL.text}</option>
                          <option value="rating">{TYPE_LABEL.rating}</option>
                          <option value="select">{TYPE_LABEL.select}</option>
                        </SelectField>
                        <span className="fq-tools">
                          <button type="button" className="btn btn-ghost btn-xs" title="Move up" disabled={i === 0} onClick={() => setDraft({ ...draft, questions: swap(draft.questions, i, i - 1) })}>↑</button>
                          <button type="button" className="btn btn-ghost btn-xs" title="Move down" disabled={i === draft.questions.length - 1} onClick={() => setDraft({ ...draft, questions: swap(draft.questions, i, i + 1) })}>↓</button>
                          <button type="button" className="btn btn-ghost btn-xs" title="Remove question" onClick={() => setDraft({ ...draft, questions: draft.questions.filter((x) => x.id !== q.id) })}>
                            <IconTrash size={12} />
                          </button>
                        </span>
                      </div>
                      <TextInput
                        size="sm"
                        aria-label={`Label of question ${i + 1}`}
                        placeholder="Ask something…"
                        value={q.label}
                        onChange={(e) => setDraft({ ...draft, questions: draft.questions.map((x) => (x.id === q.id ? { ...x, label: e.target.value } : x)) })}
                      />
                      {q.type === 'select' && (
                        <TextInput
                          size="sm"
                          aria-label={`Options of question ${i + 1}`}
                          placeholder="Options, comma separated — e.g. Sales, Support, Product"
                          value={q.options}
                          onChange={(e) => setDraft({ ...draft, questions: draft.questions.map((x) => (x.id === q.id ? { ...x, options: e.target.value } : x)) })}
                        />
                      )}
                      <label className="fq-req">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => setDraft({ ...draft, questions: draft.questions.map((x) => (x.id === q.id ? { ...x, required: e.target.checked } : x)) })}
                        />
                        <span className="small muted">Required</span>
                      </label>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="btn-xs"
                  disabled={draft.questions.length >= 20}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      questions: [...draft.questions, { id: `q${++qSeq}`, type: 'text', label: '', required: false, options: '' }],
                    })
                  }
                >
                  <IconPlus size={12} /> Add question
                </Button>
              </div>

              <aside className="form-editor-preview">
                <div className="preview-frame-bar">
                  <i /> <i /> <i /> <span>public form · live preview</span>
                </div>
                <div className="form-editor-preview-body">
                  <h3 style={{ margin: '0 0 2px' }}>{draft.name.trim() || 'Untitled form'}</h3>
                  <p className="muted small" style={{ margin: 0 }}>
                    {draft.published ? 'Live — accepting submissions' : 'Draft — not accepting submissions'}
                  </p>
                  <hr className="divider" style={{ margin: '10px 0' }} />
                  {draft.questions.length === 0 && <p className="muted small">No questions yet — add one on the left.</p>}
                  {draft.questions.map((q) => (
                    <div key={q.id} className="fp-q">
                      <span className="small strong">
                        {q.label.trim() || 'Untitled question'} {q.required && <span className="req">*</span>}
                      </span>
                      {q.type === 'rating' ? (
                        <RatingStars value={0} size="md" />
                      ) : q.type === 'select' ? (
                        <Select disabled>
                          <option value="">{q.options ? 'Choose one…' : 'Options appear here'}</option>
                        </Select>
                      ) : (
                        <span className="fp-input" />
                      )}
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            <div className="modal-actions">
              <Button variant="ghost" type="button" onClick={() => setDraft(null)} disabled={draftBusy}>
                Cancel
              </Button>
              <Button type="button" disabled={draftBusy || draft.questions.length === 0} onClick={() => void saveDraft()}>
                {draftBusy ? 'Saving…' : draft.id ? 'Save form' : 'Create form'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  const tmp = next[a];
  next[a] = next[b];
  next[b] = tmp;
  return next;
}
