/**
 * Company workspace — Team & roles: role templates served from the API
 * (single source), the member directory, invites that create working
 * sign-in accounts, and member management (role change, suspend/activate,
 * password reset). The owner row is the tenant's super admin and is locked;
 * nobody can edit their own row here — the personal profile lives in
 * Account settings.
 */
import { IconCheck, IconPlus, IconX } from '../components/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useAuth } from '../auth';
import type { RoleTemplateSummary, TeamMember } from '../lib/types';
import { Breadcrumbs, Button, ErrorBanner, PageHeader } from '../components/ui';
import { Field, PasswordInput, SearchField, SelectField, TextInput } from '../components/fields';
import { ConfirmDialog, KebabMenu } from '../components/menu';
import { SkeletonTable } from '../components/Skeleton';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';

const ROLE_COLOR: Record<string, string> = { owner: 'navy', admin: 'teal', editor: 'lav', viewer: 'gray' };

/** Human-readable permission catalogue for the tenant RBAC matrix. */
const PERM_CATALOG: { section: string; perms: [string, string][] }[] = [
  {
    section: 'Products & integrations',
    perms: [
      ['apps.manage', 'Create, pause and configure products (write)'],
      ['webhooks.manage', 'Manage webhooks and API keys (write)'],
      ['forms.manage', 'Publish and edit public review forms (write)'],
      ['widgets.manage', 'Configure the embeddable widget design (write)'],
    ],
  },
  {
    section: 'Testimonials',
    perms: [
      ['testimonials.read', 'View reviews, submissions and analytics (read)'],
      ['testimonials.write', 'Manually add testimonials (write)'],
      ['testimonials.moderate', 'Moderate the review queue (write)'],
    ],
  },
  {
    section: 'Team & settings',
    perms: [
      ['team.manage', 'Invite members, change roles, reset passwords (write)'],
      ['settings.manage', 'Manage workspace appearance and settings (write)'],
    ],
  },
  {
    section: 'Billing & audit',
    perms: [
      ['billing.view', 'View the workspace plan and billing (read)'],
      ['audit.read', 'Read this workspace’s audit log (read)'],
    ],
  },
];

