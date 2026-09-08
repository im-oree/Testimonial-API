/** Doc 4 — tenant dashboard (§2.2 MFA challenge). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, Button, Input, Label, storeSessionToken } from '@testimonial-api/ui';

export default function MfaPage() {
  const router = useRouter();
  const email = useSearchParams().get('email') ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ token?: string }>('/v1/auth/mfa/verify', { email, code });
      storeSessionToken(res.data.token);
      router.push('/app/overview');
    } catch {
      setError('That code did not work — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 380, margin: '80px auto' }}>
      <h1>Two-factor authentication</h1>
      <p>Enter the 6-digit code from your authenticator app.</p>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submit}>
        <Label htmlFor="code">Code</Label>
        <Input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
        <Button variant="primary" type="submit" disabled={busy || code.length < 6}>Verify</Button>
      </form>
    </main>
  );
}
