/** Toast — Doc 4 §6 / Doc 5 §5.4 feedback (feedback) · styled per §5 spec. */
import type { ReactNode } from 'react';

const TONES: Record<string, string> = {
  success: 'text-success', error: 'text-error', info: 'text-info', loading: 'text-primary-500',
};
export function Toast({ tone = 'default', title, description, children }: {
  tone?: 'default' | 'success' | 'error' | 'info' | 'loading'; title?: string; description?: string; children?: ReactNode;
}) {
  const glyph = tone === 'loading' ? '◌' : tone === 'success' ? '✓' : tone === 'error' ? '✕' : tone === 'info' ? 'i' : '•';
  return (
    <div role="status" data-tone={tone} data-component="Toast"
      className="flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-background-elevated px-4 py-3 shadow-lg animate-fade-in-up">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-sm ${TONES[tone] ?? 'text-foreground-secondary'} ${tone === 'loading' ? 'animate-spin' : ''}`}>{glyph}</span>
      <div className="flex-1">
        {(title || children) && <p className="text-sm font-medium text-foreground">{title ?? children}</p>}
        {description && <p className="mt-0.5 text-xs text-foreground-secondary">{description}</p>}
      </div>
    </div>
  );
}
