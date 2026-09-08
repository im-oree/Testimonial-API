/** Platform console — super-company Master Overview: cards + MRR chart + per-tenant metrics. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { PlatformOverview } from '../../lib/types';
import { Breadcrumbs, ErrorBanner, PageHeader, StatCard } from '../../components/ui';
import { SkeletonChart, SkeletonStats, SkeletonTable } from '../../components/Skeleton';

const PLAN_COLOR: Record<string, string> = { starter: '#0ea5a0', growth: '#1b2559', scale: '#9b9fea' };

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function shortName(name: string): string {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

export default function PlatformOverviewPage() {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PlatformOverview>('/v1/platform/overview')
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load platform metrics.'));
  }, []);

  const mrrs = data ? money.format(data.monthlyMrrUsd) : '';
  const chartRows =
    data?.byTenant.map((t) => ({ name: shortName(t.name), mrr: t.monthlyCostUsd, fill: PLAN_COLOR[t.plan] ?? '#1b2559' })) ?? [];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Platform', to: '/platform/overview' }, { label: 'Overview' }]} />
      <PageHeader title="Master Dashboard" subtitle="Zojatech — the super-company view of every tenant, their plans and live numbers." />

      {error && <ErrorBanner message={error} />}
      {!error && !data && (
          <>
            <SkeletonStats count={5} />
            <SkeletonChart title height={240} />
            <SkeletonTable rows={5} cols={6} />
          </>
        )}

      {data && (
        <>
          <div className="stat-grid">
            <StatCard label="Monthly MRR" value={mrrs} />
            <StatCard label="Tenants" value={data.subCompanies} />
            <StatCard label="Products (all)" value={data.activeApps} />
            <StatCard label="Total testimonials" value={data.totalTestimonials} />
            <StatCard label="Pending review (all)" value={data.pendingReview} tone={data.pendingReview > 0 ? 'warn' : 'good'} />
          </div>

          {chartRows.length > 0 && (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="chart-head">
                <div>
                  <h2 style={{ margin: 0 }}>MRR by tenant</h2>
                  <p className="muted small" style={{ margin: '2px 0 0' }}>
                    Monthly recurring revenue per plan — starter teal, growth navy, scale lavender.
                  </p>
                </div>
              </div>
              <div style={{ height: 240, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 26, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f4" />
                    <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      cursor={{ fill: '#f7f8fe' }}
                      formatter={(value) => [money.format(Number(value)), 'MRR']}
                      contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Bar dataKey="mrr" radius={[6, 6, 0, 0]} barSize={38}>
                      {chartRows.map((r, i) => (
                        <Cell key={i} fill={r.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <h2 style={{ marginTop: 4 }}>Metrics by tenant</h2>
          <p className="muted small" style={{ marginTop: -6 }}>
            Every tenant&apos;s own numbers: subscription MRR, products, testimonials and responses.
          </p>
          <div className="card table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Owner</th>
                  <th>Plan</th>
                  <th>MRR</th>
                  <th>Products</th>
                  <th>Testimonials</th>
                  <th>Approved</th>
                  <th>Pending</th>
                  <th>Responses</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.byTenant.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link className="strong linklike" to={`/platform/tenants/${t.id}`}>
                        {t.name}
                      </Link>
                      <div className="muted small">/{t.slug}</div>
                    </td>
                    <td className="muted small">{t.ownerEmail}</td>
                    <td>
                      <span className="chip chip-tenant">{t.plan}</span>
                    </td>
                    <td>${t.monthlyCostUsd}</td>
                    <td>{t.products}</td>
                    <td>{t.testimonials}</td>
                    <td>{t.approved}</td>
                    <td>{t.pending > 0 ? <span className="strong tone-warn-text">{t.pending}</span> : t.pending}</td>
                    <td>{t.responses}</td>
                    <td className="muted small">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
