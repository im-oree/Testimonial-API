/**
 * useRealtime (Doc 4 §1.5) — the one bridge between the Socket.IO singleton
 * and React Query caches. Dashboards mount it once (in the (dashboard) layout)
 * so every appId-scoped cache stays fresh on server-pushed events.
 */
'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { socket } from '../lib/socket';
import { queryKeys } from '../lib/query-keys';

export interface RealtimeScope {
  /** appId to scope invalidation to (tenant dashboards). */
  appId?: string;
  /** platform mode: no appId, but /me can change (impersonation). */
  meEnabled?: boolean;
}

export type RealtimeEvent = { appId?: string } & Record<string, unknown>;

function invalidateFromEvent(qc: QueryClient, event: RealtimeEvent, scope: RealtimeScope): void {
  const appId = event.appId ?? scope.appId;

  switch (event.type) {
    case 'testimonial.new_pending':
    case 'testimonial.status_changed':
      if (appId) {
        void qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
        void qc.invalidateQueries({ queryKey: queryKeys.apps.stats(appId) });
        void qc.invalidateQueries({ queryKey: queryKeys.platformAnalytics('') });
      }
      break;
    case 'testimonial.import_progress':
      if (appId) void qc.invalidateQueries({ queryKey: queryKeys.testimonials.all(appId) });
      break;
    case 'form.published':
      if (appId) void qc.invalidateQueries({ queryKey: queryKeys.forms.all(appId) });
      break;
    case 'widget.updated':
      if (appId) void qc.invalidateQueries({ queryKey: queryKeys.widgets.all(appId) });
      break;
    case 'permissions_changed':
      // B/C: role change → /me refetch → sidebar re-render. Scope-refetch only.
      if (scope.meEnabled ?? true) void qc.invalidateQueries({ queryKey: queryKeys.me });
      break;
    case 'session.revoked':
      if (typeof window !== 'undefined') window.location.assign('/login?reason=session_revoked');
      break;
    case 'tenant.created':
      void qc.invalidateQueries({ queryKey: queryKeys.tenants.all });
      break;
    case 'app.updated':
    case 'app.deleted':
      if (appId) void qc.invalidateQueries({ queryKey: queryKeys.apps.all });
      break;
    case 'ai.task_completed':
      void qc.invalidateQueries({ queryKey: queryKeys.ai.tasks });
      break;
    default:
      // Unknown/forward-compatible: invalidate nothing (avoid cache storms).
      break;
  }
}

/** One realtime subscription per scope; auto re-joins on reconnect. */
export function useRealtime(scope?: RealtimeScope): { connected: boolean } {
  const qc = useQueryClient();
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const connectedRef = useRef(false);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || bootedRef.current) return;
    bootedRef.current = true;

    const onAny = (event: RealtimeEvent): void => {
      invalidateFromEvent(qc, event, scopeRef.current ?? {});
    };

    const onConnect = (): void => {
      connectedRef.current = true;
      socket.emit('join', { scope: scopeRef.current ?? {} });
    };
    const onDisconnect = (): void => {
      connectedRef.current = false;
    };
    const onReconnect = (): void => {
      // Server cleared our room on disconnect → re-join (Doc 4 §G3).
      socket.emit('join', { scope: scopeRef.current ?? {} });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect', onReconnect);
    socket.onAny(onAny);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect', onReconnect);
      socket.offAny(onAny);
      if (connectedRef.current) socket.disconnect();
    };
  }, [qc]);

  return { connected: connectedRef.current };
}
