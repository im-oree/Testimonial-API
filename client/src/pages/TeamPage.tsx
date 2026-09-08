/** Company workspace — Users & Roles: members + invite modal + read-only role-permissions modal. */
import { IconCheck, IconPlus, IconX } from '../components/icons';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useAuth } from '../auth';
import type { TeamMember } from '../lib/types';
import { Breadcrumbs, Button, ErrorBanner, Label, PageHeader, Select, TextInput } from '../components/ui';
import { SkeletonTable } from '../components/Skeleton';
import Modal from '../components/Modal';

interface RoleInfo {
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  title: string;
  color: 'navy' | 'lav' | 'gray';
  description: string;
  permissions: { scope: string; label: string }[];
}

const ROLES: RoleInfo[] = [
  {
    role: 'owner',
    title: 'Owner / Admin',
    color: 'navy',
    description: 'Full control: products, reviews, moderation, team and workspace settings. This tenant’s owner account holds it.',
    permissions: [
      { scope: 'apps.manage', label: 'Create, pause and configure products' },
      { scope: 'testimonials.moderate', label: 'Moderate the review queue' },
      { scope: 'testimonials.write', label: 'Manually add testimonials' },
      { scope: 'forms.manage', label: 'Publish and edit public review forms' },
      { scope: 'widgets.manage', label: 'Configure the embeddable widget' },
      { scope: 'team.manage', label: 'Invite people and change their roles' },
      { scope: 'settings.manage', label: 'Manage workspace settings' },
      { scope: 'audit.read', label: 'Read the audit log' },
    ],
  },
  {
    role: 'editor',
    title: 'Editor',
    color: 'lav',
    description: 'Day-to-day content work: add testimonials, shape forms and widgets. Cannot moderate the queue or manage the team.',
    permissions: [
      { scope: 'testimonials.read', label: 'View reviews and analytics' },
      { scope: 'testimonials.write', label: 'Manually add testimonials' },
      { scope: 'forms.manage', label: 'Publish and edit public review forms' },
      { scope: 'widgets.manage', label: 'Configure the embeddable widget' },
    ],
  },
  {
    role: 'viewer',
    title: 'Viewer',
    color: 'gray',
    description: 'Read-only access for stakeholders: see approved reviews, the public wall and the audit log. Nothing can be changed.',
    permissions: [
      { scope: 'testimonials.read', label: 'View approved reviews and public walls' },
      { scope: 'audit.read', label: 'Read the audit log' },
    ],
  },
];

