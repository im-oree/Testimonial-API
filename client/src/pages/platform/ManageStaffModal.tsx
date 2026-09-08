/**
 * Manage-access modal — one surface for a platform staff account's lifecycle:
 * role template (RBAC), password reset, status and (super admin) removal.
 *
 * Read-only by design when the viewer holds staff.read only; the toggle is
 * driven by the caller via canWrite.
 */
import { IconCheck, IconLock, IconRefresh, IconX } from '../../components/icons';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import type { PlatformStaffMember, RoleTemplateSummary } from '../../lib/types';
import { Button } from '../../components/ui';
import { Field, PasswordInput, SelectField } from '../../components/fields';
import Modal from '../../components/Modal';
import { ConfirmDialog } from '../../components/menu';
import { ROLE_LABEL } from './PlatformStaffPage';

/** Human-readable permission catalogue (label + section) for the matrix view. */
const PERM_GROUPS: { section: string; perms: [string, string][] }[] = [
  {
    section: 'Access & impersonation',
    perms: [
      ['impersonate', 'Open any tenant exactly as its owner (super-company access)'],
    ],
  },
  {
    section: 'Tenants',
    perms: [
      ['tenants.read', 'View tenants, their products, staff and themes'],
      ['tenants.write', 'Create tenants, change plans/status, themes and staff'],
    ],
  },
  {
    section: 'Catalogue',
    perms: [['templates.write', 'Create and edit theme & design templates']],
  },
  {
    section: 'Accounts',
    perms: [
      ['staff.read', 'View the team-accounts directory'],
      ['staff.write', 'Invite staff, change roles, reset passwords, suspend'],
    ],
  },
  {
    section: 'Billing',
    perms: [['billing.read', 'View MRR and invoices']],
  },
  {
    section: 'Audit & system',
    perms: [
      ['audit.read', 'Read the platform audit log'],
      ['audit.all', 'Read every workspace’s audit logs (all tenants)'],
      ['platform.manage', 'System-level console controls (AI providers etc.)'],
    ],
  },
];

