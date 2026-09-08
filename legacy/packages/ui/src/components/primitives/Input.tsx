/** Input — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { InputHTMLAttributes } from 'react';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input data-component="Input"
      className={`h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-tertiary transition-colors duration-150 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:bg-background-muted disabled:text-foreground-tertiary disabled:cursor-not-allowed ${className ?? ''}`}
      {...rest} />
  );
}
