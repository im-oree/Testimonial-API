/** StatCard — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function StatCard({ label, value, delta, icon, className }: {
  label: string; value: string | number; delta?: number; icon?: ReactNode; className?: string;
}) {
  const trend = delta === undefined ? null : delta > 0 ? 'text-success' : delta < 0 ? 'text-error' : 'text-foreground-tertiary';
  const arrow = delta === undefined ? '' : delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  return (
    <div data-component="StatCard" data-testid="stat-card"
      className={`rounded-xl border border-border bg-background-elevated p-5 shadow-xs transition-shadow duration-200 hover:shadow-md ${className ?? ''}`}>
      {icon && <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-500">{icon}</div>}
      <p className="text-sm font-medium text-foreground-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {delta !== undefined && <p className={`mt-2 flex items-center gap-1 text-xs ${trend}`}>{arrow} {Math.abs(delta)}%</p>}
    </div>
  );
}
