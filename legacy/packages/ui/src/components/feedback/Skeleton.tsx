/** Skeleton — Doc 4 §6 / Doc 5 §5.4 feedback (feedback) · styled per §5 spec. */
import type { ReactNode } from 'react';

const VARIANTS: Record<string, string> = {
  text: 'h-4 w-full', title: 'h-7 w-48', avatar: 'h-10 w-10 rounded-full', card: 'h-32 w-full rounded-xl',
  table: 'h-12 w-full', chart: 'h-64 w-full rounded-xl',
};

export function Skeleton({ variant = 'text', className }: { variant?: 'text' | 'title' | 'avatar' | 'card' | 'table' | 'chart'; className?: string }) {
  return (
    <span data-component="Skeleton" data-testid="skeleton" aria-hidden="true"
      className={`block animate-shimmer rounded-md bg-background-muted ${VARIANTS[variant] ?? VARIANTS.text} ${className ?? ''}`}
      style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--background-muted)) 25%, hsl(var(--background-subtle)) 50%, hsl(var(--background-muted)) 75%)', backgroundSize: '200% 100%' }} />
  );
}
