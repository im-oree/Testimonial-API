/** Platform console — add a staff account (name, email, role template, initial password). */
import { IconX } from '../../components/icons';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { PlatformStaffMember, RoleTemplateSummary } from '../../lib/types';
import { Button } from '../../components/ui';
import { Field, PasswordInput, SelectField, TextInput } from '../../components/fields';
import Modal from '../../components/Modal';

export default function CreateStaffModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('platform_editor');
  const [password, setPassword] = useState('demo1234');
  const [templates, setTemplates] = useState<RoleTemplateSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmail('');
    setRole('platform_editor');
    setPassword('demo1234');
    setError(null);
    api
      .get<{ rows: PlatformStaffMember[]; templates: RoleTemplateSummary[] }>('/v1/platform/staff')
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setTemplates([]));
  }, [open]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post<PlatformStaffMember>('/v1/platform/staff', { name, email, role, password });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
      setBusy(false);
    }
  }

  const selected = templates.find((t) => t.id === role);

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <div className="stack">
        <div className="modal-head">
          <div>
            <h2 style={{ margin: 0 }}>Add a team account</h2>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              They can sign in to the platform console right away with the credentials below.
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <IconX size={13} /> Close
          </Button>
        </div>
        <form className="stack" onSubmit={(e) => void submit(e)}>
          <Field label="Full name" required htmlFor="ns-name">
            <TextInput id="ns-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Zojatech" />
          </Field>
          <Field label="Work email" required hint="Used to sign in to the console." htmlFor="ns-email">
            <TextInput id="ns-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@zojatech.test" />
          </Field>
          <Field label="Role template" htmlFor="ns-role">
            <SelectField id="ns-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.description}
                </option>
              ))}
            </SelectField>
            {selected && <span className="f-hint">{selected.perms.length} permission grants in this template.</span>}
          </Field>
          <Field label="Initial password" hint="Demo accounts share demo1234; change it after the first sign-in." htmlFor="ns-password">
            <PasswordInput id="ns-password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
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
            <Button type="submit" disabled={busy || !name.trim() || !email.trim()}>
              {busy ? 'Creating…' : 'Create account'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
