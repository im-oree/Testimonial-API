/** ImpersonationBanner — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function ImpersonationBanner({ tenantName, onExit }: { tenantName: string; onExit?: () => void }) {
  return (
    <div data-component="ImpersonationBanner" data-testid="impersonation-banner" role="note"
      className="sticky top-13 z-sticky flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground">
      <span>⚠ Viewing as {tenantName} — all actions are logged</span>
      {onExit && (
        <button type="button" onClick={onExit}
          className="ml-4 h-6 rounded bg-warning-dark/20 px-2 text-xs hover:bg-warning-dark/30">Exit impersonation</button>
      )}
    </div>
  );
}
