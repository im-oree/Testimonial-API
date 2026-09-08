/** BulkActionBar — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function BulkActionBar({ count, onApprove, onReject, onTag, onDelete, busy }: {
  count: number; onApprove?: () => void; onReject?: () => void; onTag?: () => void; onDelete?: () => void; busy?: boolean;
}) {
  if (count === 0) return null;
  return (
    <div data-component="BulkActionBar" data-testid="bulk-action-bar"
      className="my-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50/60 px-3 py-2 text-sm">
      <span className="font-medium text-primary-800">{count} selected</span>
      <button type="button" onClick={onApprove} disabled={busy} className="rounded-md bg-success px-2 py-1 text-xs font-medium text-white hover:bg-success-dark disabled:opacity-50">Approve</button>
      <button type="button" onClick={onReject} disabled={busy} className="rounded-md bg-error px-2 py-1 text-xs font-medium text-white hover:bg-error-dark disabled:opacity-50">Reject</button>
      <button type="button" onClick={onTag} disabled={busy} className="rounded-md border border-border bg-background-elevated px-2 py-1 text-xs font-medium disabled:opacity-50">Tag…</button>
      <button type="button" onClick={onDelete} disabled={busy} className="rounded-md border border-error/30 px-2 py-1 text-xs font-medium text-error hover:bg-error/10 disabled:opacity-50">Delete</button>
    </div>
  );
}
