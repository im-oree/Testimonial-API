/**
 * TemplateWidget — the live, embeddable widget.
 *
 * Renders a product's template-based design (the same StudioSchema the design
 * studio edits) at its exact fixed dimensions and answers the big embed
 * question: what happens when more reviews come in? The schema's `behavior`
 * — edited in the studio — decides:
 *
 *   · cycle    one review at a time, gentle cross-fade, dots + hover arrows
 *   · carousel swipeable / draggable slides with touch inertia (Figma-card
 *              feel), dots, arrows and auto-advance
 *   · marquee  a continuous stream in the template's own design — direction
 *              and speed adjustable, pauses on hover
 *
 * Runs inside the embed iframe on external websites: no app chrome, no auth.
 * Because it shares SchemaSurface with the studio canvas and preview, what you
 * edit is pixel-for-pixel what your visitors see.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import { SchemaSurface } from '../design-studio/runtime';
import { DEFAULT_BEHAVIOR, type StudioRecord, type StudioSchema, type WidgetBehavior } from '../design-studio/types';

function Arrow({ side, onClick }: { side: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`tpl-widget-nav tpl-widget-${side}`}
      aria-label={side === 'prev' ? 'Previous review' : 'Next review'}
      onClick={onClick}
    >
      {side === 'prev' ? '‹' : '›'}
    </button>
  );
}

function Dots({ count, index, onPick }: { count: number; index: number; onPick: (i: number) => void }) {
  if (count < 2) return null;
  return (
    <div className="tpl-widget-dots" role="tablist" aria-label="Reviews">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          className={`tpl-widget-dot ${i === index ? 'active' : ''}`}
          aria-label={`Show review ${i + 1}`}
          aria-selected={i === index}
          role="tab"
          onClick={() => onPick(i)}
        />
      ))}
    </div>
  );
}

export function TemplateWidget({
  schema,
  records,
  ctaHref = null,
}: {
  schema: StudioSchema;
  records: StudioRecord[];
  ctaHref?: string | null;
}) {
  const behavior: WidgetBehavior = { ...DEFAULT_BEHAVIOR, ...(schema.behavior ?? {}) };
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const limited = useMemo(() => {
    const capped = behavior.maxRecords > 0 ? records.slice(0, behavior.maxRecords) : records;
    return capped.length > 0 ? capped : [null]; // a null record renders the template's sample copy
  }, [records, behavior.maxRecords]);

  // Auto-advance (cycle + carousel), honoring pauseOnHover.
  useEffect(() => {
    if (behavior.mode === 'marquee' || !behavior.autoPlay || paused || limited.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % limited.length), Math.max(2, behavior.intervalSec) * 1000);
    return () => window.clearInterval(t);
  }, [behavior.mode, behavior.autoPlay, behavior.intervalSec, paused, limited.length]);

  const w = schema.canvas.width;
  const h = schema.canvas.height;
  const hoverProps = behavior.pauseOnHover
    ? { onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false) }
    : {};

  const record = limited[Math.min(index, limited.length - 1)] ?? null;
  const safeIndex = Math.min(index, limited.length - 1);
  const go = (dir: 1 | -1): void => setIndex((i) => (i + dir + limited.length) % limited.length);

  // ---- Marquee: a continuous stream of the design, direction + speed from
  // the behavior. The track holds two copies so the loop never shows a gap.
  if (behavior.mode === 'marquee' && limited.length > 0 && limited[0] !== null) {
    const durationSec = Math.max(4, w / Math.max(8, behavior.speedPx));
    const anim = `zojatech-marquee-${behavior.direction === 'right' ? 'r' : 'l'}`;
    const stream = limited.concat(limited);
    return (
      <div className="tpl-widget tpl-widget-marquee" style={{ width: w, height: h }} {...hoverProps}>
        <div
          className="tpl-marquee-track"
          style={{
            width: w * 2,
            animationName: anim,
            animationDuration: `${durationSec}s`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {stream.map((r, i) => (
            <div key={i} className="tpl-marquee-item" style={{ width: w, height: h }}>
              <SchemaSurface schema={schema} record={r} ctaHref={i === 0 ? ctaHref : null} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Carousel: draggable slides with touch inertia. A quick fling moves
  // one slide; a slow settle snaps to whichever side the drag crossed. The
  // track's x is an imperative motion value so a dropped-without-threshold
  // drag always springs back cleanly.
  if (behavior.mode === 'carousel' && limited.length > 1) {
    return <CarouselWidget schema={schema} slides={limited} behavior={behavior} index={safeIndex} onIndex={setIndex} paused={paused} hoverProps={hoverProps} ctaHref={ctaHref} />;
  }

  // ---- Cycle (default): one review at a time with a cross-fade.
  return (
    <div className="tpl-widget" style={{ width: w, height: h }} {...hoverProps} role="region" aria-label={`Customer reviews widget — ${limited.length} review${limited.length === 1 ? '' : 's'}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={safeIndex}
          className="tpl-widget-frame"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <SchemaSurface schema={schema} record={record} animate ctaHref={ctaHref} />
        </motion.div>
      </AnimatePresence>
      {limited.length > 1 && (
        <>
          <Arrow side="prev" onClick={() => go(-1)} />
          <Arrow side="next" onClick={() => go(1)} />
          <Dots count={limited.length} index={safeIndex} onPick={setIndex} />
        </>
      )}
    </div>
  );
}

/** Swipeable slide deck — one card per review, fling to move. */
function CarouselWidget({
  schema,
  slides,
  behavior,
  index,
  onIndex,
  paused,
  hoverProps,
  ctaHref,
}: {
  schema: StudioSchema;
  slides: Array<StudioRecord | null>;
  behavior: WidgetBehavior;
  index: number;
  onIndex: (i: number) => void;
  paused: boolean;
  hoverProps: { onMouseEnter?: () => void; onMouseLeave?: () => void };
  ctaHref: string | null;
}) {
  const w = schema.canvas.width;
  const h = schema.canvas.height;
  const x = useMotionValue(0);
  const spring = { type: 'spring', stiffness: 260, damping: 30 } as const;

  // Arrows / dots / auto-advance all land here — animate the track to the slide.
  useEffect(() => {
    animate(x, -index * w, spring);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, w]);

  const go = (dir: 1 | -1): void => onIndex((index + dir + slides.length) % slides.length);

  function onDragEnd(_e: unknown, info: { offset: { x: number }; velocity: { x: number } }): void {
    const power = info.offset.x + info.velocity.x * 0.16;
    let next = index;
    if (power < -w * 0.22) next = Math.min(slides.length - 1, index + 1);
    else if (power > w * 0.22) next = Math.max(0, index - 1);
    animate(x, -next * w, spring);
    if (next !== index) onIndex(next);
  }

  return (
    <div
      className="tpl-widget"
      style={{ width: w, height: h }}
      {...hoverProps}
      role="region"
      aria-label={`Customer reviews — ${slides.length} reviews, swipe to browse`}
    >
      <div className="tpl-carousel-clip">
        <motion.div
          className="tpl-carousel-track"
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -w * (slides.length - 1), right: 0 }}
          dragElastic={0.16}
          dragMomentum={false}
          onDragEnd={onDragEnd}
        >
          {slides.map((r, i) => (
            <div key={i} className="tpl-carousel-slide" style={{ width: w, height: h }}>
              <SchemaSurface schema={schema} record={r} animate ctaHref={i === index ? ctaHref : null} />
            </div>
          ))}
        </motion.div>
      </div>
      <Arrow side="prev" onClick={() => go(-1)} />
      <Arrow side="next" onClick={() => go(1)} />
      <Dots count={slides.length} index={index} onPick={onIndex} />
      {behavior.pauseOnHover && paused && <span className="visually-hidden">Paused</span>}
    </div>
  );
}
