/** ConfirmDialog — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', tone = 'primary', onConfirm }: {
  open?: boolean; onOpenChange?: (v: boolean) => void; title: string; description?: string;
  confirmLabel?: string; tone?: 'primary' | 'destructive'; onConfirm?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" data-component="ConfirmDialog">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-xl border border-border bg-background-elevated p-6 shadow-xl animate-scale-in">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-foreground-secondary">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => onOpenChange?.(false)}
            className="h-9 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-background-subtle">Cancel</button>
          <button type="button"
            onClick={() => { onConfirm?.(); onOpenChange?.(false); }}
            className={`h-9 rounded-md px-4 text-sm font-medium text-white hover:opacity-90 ${tone === 'destructive' ? 'bg-error hover:bg-error-dark' : 'bg-primary-500 hover:bg-primary-600'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
