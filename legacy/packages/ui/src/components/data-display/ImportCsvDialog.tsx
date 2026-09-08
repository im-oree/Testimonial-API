/** ImportCsvDialog — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function ImportCsvDialog({ open, onOpenChange }: { open: boolean; onOpenChange?: (v: boolean) => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" data-component="ImportCsvDialog">
      <div role="dialog" aria-modal="true" aria-label="Import CSV" className="w-full max-w-lg rounded-xl border border-border bg-background-elevated p-6 shadow-xl animate-scale-in">
        <h3 className="text-lg font-semibold text-foreground">Import testimonials from CSV</h3>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-all hover:border-primary-500 hover:bg-primary-50/30">
          <span className="text-sm text-foreground-secondary">Click to upload</span>
          <span className="text-xs text-foreground-tertiary">.csv up to 5MB</span>
          <input type="file" accept=".csv" aria-label="CSV file" className="hidden" />
        </label>
        <p className="mt-2 text-xs text-foreground-tertiary">Column mapping + 5-row preview — Doc 5 wiring.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => onOpenChange?.(false)} className="h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-background-subtle">Cancel</button>
          <button type="button" onClick={() => onOpenChange?.(false)} className="h-9 rounded-md bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600">Start import</button>
        </div>
      </div>
    </div>
  );
}