export default function ManageStaffModal({
  member,
  templates,
  actorEmail,
  canWrite,
  isSuper,
  isSelf,
  onClose,
  onChanged,
}: {
  member: PlatformStaffMember | null;
  templates: RoleTemplateSummary[];
  actorEmail: string;
  canWrite: boolean;
  isSuper: boolean;
  isSelf: boolean;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setPassword('');
      setError(null);
      setBusy(null);
    }
  }, [member]);

  if (!member) return null;

  const template = templates.find((t) => t.id === role);
  const editable = canWrite && !isSelf;
  const mayResetPassword = canWrite || isSelf;
  const removable = canWrite && isSuper && !isSelf && member.email !== actorEmail;

  async function act(kind: 'role' | 'password' | 'status' | 'remove', payload: Record<string, unknown>): Promise<void> {
    if (!member) return;
    if (kind === 'remove') {
      setBusy('remove');
      setError(null);
      try {
        await api.del(`/v1/platform/staff/${member.id}`);
        onChanged(`${member.name} was removed from the platform team.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not remove the account.');
        setBusy(null);
      }
      return;
    }
    setBusy(kind);
    setError(null);
    try {
      const updated = await api.patch<PlatformStaffMember>(`/v1/platform/staff/${member.id}`, payload);
      if (kind === 'role') onChanged(`${updated.name} now holds the ${ROLE_LABEL[updated.role] ?? updated.role} role template.`);
      else if (kind === 'password') onChanged(`Password ${isSelf ? 'changed' : 'reset'} for ${updated.email}.`);
      else if (kind === 'status') onChanged(`${updated.email} is now ${updated.status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that change.');
      setBusy(null);
    }
  }

  return (
    <Modal open onClose={onClose} width={640}>
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
          <div className="banner">
            You are editing your own account. Role, status and email are locked to protect the console; you can still change
            your password and display name.
          </div>
        )}
        {!editable && canWrite && !isSelf && (
          <div className="banner banner-error">This account was removed or is unavailable — refresh the list.</div>
        )}
        {error && (
          <div className="banner banner-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-section">
          <div className="modal-section-title">
            <IconLock size={14} /> Role template &amp; permissions
          </div>
          <div>
            <Field label="Role template" htmlFor={`role-${member.id}`}>
              <SelectField
                id={`role-${member.id}`}
                size="sm"
                value={role}
                disabled={!editable}
                onChange={(e) => setRole(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.perms.length} grants
                  </option>
                ))}
              </SelectField>
            </Field>
            {template && <p className="muted small" style={{ margin: '4px 0 0' }}>{template.description}</p>}
            <div className="perm-list perm-list-col" style={{ marginTop: 8 }}>
              {PERM_GROUPS.map((g) => (
                <li key={g.section} className="perm-group-li">
                  <div className="perm-group-label">{g.section}</div>
                  <ul className="perm-list">
                    {g.perms.map(([scope, label]) => {
                      const on = template?.perms.includes(scope) ?? false;
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
            </div>
            {editable && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  className="btn-xs"
                  disabled={busy !== null || role === member.role}
                  onClick={() => void act('role', { role })}
                >
                  {busy === 'role' ? 'Saving…' : role === member.role ? 'No change to role' : `Assign ${ROLE_LABEL[role] ?? role}`}
                </Button>
              </div>
            )}
          </div>
        </div>

        <hr className="divider" style={{ margin: '10px 0' }} />

        <div className="modal-section">
          <div className="modal-section-title">
            <IconRefresh size={14} /> Password
          </div>
          <p className="muted small" style={{ margin: '0 0 8px' }}>
            {isSelf ? 'Choose a new password for your own console sign-in.' : 'Reset this account’s password. The person signs in with the new value next time.'}
          </p>
          {mayResetPassword ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px' }}>
                <Field label={isSelf ? 'New password' : 'Temporary password'} htmlFor={`pwd-${member.id}`}>
                  <PasswordInput
                    id={`pwd-${member.id}`}
                    size="sm"
                    value={password}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
              </div>
              <Button
                variant="secondary"
                className="btn-xs"
                disabled={busy !== null || password.length < 6}
                onClick={() => void act('password', { password })}
              >
                {busy === 'password' ? 'Saving…' : isSelf ? 'Change password' : 'Reset password'}
              </Button>
            </div>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>
              Your role can view accounts but not reset passwords — a super admin or admin can do that for you.
            </p>
          )}
        </div>

        <hr className="divider" style={{ margin: '10px 0' }} />

        <div className="modal-section" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="modal-section-title" style={{ margin: 0 }}>
            Account status
            <span className={`chip chip-${member.status}`} style={{ marginLeft: 8 }}>
              {member.status}
            </span>
          </div>
          {editable && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="outline"
                className="btn-xs"
                disabled={busy !== null || member.status === 'active'}
                onClick={() => void act('status', { status: 'active' })}
              >
                {busy === 'status' ? 'Saving…' : 'Activate'}
              </Button>
              <Button
                variant="danger"
                className="btn-xs"
                disabled={busy !== null || member.status === 'suspended'}
                onClick={() => void act('status', { status: 'suspended' })}
              >
                {busy === 'status' ? 'Saving…' : 'Suspend'}
              </Button>
            </div>
          )}
        </div>

        {removable && (
          <div className="modal-section danger-zone" style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="strong small">Remove account</div>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                They immediately lose console access and the audit log records it. Super admin only.
              </p>
            </div>
            <Button variant="danger" className="btn-xs" disabled={busy !== null} onClick={() => setConfirmRemove(true)}>
              {busy === 'remove' ? 'Removing…' : 'Remove account'}
            </Button>
          </div>
        )}
      </div>
      {/* Removing an account is destructive — it always confirms first. */}
      <ConfirmDialog
        open={confirmRemove}
        title="Remove this account?"
        body={
          <p className="muted" style={{ margin: 0 }}>
            <strong>{member.name}</strong> ({member.email}) immediately loses platform console access. The action is
            recorded in the audit log.
          </p>
        }
        confirmLabel="Remove account"
        busy={busy === 'remove'}
        onConfirm={() => {
          setConfirmRemove(false);
          void act('remove', {});
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </Modal>
  );
}
