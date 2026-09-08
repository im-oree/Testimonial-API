/** ErrorState — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function ErrorState({ title = 'Something went wrong', description, retry, className }: {
  title?: string; description?: string; retry?: () => void; className?: string;
}) {
  return (
    <div role="alert" data-component="ErrorState" data-testid="error-state"
      className={`mx-auto my-8 max-w-lg rounded-lg border border-error/20 bg-error-light px-4 py-3 text-error-foreground ${className ?? ''}`}>
      <strong className="text-sm font-medium">{title}</strong>
      {description && <p className="mt-0.5 text-xs opacity-90">{description}</p>}
      {retry && (
        <button type="button" onClick={retry}
          className="mt-2 rounded-md bg-error px-2 py-1 text-xs font-medium text-white hover:bg-error-dark">Retry</button>
      )}
    </div>
  );
}
