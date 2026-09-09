/**
 * AppIntro — the boot animation, played once per page load.
 *
 * Sequence (all smooth, eased):
 *   1. SWEEP        the Zojatech mark as a looping trim-path outline — a
 *                   bright stroke travels the contour with its end trailing
 *                   a bit behind its head (one lap while the app boots)
 *   2. FILL         the solid mark fades in over the sweep
 *   3. WIPE         a circular clip-path matte closes over the full-screen
 *                   navy backdrop, track-matting the logo out while the app
 *                   scales up beneath it at the same time
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
        {/* The mark as a looping trim-path outline (same loader language as
            LogoLoader): a bright stroke sweeps the contour with its end
            trailing a bit behind its head, one lap while the app boots. The
            solid mark then fades in over it and the matte wipes away. */}
        <svg className="logo-loader logo-loader-intro" width="150" height="150" viewBox="56 49 88 98" fill="none">
          {/* the whole contour, faint — the shape reads at a glance */}
          <path className="logo-loader-base" d={ZOJATECH_MARK_PATH} fill="none" />
          {/* the traveling trim-path segment: head leads, end a bit behind */}
          <path className="logo-loader-trim" d={ZOJATECH_MARK_PATH} fill="none" pathLength={1} />
          {/* the solid mark fades in over the sweep. */}
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
