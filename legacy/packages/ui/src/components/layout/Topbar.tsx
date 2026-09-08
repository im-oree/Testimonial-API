/** Topbar — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Topbar({ left, right, className }: { left?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <header data-component="Topbar"
      className={`sticky top-0 z-sticky flex h-13 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md ${className ?? ''}`}>
      <div className="flex items-center gap-3">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}
