/** Platform console — tenants directory + create tenant wizard (modal). */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { Paged, TenantRow } from '../../lib/types';
import { Breadcrumbs, Button, EmptyState, ErrorBanner, PageHeader, Pager } from '../../components/ui';
import { SkeletonTable } from '../../components/Skeleton';
import CreateTenantModal from './CreateTenantModal';

type Filter = 'all' | 'active' | 'trialing' | 'suspended';
const PAGE_SIZE = 10;

export default function TenantsPage() {
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback((activeFilter: Filter, query: string, activePage: number) => {
    setLoading(true);
    const params = new URLSearchParams({ status: activeFilter, page: String(activePage), perPage: String(PAGE_SIZE) });
    if (query.trim()) params.set('q', query.trim());
    api
      .get<Paged<TenantRow>>(`/v1/platform/tenants?${params}`)
      .then((data) => {
        setRows(data.rows);
        setTotal(data.total);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load tenants.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load('all', '', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilter(f: Filter): void {
    setFilter(f);
    setPage(1);
    load(f, q, 1);
  }
  function applySearch(e: React.FormEvent): void {
    e.preventDefault();
    setPage(1);
    load(filter, q, 1);
  }
  function gotoPage(p: number): void {
    setPage(p);
    load(filter, q, p);
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Platform', to: '/platform/overview' }, { label: 'Tenants' }]} />
      <PageHeader
        title="Tenants"
        subtitle={`${total} tenant${total === 1 ? '' : 's'} on the platform. Creating one provisions its ID, plan and admin account end-to-end.`}
        actions={<Button onClick={() => setCreating(true)}>＋ New tenant</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={() => load(filter, q, page)} />}

      <div className="toolbar">
        <div className="segmented">
          {(['all', 'active', 'trialing', 'suspended'] as Filter[]).map((f) => (
            <button key={f} type="button" className={`segment ${filter === f ? 'active' : ''}`} onClick={() => applyFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <form className="search-form" onSubmit={applySearch}>
          <input className="input" type="search" placeholder="Search name, slug or plan…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      {loading && <SkeletonTable rows={8} />}
      {!loading && rows.length === 0 && <EmptyState title="No tenants match" />}
      {!loading && rows.length > 0 && (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>MRR</th>
                <th>Status</th>
                <th>Products</th>
                <th>Testimonials</th>
                <th>Pending</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="clickable-row">
                  <td>
                    <Link className="strong linklike" to={`/platform/tenants/${t.id}`}>
                      {t.name}
                    </Link>
                    <div className="muted small">/{t.slug}</div>
                  </td>
                  <td className="muted small">{t.ownerEmail}</td>
                  <td>{t.plan}</td>
                  <td>${t.monthlyCostUsd}</td>
                  <td>
                    <span className={`chip chip-${t.status}`}>{t.status}</span>
                  </td>
                  <td>{t.appCount}</td>
                  <td>{t.testimonialCount}</td>
                  <td>{t.pendingCount > 0 ? <span className="strong tone-warn-text">{t.pendingCount}</span> : t.pendingCount}</td>
                  <td className="muted small">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && total > PAGE_SIZE && <Pager page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} onChange={gotoPage} />}

      <CreateTenantModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setFilter('all');
          setPage(1);
          setQ('');
          load('all', '', 1);
        }}
      />
    </div>
  );
}
