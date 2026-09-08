/** One app — all testimonials with status filter + search + pagination. */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useAppName } from '../lib/useAppName';
import type { Paged, Testimonial } from '../lib/types';
import { Breadcrumbs, EmptyState, ErrorBanner, PageHeader, Pager, RatingStars, StatusChip } from '../components/ui';
import { SkeletonTable } from '../components/Skeleton';

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'archived';

const FILTERS: Filter[] = ['all', 'pending', 'approved', 'rejected', 'archived'];
const PAGE_SIZE = 10;

export default function TestimonialsPage() {
  const { appId = '' } = useParams();
  const appName = useAppName(appId);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Testimonial[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (activeFilter: Filter, query: string, activePage: number) => {
      if (!appId) return;
      setLoading(true);
      const params = new URLSearchParams({ status: activeFilter, page: String(activePage), perPage: String(PAGE_SIZE) });
      if (query.trim()) params.set('q', query.trim());
      api
        .get<Paged<Testimonial>>(`/v1/apps/${appId}/testimonials?${params}`)
        .then((data) => {
          setRows(data.rows);
          setTotal(data.total);
          setError(null);
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load testimonials.'))
        .finally(() => setLoading(false));
    },
    [appId],
  );

  useEffect(() => {
    setPage(1);
    load('all', '', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  function applySearch(e: React.FormEvent): void {
    e.preventDefault();
    setPage(1);
    load(filter, q, 1);
  }
  function applyFilter(f: Filter): void {
    setFilter(f);
    setPage(1);
    load(f, q, 1);
  }
  function gotoPage(p: number): void {
    setPage(p);
    load(filter, q, p);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', to: '/app/products' },
          { label: appName ?? appId, to: `/app/a/${appId}/overview` },
          { label: 'Testimonials' },
        ]}
      />
      <PageHeader title="Testimonials" subtitle={`${total} shown${filter !== 'all' ? ` · ${filter}` : ''}`} />

      {error && <ErrorBanner message={error} onRetry={() => load(filter, q, page)} />}

      <div className="toolbar">
        <div className="segmented">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`segment ${filter === f ? 'active' : ''}`}
              onClick={() => {
                applyFilter(f);
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <form onSubmit={applySearch} className="search-form">
          <input className="input" type="search" placeholder="Search author or text…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      {loading && <SkeletonTable rows={6} />}
      {!loading && rows.length === 0 && <EmptyState title="No testimonials here" hint="Try a different filter, or wait for new form submissions." />}
      {!loading && rows.length > 0 && (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Author</th>
                <th>Rating</th>
                <th>Content</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="strong">{t.authorName ?? 'Anonymous'}</div>
                    {t.tags.length > 0 && <div className="muted small">{t.tags.join(', ')}</div>}
                  </td>
                  <td>{t.rating ? <RatingStars value={t.rating} size="sm" /> : '—'}</td>
                  <td className="content-cell">
                    <span className="clamp-3">{t.content}</span>
                  </td>
                  <td>
                    <StatusChip status={t.status} />
                  </td>
                  <td className="muted small">{timeAgo(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && total > PAGE_SIZE && <Pager page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} onChange={gotoPage} />}
      {!loading && rows.length > 0 && (
        <p className="muted small" style={{ marginTop: 8 }}>
          Approve or reject new submissions in{' '}
          <Link to={`/app/a/${appId}/testimonials/moderation`} className="linklike">
            Moderation
          </Link>
          .
        </p>
      )}
    </div>
  );
}
