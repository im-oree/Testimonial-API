/** DestructiveConfirmDialog — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function DestructiveConfirmDialog({ open, onOpenChange, title, description, confirmText, onConfirm }: {
  open?: boolean; onOpenChange?: (v: boolean) => void; title: string; description?: string;
  confirmText: string; onConfirm?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" data-component="DestructiveConfirmDialog">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-xl border border-error/30 bg-background-elevated p-6 shadow-xl animate-scale-in">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-foreground-secondary">{description}</p>}
        <p className="mt-3 text-xs text-foreground-secondary">Type <code className="rounded bg-background-muted px-1 font-mono">{confirmText}</code> to confirm.</p>
        <input aria-label="Confirmation text" placeholder={confirmText}
          className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-error/20 focus:border-error" />
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => onOpenChange?.(false)}
            className="h-9 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-background-subtle">Cancel</button>
          <button type="button" onClick={() => { onConfirm?.(); onOpenChange?.(false); }}
            className="h-9 rounded-md bg-error px-4 text-sm font-medium text-white hover:bg-error-dark">Delete permanently</button>
        </div>
      </div>
    </div>
  );
}
