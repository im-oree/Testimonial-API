/** Platform console — Audit Logs: console events, or (super admin) every workspace merged into one view. */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useAuth } from '../../auth';
import type { AuditRow } from '../../lib/types';
import { Breadcrumbs, EmptyState, ErrorBanner, PageHeader, Pager } from '../../components/ui';
import { SkeletonTable } from '../../components/Skeleton';

const PAGE_SIZE = 15;

function prettyAction(action: string): string {
  return action.split('.').map((p) => (p.charAt(0).toUpperCase() + p.slice(1)).replace('_', ' ')).join(' · ');
}

export default function PlatformAuditPage() {
  const { permissions } = useAuth();
  const canSeeAll = permissions.includes('audit.all');
  const [scope, setScope] = useState<'platform' | 'all'>('platform');
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((p: number, s: 'platform' | 'all') => {
    setLoading(true);
    api
      .get<{ rows: AuditRow[]; total: number; scope: 'platform' | 'all'; tenantNames?: Record<string, string> }>(
        `/v1/platform/audit-logs?page=${p}&perPage=${PAGE_SIZE}&scope=${s}`,
      )
      .then((data) => {
        setRows(data.rows);
        setTotal(data.total);
        setScope(data.scope);
        setTenantNames(data.tenantNames ?? {});
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the platform audit log.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(1, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Platform', to: '/platform/overview' }, { label: 'Audit Logs' }]} />
      <PageHeader
        title="Audit Logs"
        subtitle={
          scope === 'all'
            ? 'Every workspace’s audit log plus console events — the super-admin view of everything.'
            : 'Everything Zojatech staff and System processes do across every tenant.'
        }
        actions={
          canSeeAll ? (
            <div className="segmented" role="radiogroup" aria-label="Audit scope">
              <button type="button" role="radio" aria-checked={scope === 'platform'} className={`segment ${scope === 'platform' ? 'active' : ''}`} onClick={() => { setPage(1); load(1, 'platform'); }}>
                Platform events
              </button>
              <button type="button" role="radio" aria-checked={scope === 'all'} className={`segment ${scope === 'all' ? 'active' : ''}`} onClick={() => { setPage(1); load(1, 'all'); }}>
                All workspaces
              </button>
            </div>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => load(page, scope)} />}
      {loading && <SkeletonTable rows={8} />}
      {!loading && rows.length === 0 && <EmptyState title="No audit entries yet" />}

      {!loading && rows.length > 0 && (
        <div className="card">
          <ul className="audit-list">
            {rows.map((row) => {
              const isSystem = row.actor.toLowerCase() === 'system';
              const workspace = row.tenantId ? tenantNames[row.tenantId] ?? row.tenantId : null;
              return (
                <li key={row.id} className="audit-row">
                  <div className="audit-marker">
                    <span className={`dot ${isSystem ? 'dot-system' : 'dot-human'}`} />
                  </div>
                  <div className="audit-main">
                    <div className="strong small">
                      {prettyAction(row.action)}
                      {workspace ? (
                        <span className="chip chip-tenant" style={{ marginLeft: 8 }}>
                          workspace · {workspace}
                        </span>
                      ) : (
                        <span className={`chip ${isSystem ? 'chip-system' : 'chip-human'}`} style={{ marginLeft: 8 }}>
                          {isSystem ? 'System' : 'Human · Zojatech'}
                        </span>
                      )}
                    </div>
                    <div className="muted small">
                      by <span className="actor">{row.actor}</span>
                      {row.resource && (
                        <>
                          {' '}· {workspace ? 'resource' : 'company/tenant'} <code>{row.resource}</code>
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
                load(p, scope);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
