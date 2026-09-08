/** CopyButton — Doc 4 §6 / Doc 5 §5.1 primitives (primitives) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const copy = (): void => { void navigator.clipboard?.writeText(text); };
  return (
    <button type="button" onClick={copy} data-component="CopyButton"
      className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-800 px-2 text-2xs text-slate-400 hover:bg-slate-700 hover:text-slate-200">
      {label}
    </button>
  );
}
