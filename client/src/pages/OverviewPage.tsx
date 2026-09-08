/** One app's dashboard — stats + moderation snapshot + jump links for that app. */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { AppSummary, FormRow, Overview, Testimonial } from '../lib/types';
import { Breadcrumbs, Button, ErrorBanner, PageHeader, StatCard } from '../components/ui';
import { SkeletonChart, SkeletonStats } from '../components/Skeleton';

export default function OverviewPage() {
  const { appId = '' } = useParams();
  const [app, setApp] = useState<AppSummary | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recent, setRecent] = useState<Testimonial[]>([]);
  const [publishedForm, setPublishedForm] = useState<FormRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appId) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      api.get<{ rows: AppSummary[] }>(`/v1/apps?perPage=200`).then((d) => d.rows.find((a) => a.id === appId) ?? null),
      api.get<Overview>(`/v1/dashboard/overview?appId=${appId}`),
      api.get<{ rows: Testimonial[]; total: number }>(`/v1/apps/${appId}/testimonials?status=pending&perPage=5`),
      api.get<{ rows: FormRow[] }>(`/v1/apps/${appId}/forms`).then((d) => d.rows.find((f) => f.published) ?? null),
    ])
      .then(([appRow, ov, pending, form]) => {
        if (!alive) return;
        if (!appRow) {
          setError('This app does not exist or you do not have access to it.');
        }
        setApp(appRow);
        setOverview(ov);
        setRecent(pending.rows);
        setPublishedForm(form);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load this app.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [appId]);

  if (loading)
    return (
      <div>
        <div className="card" style={{ padding: 18 }}>
          <span className="sk" style={{ display: "block", width: "45%", height: 17 }} />
          <span className="sk" style={{ display: "block", width: "70%", height: 11, marginTop: 9 }} />
        </div>
        <SkeletonStats count={4} />
        <div className="two-col">
          <SkeletonChart height={170} />
          <div className="card stack">
            <span className="sk" style={{ display: "block", width: "60%", height: 13 }} />
            <span className="sk" style={{ display: "block", width: "100%", height: 34 }} />
            <span className="sk" style={{ display: "block", width: "100%", height: 34 }} />
            <span className="sk" style={{ display: "block", width: "100%", height: 34 }} />
            <span className="sk" style={{ display: "block", width: "100%", height: 34 }} />
          </div>
        </div>
      </div>
    );
  if (error || !app) return <ErrorBanner message={error ?? 'App not found.'} />;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Products', to: '/app/products' }, { label: app.name, to: `/app/a/${app.id}/overview` }, { label: 'Overview' }]} />
      <PageHeader
        title={app.name}
        subtitle={app.websiteUrl ? `${app.websiteUrl} — testimonials collected for this site only.` : 'This app has no website URL set yet.'}
      />

      {error && <ErrorBanner message={error} />}
      {overview && (
        <>
          <div className="stat-grid">
            <StatCard label="Pending review" value={overview.totalPending} tone={overview.totalPending > 0 ? 'warn' : 'good'} />
            <StatCard label="Approved" value={overview.totalApproved} tone="good" />
            <StatCard label="Rejected" value={overview.totalRejected} />
            <StatCard label="Total testimonials" value={overview.totalTestimonials} />
          </div>

          <div className="two-col">
            <section className="card">
              <h2>Waiting for moderation</h2>
              {recent.length === 0 ? (
                <p className="muted">Nothing to review — all caught up. 🎉</p>
              ) : (
                <ul className="plain-list">
                  {recent.map((t) => (
                    <li key={t.id} className="list-row">
                      <div>
                        <span className="strong">{t.authorName ?? 'Anonymous'}</span>
                        <span className="muted"> · {new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="muted clamp-2">{t.content}</p>
                    </li>
                  ))}
                </ul>
              )}
              {overview.totalPending > 0 && (
                <Link className="btn btn-secondary" to={`/app/a/${app.id}/testimonials/moderation`}>
                  Open moderation ({overview.totalPending})
                </Link>
              )}
            </section>

            <section className="card">
              <h2>This app&apos;s sections</h2>
              <div className="stack">
                <Link className="btn btn-secondary btn-block" to={`/app/a/${app.id}/testimonials`}>
                  Testimonials — browse all reviews
                </Link>
                <Link className="btn btn-secondary btn-block" to={`/app/a/${app.id}/testimonials/moderation`}>
                  Moderation — approve & reject
                </Link>
                <Link className="btn btn-secondary btn-block" to={`/app/a/${app.id}/forms`}>
                  Forms — collect new reviews
                </Link>
                {publishedForm ? (
                  <a className="btn btn-secondary btn-block" href={`/forms/${publishedForm.slug}`} target="_blank" rel="noreferrer">
                    Open public form: /forms/{publishedForm.slug}
                  </a>
                ) : (
                  <Button variant="secondary" className="btn-block" disabled>
                    Publish a form first to get a public link
                  </Button>
                )}
              </div>
              <p className="muted small" style={{ marginTop: 12 }}>
                Tip: submit a review on the public form — it appears in this product&apos;s moderation instantly.
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
