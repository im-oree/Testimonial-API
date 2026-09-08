/** Card — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Card({ title, children, actions, className }: {
  title?: string; children?: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <div data-component="Card" className={`rounded-xl border border-border bg-background-elevated p-5 shadow-xs ${className ?? ''}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
          {actions}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}
