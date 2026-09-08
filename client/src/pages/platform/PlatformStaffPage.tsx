/**
 * Platform console — Team accounts (staff) with role-template RBAC.
 *
 * Platform staff accounts are the people who operate the Zojatech console.
 * Every account maps to exactly one role template; the template decides its
 * grants, and reads/writes are separate permissions so "can view tenants"
 * never implies "can change tenants". Account lifecycle lives in the
 * Manage-access modal: role assignment, password reset, suspend/activate and
 * (super admin only) removal.
 */
import { IconPlus, IconUsers } from '../../components/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { useAuth } from '../../auth';
import type { PlatformStaffMember, RoleTemplateSummary } from '../../lib/types';
import { ErrorBanner, PageHeader, Button } from '../../components/ui';
import { SearchField } from '../../components/fields';
import { SkeletonTable } from '../../components/Skeleton';
import ManageStaffModal from './ManageStaffModal';
import CreateStaffModal from './CreateStaffModal';

export const ROLE_COLOR: Record<string, string> = {
  platform_owner: 'navy',
  platform_admin: 'teal',
  platform_editor: 'lav',
  platform_support: 'gray',
};

export const ROLE_LABEL: Record<string, string> = {
  platform_owner: 'Super admin',
  platform_admin: 'Admin',
  platform_editor: 'Editor',
  platform_support: 'Support',
};

export default function PlatformStaffPage() {
  const { user, permissions } = useAuth();
  const canWrite = permissions.includes('staff.write');
  const isSuper = permissions.includes('platform.manage');

  const [rows, setRows] = useState<PlatformStaffMember[] | null>(null);
  const [templates, setTemplates] = useState<RoleTemplateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [manage, setManage] = useState<PlatformStaffMember | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api
      .get<{ rows: PlatformStaffMember[]; templates: RoleTemplateSummary[] }>('/v1/platform/staff')
      .then((data) => {
        setRows(data.rows);
        setTemplates(data.templates ?? []);
        setError(null);
      })
      .catch((err: unknown) => {
        setRows([]);
        setError(err instanceof Error ? err.message : 'Could not load staff accounts.');
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((m) => `${m.name} ${m.email} ${m.role}`.toLowerCase().includes(needle));
  }, [rows, q]);

  const countByRole = (id: string): number => (rows ?? []).filter((m) => m.role === id).length;
  const me = rows?.find((m) => m.email === user?.email) ?? null;

  return (
    <div>
      <PageHeader
        title="Team accounts"
        subtitle="People who can sign in to the Zojatech console. Each account is bound to a role template — change the template to change what the person can read and write."
        actions={
          canWrite ? (
            <Button onClick={() => setCreating(true)}>
              <IconPlus size={13} /> Add account
            </Button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}
      {notice && <div className="banner banner-ok">{notice}</div>}

      <div className="role-grid role-grid-templates" style={{ marginBottom: 14 }}>
        {templates.map((t) => (
          <div key={t.id} className={`card role-card role-${ROLE_COLOR[t.id] ?? 'gray'} role-template-card`}>
            <div className="role-card-head">
              <span className="strong">{t.name}</span>
              <span className={`chip chip-role chip-role-${ROLE_COLOR[t.id] ?? 'gray'}`}>
                {countByRole(t.id)} account{countByRole(t.id) === 1 ? '' : 's'}
              </span>
            </div>
            <p className="muted small">{t.description}</p>
          </div>
        ))}
      </div>

      <div className="card table-card">
        <div className="table-head-row">
          <h2 style={{ margin: 0 }}>
            <IconUsers size={15} /> Accounts
          </h2>
          <SearchField size="sm" placeholder="Search by name, email or role…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} aria-label="Search accounts" />
        </div>
        {!rows ? (
          <SkeletonTable bare rows={4} />
        ) : filtered.length === 0 ? (
          <p className="muted" style={{ padding: '18px 4px' }}>
            {q ? 'No account matches that search.' : 'No staff accounts yet — add the first console operator.'}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role template</th>
                <th>Status</th>
                <th>Last active</th>
                <th style={{ textAlign: 'right' }}>Manage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="strong">{m.name}</div>
                    <div className="muted small">{m.email}</div>
                  </td>
                  <td>
                    <span className={`chip chip-role chip-role-${ROLE_COLOR[m.role] ?? 'gray'}`}>{ROLE_LABEL[m.role] ?? m.role}</span>
                  </td>
                  <td>
                    <span className={`chip chip-${m.status}`}>{m.status}</span>
                  </td>
                  <td className="muted small">{m.lastActiveAt ? timeAgo(m.lastActiveAt) : 'Never'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Button variant="outline" className="btn-xs" onClick={() => setManage(m)}>
                      {canWrite ? 'Manage access' : 'View access'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="muted small" style={{ marginTop: 10 }}>
        Role templates are the single source of truth for console permissions. Reads and writes are separate grants, so a
        Support account can look at tenants and audit logs but cannot change them. Permission templates can be edited in a
        later milestone — for now every console account is bound to one of the four presets above.
      </p>

      <CreateStaffModal open={creating} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />

      <ManageStaffModal
        member={manage}
        templates={templates}
        actorEmail={user?.email ?? ''}
        canWrite={canWrite}
        isSuper={isSuper}
        isSelf={me ? manage?.id === me.id : false}
        onClose={() => setManage(null)}
        onChanged={(message) => { setNotice(message); setManage(null); load(); }}
      />
    </div>
  );
}
