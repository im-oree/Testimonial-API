/** StatusBadge — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

const MAP: Record<string, { tone: string; dot: string }> = {
  pending: { tone: 'bg-warning-light text-warning-foreground dark:bg-warning-dark/30 dark:text-warning', dot: 'bg-warning' },
  approved: { tone: 'bg-success-light text-success-foreground dark:bg-success-dark/30 dark:text-success', dot: 'bg-success' },
  rejected: { tone: 'bg-error-light text-error-foreground dark:bg-error-dark/30 dark:text-error', dot: 'bg-error' },
  archived: { tone: 'bg-background-muted text-foreground-tertiary', dot: 'bg-foreground-tertiary' },
  active: { tone: 'bg-success-light text-success-foreground dark:bg-success-dark/30 dark:text-success', dot: 'bg-success' },
  disabled: { tone: 'bg-background-muted text-foreground-tertiary', dot: 'bg-foreground-tertiary' },
  suspended: { tone: 'bg-error-light text-error-foreground dark:bg-error-dark/30 dark:text-error', dot: 'bg-error' },
};

/** Maps TestimonialStatus (+ tenant/user statuses) per Doc 5 §5.3. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const c = MAP[status] ?? MAP.archived;
  return (
    <span data-component="StatusBadge" data-status={status}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-medium ${c.tone} ${className ?? ''}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}
