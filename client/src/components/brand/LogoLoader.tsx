/**
 * LogoLoader — the Zojatech mark as an indefinite, looping trim-path outline.
 *
 * The same drawing language as the boot intro (AppIntro draws the mark once,
 * then wipes), but for states with no known end: a bright stroke sweeps the
 * logo's contour forever with its END trailing a little behind its head —
 * a small gap that walks around the shape (animated stroke-dashoffset over a
 * pathLength-normalised dash pattern, so the loop is perfectly seamless).
 * A faint full outline underneath keeps the mark readable while it sweeps.
 *
 * Used by the Suspense fallback in App.tsx (lazy route chunks) — size it to
 * the moment; 96px reads well as a page-level state, 24–32px inline.
 *
 * Reduced motion: the sweep stops and the full outline simply shows.
 */
import { ZOJATECH_MARK_PATH } from '../icons/brand';

export function LogoLoader({
  size = 96,
  className = '',
  label = 'Loading',
}: {
  size?: number;
  className?: string;
  label?: string | null;
}) {
  return (
    <svg
      className={`logo-loader ${className}`.trim()}
      width={size}
      height={size}
      viewBox="56 49 88 98"
      fill="none"
      role={label ? 'status' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
    >
      {/* the whole contour, faint — the shape reads at a glance */}
      <path className="logo-loader-base" d={ZOJATECH_MARK_PATH} fill="none" />
      {/* the traveling trim-path segment: head leads, end a bit behind */}
      <path className="logo-loader-trim" d={ZOJATECH_MARK_PATH} fill="none" pathLength={1} />
    </svg>
  );
}
