/** Tooltip — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Tooltip({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <span title={label} data-component="Tooltip" className="inline-flex">{children}</span>
  );
}
