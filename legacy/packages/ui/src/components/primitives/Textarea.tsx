/** Textarea — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { TextareaHTMLAttributes } from 'react';

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea data-component="Textarea" rows={4}
      className={`min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary resize-y transition-colors duration-150 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:bg-background-muted disabled:cursor-not-allowed ${className ?? ''}`}
      {...rest} />
  );
}
