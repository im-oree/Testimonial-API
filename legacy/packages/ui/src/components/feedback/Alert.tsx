/** Alert — Doc 4 §6 / Doc 5 §5.4 feedback (feedback) · styled per §5 spec. */
import type { ReactNode } from 'react';

const TONES: Record<string, string> = {
  info: 'bg-info-light border-info/20 text-info-foreground',
  success: 'bg-success-light border-success/20 text-success-foreground',
  warning: 'bg-warning-light border-warning/20 text-warning-foreground',
  error: 'bg-error-light border-error/20 text-error-foreground',
};
const GLYPHS: Record<string, string> = { info: 'i', success: '✓', warning: '!', error: '✕' };

export function Alert({ tone = 'info', title, description, children, className }: {
  tone?: 'info' | 'success' | 'warning' | 'error'; title: string; description?: string; children?: ReactNode; className?: string;
}) {
  return (
    <div role="alert" data-tone={tone} data-component="Alert"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${TONES[tone] ?? TONES.info} ${className ?? ''}`}>
      <span aria-hidden="true" className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-current text-[10px] font-bold">{GLYPHS[tone] ?? 'i'}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        {(description || children) && <p className="mt-0.5 text-xs opacity-90">{description ?? children}</p>}
      </div>
    </div>
  );
}
