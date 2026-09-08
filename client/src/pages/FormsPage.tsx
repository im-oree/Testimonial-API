/** One app — form list with publish/unpublish ("form approval"). */
import { IconExternal } from '../components/icons';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { useAppName } from '../lib/useAppName';
import type { FormRow } from '../lib/types';
import { Breadcrumbs, Button, EmptyState, ErrorBanner, PageHeader, Toggle } from '../components/ui';
import { SkeletonTable } from '../components/Skeleton';

export default function FormsPage() {
  const { appId = '' } = useParams();
  const appName = useAppName(appId);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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
      <PageHeader title="Forms" subtitle="Collect testimonials on public pages. A form must be published to accept submissions." />

      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading && <SkeletonTable rows={5} />}
      {!loading && rows.length === 0 && <EmptyState title="No forms yet" hint="Create a form to start collecting testimonials for this app." />}

      {!loading && rows.length > 0 && (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Form</th>
                <th>Public link</th>
                <th>Submissions</th>
                <th>Created</th>
                <th>Status</th>
                <th>Published</th>
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
                    <Toggle checked={f.published} disabled={busyId === f.id} onChange={() => void togglePublished(f)} />
                  </td>
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
            <strong>Moderation</strong> as pending. Approve it and it moves to your testimonials list. Toggle a form to Draft and its public
            page stops accepting submissions.
          </p>
        ) : (
          <p className="muted">No forms in this product yet.</p>
        )}
      </div>
    </div>
  );
}
