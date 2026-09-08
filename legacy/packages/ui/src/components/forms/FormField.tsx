/** FormField — Doc 4 §6 / Doc 5 §5.5 forms (forms) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function FormField({ label, htmlFor, required, hint, error, children, className }: {
  label: string; htmlFor?: string; required?: boolean; hint?: string; error?: string; children?: ReactNode; className?: string;
}) {
  return (
    <div data-component="FormField" data-testid="form-field" className={`space-y-1.5 ${className ?? ''}`}>
      <label htmlFor={htmlFor} className="flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-xs text-error">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-error">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-foreground-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}
