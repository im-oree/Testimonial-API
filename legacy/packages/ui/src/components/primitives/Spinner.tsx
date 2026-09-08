/** Spinner — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" aria-label={label} data-component="Spinner"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary-500 ${className ?? ''}`} />
  );
}
