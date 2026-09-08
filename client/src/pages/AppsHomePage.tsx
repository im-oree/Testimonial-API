/**
 * Products home — the company-wide dashboard. One row per product (each
 * product = one website/surface where the company collects testimonials),
 * totals across all products, filters/search, and a "New product" setup
 * wizard in a modal.
 */
import { IconPlus } from '../components/icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { AppSummary, AppsResponse } from '../lib/types';
import CreateProductModal from '../components/CreateProductModal';
import { Breadcrumbs, Button, EmptyState, ErrorBanner, PageHeader, Pager } from '../components/ui';
import { SkeletonTable } from '../components/Skeleton';
import { KebabMenu } from '../components/menu';

type Filter = 'all' | 'active' | 'paused';
const PAGE_SIZE = 8;

export default function AppsHomePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AppsResponse | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [busyPause, setBusyPause] = useState<string | null>(null);

  const load = useCallback((activeFilter: Filter, query: string, activePage: number) => {
    setLoading(true);
    const params = new URLSearchParams({ status: activeFilter, page: String(activePage), perPage: String(PAGE_SIZE) });
    if (query.trim()) params.set('q', query.trim());
    api
      .get<AppsResponse>(`/v1/apps?${params}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your products.'))
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

  async function togglePause(app: AppSummary): Promise<void> {
    setBusyPause(app.id);
    setError(null);
    try {
      await api.patch(`/v1/apps/${app.id}`, { status: app.status === 'active' ? 'paused' : 'active' });
      load(filter, q, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the product.');
    } finally {
      setBusyPause(null);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Company', to: '/app/overview' }, { label: 'Products' }]} />
      <PageHeader
        title="Products"
        subtitle="One product per website or customer-facing surface. Each product collects its own testimonials through a public form and wall, and is fully isolated from your other products."
        actions={<Button onClick={() => setCreating(true)}><IconPlus size={14} /> New product</Button>}
      />

      {error && <ErrorBanner message={error} />}

      {!data && loading && <SkeletonTable rows={4} cols={7} />}

      {data && (
        <>
          <div className="toolbar" style={{ marginTop: 18 }}>
            <div className="segmented">
              {(['all', 'active', 'paused'] as Filter[]).map((f) => (
                <button key={f} type="button" className={`segment ${filter === f ? 'active' : ''}`} onClick={() => applyFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
            <form className="search-form" onSubmit={applySearch}>
              <input className="input" type="search" placeholder="Search products or websites…" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
          </div>

          {!loading && data.rows.length === 0 && (
            <EmptyState
              title={data.total === 0 ? 'No products yet' : 'Nothing matches your search'}
              hint={data.total === 0 ? 'Create your first product to start collecting testimonials on a website.' : undefined}
            />
          )}

          {!loading && data.rows.length > 0 && (
            <div className="card table-card">
              <div className="table-scroll">
              <table className="table" style={{ minWidth: 820 }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Approved</th>
                    <th>Pending</th>
                    <th>Avg</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div className="strong">{app.name}</div>
                        {app.websiteUrl && <div className="muted small">{app.websiteUrl}</div>}
                      </td>
                      <td>
                        <span className="id-code" style={app.accentColor ? { color: app.accentColor } : undefined}>
                          {app.code}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${app.status === 'active' ? 'chip-approved' : 'chip-archived'}`}>{app.status}</span>
                      </td>
                      <td>{app.approved}</td>
                      <td>{app.pending > 0 ? <span className="strong tone-warn-text">{app.pending}</span> : app.pending}</td>
                      <td>{app.avgRating ?? '—'}</td>
                      <td className="muted small">{formatDate(app.createdAt)}</td>
                      <td>
                        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                          <Link className="btn btn-secondary btn-xs" to={`/app/a/${app.id}/overview`}>
                            Open
                          </Link>
                          <KebabMenu
                            label={`Actions for ${app.name}`}
                            actions={[
                              { id: 'wall', label: 'Public wall', onSelect: () => navigate(`/wall/${app.slug}`) },
                              { id: 'studio', label: 'Design studio', onSelect: () => navigate(`/app/a/${app.id}/studio`) },
                              {
                                id: 'pause',
                                label: app.status === 'active' ? 'Pause product' : 'Resume product',
                                disabled: busyPause === app.id,
                                onSelect: () => void togglePause(app),
                              },
                              {
                                id: 'copy',
                                label: `Copy ID (${app.code})`,
                                onSelect: () => {
                                  void navigator.clipboard?.writeText(app.code).catch(() => undefined);
                                },
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </div>
          )}

          {!loading && data.total > PAGE_SIZE && <Pager page={page} pageCount={Math.ceil(data.total / PAGE_SIZE)} total={data.total} onChange={gotoPage} />}
        </>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <h2>How it works</h2>
        <ol className="how-list">
          <li>
            <strong>Create a product</strong> for a website — e.g. “Acme Blog”. Each product is isolated with its own ID, reviews, form
            and wall.
          </li>
          <li>
            The wizard gives you the public review link and wall link — put them on that website.
          </li>
          <li>
            Visitors submit reviews, then they land in that product&apos;s <strong>Moderation</strong> queue.
          </li>
          <li>
            Approve the good ones — they appear in the product&apos;s <strong>Testimonials</strong> and on its public Wall.
          </li>
        </ol>
      </div>

      <CreateProductModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          load('all', '', 1);
        }}
      />
    </div>
  );
}
