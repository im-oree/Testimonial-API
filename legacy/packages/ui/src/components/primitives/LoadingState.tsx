/** LoadingState — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" data-component="LoadingState" data-testid="loading-state"
      className={`flex items-center justify-center gap-2 py-12 text-sm text-foreground-secondary ${className ?? ''}`}>
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary-500" />
      {label}
    </div>
  );
}
