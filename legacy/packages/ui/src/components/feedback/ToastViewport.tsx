/** ToastViewport — Doc 4 §6 / Doc 5 §5.4 feedback (feedback) · styled per §5 spec. */
import type { ReactNode } from 'react';

export function ToastViewport({ children }: { children?: ReactNode }) {
  return (
    <div aria-live="polite" data-component="ToastViewport" className="fixed right-4 bottom-4 z-toast flex flex-col items-end gap-2">
      {children}
    </div>
  );
}
