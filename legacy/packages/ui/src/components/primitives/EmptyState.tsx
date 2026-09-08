/** EmptyState — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: {
  title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div data-component="EmptyState" data-testid="empty-state" className="flex flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background-muted text-2xl text-foreground-tertiary/70">◎</div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-foreground-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
