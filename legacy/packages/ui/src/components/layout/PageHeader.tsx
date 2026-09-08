/** PageHeader — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions, className }: {
  title: string; description?: string; actions?: ReactNode; className?: string;
}) {
  return (
    <header data-component="PageHeader" className={`mb-6 flex items-start justify-between gap-4 ${className ?? ''}`}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-foreground-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
