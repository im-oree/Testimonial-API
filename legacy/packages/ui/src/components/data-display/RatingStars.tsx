/** RatingStars — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function RatingStars({ value, size = 'md', onChange, label, className }: {
  value: number; size?: 'sm' | 'md' | 'lg'; onChange?: (v: number) => void; label?: string; className?: string;
}) {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' } as const;
  const star = (n: number): ReactNode => {
    const filled = value >= n - 0.25;
    const el = (
      <span aria-hidden="true" className={`${sizes[size]} ${filled ? 'text-warning' : 'text-foreground-tertiary/30'}`}>★</span>
    );
    if (!onChange) return el;
    return (
      <button key={n} type="button" aria-label={`Rate ${n} of 5`} onClick={() => onChange(n)}
        className={`cursor-pointer transition-transform hover:scale-110 ${sizes[size]}`}>
        <span className={filled ? 'text-warning' : 'text-foreground-tertiary/30'}>★</span>
      </button>
    );
  };
  return (
    <div role="radiogroup" aria-label={label ?? `Rating ${value} out of 5`} data-component="RatingStars"
      className={`flex items-center gap-0.5 ${className ?? ''}`}>
      {[1, 2, 3, 4, 5].map((n) => star(n))}
    </div>
  );
}
