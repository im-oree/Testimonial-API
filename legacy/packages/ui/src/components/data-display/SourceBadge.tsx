/** SourceBadge — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

const MAP: Record<string, { tone: string; label: string }> = {
  manual: { tone: 'bg-background-subtle text-foreground-secondary', label: 'Manual' },
  form: { tone: 'bg-info-light text-info-foreground dark:bg-info-dark/30 dark:text-info', label: 'Form' },
  api: { tone: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300', label: 'API' },
  twitter_import: { tone: 'bg-info-light text-info-foreground dark:bg-info-dark/30 dark:text-info', label: 'Twitter' },
  csv_import: { tone: 'bg-background-subtle text-foreground-secondary', label: 'CSV' },
};

/** Maps TestimonialSource per Doc 5 §5.3 (icon pass in the iconography slice). */
export function SourceBadge({ source, className }: { source: string; className?: string }) {
  const c = MAP[source] ?? MAP.manual;
  return (
    <span data-component="SourceBadge" data-source={source}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-medium ${c.tone} ${className ?? ''}`}>
      {c.label}
    </span>
  );
}
