/** Tabs — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Tabs({ tabs }: { tabs: Array<{ label: string; value: string; active?: boolean; onSelect?: (v: string) => void }> }) {
  return (
    <div role="tablist" data-component="Tabs" className="flex w-fit gap-1 rounded-lg bg-background-subtle p-1">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.active ?? false}
          onClick={() => t.onSelect?.(t.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${t.active ? 'bg-background-elevated text-foreground shadow-xs' : 'text-foreground-secondary hover:text-foreground'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
