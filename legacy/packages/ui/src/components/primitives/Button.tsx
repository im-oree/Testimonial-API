/** Button — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

const VARIANTS: Record<string, string> = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm hover:shadow-md focus-visible:ring-primary-500',
  secondary: 'bg-background text-foreground border border-border hover:bg-background-subtle active:bg-background-muted',
  ghost: 'bg-transparent text-foreground-secondary hover:bg-background-subtle hover:text-foreground',
  destructive: 'bg-error text-white hover:bg-error-dark active:bg-error-dark focus-visible:ring-error',
  link: 'bg-transparent text-primary-500 hover:text-primary-600 underline underline-offset-4 hover:underline-offset-2',
};
const SIZES: Record<string, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-4 text-sm rounded-md gap-2',
  lg: 'h-10 px-5 text-sm rounded-lg gap-2',
  xl: 'h-12 px-6 text-base rounded-lg gap-2.5',
};

export function Button({ children, variant = 'secondary', size = 'md', type = 'button', loading, disabled, onClick, className }: {
  children?: ReactNode; variant?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; type?: 'button' | 'submit';
  loading?: boolean; disabled?: boolean; onClick?: () => void; className?: string;
}) {
  const isDisabled = disabled || loading;
  return (
    <button type={type} disabled={isDisabled} data-variant={variant} data-component="Button"
      className={`inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 outline-none ${VARIANTS[variant] ?? VARIANTS.secondary} ${SIZES[size] ?? SIZES.md} ${loading ? 'opacity-70 pointer-events-none' : ''} ${isDisabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''} ${className ?? ''}`}
      onClick={onClick}>
      {children}
    </button>
  );
}
