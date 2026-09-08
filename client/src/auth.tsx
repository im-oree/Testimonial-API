/**
 * Auth context — loads the current session once (GET /v1/auth/me) and makes
 * it available to the guards and the layout headers.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, ApiError, fetchMeRaw, getSessionToken, recordAuthDebug, storeSessionToken } from './lib/api';
import type { MeImpersonating, MeResponse } from './lib/types';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthState {
  status: AuthStatus;
  kind: 'company' | 'platform' | null;
  user: MeResponse['user'] | null;
  tenant: MeResponse['tenant'];
  permissions: string[];
  roleTemplates: MeResponse['roleTemplates'];
  impersonating: MeImpersonating | null;
  /** Swaps an impersonation session back to the platform admin's own session. */
  exitImpersonation: () => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [me, setMe] = useState<MeResponse | null>(null);

  /**
   * Checks the session with GET /v1/auth/me. fetchMeRaw already retries the
   * request over every token channel (header, custom header, URL query) before
   * giving up, so a 401 here means the server genuinely rejected the session.
   * Non-401 failures (server mid-restart, network blip) get one retry before
   * we treat the app as signed out.
   */
  const load = async (): Promise<void> => {
    setStatus('loading');
    const tokenAtStart = getSessionToken();
    const applyOrClear = async (): Promise<void> => {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const data = await fetchMeRaw();
          // A login/sign-out may have happened while this request was in
          // flight — only apply the result if the token is unchanged.
          if (getSessionToken() !== tokenAtStart) return;
          setMe(data);
          setStatus('signedIn');
          return;
        } catch (err) {
          if (getSessionToken() !== tokenAtStart) return;
          if (err instanceof ApiError && err.status === 401) {
            // fetchMeRaw already recorded the "what happened" note.
            storeSessionToken(null);
            setMe(null);
            setStatus('signedOut');
            return;
          }
          // Transient failure — retry once, then treat as signed out (the
          // token is kept; a fresh login will replace it).
          if (attempt === 1) {
            recordAuthDebug('Session check could not reach the server — retrying once.');
            await new Promise((resolve) => setTimeout(resolve, 700));
            continue;
          }
          recordAuthDebug(err instanceof Error ? err.message : 'Session check failed without a server response.');
          setMe(null);
          setStatus('signedOut');
          return;
        }
      }
    };
    await applyOrClear();
  };

  useEffect(() => {
    void load();
  }, []);

  const value = useMemo<AuthState>(() => {
    const kind = me?.tenant ? 'company' : 'platform';
    return {
      status,
      kind: status === 'signedIn' ? kind : null,
      user: me?.user ?? null,
      tenant: me?.tenant ?? null,
      permissions: me?.permissions ?? [],
      roleTemplates: me?.roleTemplates ?? undefined,
      impersonating: me?.impersonating ?? null,
      exitImpersonation: async () => {
        try {
          const res = await api.post<{ token: string }>('/v1/auth/impersonation/exit');
          const tenantId = me?.impersonating?.tenantId ?? '';
          storeSessionToken(res.token);
          setMe(null);
          setStatus('signedOut');
          window.location.assign(`/platform/tenants/${tenantId}`);
        } catch {
          // Leave the session untouched; the banner stays visible.
        }
      },
      refresh: load,
      signOut: () => {
        storeSessionToken(null);
        setMe(null);
        setStatus('signedOut');
      },
    };
  }, [status, me]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Full-screen loading shown while the session is checked. */
export function FullScreenLoading({ label = 'Checking your session…' }: { label?: string }) {
  return (
    <div className="screen-center">
      <div className="spinner" aria-hidden />
      <p className="muted">{label}</p>
    </div>
  );
}

/**
 * Route guard. Renders children only for a signed-in session of the given
 * kind (company = tenant dashboard, platform = platform console).
 *
 * The auth provider checks /me once when the app loads. Right after a fresh
 * login on /login there is a valid token but the provider still reports
 * "signed out", so when a token exists we re-check /me once before ever
 * bouncing to /login (this is what kept kicking users back with
 * "Your session ended").
 */
export function RequireAuth({ kind, children }: { kind: 'company' | 'platform'; children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  const rechecked = useRef(false);

  const hasToken = Boolean(getSessionToken());
  const shouldRecheck = auth.status === 'signedOut' && hasToken && !rechecked.current;

  useEffect(() => {
    if (shouldRecheck) {
      rechecked.current = true;
      void auth.refresh();
    }
  }, [shouldRecheck, auth]);

  if (auth.status === 'loading' || shouldRecheck) return <FullScreenLoading />;
  if (auth.status === 'signedOut' || !auth.kind) {
    return <Navigate to={{ pathname: '/login', search: '?reason=session_expired' }} replace state={{ from: location.pathname }} />;
  }
  if (kind === 'company' && auth.kind !== 'company') return <Navigate to="/platform/overview" replace />;
  if (kind === 'platform' && auth.kind !== 'platform') return <Navigate to="/app" replace />;
  return <>{children}</>;
}
