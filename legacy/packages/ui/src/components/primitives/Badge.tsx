/** Badge — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

const TONES: Record<string, string> = {
  success: 'bg-success-light text-success-foreground dark:bg-success-dark/30 dark:text-success',
  warning: 'bg-warning-light text-warning-foreground dark:bg-warning-dark/30 dark:text-warning',
  error: 'bg-error-light text-error-foreground dark:bg-error-dark/30 dark:text-error',
  info: 'bg-info-light text-info-foreground dark:bg-info-dark/30 dark:text-info',
  neutral: 'bg-background-muted text-foreground-secondary',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return (
    <span data-tone={tone} data-component="Badge" data-testid="badge"
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-medium transition-colors ${TONES[tone] ?? TONES.neutral}`}>
      {children}
    </span>
  );
}
