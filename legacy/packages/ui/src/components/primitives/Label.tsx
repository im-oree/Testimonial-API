/** Label — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Label({ children, htmlFor, className }: { children?: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} data-component="Label"
      className={`text-sm font-medium text-foreground ${className ?? ''}`}>{children}</label>
  );
}
