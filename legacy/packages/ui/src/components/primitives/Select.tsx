/** Select — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Select({ options, value, onChange, placeholder, className }: {
  options: Array<{ label: string; value: string }>; value?: string; onChange?: (v: string) => void;
  placeholder?: string; className?: string;
}) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} data-component="Select"
      className={`h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 pr-8 text-sm text-foreground transition-colors duration-150 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:bg-background-muted ${className ?? ''}`}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
