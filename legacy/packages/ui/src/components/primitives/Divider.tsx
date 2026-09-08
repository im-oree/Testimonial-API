/** Divider — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Divider({ className }: { className?: string }) {
  return <hr data-component="Divider" className={`my-4 border-border-subtle ${className ?? ''}`} />;
}
