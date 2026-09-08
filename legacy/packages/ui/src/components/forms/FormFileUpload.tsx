/** FormFileUpload — Doc 4 §6 / Doc 5 §5.5 forms (forms) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function FormFileUpload({ accept = 'image/*', hint, progress, onChange, className }: {
  accept?: string; hint?: string; progress?: number; onChange?: (file: File | null) => void; className?: string;
}) {
  return (
    <div data-component="FormFileUpload" data-testid="form-file-upload" className={className}>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-all duration-200 hover:border-primary-500 hover:bg-primary-50/30">
        <span className="text-sm text-foreground-secondary"><span className="font-medium text-primary-500">Click to upload</span></span>
        <span className="text-xs text-foreground-tertiary">{hint ?? 'Accepted types only — max size enforced'}</span>
        <input type="file" accept={accept} aria-label="File upload"
          onChange={(e) => onChange?.(e.target.files?.[0] ?? null)} className="hidden" />
      </label>
      {typeof progress === 'number' && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-background-muted">
          <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  );
}
