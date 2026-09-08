/**
 * API client (Doc 4 §1.3) — axios instance with auth interceptors:
 *   • 401          → silent /v1/auth/refresh, retry original once, else /login
 *   • 409 PERM_STALE → silent /me refetch (invalidate queryKeys.me), retry
 * Browser-only concerns are guarded for SSR (server components never run the
 * refresh/redirect branches).
 */
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

export const apiClient: AxiosInstance = axios.create({
  // Same-origin by default (the Next server proxies /v1 → the API, see
  // apps/web/next.config.mjs). Set NEXT_PUBLIC_API_URL / NEXT_PUBLIC_API_BASE_URL
  // to talk to a remote API directly instead.
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  withCredentials: true, // HttpOnly session cookies
});

const isBrowser = typeof window !== 'undefined';

/** Injected by the app Providers so api-client never imports a QueryClient. */
let queryClientRef: QueryClient | null = null;
export function setApiQueryClient(qc: QueryClient): void {
  queryClientRef = qc;
}

// --- Demo session token (local, no cookies) --------------------------------
// The preview runs inside an embedded iframe where third-party cookies are
// frequently blocked, so the demo slice also returns a session `token` on
// login which we persist here and send as `Authorization: Bearer`. Real
// backends can keep using cookies — when no token is stored no header is sent.
const TOKEN_KEY = 'demo.sessionToken';

export function storeSessionToken(token: string | null | undefined): void {
  if (!isBrowser) return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — auth will fall back to cookies */
  }
}

function readSessionToken(): string | null {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use((config) => {
  const token = readSessionToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

async function silentRefresh(): Promise<boolean> {
  if (!isBrowser) return false;
  try {
    const token = readSessionToken();
    await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/v1/auth/refresh`,
      {},
      { withCredentials: true, headers: token ? { Authorization: `Bearer ${token}` } : undefined },
    );
    return true;
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ error?: { code?: string } }>) => {
    const config = error.config as RetriableConfig | undefined;
    const code = error.response?.data?.error?.code;

    // 409 PERM_STALE → permissions changed server-side; refetch /me, retry once.
    if (error.response?.status === 409 && code === 'PERM_STALE' && config && !config._retried) {
      config._retried = true;
      queryClientRef?.invalidateQueries({ queryKey: queryKeys.me });
      try {
        return await apiClient(config);
      } catch {
        return Promise.reject(error);
      }
    }

    // 401 → silent refresh, retry once; if refresh fails force re-login.
    if (error.response?.status === 401 && config && !config._retried && isBrowser) {
      config._retried = true;
      const refreshed = await silentRefresh();
      if (refreshed) {
        try {
          return await apiClient(config);
        } catch {
          return Promise.reject(error);
        }
      }
      storeSessionToken(null); // stale/expired demo session
      const next = window.location.pathname;
      window.location.assign(`/login${next && next !== '/login' ? `?next=${encodeURIComponent(next)}` : ''}`);
    }

    return Promise.reject(error);
  },
);

/** The EnvShape code returned by the backend for a stale permission version. */
export const PERM_STALE_CODE = 'PERM_STALE';