function PermissionMatrix({ template }: { template?: RoleTemplateSummary | null }) {
  if (!template) return <p className="muted small">No template selected.</p>;
  return (
    <ul className="perm-list perm-list-col" style={{ marginTop: 8 }}>
      {PERM_CATALOG.map((g) => (
        <li key={g.section} className="perm-group-li">
          <div className="perm-group-label">{g.section}</div>
          <ul className="perm-list">
            {g.perms.map(([scope, label]) => {
              const on = template.perms.includes(scope);
              return (
                <li key={scope}>
                  <span className={`perm-check ${on ? '' : 'perm-check-off'}`}>{on ? <IconCheck size={11} /> : '–'}</span>
                  <div>
                    <div className="small strong">{label}</div>
                    <code className="perm-code">{scope}</code>
                  </div>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

interface CreatedCreds {
  email: string;
  password: string;
}

export default function TeamPage() {
  const { user, permissions } = useAuth();
  const canManage = permissions.includes('team.manage');

  const [rows, setRows] = useState<TeamMember[] | null>(null);
  const [templates, setTemplates] = useState<RoleTemplateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedCreds | null>(null);
  const [q, setQ] = useState('');

  const [inviting, setInviting] = useState(false);
  const [roleDetail, setRoleDetail] = useState<RoleTemplateSummary | null>(null);
  const [managing, setManaging] = useState<TeamMember | null>(null);

  const load = useCallback(() => {
    api
      .get<{ rows: TeamMember[] }>('/v1/team')
      .then((data) => {
        setRows(data.rows);
        setError(null);
      })
      .catch((err: unknown) => {
        setRows([]);
        setError(err instanceof Error ? err.message : 'Could not load the team.');
      });
  }, []);

  useEffect(() => {
    load();
    api
      .get<{ templates: RoleTemplateSummary[] }>('/v1/team/roles')
      .then((d) => setTemplates(d.templates))
      .catch(() => setTemplates([]));
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((m) => `${m.name} ${m.email} ${m.role}`.toLowerCase().includes(needle));
  }, [rows, q]);

  const countByRole = (roleId: string): number => (rows ?? []).filter((m) => m.role === roleId).length;
  const viewerMode = !canManage;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Company', to: '/app/overview' }, { label: 'Team & roles' }]} />
      <PageHeader
        title="Team & roles"
        subtitle={`${rows?.length ?? 0} member${rows?.length === 1 ? '' : 's'} on this workspace. You are ${user?.email ?? 'signed in'}.`}
        actions={
          canManage ? (
            <Button onClick={() => setInviting(true)}>
              <IconPlus size={13} /> Add member
            </Button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}
      {created && (
        <div className="banner credential-box" role="status">
          <div className="small strong">Member added — sign-in credentials (shown once)</div>
          <div className="strong" style={{ fontSize: 13 }}>
            {created.email} · <code>{created.password}</code>
          </div>
          <div className="small muted" style={{ marginTop: 2 }}>
            They can sign in right away and change their password any time under Account settings.
          </div>
          <Button variant="ghost" className="btn-xs" style={{ marginTop: 6 }} onClick={() => setCreated(null)}>
            <IconX size={12} /> Got it
          </Button>
        </div>
      )}

      <h2>Role templates</h2>
      <p className="muted small" style={{ marginTop: -6 }}>
        {viewerMode
          ? 'Every member is bound to a role template. Your role can view them; click one to see exactly what it can read and write.'
          : 'Every member is bound to a role template. Reads and writes are separate grants — assigning a template is how you change what a person can do.'}
      </p>
      {templates.length === 0 ? (
        <div className="card" style={{ padding: 14 }}>
          <span className="sk" style={{ display: 'block', height: 12, width: '70%' }} />
        </div>
      ) : (
        <div className="role-grid role-grid-templates">
          {templates.map((t) => (
            <button key={t.id} type="button" className={`card role-card role-${ROLE_COLOR[t.id] ?? 'gray'}`} onClick={() => setRoleDetail(t)}>
              <div className="role-card-head">
                <span className="strong">{t.name}</span>
                <span className={`chip chip-role chip-role-${ROLE_COLOR[t.id] ?? 'gray'}`}>
                  {countByRole(t.id)} member{countByRole(t.id) === 1 ? '' : 's'}
                </span>
              </div>
              <p className="muted small">{t.description}</p>
              <p className="small">
                <span className="strong">{t.perms.length}</span> permission grants · <span className="linklike">View permissions</span>
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="card table-card">
        <div className="table-head-row">
          <h2 style={{ margin: 0 }}>Members</h2>
          <SearchField size="sm" placeholder="Search by name, email or role…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} aria-label="Search members" />
        </div>
        {!rows ? (
          <SkeletonTable bare rows={4} />
        ) : filtered.length === 0 ? (
          <p className="muted" style={{ padding: '18px 4px' }}>
            {q ? 'No member matches that search.' : 'No members yet — add the first one.'}
          </p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role template</th>
                  <th>Status</th>
                  <th>Last active</th>
                  <th style={{ textAlign: 'right' }}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const isSelf = m.email === user?.email;
                  const isOwner = m.role === 'owner';
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="strong">{m.name}</div>
                        <div className="muted small">{m.email}</div>
                        {isSelf && <span className="chip chip-tenant" style={{ marginTop: 2 }}>you</span>}
                      </td>
                      <td>
                        <span className={`chip chip-role chip-role-${ROLE_COLOR[m.role] ?? 'gray'}`}>{m.role}</span>
                      </td>
                      <td>
                        <span className={`chip chip-${m.status}`}>{m.status}</span>
                      </td>
                      <td className="muted small">{m.lastActiveAt ? timeAgo(m.lastActiveAt) : 'Never'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {isSelf || isOwner ? (
                          <Button variant="ghost" className="btn-xs" onClick={() => setManaging(m)}>
                            Permissions
                          </Button>
                        ) : (
                          <Button variant={canManage ? 'outline' : 'ghost'} className="btn-xs" onClick={() => setManaging(m)}>
                            {canManage ? 'Manage access' : 'Permissions'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role template detail (read-only matrix) */}
      <Modal open={Boolean(roleDetail)} onClose={() => setRoleDetail(null)} width={600}>
        {roleDetail && (
          <div className="stack">
            <div className="modal-head">
              <div>
                <h2 style={{ margin: 0 }}>{roleDetail.name}</h2>
                <p className="muted small" style={{ margin: '2px 0 0' }}>
                  {countByRole(roleDetail.id)} member{countByRole(roleDetail.id) === 1 ? '' : 's'} hold this template
                </p>
              </div>
              <Button variant="ghost" onClick={() => setRoleDetail(null)}>
                <IconX size={13} /> Close
              </Button>
            </div>
            <p className="small">{roleDetail.description}</p>
            <PermissionMatrix template={roleDetail} />
          </div>
        )}
      </Modal>

      <MemberManageModal
        member={managing}
        templates={templates}
        actorEmail={user?.email ?? ''}
        canManage={canManage}
        onClose={() => setManaging(null)}
        onChanged={(message) => {
          toast(message);
          setManaging(null);
          load();
        }}
      />

      {/* Add member modal */}
      <Modal open={inviting} onClose={() => setInviting(false)} width={520}>
        <AddMemberForm
          templates={templates}
          onClose={() => setInviting(false)}
          onCreated={(creds) => {
            setCreated(creds);
            setInviting(false);
            load();
          }}
        />
      </Modal>
    </div>
  );
}

function AddMemberForm({
  templates,
  onClose,
  onCreated,
}: {
  templates: RoleTemplateSummary[];
  onClose: () => void;
  onCreated: (creds: CreatedCreds) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ credentials: CreatedCreds }>('/v1/team/invites', { email, role });
      onCreated(res.credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the member.');
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={(e) => void submit(e)}>
      <div className="modal-head">
        <div>
          <h2 style={{ margin: 0 }}>Add a member</h2>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            No outbound email in the demo, so a sign-in account is created immediately — credentials are shown once here.
          </p>
        </div>
        <Button variant="ghost" type="button" onClick={onClose}>
          <IconX size={13} /> Close
        </Button>
      </div>
      <Field label="Work email" required hint="This is also their sign-in account." htmlFor="tm-email">
        <TextInput id="tm-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@acme.test" />
      </Field>
      <Field label="Role template" htmlFor="tm-role">
        <SelectField id="tm-role" value={role} onChange={(e) => setRole(e.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.perms.length} grants
            </option>
          ))}
        </SelectField>
      </Field>
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}
      <div className="modal-actions">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? 'Adding…' : 'Add member'}
        </Button>
      </div>
    </form>
  );
}

function MemberManageModal({
  member,
  templates,
  actorEmail,
  canManage,
  onClose,
  onChanged,
}: {
  member: TeamMember | null;
  templates: RoleTemplateSummary[];
  actorEmail: string;
  canManage: boolean;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setPassword('');
      setError(null);
      setBusy(null);
      setConfirmSuspend(false);
    }
  }, [member]);

  if (!member) return null;
  const isOwner = member.role === 'owner';
  const isSelf = member.email === actorEmail;
  const editable = canManage && !isOwner && !isSelf;
  const template = templates.find((t) => t.id === role);

  async function act(kind: 'role' | 'password' | 'status', payload: Record<string, unknown>): Promise<void> {
    if (!member) return;
    setBusy(kind);
    setError(null);
    try {
      const updated = await api.patch<TeamMember>(`/v1/team/${member.id}`, payload);
      if (kind === 'role') onChanged(`${updated.name} now holds the ${updated.role} role template.`);
      else if (kind === 'password') onChanged(`Password reset for ${updated.email} — they sign in with the new one next time.`);
      else onChanged(`${updated.email} is now ${updated.status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that change.');
      setBusy(null);
    }
  }

  return (
    <Modal open onClose={onClose} width={620}>
      <div className="stack">
        <div className="modal-head">
          <div>
            <h2 style={{ margin: 0 }}>{member.name}</h2>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              {member.email} · last active {member.lastActiveAt ? timeAgo(member.lastActiveAt) : 'never'}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <IconX size={13} /> Close
          </Button>
        </div>

        {isSelf && (
          <div className="banner">This is you — change your own profile and password under Account settings.</div>
        )}
        {isOwner && (
          <div className="banner">
            This is the workspace owner — the tenant’s super admin. Its role and status are locked from Team & roles.
          </div>
        )}
        {!canManage && !isOwner && !isSelf && (
          <div className="banner">Your role can view the team but not manage members.</div>
        )}
        {error && (
          <div className="banner banner-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-section">
          <div className="modal-section-title">Role template</div>
          {isOwner ? (
            <p className="muted small" style={{ margin: 0 }}>
              Owner — full control over this workspace (super admin).
            </p>
          ) : (
            <Field label="Template" htmlFor={`mm-role-${member.id}`}>
              <SelectField id={`mm-role-${member.id}`} size="sm" value={role} disabled={!editable} onChange={(e) => setRole(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.perms.length} grants
                  </option>
                ))}
              </SelectField>
            </Field>
          )}
          {template && <p className="muted small" style={{ margin: '4px 0 0' }}>{template.description}</p>}
          <PermissionMatrix template={template ?? (isOwner ? templates.find((t) => t.id === 'owner') ?? null : null)} />
          {editable && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button className="btn-xs" disabled={busy !== null || role === member.role} onClick={() => void act('role', { role })}>
                {busy === 'role' ? 'Saving…' : role === member.role ? 'No change to role' : `Apply ${role}`}
              </Button>
            </div>
          )}
        </div>

        <hr className="divider" style={{ margin: '10px 0' }} />

        {editable && (
          <div className="modal-section">
            <div className="modal-section-title">Password reset</div>
            <p className="muted small" style={{ margin: '0 0 8px' }}>
              Reset {member.email}’s sign-in password. They use the new value next time they sign in.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px' }}>
                <Field label="New password" htmlFor={`mm-pwd-${member.id}`}>
                  <PasswordInput id={`mm-pwd-${member.id}`} size="sm" value={password} autoComplete="new-password" placeholder="At least 6 characters" onChange={(e) => setPassword(e.target.value)} />
                </Field>
              </div>
              <Button variant="secondary" className="btn-xs" disabled={busy !== null || password.length < 6} onClick={() => void act('password', { password })}>
                {busy === 'password' ? 'Saving…' : 'Reset password'}
              </Button>
            </div>
          </div>
        )}

        {editable && (
          <>
            <hr className="divider" style={{ margin: '10px 0' }} />
            <div className="modal-section" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="modal-section-title" style={{ margin: 0 }}>
                Account status <span className={`chip chip-${member.status}`} style={{ marginLeft: 8 }}>{member.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button variant="outline" className="btn-xs" disabled={busy !== null || member.status === 'active'} onClick={() => void act('status', { status: 'active' })}>
                  {busy === 'status' ? 'Saving…' : 'Activate access'}
                </Button>
                <KebabMenu
                  label={`More actions for ${member.name}`}
                  actions={[
                    {
                      id: 'suspend',
                      label: 'Suspend access',
                      danger: true,
                      disabled: busy !== null || member.status === 'suspended',
                      onSelect: () => setConfirmSuspend(true),
                    },
                  ]}
                />
              </div>
            </div>
          </>
        )}
        <ConfirmDialog
          open={confirmSuspend}
          title={member ? `Suspend ${member.name}?` : 'Suspend?'}
          body={
            <p style={{ margin: 0 }}>
              {member ? (
                <>
                  {member.name} keeps their account, but will be blocked from signing in to this workspace
                  until an owner or manager activates them again.
                </>
              ) : (
                'No member selected.'
              )}
            </p>
          }
          confirmLabel="Suspend access"
          busy={busy !== null}
          onCancel={() => setConfirmSuspend(false)}
          onConfirm={() => void act('status', { status: 'suspended' })}
        />
      </div>
    </Modal>
  );
}
