/** Slider — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function Slider({ min = 0, max = 100, value, onChange, className }: {
  min?: number; max?: number; value: number; onChange: (v: number) => void; className?: string;
}) {
  return (
    <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
      data-component="Slider" aria-label="Slider"
      className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-background-muted accent-primary-500 ${className ?? ''}`} />
  );
}