export default function TeamPage() {
  const { user, permissions } = useAuth();
  const canManage = permissions.includes('team.manage');

  const [rows, setRows] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [openRole, setOpenRole] = useState<RoleInfo | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ rows: TeamMember[] }>('/v1/team')
      .then((data) => {
        setRows(data.rows);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the team.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const member = await api.post<TeamMember>('/v1/team/invites', { email: inviteEmail, role: inviteRole });
      setNotice(`${member.email} was invited as ${member.role}.`);
      setInviteEmail('');
      setInviting(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the invite.');
    } finally {
      setBusy(false);
    }
  }

  const byRole = (r: string): number => rows.filter((m) => m.role === r).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Company', to: '/app/overview' }, { label: 'Users & Roles' }]} />
      <PageHeader
        title="Users & Roles"
        subtitle={`${rows.length} member${rows.length === 1 ? '' : 's'} on this tenant. You are ${user?.email ?? 'signed in'}.`}
        actions={
          canManage ? (
            <Button onClick={() => setInviting(true)} disabled={inviting}>
              <IconPlus size={13} /> Invite member
            </Button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}
      {notice && <div className="banner banner-ok"><IconCheck size={13} /> {notice}</div>}

      <h2>Reference roles</h2>
      <p className="muted small" style={{ marginTop: -6 }}>
        Three roles ship with every tenant. Click one to see exactly what it can do.
      </p>
      <div className="role-grid">
        {ROLES.map((role) => (
          <button key={role.role} type="button" className={`card role-card role-${role.color}`} onClick={() => setOpenRole(role)}>
            <div className="role-card-head">
              <span className="strong">{role.title}</span>
              <span className="chip chip-role chip-role-soft">{role.role}</span>
            </div>
            <p className="muted small">{role.description}</p>
            <p className="small">
              <span className="strong">{byRole(role.role)}</span> member{byRole(role.role) === 1 ? '' : 's'} ·{' '}
              <span className="linklike">View permissions</span>
            </p>
          </button>
        ))}
      </div>

      <div className="card table-card">
        <h2 style={{ margin: '12px 0 4px' }}>Members</h2>
        {loading ? (
          <SkeletonTable bare rows={4} />
        ) : rows.length === 0 ? (
          <p className="muted">No members yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const info = ROLES.find((r) => r.role === m.role || (m.role === 'admin' && r.role === 'owner'));
                return (
                  <tr key={m.id}>
                    <td>
                      <div className="strong">{m.name}</div>
                      <div className="muted small">{m.email}</div>
                    </td>
                    <td>
                      <span className={`chip chip-role chip-role-${info?.color ?? 'gray'}`}>{m.role}</span>
                    </td>
                    <td>
                      <span className={`chip chip-${m.status}`}>{m.status}</span>
                    </td>
                    <td className="muted small">{m.lastActiveAt ? timeAgo(m.lastActiveAt) : 'Never'}</td>
                    <td>
                      <Button variant="ghost" className="btn-xs" onClick={() => setOpenRole(info ?? ROLES[0])}>
                        Permissions
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Read-only role permissions modal */}
      <Modal open={Boolean(openRole)} onClose={() => setOpenRole(null)} width={560}>
        {openRole && (
          <div className="stack">
            <div className="modal-head">
              <div>
                <h2 style={{ margin: 0 }}>{openRole.title}</h2>
                <p className="muted small" style={{ margin: '2px 0 0' }}>
                  Read-only view of this role&apos;s permissions
                </p>
              </div>
              <Button variant="ghost" onClick={() => setOpenRole(null)}>
                <IconX size={13} /> Close
              </Button>
            </div>
            <p className="small">{openRole.description}</p>
            <ul className="perm-list">
              {openRole.permissions.map((p) => (
                <li key={p.scope}>
                  <span className="perm-check"><IconCheck size={11} /></span>
                  <div>
                    <div className="small strong">{p.label}</div>
                    <code className="perm-code">{p.scope}</code>
                  </div>
                </li>
              ))}
            </ul>
            <p className="muted small">
              <strong>{byRole(openRole.role)}</strong> member{byRole(openRole.role) === 1 ? '' : 's'} currently hold this role.
            </p>
          </div>
        )}
      </Modal>

      {/* Invite member modal */}
      <Modal open={inviting} onClose={() => setInviting(false)} width={480}>
        <div className="stack">
          <div className="modal-head">
            <div>
              <h2 style={{ margin: 0 }}>Invite a member</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                They&apos;ll get an email invite and can pick a password when they join.
              </p>
            </div>
            <Button variant="ghost" onClick={() => setInviting(false)}>
              <IconX size={13} /> Close
            </Button>
          </div>
          <form className="stack" onSubmit={(e) => void invite(e)}>
            <div>
              <Label>Work email *</Label>
              <TextInput type="email" required autoFocus value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@acme.test" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="editor">Editor — add content, manage forms</option>
                <option value="viewer">Viewer — read-only</option>
                <option value="owner">Owner/Admin — full control</option>
              </Select>
            </div>
            {error && (
              <div className="banner banner-error" role="alert">
                {error}
              </div>
            )}
            <div className="modal-actions">
              <Button variant="ghost" type="button" onClick={() => setInviting(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !inviteEmail.trim()}>
                {busy ? 'Sending…' : 'Send invite'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
