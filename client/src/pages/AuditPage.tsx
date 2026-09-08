/** Company workspace — Audit Logs: who did what, when (human + System performers). */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { AuditRow } from '../lib/types';
import { Breadcrumbs, EmptyState, ErrorBanner, PageHeader, Pager } from '../components/ui';
import { SkeletonTable } from '../components/Skeleton';

const PAGE_SIZE = 12;

function prettyAction(action: string): string {
  return action
    .split('.')
    .map((part) => (part.charAt(0).toUpperCase() + part.slice(1)).replace('_', ' '))
    .join(' · ');
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((activePage: number) => {
    setLoading(true);
    api
      .get<{ rows: AuditRow[]; total: number }>(`/v1/audit-logs?page=${activePage}&perPage=${PAGE_SIZE}`)
      .then((data) => {
        setRows(data.rows);
        setTotal(data.total);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the audit log.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Company', to: '/app/overview' }, { label: 'Audit Logs' }]} />
      <PageHeader
        title="Audit Logs"
        subtitle="Every important action on this tenant, attributed to a person or to the System (automatic processes)."
      />

      {error && <ErrorBanner message={error} onRetry={() => load(page)} />}

      {loading && <SkeletonTable rows={8} />}
      {!loading && rows.length === 0 && <EmptyState title="No audit entries yet" hint="Actions like moderation, form publishing and logins will appear here." />}

      {!loading && rows.length > 0 && (
        <div className="card">
          <ul className="audit-list">
            {rows.map((row) => {
              const actor = row.actor.toLowerCase();
              const isSystem = actor === 'system';
              const isPlatformPerformer = actor.endsWith('@zojatech.test');
              return (
                <li key={row.id} className="audit-row">
                  <div className="audit-marker">
                    <span className={`dot ${isSystem ? 'dot-system' : 'dot-human'}`} />
                  </div>
                  <div className="audit-main">
                    <div className="strong small">
                      {prettyAction(row.action)}
                      <span className={`chip ${isSystem ? 'chip-system' : 'chip-human'}`} style={{ marginLeft: 8 }}>
                        {isSystem ? 'System' : isPlatformPerformer ? 'Human · Zojatech' : 'Human'}
                      </span>
                    </div>
                    <div className="muted small">
                      by <span className="actor">{row.actor}</span>
                      {row.resource && <> · resource <code>{row.resource}</code></>}
                      {row.ip && <> · IP {row.ip}</>}
                    </div>
                  </div>
                  <div className="muted small audit-time">{formatDate(row.createdAt)}</div>
                </li>
              );
            })}
          </ul>
          {total > PAGE_SIZE && <Pager page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} onChange={(p) => { setPage(p); load(p); }} />}
        </div>
      )}
    </div>
  );
}
