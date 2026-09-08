/** JsonViewer — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function JsonViewer({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre data-component="JsonViewer" className={`max-h-96 overflow-auto rounded-lg bg-background-subtle p-4 font-mono text-xs text-foreground ${className ?? ''}`}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
