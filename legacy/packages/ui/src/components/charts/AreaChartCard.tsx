/** AreaChartCard — Doc 4 §6 / Doc 5 §5.6 charts (charts) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function AreaChartCard({ title, subtitle, controls, children, empty, className }: {
  title: string; subtitle?: string; controls?: ReactNode; children?: ReactNode; empty?: boolean; className?: string;
}) {
  return (
    <section data-component="AreaChartCard" data-testid="chart-card"
      className={`rounded-xl border border-border bg-background-elevated p-5 shadow-xs ${className ?? ''}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-foreground-secondary">{subtitle}</p>}
        </div>
        {controls && <div className="flex items-center gap-1">{controls}</div>}
      </div>
      <div className="h-64">
        {empty ? (
          <p className="flex h-full items-center justify-center text-sm text-foreground-tertiary">No data for this period</p>
        ) : (
          children ?? <p className="flex h-full items-center justify-center text-xs text-foreground-tertiary">Chart renders in the charts slice</p>
        )}
      </div>
    </section>
  );
}
