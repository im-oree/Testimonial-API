/** TagInput — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function TagInput({ value, onChange, className }: { value: string[]; onChange?: (tags: string[]) => void; className?: string }) {
  return (
    <div data-component="TagInput" className={`flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 ${className ?? ''}`}>
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-2xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          {t}
          <button type="button" onClick={() => onChange?.(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="hover:text-primary-900">×</button>
        </span>
      ))}
      <input aria-label="Add tag" placeholder="Add tag…"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const v = (e.target as HTMLInputElement).value.trim();
            if (v && !value.includes(v)) onChange?.([...value, v]);
            (e.target as HTMLInputElement).value = '';
          }
        }}
        className="h-6 min-w-24 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-tertiary" />
    </div>
  );
}
