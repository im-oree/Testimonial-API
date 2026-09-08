/** ForbiddenPage — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function ForbiddenPage({ permission }: { permission?: string }) {
  return (
    <div role="alert" data-component="ForbiddenPage" data-testid="forbidden-page" className="mx-auto max-w-md py-24 text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="mt-4 text-2xl font-bold text-foreground">403 — Forbidden</h1>
      <p className="mt-2 text-sm text-foreground-secondary">
        You don't have permission to view this page{permission ? ` (requires: ${permission})` : ''}.
      </p>
    </div>
  );
}
