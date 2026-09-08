/** Switch — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Switch({ checked, onCheckedChange, disabled, 'aria-label': ariaLabel }: {
  checked?: boolean; onCheckedChange?: (v: boolean) => void; disabled?: boolean; 'aria-label'?: string;
}) {
  return (
    <button
      type="button" role="switch" aria-checked={checked ?? false} aria-label={ariaLabel ?? undefined}
      disabled={disabled} data-component="Switch"
      onClick={() => onCheckedChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${checked ? 'bg-primary-500 border-primary-500' : 'bg-background-muted border-border'}`}>
      <span aria-hidden="true"
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}
