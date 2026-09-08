/**
 * Tiny API helper — plain fetch with a bearer token.
 *
 * The token comes from the login response and is kept in localStorage (with
 * sessionStorage + in-memory fallbacks so it also works in sandboxed preview
 * iframes where storage can be restricted). Every /v1 request attaches
 * `Authorization: Bearer <token>`.
 *
 * 401 handling rules (they matter!):
 *  - A request that DID send a token and got 401 means the session is gone:
 *    clear the token and send the user to /login — but never from public
 *    pages (/login, /forms/*).
 *  - A request that did NOT send a token and got 401 just means "not signed
 *    in" — that must NOT clear/redirect, otherwise an early anonymous
 *    /v1/auth/me from the app boot could wipe a login that happened a moment
 *    later (a real race we hit).
 */

import type { MeResponse } from './types';

const TOKEN_KEY = 'demo.sessionToken';
const DEBUG_KEY = 'demo.authDebug';

let memoryToken: string | null = null;
let memoryDebug: string | null = null;

export function storeSessionToken(token: string | null | undefined): void {
  memoryToken = token ?? null;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // storage blocked (sandboxed iframe) — the in-memory token still works
  }
}

export function getSessionToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return memoryToken;
  }
}

/** Records a short "what happened" note shown on the login page when a session dies. */
export function recordAuthDebug(note: string | null): void {
  memoryDebug = note;
  if (note) console.warn('[auth debug]', note);
  try {
    if (note) window.localStorage.setItem(DEBUG_KEY, note);
    else window.localStorage.removeItem(DEBUG_KEY);
  } catch {
    // ignore
  }
}

export function getAuthDebug(): string | null {
  if (memoryDebug) return memoryDebug;
  try {
    return window.localStorage.getItem(DEBUG_KEY);
  } catch {
    return memoryDebug;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Base for API calls. Points at the same origin (/v1) which Vite proxies to the API.
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

/** Appends the token to the URL as a query param — the channel that always gets through. */
function withSessionQuery(path: string, token: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}session_token=${encodeURIComponent(token)}`;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** When true (session checks), a 401 records a note but never clears the token or redirects. */
  raw?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getSessionToken();
  const tokenSent = Boolean(token);
  const method = options.method ?? 'GET';

  // The token rides on the conventional Authorization header and on a custom
  // header. Some embedded preview environments strip headers between the
  // browser and the server, so on a 401 we transparently retry once with the
  // token in the URL (?session_token=), which always arrives.
  const doFetch = async (url: string): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      headers['x-session-token'] = token;
    }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
    });
  };

  let res: Response;
  let usedQuery = false;
  try {
    res = await doFetch(`${API_BASE}${path}`);
    if (res.status === 401 && tokenSent) {
      // Headers may have been stripped in transit — retry with the token in the URL.
      usedQuery = true;
      res = await doFetch(`${API_BASE}${withSessionQuery(path, token!)}`);
    }
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please try again.');
  }

  if (res.status === 401) {
    // Read the server's own error text so the debug note is complete.
    let serverMessage = '';
    try {
      const data = (await res.clone().json()) as { error?: { message?: string }; message?: string };
      serverMessage = data.error?.message ?? data.message ?? '';
    } catch {
      // no JSON body
    }
    if (tokenSent) {
      // We were signed in and the server says the session is gone — through
      // the header AND the URL channel (if the URL channel wasn't tried, the
      // retry already proved the header alone failed and the query worked, in
      // which case we wouldn't be here).
      const note =
        `${method} ${path} -> 401 (token ${token?.slice(0, 8)}… ` +
        `${usedQuery ? 'was sent via header and ?session_token' : 'was sent'}) ` +
        `at ${new Date().toISOString()} on ${window.location.pathname}` +
        (serverMessage ? ` — server: "${serverMessage}"` : '');
      if (options.raw) {
        // Session checks: let the auth provider decide (it clears the token
        // and marks the session as signed out) — no redirect here.
        recordAuthDebug(note);
        throw new ApiError(401, serverMessage || 'No active session.');
      }
      recordAuthDebug(note);
      storeSessionToken(null);
      const currentPath = window.location.pathname;
      const isPublic = currentPath === '/login' || currentPath.startsWith('/login/') || currentPath.startsWith('/forms/');
      if (!isPublic) {
        const next = currentPath !== '/' ? `&next=${encodeURIComponent(currentPath)}` : '';
        window.location.assign(`/login?reason=session_expired${next}`);
      }
    }
    // No token attached: this is just "anonymous request hit a private route".
    throw new ApiError(401, serverMessage || 'No active session.');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: { message?: string }; message?: string };
      message = data.error?.message ?? data.message ?? message;
    } catch {
      // no JSON body — keep the generic message
    }
    if (tokenSent) {
      recordAuthDebug(`${method} ${path} -> ${res.status} (${message}) while a token was attached.`);
    }
    throw new ApiError(res.status, message);
  }

  // Some endpoints return no body (204 etc.)
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/**
 * Raw GET /v1/auth/me for the session check. On 401 it records a note but does
 * NOT clear the token or redirect — the auth provider decides what to do.
 */
export async function fetchMeRaw(): Promise<MeResponse> {
  return request<MeResponse>('/v1/auth/me', { raw: true });
}
