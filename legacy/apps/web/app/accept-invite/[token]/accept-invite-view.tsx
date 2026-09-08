/** Doc 4 — tenant dashboard (accept invite → staff record). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Button, Input, Label, storeSessionToken } from '@testimonial-api/ui';

export function AcceptInviteView({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiClient.post<{ token?: string }>('/v1/auth/invites/accept', { token, name, password });
      storeSessionToken(res.data.token);
      router.replace('/login?invite=accepted');
    } catch {
      setError('This invite is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: '80px auto' }}>
      <h1>Join your team</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submit}>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button variant="primary" type="submit" disabled={busy}>Accept invite</Button>
      </form>
    </main>
  );
}
