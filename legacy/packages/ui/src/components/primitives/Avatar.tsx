/** Avatar — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

const SIZES: Record<string, string> = {
  xs: 'h-6 w-6 text-2xs', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-lg',
};

export function Avatar({ name, src, size = 'sm' }: { name: string; src?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const sizeCls = SIZES[size] ?? SIZES.sm;
  if (src) {
    return <img src={src} alt={name} data-component="Avatar" className={`rounded-full object-cover ring-2 ring-background ${sizeCls}`} />;
  }
  return (
    <span data-component="Avatar" aria-label={name}
      className={`flex items-center justify-center overflow-hidden rounded-full bg-primary-100 font-medium text-primary-700 ring-2 ring-background ${sizeCls}`}>
      {initials}
    </span>
  );
}
