/** Doc 4 — tenant dashboard (§2.2 onboarding — invite token → set password → staff record). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Button, Input, Label, storeSessionToken } from '@testimonial-api/ui';

export function OnboardingView({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ token?: string }>('/v1/auth/onboarding', { token, name, password });
      storeSessionToken(res.data.token);
      router.replace('/login?onboarded=1');
    } catch {
      setError('This invite link is invalid or expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: '80px auto' }}>
      <h1>Set up your account</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submit}>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button variant="primary" type="submit" disabled={busy}>Create account</Button>
      </form>
    </main>
  );
}
