/** Company workspace — Account settings: profile (name/email) + password. */
import { useEffect, useState } from 'react';
import { api, storeSessionToken } from '../lib/api';
import { useAuth } from '../auth';
import { Breadcrumbs, Button, Card, ErrorBanner, Label, PageHeader, TextInput } from '../components/ui';
import { SkeletonCards } from '../components/Skeleton';

interface AccountInfo {
  user: { id: string; email: string; name: string; role: string };
  tenantName: string;
}

export default function AccountPage() {
  const { refresh } = useAuth();
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    api
      .get<AccountInfo>('/v1/account')
      .then((data) => {
        setInfo(data);
        setName(data.user.name);
        setEmail(data.user.email);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your account.'));
  }, []);

  async function saveProfile(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.patch<{ user: { id: string; email: string; name: string; role: string }; token?: string }>('/v1/account', {
        name,
        email,
      });
      if (res.token) storeSessionToken(res.token);
      await refresh();
      setInfo((prev) => (prev ? { ...prev, user: res.user } : prev));
      setNotice('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.patch('/v1/account', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('Password updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Company', to: '/app/overview' }, { label: 'Settings', to: '/app/settings' }, { label: 'Account' }]} />
      <PageHeader
        title="Account settings"
        subtitle={info ? `Signed in as ${info.user.role} on ${info.tenantName}.` : 'Manage the account you sign in with.'}
      />

      {error && <ErrorBanner message={error} />}
      {notice && <div className="banner banner-ok">✓ {notice}</div>}
      {!info && !error && <SkeletonCards count={2} height={250} wrap="two-col" />}

      {info && (
        <div className="two-col">
          <Card className="stack">
            <h2 style={{ margin: 0 }}>Profile</h2>
            <p className="muted small" style={{ marginTop: -6, marginBottom: 0 }}>
              Your name and sign-in email. Changing the email updates it everywhere and keeps you signed in.
            </p>
            <form className="stack" onSubmit={(e) => void saveProfile(e)}>
              <div>
                <Label>Full name</Label>
                <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Email</Label>
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="modal-actions">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save profile'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="stack">
            <h2 style={{ margin: 0 }}>Password</h2>
            <p className="muted small" style={{ marginTop: -6, marginBottom: 0 }}>
              {`Demo account — current password is demo1234 for every seeded user.`}
            </p>
            <form className="stack" onSubmit={(e) => void changePassword(e)}>
              <div>
                <Label>Current password</Label>
                <TextInput type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div>
                <Label>New password (min 6 characters)</Label>
                <TextInput type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div>
                <Label>Confirm new password</Label>
                <TextInput type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <div className="modal-actions">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Updating…' : 'Change password'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
