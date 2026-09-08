/** RealtimeIndicator — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function RealtimeIndicator({ connected, className }: { connected: boolean; className?: string }) {
  return (
    <span data-connected={connected} data-component="RealtimeIndicator"
      className={`inline-flex items-center gap-1.5 text-xs ${connected ? 'text-success' : 'text-warning'} ${className ?? ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-success' : 'bg-warning animate-pulse-subtle'}`} />
      {connected ? 'Live' : 'Reconnecting…'}
    </span>
  );
}
