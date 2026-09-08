/** Dialog — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

const SIZES: Record<string, string> = {
  sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl',
};

export function Dialog({ open, onOpenChange, title, description, size = 'md', children }: {
  open?: boolean; onOpenChange?: (v: boolean) => void; title: string; description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl'; children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" data-component="Dialog">
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`relative w-full ${SIZES[size] ?? SIZES.md} rounded-xl border border-border bg-background-elevated shadow-xl animate-scale-in`}>
        <button type="button" aria-label="Close" onClick={() => onOpenChange?.(false)}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-subtle">✕</button>
        <div className="px-6 pt-6 pb-2 pr-12">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-1 text-sm text-foreground-secondary">{description}</p>}
        </div>
        <div className="px-6 py-4">{children}</div>
        <div className="flex justify-end gap-3 px-6 pb-6 pt-2" />
      </div>
    </div>
  );
}
