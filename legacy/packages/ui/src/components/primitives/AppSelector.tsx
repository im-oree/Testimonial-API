/** AppSelector — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function AppSelector({ apps, value, onChange, className }: {
  apps: Array<{ id: string; name: string }>; value?: string; onChange?: (appId: string) => void; className?: string;
}) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} aria-label="Active app"
      data-component="AppSelector"
      className={`h-8 rounded-md border border-border bg-background-elevated px-2 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary-500/20 ${className ?? ''}`}>
      {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  );
}
