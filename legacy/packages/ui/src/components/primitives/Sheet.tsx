/** Sheet — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Sheet({ open, onOpenChange, title, side = 'right', children }: {
  open?: boolean; onOpenChange?: (v: boolean) => void; title: string; side?: 'left' | 'right'; children?: ReactNode;
}) {
  if (!open) return null;
  const fromRight = side === 'right';
  return (
    <div className="fixed inset-0 z-overlay bg-black/50 backdrop-blur-sm animate-fade-in" data-component="Sheet">
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`fixed top-0 bottom-0 flex w-full max-w-md flex-col border-border bg-background-elevated shadow-xl z-modal ${fromRight ? 'right-0 border-l animate-slide-in-right' : 'left-0 border-r animate-slide-in-left'}`}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button type="button" aria-label="Close" onClick={() => onOpenChange?.(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-subtle">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
