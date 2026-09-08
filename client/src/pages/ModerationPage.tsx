/** One app — moderation queue (pending testimonials → approve/reject). */
import { IconCheck } from '../components/icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import { timeAgo } from '../lib/format';
import { useAppName } from '../lib/useAppName';
import type { Paged, Testimonial } from '../lib/types';
import { Breadcrumbs, Button, EmptyState, ErrorBanner, PageHeader, RatingStars } from '../components/ui';
import { SkeletonCards } from '../components/Skeleton';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!appId) return;
    setLoading(true);
    api
      .get<Paged<QueueItem>>(`/v1/apps/${appId}/testimonials?status=pending&perPage=200`)
      .then((data) => {
        setItems(data.rows);
        setTotal(data.total);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the queue.'))
      .finally(() => setLoading(false));
  }, [appId]);

  useEffect(() => {
    load();
  }, [load]);

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

      {error && <ErrorBanner message={error} onRetry={load} />}
      {!canModerate && !loading && <ErrorBanner message="Your role does not include moderation permissions." />}

      {loading && <SkeletonCards count={3} height={130} wrap="stack" />}
      {!loading && items.length === 0 && (
        <EmptyState title="All caught up" hint="New form submissions for this product land here as pending testimonials." />
      )}

      {!loading &&
        items.map((item) => (
          <div className="card queue-card" key={item.id}>
            <div className="queue-head">
              <div>
                <span className="strong">{item.authorName ?? 'Anonymous'}</span>
                <span className="muted small"> · {timeAgo(item.createdAt)}</span>
                {item.tags.length > 0 && (
                  <span className="chip chip-tag" style={{ marginLeft: 8 }}>
                    {item.tags.join(', ')}
                  </span>
                )}
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

      {!loading && items.length > 0 && (
        <p className="muted small" style={{ marginTop: 8 }}>
          Approved testimonials appear in{' '}
          <Link to={`/app/a/${appId}/testimonials`} className="linklike">
            Testimonials
          </Link>
          .
        </p>
      )}
    </div>
  );
}
