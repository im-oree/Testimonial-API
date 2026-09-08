/** Company (tenant) workspace — Overview: totals, Recharts analytics + quick product cards. */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { AppsResponse } from '../lib/types';
import { Breadcrumbs, Button, Card, ErrorBanner, PageHeader, StatCard } from '../components/ui';
import { SkeletonChart, SkeletonStats, SkeletonTable } from '../components/Skeleton';

function shortName(name: string): string {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

const STATUS_COLORS: Record<string, string> = { Approved: '#16a34a', Pending: '#d97706', Rejected: '#dc2626' };

export default function CompanyOverviewPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AppsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AppsResponse>('/v1/apps?perPage=200')
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your workspace.'));
  }, []);

  const totals = data?.totals;
  const products = data?.rows ?? [];

  const statusData = totals
    ? [
        { name: 'Approved', value: totals.approved },
        { name: 'Pending', value: totals.pending },
        { name: 'Rejected', value: totals.rejected },
        ...(totals.totalTestimonials - (totals.approved + totals.pending + totals.rejected) > 0
          ? [{ name: 'Archived / other', value: totals.totalTestimonials - (totals.approved + totals.pending + totals.rejected) }]
          : []),
      ].filter((i) => i.value > 0)
    : [];

  const byProductData = products.map((a) => ({
    name: shortName(a.name),
    Approved: a.approved,
    Pending: a.pending,
    Rejected: a.rejected,
  }));

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Company', to: '/app/overview' }, { label: 'Overview' }]} />
      <PageHeader
        title="Overview"
        subtitle="Everything happening across your products — pick one to go deeper, or jump into moderation."
        actions={<Button onClick={() => navigate('/app/products')}>＋ New product</Button>}
      />

      {error && <ErrorBanner message={error} />}
      {!data && !error && (
          <>
            <SkeletonStats count={6} />
            <div className="charts-grid" style={{ marginBottom: 18 }}>
              <SkeletonChart title height={250} />
              <SkeletonChart title height={250} />
            </div>
            <SkeletonTable rows={4} cols={5} />
          </>
        )}

      {data && totals && (
        <>
          <div className="stat-grid">
            <StatCard label="Products" value={data.total} />
            <StatCard label="All testimonials" value={totals.totalTestimonials} />
            <StatCard label="Approved" value={totals.approved} tone="good" />
            <StatCard label="Pending review" value={totals.pending} tone={totals.pending > 0 ? 'warn' : 'good'} />
            <StatCard label="Forms" value={totals.forms} />
            <StatCard label="Responses" value={totals.submissions} />
          </div>

          <div className="charts-grid" style={{ marginBottom: 18 }}>
            <Card>
              <div className="chart-head">
                <div>
                  <h2 style={{ margin: 0 }}>Review status</h2>
                  <p className="muted small" style={{ margin: '2px 0 0' }}>
                    Approved, pending and rejected across all products.
                  </p>
                </div>
              </div>
              <div style={{ height: 250, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData.length ? statusData : [{ name: 'No reviews yet', value: 1 }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="#fff"
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#9ca3af'} />
                      ))}
                      {!statusData.length && <Cell fill="#e5e7eb" />}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <div className="chart-head">
                <div>
                  <h2 style={{ margin: 0 }}>Reviews by product</h2>
                  <p className="muted small" style={{ margin: '2px 0 0' }}>
                    Where your testimonials stand, per product.
                  </p>
                </div>
              </div>
              <div style={{ height: 250, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byProductData} margin={{ top: 24, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f4" />
                    <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} tick={{ fill: '#6b7280', fontSize: 11 }} interval={0} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <Tooltip cursor={{ fill: '#f7f8fe' }} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                    <Bar dataKey="Approved" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="Pending" stackId="a" fill="#d97706" maxBarSize={30} />
                    <Bar dataKey="Rejected" stackId="a" fill="#dc2626" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}

      {data && products.length === 0 && (
        <div className="card center-cta">
          <h2>No products yet</h2>
          <p className="muted">Create your first product — we set up its review form and wall so you can start collecting.</p>
          <Button onClick={() => navigate('/app/products')}>Create your first product</Button>
        </div>
      )}

      {data && products.length > 0 && (
        <>
          <div className="section-row">
            <h2 style={{ margin: 0 }}>Your products</h2>
            <Link className="small linklike" to="/app/products">
              Manage all products →
            </Link>
          </div>
          <div className="product-grid">
            {products.map((a) => (
              <Link key={a.id} className="card product-card" to={`/app/a/${a.id}/overview`}>
                <div className="product-card-head">
                  <span className="ws-avatar" style={{ background: a.accentColor ?? 'var(--navy)' }}>
                    {(a.name[0] ?? '?').toUpperCase()}
                  </span>
                  <div className="product-card-title">
                    <div className="strong">{a.name}</div>
                    <div className="muted small">
                      {a.code} · {a.status}
                    </div>
                  </div>
                  {a.pending > 0 && <span className="sidebar-app-badge">{a.pending} pending</span>}
                </div>
                {a.websiteUrl && <div className="muted small product-site">{a.websiteUrl}</div>}
                <div className="product-stats">
                  <span>
                    <strong>{a.approved}</strong> approved
                  </span>
                  <span>
                    <strong>{a.pending}</strong> pending
                  </span>
                  <span>
                    <strong>{a.avgRating ?? '—'}</strong> avg rating
                  </span>
                  <span>
                    <strong>{a.submissions}</strong> responses
                  </span>
                </div>
                <div className="muted small">
                  Created {formatDate(a.createdAt)}
                  <span className="product-open">Open product →</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
