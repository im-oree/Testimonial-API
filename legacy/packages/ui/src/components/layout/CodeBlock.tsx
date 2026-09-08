/** CodeBlock — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function CodeBlock({ code, language = 'html', className }: { code: string; language?: string; className?: string }) {
  return (
    <div data-component="CodeBlock" className={`relative overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 ${className ?? ''}`}>
      <button type="button" onClick={() => void navigator.clipboard?.writeText(code)}
        className="absolute top-2 right-2 flex h-7 items-center gap-1 rounded bg-slate-800 px-2 text-2xs text-slate-400 hover:bg-slate-700 hover:text-slate-200">Copy</button>
      <pre className="whitespace-pre-wrap break-all"><code data-language={language}>{code}</code></pre>
    </div>
  );
}
