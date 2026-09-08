/** Checkbox — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Checkbox({ checked, onCheckedChange, disabled, 'aria-label': ariaLabel }: {
  checked?: boolean; onCheckedChange?: (v: boolean) => void; disabled?: boolean; 'aria-label'?: string;
}) {
  return (
    <input type="checkbox" checked={checked} disabled={disabled} aria-label={ariaLabel}
      onChange={(e) => onCheckedChange?.(e.target.checked)} data-component="Checkbox"
      className="h-4 w-4 shrink-0 rounded-sm border border-border accent-primary-500" />
  );
}
