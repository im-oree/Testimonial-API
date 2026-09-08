/**
 * Login page — one page for company staff and platform admins.
 * "Demo access" buttons fill the form and sign straight in (no cookies:
 * the API returns a session token that this app keeps and sends as a Bearer
 * header, so it also works inside embedded preview iframes).
 */
import { IconZojatechMark } from '../components/icons/brand';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, FullScreenLoading } from '../auth';
import { api, ApiError, getAuthDebug, recordAuthDebug, storeSessionToken } from '../lib/api';
import { Button, ErrorBanner } from '../components/ui';
import { Field, PasswordInput, TextInput } from '../components/fields';
import type { LoginResponse } from '../lib/types';

type Mode = 'company' | 'platform';

const MODE_META: Record<Mode, { title: string; subtitle: string; endpoint: string; home: string; demoLabel: string }> = {
  company: {
    title: 'Sign in to your workspace',
    subtitle: 'Products, reviews and widgets — all in one place.',
    endpoint: '/v1/auth/login',
    home: '/app',
    demoLabel: 'Company workspace · Acme Inc',
  },
  platform: {
    title: 'Platform admin',
    subtitle: 'The Zojatech staff console.',
    endpoint: '/v1/platform/auth/login',
    home: '/platform/overview',
    demoLabel: 'Platform admin · Zojatech',
  },
};

const DEMO_ACCOUNTS: Array<{ mode: Mode; label: string; email: string; password: string }> = [
  { mode: 'company', label: 'Company workspace · owner', email: 'owner@acme.test', password: 'demo1234' },
  { mode: 'company', label: 'Company workspace · editor', email: 'editor@acme.test', password: 'demo1234' },
  { mode: 'company', label: 'Company workspace · viewer', email: 'chris@acme.test', password: 'demo1234' },
  { mode: 'platform', label: 'Platform · super admin', email: 'admin@zojatech.test', password: 'demo1234' },
  { mode: 'platform', label: 'Platform · admin', email: 'tolu@zojatech.test', password: 'demo1234' },
  { mode: 'platform', label: 'Platform · editor', email: 'kemi@zojatech.test', password: 'demo1234' },
];

const REASON_MESSAGES: Record<string, string> = {
  session_expired: 'Your session ended — please sign in again.',
  onboarded: 'Account created — sign in to continue.',
  invite_accepted: 'Invite accepted — sign in to continue.',
};

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawMode = searchParams.get('mode');
  const initialMode: Mode = rawMode === 'platform' ? 'platform' : 'company';
  const nextParam = searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;
  const reason = searchParams.get('reason');

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(reason ? REASON_MESSAGES[reason] ?? reason : null);
  const [busy, setBusy] = useState(false);

  // Already signed in? Go straight to the right home instead of showing the form.
  if (auth.status === 'loading') return <FullScreenLoading />;
  if (auth.status === 'signedIn' && auth.kind) {
    const home = auth.kind === 'company' ? '/app' : '/platform/overview';
    return <Navigate to={next ?? home} replace />;
  }

  const cfg = MODE_META[mode];
  const debugNote = reason === 'session_expired' ? getAuthDebug() : null;

  async function doLogin(creds: { email: string; password: string }, targetMode: Mode): Promise<void> {
    const target = MODE_META[targetMode];
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<LoginResponse>(target.endpoint, creds);
      if (res.token) {
        storeSessionToken(res.token);
        recordAuthDebug(null); // a fresh login wipes any previous failure note
      }
      navigate(next ?? target.home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('Cannot reach the server. The API may still be starting — try again in a moment.');
      } else {
        setError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
      setBusy(false);
    }
  }

  function submit(e: FormEvent): void {
    e.preventDefault();
    void doLogin({ email, password }, mode);
  }

  function demoSignIn(account: (typeof DEMO_ACCOUNTS)[number]): void {
    setMode(account.mode);
    setEmail(account.email);
    setPassword(account.password);
    void doLogin(account, account.mode);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <IconZojatechMark size={26} />
          <span>Zojatech</span>
        </div>
        <h1>{cfg.title}</h1>
        <p className="muted">{cfg.subtitle}</p>

        <ErrorBanner message={error} />

        {debugNote && (
          <p className="debug-note" data-testid="auth-debug">
            What happened: {debugNote}
          </p>
        )}

        <div className="segmented">
          {(['company', 'platform'] as Mode[]).map((m) => (
            <button key={m} type="button" className={`segment ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
              {m === 'company' ? 'Company staff' : 'Platform admin'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="stack">
          <Field label="Email" required htmlFor="login-email">
            <TextInput id="login-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </Field>
          <Field label="Password" required htmlFor="login-password">
            <PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* Demo accounts stay out of the way: collapsed below the form. */}
        <details className="demo-access">
          <summary>
            <span className="strong small">Demo accounts</span>
            <span className="muted small"> — one-click sign-in for exploring</span>
          </summary>
          <div className="demo-list">
            {DEMO_ACCOUNTS.map((account) => (
              <Button key={account.email} variant="secondary" type="button" disabled={busy} onClick={() => demoSignIn(account)}>
                <span className="demo-btn-main">{account.label}</span>
                <span className="demo-btn-sub">{account.email} · {account.password}</span>
              </Button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
