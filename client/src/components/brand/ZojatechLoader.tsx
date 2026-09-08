/**
 * ZojatechLoader — the brand loader.
 *
 * The Zojatech mark animated like an After Effects trim-path: the stroke
 * draws on, but a bite of the end stays missing, and the dash offset then
 * animates continuously so the gap travels around the mark forever — an
 * honest "working…" signal with no spinners.
 *
 * Used wherever the app waits on something without a known shape: the
 * session check, the studio boot, slow actions.
 */
import { motion } from 'framer-motion';
import { ZOJATECH_MARK_PATH } from '../icons/brand';

export function ZojatechLoader({
  size = 44,
  color = '#002986',
  label = null,
}: {
  size?: number;
  color?: string;
  label?: string | null;
}) {
  return (
    <span className="zj-loader" role="status" aria-label={label ?? 'Loading'}>
      <svg width={size} height={size} viewBox="56 49 88 98" fill="none" aria-hidden>
        {/* Faint full outline so the mark reads at a glance while it draws. */}
        <path
          d={ZOJATECH_MARK_PATH}
          fill="none"
          stroke={color}
          strokeOpacity={0.14}
          strokeWidth={6}
          strokeLinejoin="round"
          strokeLinecap="round"
          fillRule="evenodd"
        />
        <motion.path
          d={ZOJATECH_MARK_PATH}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinejoin="round"
          strokeLinecap="round"
          fillRule="evenodd"
          initial={{ pathLength: 0, pathOffset: 0 }}
          animate={{ pathLength: 0.88, pathOffset: 1 }}
          transition={{
            // Draw on almost fully — the last stretch stays down…
            pathLength: { duration: 0.85, ease: 'easeInOut' },
            // …then the offset loops, sweeping the gap around the mark.
            pathOffset: { delay: 0.9, duration: 1.5, ease: 'linear', repeat: Infinity },
          }}
        />
      </svg>
      {label && (
        <span className="muted small" style={{ marginTop: 10 }}>
          {label}
        </span>
      )}
    </span>
  );
}
