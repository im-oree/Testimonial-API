/**
 * One app — moderation queue (pending testimonials).
 *
 * The queue is paginated (7 at a time by default) so a long backlog never
 * loads in one go, with prev/next + numbered pages and a per-page choice.
 * Each card keeps its two clear decisions (Approve first, Reject second);
 * rejecting asks for a reason before it commits. Selecting cards opens bulk
 * approve / reject so a morning queue clears in a few clicks — destructive
 * bulk steps confirm first.
 */
import { IconCheck } from '../components/icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import { timeAgo } from '../lib/format';
import { useAppName } from '../lib/useAppName';
import type { Paged, Testimonial } from '../lib/types';
import { Breadcrumbs, Button, EmptyState, ErrorBanner, PageHeader, Pager, RatingStars } from '../components/ui';
import { SkeletonCards } from '../components/Skeleton';
import { ConfirmDialog } from '../components/menu';

const PAGE_SIZES = [7, 15, 30];
const DEFAULT_PAGE_SIZE = 7;

interface QueueItem extends Testimonial {
  rejecting?: boolean;
  reason?: string;
  busy?: boolean;
}

export default function ModerationPage() {
  const { appId = '' } = useParams();
  const appName = useAppName(appId);
  const { permissions } = useAuth();
  const canModerate = permissions.includes('testimonials.moderate');

  const [items, setItems] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<null | 'approve' | 'reject'>(null);

  const load = useCallback(
    (activePage: number, size: number) => {
      if (!appId) return;
      setLoading(true);
      api
        .get<Paged<QueueItem>>(`/v1/apps/${appId}/testimonials?status=pending&page=${activePage}&perPage=${size}`)
        .then((data) => {
          setItems(data.rows);
          setTotal(data.total);
          setError(null);
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the queue.'))
        .finally(() => setLoading(false));
    },
    [appId],
  );

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    load(1, DEFAULT_PAGE_SIZE);
  }, [load]);

  function gotoPage(p: number): void {
    setPage(p);
    setSelected(new Set());
    load(p, perPage);
  }
  function changePerPage(n: number): void {
    setPerPage(n);
    setPage(1);
    setSelected(new Set());
    load(1, n);
  }

  async function decide(item: QueueItem, action: 'approve' | 'reject'): Promise<void> {
    if (action === 'reject' && !item.reason?.trim()) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, rejecting: true } : i)));
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, busy: true } : i)));
    setError(null);
    try {
      await api.patch(`/v1/apps/${appId}/testimonials/${item.id}/moderation`, {
        action,
        reason: item.reason?.trim() || undefined,
      });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed.');
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, busy: false } : i)));
    }
  }

  function cancelReject(item: QueueItem): void {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, rejecting: false, reason: '' } : i)));
  }

  const pageIds = items.map((i) => i.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  function toggleAll(): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }
  function toggleOne(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(action: 'approve' | 'reject'): Promise<void> {
    setBulkBusy(true);
    setError(null);
    try {
      await api.post(`/v1/apps/${appId}/testimonials/bulk/moderation`, { action, ids: [...selected] });
      setSelected(new Set());
      setConfirmBulk(null);
      load(page, perPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That bulk action failed.');
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', to: '/app/products' },
          { label: appName ?? appId, to: `/app/a/${appId}/overview` },
          { label: 'Moderation' },
        ]}
      />
      <PageHeader title="Moderation" subtitle={`${total} submission${total === 1 ? '' : 's'} waiting for a decision.`} />

      {error && <ErrorBanner message={error} onRetry={() => load(page, perPage)} />}
      {!canModerate && !loading && <ErrorBanner message="Your role does not include moderation permissions." />}

      {canModerate && !loading && items.length > 0 && (
        <div className="queue-toolbar">
          <label className="t-live" style={{ gap: 8 }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all on this page" />
            <span className="small muted">Select this page</span>
          </label>
          {selected.size > 0 && (
            <span className="bulk-actions" role="toolbar" aria-label="Bulk moderation">
              <span className="strong small" style={{ alignSelf: 'center' }}>{selected.size} selected</span>
              <Button variant="secondary" className="btn-xs" disabled={bulkBusy} onClick={() => void bulk('approve')}>
                <IconCheck size={12} /> Approve
              </Button>
              <Button variant="secondary" className="btn-xs" disabled={bulkBusy} onClick={() => setConfirmBulk('reject')}>
                Reject
              </Button>
              <Button variant="ghost" className="btn-xs" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </span>
          )}
        </div>
      )}

      {loading && <SkeletonCards count={3} height={130} wrap="stack" />}
      {!loading && items.length === 0 && (
        <EmptyState title="All caught up" hint="New form submissions for this product land here as pending testimonials." />
      )}

      {!loading && (
        <div className="queue-list">
          {items.map((item) => (
            <div className="card card-hover queue-card" key={item.id}>
            <div className="queue-head">
              <div className="queue-head-main">
                {canModerate && (
                  <input
                    type="checkbox"
                    style={{ width: 15, height: 15, accentColor: 'var(--brand)', cursor: 'pointer' }}
                    checked={selected.has(item.id)}
                    onChange={() => toggleOne(item.id)}
                    aria-label={`Select review by ${item.authorName ?? 'anonymous'}`}
                  />
                )}
                <div>
                  <span className="strong">{item.authorName ?? 'Anonymous'}</span>
                  <span className="muted small"> · {timeAgo(item.createdAt)}</span>
                  {item.tags.length > 0 && (
                    <span className="chip chip-tag" style={{ marginLeft: 8 }}>
                      {item.tags.join(', ')}
                    </span>
                  )}
                </div>
              </div>
              {item.rating && <RatingStars value={item.rating} size="sm" />}
            </div>
            <p className="queue-content">{item.content}</p>

            {item.rejecting ? (
              <div className="reject-row">
                <input
                  className="input"
                  autoFocus
                  placeholder="Reason for rejection (shown in the audit log)"
                  value={item.reason ?? ''}
                  onChange={(e) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, reason: e.target.value } : i)))}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelReject(item);
                  }}
                />
                <Button variant="danger" disabled={item.busy} onClick={() => void decide({ ...item, rejecting: false }, 'reject')}>
                  {item.busy ? 'Working…' : 'Confirm rejection'}
                </Button>
                <Button variant="ghost" onClick={() => cancelReject(item)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="queue-actions">
                <Button variant="secondary" disabled={item.busy} onClick={() => void decide(item, 'reject')}>
                  Reject
                </Button>
                <Button disabled={item.busy} onClick={() => void decide(item, 'approve')}>
                  {item.busy ? '…' : (<><IconCheck size={13} /> Approve</>)}
                </Button>
              </div>
            )}
            </div>
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <Pager
          page={page}
          pageCount={Math.ceil(total / perPage)}
          total={total}
          perPage={perPage}
          perPageOptions={PAGE_SIZES}
          onChange={gotoPage}
          onPerPageChange={changePerPage}
        />
      )}

      {!loading && items.length > 0 && (
        <p className="muted small" style={{ marginTop: 8 }}>
          Approved testimonials appear in{' '}
          <Link to={`/app/a/${appId}/testimonials`} className="linklike">
            Testimonials
          </Link>
          , where you can edit them and switch them live on the wall.
        </p>
      )}

      <ConfirmDialog
        open={confirmBulk !== null}
        title={confirmBulk === 'reject' ? `Reject ${selected.size} submissions?` : `Approve ${selected.size} submissions?`}
        body={
          <p className="muted" style={{ margin: 0 }}>
            {confirmBulk === 'reject'
              ? 'The selected submissions will be marked rejected and never appear on the wall.'
              : 'The selected submissions will be approved and go live on the public wall (you can hide individual ones later).'}
          </p>
        }
        confirmLabel={confirmBulk === 'reject' ? `Reject ${selected.size}` : `Approve ${selected.size}`}
        busy={bulkBusy}
        onConfirm={() => void bulk(confirmBulk === 'reject' ? 'reject' : 'approve')}
        onCancel={() => setConfirmBulk(null)}
      />
    </div>
  );
}
