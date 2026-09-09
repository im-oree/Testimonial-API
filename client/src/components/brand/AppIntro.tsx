/**
 * AppIntro — the boot animation, played once per page load.
 *
 * Sequence (all smooth, eased):
 *   1. TRIM PATH   the Zojatech mark draws on as a stroke
 *   2. FILL        the solid mark fades in over the stroke
 *   3. WIPE        a circular clip-path matte closes over the full-screen
 *                  navy backdrop, track-matting the logo out while the app
 *                  scales up beneath it at the same time
 *
 * Client-side navigation never remounts the app, so the intro only appears
 * when the tab is opened or the page is hard-refreshed — exactly once per
 * load. Visitors with reduced-motion preferences get a quick fade instead.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ZOJATECH_MARK_PATH } from '../icons/brand';

type Phase = 'draw' | 'fill' | 'wipe';

export function AppIntro({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('draw');

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced) {
      const t = window.setTimeout(() => {
        onReveal();
        onDone();
      }, 300);
      return () => window.clearTimeout(t);
    }
    const t1 = window.setTimeout(() => setPhase('fill'), 1100);
    const t2 = window.setTimeout(() => {
      setPhase('wipe');
      onReveal(); // the app scales in WHILE the matte closes
    }, 1800);
    const t3 = window.setTimeout(() => onDone(), 2600);
    return () => {
      [t1, t2, t3].forEach(window.clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`app-intro ${phase === 'wipe' ? 'is-wipe' : ''}`} aria-hidden>
      {/* A full-screen navy layer carrying the logo. A circular clip covers
          everything at first — no visible edge, no aspect-ratio tricks — then
          closes to nothing, wiping the logo out with it. */}
      <div className="app-intro-matte">
        <svg width="150" height="150" viewBox="56 49 88 98" fill="none">
          {/* 1 — the stroke draws on (trim path). */}
          <motion.path
            d={ZOJATECH_MARK_PATH}
            fill="none"
            stroke="#ffffff"
            strokeWidth={6}
            strokeLinejoin="round"
            strokeLinecap="round"
            fillRule="evenodd"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1] }}
          />
          {/* 2 — the solid mark fades in over it. */}
          <motion.path
            d={ZOJATECH_MARK_PATH}
            fill="#ffffff"
            fillRule="evenodd"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'draw' ? 0 : 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
      </div>
    </div>
  );
}
