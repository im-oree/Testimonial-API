/**
 * Toast — the app's global "it worked / it failed" surface.
 *
 * Success and failure feedback used to live in per-page banners that
 * scrolled out of view (or hid behind the fold). This gives every action a
 * consistent, impossible-to-miss acknowledgement: bottom-center on desktop,
 * above the mobile tab bar — both inside the thumb zone — announced to
 * screen readers via a polite live region.
 *
 * Usage anywhere, no hooks or context plumbing:
 *
 *   import { toast } from '../components/Toast';
 *   toast('Testimonial updated');
 *   toast('Could not save — try again', 'error');
 */
import { useEffect, useState } from 'react';
import { IconCheck, IconX } from './icons';

interface ToastItem {
  id: number;
  message: string;
  tone: 'ok' | 'error';
}

type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();
let seq = 0;

/** Show a toast. Successes auto-dismiss; errors stay a little longer. */
export function toast(message: string, tone: 'ok' | 'error' = 'ok'): void {
  const item: ToastItem = { id: ++seq, message, tone };
  listeners.forEach((l) => l(item));
}

/** Mount once at the app root (App.tsx renders <Toaster />). */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const on: Listener = (t) => {
      setItems((cur) => [...cur, t].slice(-3)); // never more than 3 stacked
      window.setTimeout(() => {
        setItems((cur) => cur.filter((x) => x.id !== t.id));
      }, t.tone === 'error' ? 4200 : 2600);
    };
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, []);

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.tone === 'ok' ? <IconCheck size={14} /> : <IconX size={14} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
