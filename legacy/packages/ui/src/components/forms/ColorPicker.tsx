/** ColorPicker — Doc 4 §6 / Doc 5 §5.5 forms (forms) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function ColorPicker({ value, onChange, presets }: {
  value: string; onChange?: (v: string) => void; presets?: string[];
}) {
  return (
    <div data-component="ColorPicker" className="flex items-center gap-2">
      <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border shadow-inner-subtle transition-all hover:ring-2 hover:ring-primary-500/30"
        style={{ backgroundColor: value }} aria-label="Brand color">
        <input type="color" value={value} onChange={(e) => onChange?.(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
      <span className="font-mono text-xs text-foreground-secondary">{value}</span>
      {presets && (
        <div className="ml-2 grid grid-cols-6 gap-1.5">
          {presets.map((p) => (
            <button key={p} type="button" aria-label={p} onClick={() => onChange?.(p)}
              className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: p }} />
          ))}
        </div>
      )}
    </div>
  );
}
