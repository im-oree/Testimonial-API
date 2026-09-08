/** QrCodeDisplay — Doc 4 §6 / Doc 5 §5.3 data display (data-display) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function QrCodeDisplay({ url, className }: { url: string; className?: string }) {
  return (
    <div data-component="QrCodeDisplay" data-testid="qr-display" aria-label={`QR code for ${url}`}
      className={`inline-flex h-40 w-40 items-center justify-center rounded-lg border border-border bg-white p-2 ${className ?? ''}`}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 font-mono text-[6px] text-slate-900">
        <div className="grid grid-cols-3 gap-0.5 text-primary-900">{"█ ██ █".replace(' ', '')}</div>
        <span className="px-1 text-[8px] text-slate-500">scan-me</span>
      </div>
    </div>
  );
}
