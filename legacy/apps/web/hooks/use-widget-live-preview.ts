/** Doc 4 — tenant dashboard (§7 hook). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState } from 'react';

/**
 * Local-only live-preview state for WidgetBuilder. The actual widget renderer
 * (shared embed code) renders the preview in Doc 5; here we keep the hook
 * contract: { overrides, update, embedCode }.
 */
export interface WidgetPreviewOverrides {
  theme: 'light' | 'dark';
  accentColor: string;
  fontFamily?: string;
}

export function useWidgetLivePreview(initial: WidgetPreviewOverrides = { theme: 'light', accentColor: '#6366f1' }) {
  const [overrides, setOverrides] = useState<WidgetPreviewOverrides>(initial);
  const update = (patch: Partial<WidgetPreviewOverrides>): void => setOverrides((o) => ({ ...o, ...patch }));
  return { overrides, update };
}
