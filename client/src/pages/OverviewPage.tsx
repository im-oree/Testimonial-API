/**
 * One product's dashboard — headline stats first, a real distribution chart
 * (this page's loading skeleton mirrors the exact content shape, chart and
 * all), the moderation snapshot beside it, and equally sized quick links into
 * the product's pages below. Key content stays above the fold; nothing relies
 * on a second column for important numbers.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { AppSummary, FormRow, Overview, Testimonial } from '../lib/types';
import { Breadcrumbs, ErrorBanner, PageHeader, StatCard } from '../components/ui';
import { SkeletonChart, SkeletonStats } from '../components/Skeleton';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { IconClipboard, IconEdit, IconExternal, IconLayers, IconStar } from '../components/icons';

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Approved: '#16a34a',
  Rejected: '#dc2626',
  Archived: '#94a3b8',
};

function QuickLink({ icon, title, blurb, to, disabled, hint }: { icon: React.ReactNode; title: string; blurb: string; to?: string; disabled?: boolean; hint?: string }) {
  if (disabled || !to) {
    return (
      <div className="quick-link quick-link-disabled" title={hint}>
        <span className="quick-link-ic">{icon}</span>
        <span className="strong">{title}</span>
        <span className="muted small">{hint ?? blurb}</span>
      </div>
    );
  }
  return (
    <Link className="quick-link" to={to}>
      <span className="quick-link-ic">{icon}</span>
      <span className="strong">{title}</span>
      <span className="muted small">{blurb}</span>
    </Link>
  );
}

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
          <span className="sk" style={{ display: 'block', width: '45%', height: 17 }} />
          <span className="sk" style={{ display: 'block', width: '70%', height: 11, marginTop: 9 }} />
        </div>
        <SkeletonStats count={4} />
        <div className="two-col">
          <SkeletonChart height={250} title />
          <div className="card stack">
            <span className="sk" style={{ display: 'block', width: '55%', height: 15 }} />
            <span className="sk" style={{ display: 'block', width: '100%', height: 30 }} />
            <span className="sk" style={{ display: 'block', width: '100%', height: 30 }} />
            <span className="sk" style={{ display: 'block', width: '100%', height: 30 }} />
            <span className="sk" style={{ display: 'block', width: '100%', height: 30 }} />
          </div>
        </div>
        <div className="quick-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card quick-link-sk" style={{ padding: 14 }}>
              <span className="sk" style={{ display: 'block', width: '70%', height: 13 }} />
              <span className="sk" style={{ display: 'block', width: '90%', height: 9, marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>
    );
  if (error || !app) return <ErrorBanner message={error ?? 'App not found.'} />;

  const chartRows = overview
    ? [
        { name: 'Pending', value: overview.totalPending },
        { name: 'Approved', value: overview.totalApproved },
        { name: 'Rejected', value: overview.totalRejected },
        { name: 'Archived', value: Math.max(0, overview.totalTestimonials - overview.totalPending - overview.totalApproved - overview.totalRejected) },
      ].filter((r) => r.value > 0)
    : [];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Products', to: '/app/products' }, { label: app.name, to: `/app/a/${app.id}/overview` }, { label: 'Overview' }]} />
      <PageHeader
        title={app.name}
        subtitle={app.websiteUrl ? `${app.websiteUrl} — testimonials collected for this site only.` : 'This app has no website URL set yet.'}
        actions={
          <Link className="btn btn-outline" to={`/app/a/${app.id}/studio`}>
            <IconLayers size={13} /> Open design studio
          </Link>
        }
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
              <div className="chart-head">
                <div>
                  <h2 style={{ margin: 0 }}>Review distribution</h2>
                  <p className="muted small" style={{ margin: '2px 0 0' }}>
                    How this product&apos;s reviews are spread across the moderation states.
                  </p>
                </div>
              </div>
              <div style={{ height: 250, width: '100%' }}>
                {chartRows.length === 0 ? (
                  <div className="block-center" style={{ height: '100%' }}>
                    <p className="muted">No testimonials yet — publish a form to start collecting reviews.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f2f4" />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={74} tickLine={false} axisLine={false} tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }} />
                      <Tooltip cursor={{ fill: '#f7f8fe' }} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                      <Bar dataKey="value" name="Reviews" radius={[0, 8, 8, 0]} maxBarSize={26}>
                        {chartRows.map((r) => (
                          <Cell key={r.name} fill={STATUS_COLORS[r.name] ?? '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="card stack">
              <h2 style={{ margin: 0 }}>Waiting for moderation</h2>
              {recent.length === 0 ? (
                <div className="block-center" style={{ padding: '26px 0' }}>
                  <p className="muted" style={{ margin: 0 }}>
                    Nothing to review — all caught up.
                  </p>
                </div>
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
          </div>

          <section className="card" style={{ padding: '16px 18px' }}>
            <h2 style={{ margin: 0 }}>Work with this product</h2>
            <p className="muted small" style={{ marginTop: 2 }}>
              Everything is one click away — the important destinations come first.
            </p>
            <div className="quick-grid">
              <QuickLink icon={<IconStar size={16} />} title="Testimonials" blurb="Browse all approved reviews" to={`/app/a/${app.id}/testimonials`} />
              <QuickLink icon={<IconClipboard size={16} />} title="Moderation" blurb={`${overview.totalPending} waiting`} to={`/app/a/${app.id}/testimonials/moderation`} />
              <QuickLink icon={<IconEdit size={16} />} title="Forms" blurb="Collect new reviews" to={`/app/a/${app.id}/forms`} />
              <QuickLink icon={<IconLayers size={16} />} title="Widget" blurb="Pick a template &amp; get the embed code" to={`/app/a/${app.id}/connect`} />
              <QuickLink icon={<IconLayers size={16} />} title="Design studio" blurb="Customise your widget template" to={`/app/a/${app.id}/studio`} />
              <QuickLink
                icon={<IconExternal size={16} />}
                title="Public form"
                blurb={publishedForm ? `Open /forms/${publishedForm.slug}` : 'No published form yet'}
                to={publishedForm ? `/forms/${publishedForm.slug}` : undefined}
                disabled={!publishedForm}
                hint={publishedForm ? undefined : 'Publish a form first to get a public link'}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
