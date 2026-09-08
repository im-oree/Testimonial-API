/**
 * Socket.IO client singleton (Doc 4 §1.5 + README §13).
 * Connects to the backend `/live` namespace with the session cookie
 * (Socket.IO uses the same HttpOnly cookie the REST session uses).
 * Browser-only — never connects during SSR.
 *
 * Same-origin by default (the Next server proxies /v1 + /live → the API,
 * see apps/web/next.config.mjs); set NEXT_PUBLIC_WS_URL to override.
 */
import { io, type Socket } from 'socket.io-client';

const base =
  process.env.NEXT_PUBLIC_WS_URL ?? process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

function createSocket(): Socket {
  // Polling-first: rides through the Next dev proxy reliably; upgrades to WS
  // when a direct backend socket is available.
  if (base) {
    return io(base, { path: '/live', withCredentials: true, autoConnect: false, transports: ['polling', 'websocket'] });
  }
  return io({ path: '/live', withCredentials: true, autoConnect: false, transports: ['polling', 'websocket'] });
}

/** Lazily-created singleton. `connect()` is called by useRealtime in the browser. */
export const socket: Socket = createSocket();
