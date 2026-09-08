/** Platform console — super-company Audit Logs (human Zojatech staff + System performers). */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { AuditRow } from '../../lib/types';
import { Breadcrumbs, EmptyState, ErrorBanner, PageHeader, Pager } from '../../components/ui';
import { SkeletonTable } from '../../components/Skeleton';

const PAGE_SIZE = 15;

function prettyAction(action: string): string {
  return action.split('.').map((p) => (p.charAt(0).toUpperCase() + p.slice(1)).replace('_', ' ')).join(' · ');
}

export default function PlatformAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((p: number) => {
    setLoading(true);
    api
      .get<{ rows: AuditRow[]; total: number }>(`/v1/platform/audit-logs?page=${p}&perPage=${PAGE_SIZE}`)
      .then((data) => {
        setRows(data.rows);
        setTotal(data.total);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the platform audit log.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Platform', to: '/platform/overview' }, { label: 'Audit Logs' }]} />
      <PageHeader
        title="Platform Audit Logs"
        subtitle="Everything Zojatech staff and System processes do across every tenant."
      />

      {error && <ErrorBanner message={error} onRetry={() => load(page)} />}
      {loading && <SkeletonTable rows={8} />}
      {!loading && rows.length === 0 && <EmptyState title="No audit entries yet" />}

      {!loading && rows.length > 0 && (
        <div className="card">
          <ul className="audit-list">
            {rows.map((row) => {
              const isSystem = row.actor.toLowerCase() === 'system';
              return (
                <li key={row.id} className="audit-row">
                  <div className="audit-marker">
                    <span className={`dot ${isSystem ? 'dot-system' : 'dot-human'}`} />
                  </div>
                  <div className="audit-main">
                    <div className="strong small">
                      {prettyAction(row.action)}
                      <span className={`chip ${isSystem ? 'chip-system' : 'chip-human'}`} style={{ marginLeft: 8 }}>
                        {isSystem ? 'System' : 'Human · Zojatech'}
                      </span>
                    </div>
                    <div className="muted small">
                      by <span className="actor">{row.actor}</span>
                      {row.resource && (
                        <>
                          {' '}· company/tenant <code>{row.resource}</code>
                        </>
                      )}
                      {row.ip && <> · IP {row.ip}</>}
                    </div>
                  </div>
                  <div className="muted small audit-time">{formatDate(row.createdAt)}</div>
                </li>
              );
            })}
          </ul>
          {total > PAGE_SIZE && (
            <Pager
              page={page}
              pageCount={Math.ceil(total / PAGE_SIZE)}
              total={total}
              onChange={(p) => {
                setPage(p);
                load(p);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
