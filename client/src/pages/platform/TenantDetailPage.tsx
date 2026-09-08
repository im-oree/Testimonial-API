/** Platform console — tenant detail: metrics + trend chart + products + identity + team + impersonate. */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, storeSessionToken } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { Paged, TeamMember, TenantDetail, ThemeSaveResponse } from '../../lib/types';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Breadcrumbs, Button, Card, ErrorBanner, Label, PageHeader, Select, StatCard, TextInput } from '../../components/ui';
import { SkeletonChart, SkeletonStats, SkeletonTable } from '../../components/Skeleton';
import ThemeEditor from '../../components/ThemeEditor';


export default function TenantDetailPage() {
  const { tenantId = '' } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [staff, setStaff] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');

  function load(): void {
    setError(null);
    Promise.all([
      api.get<TenantDetail>(`/v1/platform/tenants/${tenantId}`),
      api.get<Paged<TeamMember>>(`/v1/platform/tenants/${tenantId}/staff`),
    ])
      .then(([detail, staffData]) => {
        setTenant(detail);
        setStaff(staffData.rows);
        setOwnerEmail(detail.ownerEmail);
        setOwnerName(staffData.rows.find((m) => m.role === 'owner' && m.email === detail.ownerEmail)?.name ?? detail.ownerEmail.split('@')[0]);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load this tenant.'));
  }

  useEffect(() => {
    load();
  }, [tenantId]);

  const trendData =
    tenant?.trend.map((d) => {
      const [, m, day] = d.day.split('-');
      return { day: `${Number(m)}/${Number(day)}`, submitted: d.submitted, approved: d.approved };
    }) ?? [];

  async function save(patch: { plan?: string; status?: string }): Promise<void> {
    if (!tenant) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.patch<TenantDetail>(`/v1/platform/tenants/${tenant.id}`, patch);
      setTenant(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  }

  async function saveOwner(): Promise<void> {
    if (!tenant) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch<TenantDetail>(`/v1/platform/tenants/${tenant.id}`, { ownerEmail, ownerName });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the owner account.');
    } finally {
      setBusy(false);
    }
  }

  async function impersonate(): Promise<void> {
    if (!tenant) return;
    setImpersonating(true);
    setError(null);
    try {
      const res = await api.post<{ token: string; user: { email: string }; tenant: { id: string; name: string } }>(
        `/v1/platform/tenants/${tenant.id}/impersonate`,
      );
      storeSessionToken(res.token);
      navigate('/app', { replace: true });
      window.setTimeout(() => window.location.assign('/app'), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start impersonation.');
      setImpersonating(false);
    }
  }

  if (error && !tenant) return <ErrorBanner message={error} onRetry={load} />;
  if (!tenant)
    return (
      <div>
        <div className="card" style={{ padding: 18 }}>
          <span className="sk" style={{ display: "block", width: "40%", height: 17 }} />
          <span className="sk" style={{ display: "block", width: "62%", height: 11, marginTop: 9 }} />
        </div>
        <SkeletonStats count={8} />
        <div className="two-col" style={{ marginBottom: 14 }}>
          <SkeletonChart height={230} />
          <div className="card stack">
            <span className="sk" style={{ display: "block", width: "55%", height: 15 }} />
            <span className="sk" style={{ display: "block", width: "92%", height: 26 }} />
            <span className="sk" style={{ display: "block", width: "92%", height: 26 }} />
          </div>
        </div>
        <SkeletonTable rows={3} cols={5} />
      </div>
    );

  return (
    <div>
      <Breadcrumbs
        items={[{ label: 'Platform', to: '/platform/overview' }, { label: 'Tenants', to: '/platform/tenants' }, { label: tenant.name }]}
      />
      <PageHeader
        title={tenant.name}
        subtitle={`Tenant · ID ${tenant.id} · /${tenant.slug} · created ${formatDate(tenant.createdAt)}`}
        actions={
          <Button disabled={impersonating} onClick={() => void impersonate()}>
            {impersonating ? 'Opening…' : 'Open as company'}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {notice && <div className="banner banner-ok">✓ {notice}</div>}

      <div className="stat-grid">
        <StatCard label="Monthly MRR" value={`$${tenant.monthlyCostUsd}`} />
        <StatCard label="Products" value={tenant.apps.length} />
        <StatCard label="Testimonials" value={tenant.testimonialCount} />
        <StatCard label="Published" value={tenant.approvedCount} tone="good" />
        <StatCard label="Pending" value={tenant.pendingCount} tone={tenant.pendingCount > 0 ? 'warn' : 'good'} />
        <StatCard label="Avg rating" value={tenant.avgRating ?? '—'} />
        <StatCard label="Responses" value={tenant.submissionsCount} />
        <StatCard label="Seats" value={`${tenant.seatsUsed} / ${tenant.seatsLimit}`} />
      </div>

      <div className="two-col" style={{ marginBottom: 14 }}>
        <Card>
          <div className="chart-head">
            <div>
              <h2 style={{ margin: 0 }}>7-day activity trend</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Submissions vs approved across every product.
              </p>
            </div>
          </div>
          <div style={{ height: 230, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 24, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f4" />
                <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip cursor={{ fill: '#f7f8fe' }} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                <Bar dataKey="submitted" name="Submissions" fill="#0ea5a0" radius={[4, 4, 0, 0]} maxBarSize={16} />
                <Bar dataKey="approved" name="Approved" fill="#1b2559" radius={[4, 4, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="stack">
          <div className="brand-id">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="brand-logo" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            ) : (
              <span className="brand-avatar" style={{ background: tenant.theme?.primary ?? tenant.brandColor ?? 'var(--navy)' }}>
                {(tenant.name[0] ?? '?').toUpperCase()}
              </span>
            )}
            <div>
              <h2 style={{ margin: 0 }}>Theme &amp; branding</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Presets + fully adjustable tokens, saved server-side. The tenant can restyle it themselves — this is your Zojatech-side control.
              </p>
            </div>
          </div>
          <ThemeEditor
            endpoint={`/v1/platform/tenants/${tenant.id}/theme`}
            initial={tenant.theme ?? null}
            initialLogo={tenant.logoUrl}
            onSaved={(res: ThemeSaveResponse) => {
              setTenant((prev) => (prev ? { ...prev, theme: res.theme, brandColor: res.brandColor ?? prev.brandColor, logoUrl: res.logoUrl ?? prev.logoUrl } : prev));
              setNotice('Theme saved — the company’s public form, walls and embeds reflect it on next load.');
            }}
          />
        </Card>
      </div>

      <div className="card stack" style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Products</h2>
        <p className="muted small" style={{ marginTop: -6 }}>
          Each product collects its own testimonials. Use <strong>Open as company</strong> to manage one exactly like its owner does.
        </p>
        {tenant.apps.length === 0 ? (
          <p className="muted">This tenant has no products yet — its owner can create one after signing in.</p>
        ) : (
          <div className="card table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Approved</th>
                  <th>Pending</th>
                  <th>Rejected</th>
                  <th>Avg rating</th>
                  <th>Forms</th>
                  <th>Responses</th>
                </tr>
              </thead>
              <tbody>
                {tenant.apps.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="strong">{a.name}</div>
                      {a.websiteUrl && <div className="muted small">{a.websiteUrl}</div>}
                    </td>
                    <td>
                      <span className="id-code" style={a.accentColor ? { color: a.accentColor } : undefined}>
                        {a.code}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${a.status === 'active' ? 'chip-approved' : 'chip-archived'}`}>{a.status}</span>
                    </td>
                    <td>{a.approved}</td>
                    <td>{a.pending > 0 ? <span className="strong tone-warn-text">{a.pending}</span> : a.pending}</td>
                    <td className={a.rejected > 0 ? 'tone-bad-text' : ''}>{a.rejected}</td>
                    <td>{a.avgRating ?? '—'}</td>
                    <td>{a.forms}</td>
                    <td>{a.submissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="two-col">
        <Card>
          <h2>Plan, status & owner</h2>
          <div className="stack">
            <div>
              <Label>Plan</Label>
              <Select value={tenant.plan} disabled={busy} onChange={(e) => void save({ plan: e.target.value })}>
                <option value="starter">Starter — $29/mo</option>
                <option value="growth">Growth — $99/mo</option>
                <option value="scale">Scale — $299/mo</option>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={tenant.status} disabled={busy} onChange={(e) => void save({ status: e.target.value })}>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
            <div className="card" style={{ padding: 12, background: 'var(--lav-soft)', borderStyle: 'dashed' }}>
              <Label>Admin account (this email signs in with the demo password)</Label>
              <div className="stack" style={{ gap: 8 }}>
                <TextInput
                  type="email"
                  aria-label="Admin email"
                  value={ownerEmail}
                  disabled={busy}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@company.test"
                />
                <TextInput aria-label="Admin name" value={ownerName} disabled={busy} onChange={(e) => setOwnerName(e.target.value)} />
                <div>
                  <Button variant="outline" className="btn-xs" disabled={busy || ownerEmail === tenant.ownerEmail} onClick={() => void saveOwner()}>
                    {busy ? 'Saving…' : 'Update admin account'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2>Team</h2>
          {staff.length === 0 ? (
            <p className="muted">No staff members yet.</p>
          ) : (
            <ul className="plain-list">
              {staff.map((m) => (
                <li key={m.id} className="list-row">
                  <div>
                    <span className="strong">{m.name}</span>
                    <span className="muted"> · {m.email}</span>
                  </div>
                  <span className={`chip chip-${m.status}`}>
                    {m.role} · {m.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
