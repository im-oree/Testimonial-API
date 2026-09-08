/** WidgetBuilder — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export interface WidgetStyleOverrides { theme: 'light' | 'dark'; accentColor: string; fontFamily?: string }
export function WidgetBuilder({ overrides, onChange, className }: {
  overrides: WidgetStyleOverrides; onChange?: (o: WidgetStyleOverrides) => void; className?: string;
}) {
  return (
    <div data-component="WidgetBuilder" data-testid="widget-builder" className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${className ?? ''}`}>
      <div className="space-y-4 rounded-xl border border-border bg-background-elevated p-5">
        <label className="block text-sm font-medium text-foreground">Theme</label>
        <select value={overrides.theme} onChange={(e) => onChange?.({ ...overrides, theme: e.target.value as WidgetStyleOverrides['theme'] })}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Accent</span>
          <input type="color" value={overrides.accentColor} aria-label="Accent color"
            onChange={(e) => onChange?.({ ...overrides, accentColor: e.target.value })}
            className="h-9 w-9 rounded-md border border-border bg-background p-0.5" />
          <span className="font-mono text-xs text-foreground-secondary">{overrides.accentColor}</span>
        </div>
        <label className="block text-sm font-medium text-foreground">Font</label>
        <input value={overrides.fontFamily ?? ''} placeholder="Inter, system-ui…"
          onChange={(e) => onChange?.({ ...overrides, fontFamily: e.target.value })}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
      </div>
      <div data-testid="widget-preview" className="rounded-xl border border-border p-5"
        style={{ background: overrides.theme === 'dark' ? '#18181b' : '#ffffff', color: overrides.theme === 'dark' ? '#fafafa' : '#18181b' }}>
        <p className="text-xs text-foreground-tertiary">Live preview</p>
        <blockquote className="mt-2 text-base" style={{ fontFamily: overrides.fontFamily }}>“This product is fantastic!”</blockquote>
      </div>
    </div>
  );
}
