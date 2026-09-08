/**
 * Testimonial API — unified sign-in (2026-09-08 consolidation).
 * One login for every audience; the mode switch picks the right backend
 * endpoint + post-login workspace:
 *   company/tenant staff  -> POST /v1/auth/login        -> /app/overview
 *   platform staff        -> POST /v1/platform/auth/login -> /platform/overview
 * External sites never sign in here — they integrate via API keys against
 * the backend's public endpoints.
 *
 * Demo accounts are one-click: the buttons below fill the form with the
 * seeded in-memory credentials and sign you in immediately (see
 * apps/api/src/modules/demo). They only exist while the demo slice is wired.
 */
'use client';

import axios from 'axios';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, Button, Input, Label, storeSessionToken } from '@testimonial-api/ui';

type Mode = 'company' | 'platform';

const MODES: Record<Mode, { title: string; endpoint: string; defaultNext: string }> = {
  company: {
    title: 'Sign in to your workspace',
    endpoint: '/v1/auth/login',
    defaultNext: '/app/overview',
  },
  platform: {
    title: 'Platform admin',
    endpoint: '/v1/platform/auth/login',
    defaultNext: '/platform/overview',
  },
};

const DEMO_ACCOUNTS: Array<{ mode: Mode; label: string; email: string; password: string }> = [
  { mode: 'company', label: 'Company workspace · Acme Inc', email: 'owner@acme.test', password: 'demo1234' },
  { mode: 'platform', label: 'Platform admin · Zojatech', email: 'admin@zojatech.test', password: 'demo1234' },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'platform' ? 'platform' : 'company');
  const cfg = MODES[mode];
  const next = searchParams.get('next') ?? cfg.defaultNext;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(searchParams.get('reason'));
  const [busy, setBusy] = useState(false);

  const doLogin = async (creds: { email: string; password: string }, targetMode: Mode): Promise<void> => {
    const target = MODES[targetMode];
    const targetNext = searchParams.get('next') ?? target.defaultNext;
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ requiresMfa?: boolean; token?: string }>(target.endpoint, creds);
      storeSessionToken(res.data.token); // demo sessions are token-based (iframe-proof)
      if (res.data.requiresMfa) {
        router.push(`/login/mfa?email=${encodeURIComponent(creds.email)}`);
      } else {
        router.push(targetNext);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setError('Cannot reach the server. If this is the preview, the API may still be starting — try again in a moment.');
      } else {
        setError('Invalid email or password.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    await doLogin({ email, password }, mode);
  };

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]): void => {
    setMode(account.mode);
    setEmail(account.email);
    setPassword(account.password);
    void doLogin({ email: account.email, password: account.password }, account.mode);
  };

  return (
    <main style={{ maxWidth: 380, margin: '80px auto' }}>
      <h1>{cfg.title}</h1>
      <p>
        <Button variant="ghost" onClick={() => setMode(mode === 'company' ? 'platform' : 'company')}>
          {mode === 'company' ? 'Platform staff? Sign in as admin' : 'Company staff? Sign in to your workspace'}
        </Button>
      </p>
      {error && <p role="alert" data-testid="login-error">{error}</p>}
      <form onSubmit={submit}>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
      <p style={{ fontSize: 13, color: 'var(--foreground-tertiary)', lineHeight: 1.7 }}>
        <strong>Demo access</strong> — local in-memory backend, no real data. Pick an account to fill the form and sign in:
      </p>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {DEMO_ACCOUNTS.map((account) => (
          <Button key={account.email} variant="secondary" type="button" disabled={busy} onClick={() => fillDemo(account)}>
            {account.label} — {account.email} / {account.password}
          </Button>
        ))}
      </div>
    </main>
  );
}
