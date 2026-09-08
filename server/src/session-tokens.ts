/**
 * Stateless session tokens (HMAC-signed, JWT-style).
 *
 * The token carries { kind: 'company'|'platform', email } and is signed with a
 * secret that is persisted to disk next to the server. Because tokens are
 * self-contained they keep working across server restarts (the earlier
 * in-memory session map wiped every token on restart, which made the client
 * see "session rejected server-side" after the API restarted under it).
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './env';

export type SessionKind = 'company' | 'platform';
export interface Session {
  kind: SessionKind;
  email: string;
  /**
   * Set when a platform admin impersonates a company: the company token then
   * remembers who issued it so /me can flag it and the session can be exited
   * back to a platform token.
   */
  impersonatedBy?: string;
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const SECRET_PATH = process.env.SESSION_SECRET_FILE ?? path.join(moduleDir, '..', '.session-secret');

let secret: string | null = null;

function getSecret(): string {
  if (secret) return secret;
  // SESSION_SECRET (from .env / environment) wins — for deployments where
  // writing the auto-generated secret file isn't possible.
  const inline = process.env.SESSION_SECRET?.trim();
  if (inline) {
    secret = inline;
    return secret;
  }
  try {
    const existing = fs.readFileSync(SECRET_PATH, 'utf8').trim();
    if (existing) {
      secret = existing;
      return secret;
    }
  } catch {
    // not created yet — fall through and create it
  }
  const fresh = randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(SECRET_PATH, fresh, { mode: 0o600 });
    console.log('[session-tokens] created signing secret at', SECRET_PATH);
  } catch (err) {
    // Read-only filesystem (e.g. some sandboxes): keep it in memory only.
    console.warn('[session-tokens] could not persist secret, tokens will not survive restarts:', (err as Error).message);
  }
  secret = fresh;
  return secret;
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload, 'utf8').digest('base64url');
}

/** Creates a signed token for a session. `impersonatedBy` marks a company token created by a platform admin. */
export function createSessionToken(kind: SessionKind, email: string, impersonatedBy?: string): string {
  const payload = b64url(JSON.stringify(impersonatedBy ? { k: kind, e: email, i: impersonatedBy } : { k: kind, e: email }));
  return `${payload}.${sign(payload)}`;
}

/** Verifies a token and returns its session, or null when invalid. */
export function resolveSessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;
  const expected = sign(payloadPart);
  const a = Buffer.from(expected);
  const b = Buffer.from(signaturePart);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as { k?: unknown; e?: unknown; i?: unknown };
    if ((data.k === 'company' || data.k === 'platform') && typeof data.e === 'string' && data.e.length > 0) {
      return {
        kind: data.k,
        email: data.e,
        impersonatedBy: typeof data.i === 'string' && data.i.length > 0 ? data.i : undefined,
      };
    }
  } catch {
    // malformed payload
  }
  return null;
}

/** First characters of a token — useful for logs without leaking the full token. */
export function tokenPrefix(token: string | undefined): string {
  if (!token) return '-';
  return token.length > 10 ? `${token.slice(0, 10)}…` : token;
}
