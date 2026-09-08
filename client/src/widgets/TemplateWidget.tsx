/**
 * TemplateWidget — the live, embeddable widget.
 *
 * Renders a product's template-based design (the same StudioSchema the design
 * studio edits) at its exact fixed dimensions and answers the big embed
 * question: what happens when more reviews come in? The schema's `behavior`
 * — edited in the studio — decides:
 *
 *   · cycle     one review at a time, gentle cross-fade, dots + hover arrows
 *   · carousel  swipeable / draggable slides with touch inertia, dots,
 *              arrows and auto-advance
 *   · coverflow a 3D depth carousel — cards fan out in perspective, the
 *              whole scene leans toward the cursor, drag or click a side
 *              card to bring it front (gap, depth and rotation adjustable
 *              in the studio)
 *   · wheel     a 3D ring of cards rotating around the vertical axis —
 *              drag to spin, the scene tilts with the cursor
 *   · stack     a deck of cards — drag the top card aside (or wait) and
 *              the next review swings in
 *   · tilt      a mouse-reactive 3D card — leans and catches a glare under
 *              the cursor, springs back on leave, cycles reviews
 *   · marquee   a continuous stream in the template's own design — direction
 *              and speed adjustable, pauses on hover
 *
 * Runs inside the embed iframe on external websites: no app chrome, no auth.
 * Because it shares SchemaSurface with the studio canvas and preview, what you
 * edit is pixel-for-pixel what your visitors see.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useSpring } from 'framer-motion';
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

  // Auto-advance (cycle + carousel + coverflow + tilt), honoring pauseOnHover.
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
    return <CarouselWidget schema={schema} slides={limited} index={safeIndex} onIndex={setIndex} paused={paused} hoverProps={hoverProps} ctaHref={ctaHref} />;
  }

  // ---- Coverflow: 3D depth carousel with mouse-parallax.
  if (behavior.mode === 'coverflow' && limited.length > 1) {
    return <CoverflowWidget schema={schema} slides={limited} behavior={behavior} index={safeIndex} onIndex={setIndex} paused={paused} hoverProps={hoverProps} ctaHref={ctaHref} />;
  }

  // ---- Wheel: a 3D ring of cards rotating around the vertical axis.
  if (behavior.mode === 'wheel' && limited.length > 1) {
    return <WheelWidget schema={schema} slides={limited} index={safeIndex} onIndex={setIndex} paused={paused} hoverProps={hoverProps} ctaHref={ctaHref} />;
  }

  // ---- Stack: a deck — the top card swings away to reveal the next review.
  if (behavior.mode === 'stack' && limited.length > 1) {
    return <StackWidget schema={schema} slides={limited} index={safeIndex} onIndex={setIndex} paused={paused} hoverProps={hoverProps} ctaHref={ctaHref} />;
  }

  // ---- Tilt: a mouse-reactive 3D card that cycles reviews.
  if (behavior.mode === 'tilt') {
    return <TiltWidget schema={schema} slides={limited} index={safeIndex} onIndex={setIndex} paused={paused} hoverProps={hoverProps} ctaHref={ctaHref} />;
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

type HoverProps = { onMouseEnter?: () => void; onMouseLeave?: () => void };

/** Swipeable slide deck — one card per review, fling to move. */
function CarouselWidget({
  schema,
  slides,
  index,
  onIndex,
  paused,
  hoverProps,
  ctaHref,
}: {
  schema: StudioSchema;
  slides: Array<StudioRecord | null>;
  index: number;
  onIndex: (i: number) => void;
  paused: boolean;
  hoverProps: HoverProps;
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
      {paused && <span className="visually-hidden">Paused</span>}
    </div>
  );
}

/**
 * Coverflow — a 3D depth carousel. The active card faces front; neighbours
 * fan out in perspective (rotated, pushed back, dimmed). The whole scene
 * leans a few degrees toward the cursor (parallax), drags rubber-band, and
 * side cards are click-to-focus.
 */
function CoverflowWidget({
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
  hoverProps: HoverProps;
  ctaHref: string | null;
}) {
  const w = schema.canvas.width;
  const h = schema.canvas.height;
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Scene parallax: the whole coverflow leans toward the cursor.
  const sceneRx = useSpring(0, { stiffness: 120, damping: 18 });
  const sceneRy = useSpring(0, { stiffness: 120, damping: 18 });
  // Drag feedback: the row slides with the pointer, then springs back.
  const dragX = useSpring(0, { stiffness: 260, damping: 26 });

  const dragRef = useRef<{ x: number; dist: number } | null>(null);

  function onPointerDown(e: React.PointerEvent): void {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, dist: 0 };
  }
  function onPointerMove(e: React.PointerEvent): void {
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect) {
      // Parallax: -0.5..0.5 from center → a few degrees of lean.
      sceneRy.set(((e.clientX - rect.left) / rect.width - 0.5) * 8);
      sceneRx.set(-((e.clientY - rect.top) / rect.height - 0.5) * 5);
    }
    const d = dragRef.current;
    if (!d) return;
    d.dist = e.clientX - d.x;
    dragX.set(d.dist * 0.55);
  }
  function onPointerUp(): void {
    const d = dragRef.current;
    dragRef.current = null;
    dragX.set(0);
    if (!d) return;
    if (d.dist < -w * 0.14) onIndex(Math.min(slides.length - 1, index + 1));
    else if (d.dist > w * 0.14) onIndex(Math.max(0, index - 1));
  }
  function onPointerLeave(): void {
    sceneRx.set(0);
    sceneRy.set(0);
    dragRef.current = null;
    dragX.set(0);
  }

  // Tuning comes from the studio's behavior panel: card gap, z-depth and
  // side rotation are all adjustable per design.
  const gap = Math.min(w * Math.max(0.1, behavior.spacing ?? 0.42), 340);
  const depth = Math.max(30, behavior.depth ?? 190);
  const maxAngle = Math.min(70, Math.max(6, behavior.angle ?? 48));

  function slideTransform(offset: number): string {
    const abs = Math.abs(offset);
    const sign = offset < 0 ? -1 : 1;
    return [
      `translateX(${offset * gap}px)`,
      `translateZ(${-abs * depth}px)`,
      `rotateY(${sign * Math.min(maxAngle, 16 + abs * 14)}deg)`,
      `scale(${Math.max(0.62, 1 - abs * 0.14)})`,
    ].join(' ');
  }

  const go = (dir: 1 | -1): void => onIndex((index + dir + slides.length) % slides.length);

  return (
    <div
      ref={stageRef}
      className="tpl-widget tpl-coverflow"
      style={{ width: w, height: h }}
      {...hoverProps}
      role="region"
      aria-label={`Customer reviews — ${slides.length} reviews, drag or click a card`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <motion.div className="tpl-coverflow-scene" style={{ rotateX: sceneRx, rotateY: sceneRy, x: dragX }}>
        {slides.map((r, i) => {
          // Wrapped offset: the row is a ring, so distance is min(|i-index|, n-|i-index|).
          const n = slides.length;
          const raw = i - index;
          const offset = Math.abs(raw) > n / 2 ? raw - Math.sign(raw) * n : raw;
          const abs = Math.abs(offset);
          return (
            <div
              key={i}
              className={`tpl-coverflow-slide ${offset === 0 ? 'is-active' : ''}`}
              style={{
                width: w,
                height: h,
                zIndex: 100 - abs,
                transform: slideTransform(offset),
                opacity: offset === 0 ? 1 : Math.max(0.25, 0.85 - abs * 0.18),
                pointerEvents: offset === 0 ? 'none' : 'auto',
              }}
              onClick={() => {
                if (Math.abs(dragRef.current?.dist ?? 0) < 6 && offset !== 0) onIndex(i);
              }}
            >
              <SchemaSurface schema={schema} record={r} animate ctaHref={offset === 0 ? ctaHref : null} />
            </div>
          );
        })}
      </motion.div>
      <Arrow side="prev" onClick={() => go(-1)} />
      <Arrow side="next" onClick={() => go(1)} />
      <Dots count={slides.length} index={index} onPick={onIndex} />
      {paused && <span className="visually-hidden">Paused</span>}
    </div>
  );
}

/**
 * Tilt — a mouse-reactive 3D card. The card leans toward the cursor with a
 * springy rotation and a glare that follows the pointer; it settles flat on
 * leave. Reviews still cycle (cross-fade inside the tilting card).
 */
function TiltWidget({
  schema,
  slides,
  index,
  onIndex,
  paused,
  hoverProps,
  ctaHref,
}: {
  schema: StudioSchema;
  slides: Array<StudioRecord | null>;
  index: number;
  onIndex: (i: number) => void;
  paused: boolean;
  hoverProps: HoverProps;
  ctaHref: string | null;
}) {
  const w = schema.canvas.width;
  const h = schema.canvas.height;
  const cardRef = useRef<HTMLDivElement | null>(null);

  const rotateX = useSpring(0, { stiffness: 180, damping: 16 });
  const rotateY = useSpring(0, { stiffness: 180, damping: 16 });
  const [glare, setGlare] = useState({ x: 50, y: 50, on: false });

  function onPointerMove(e: React.PointerEvent): void {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width; // 0..1
    const ny = (e.clientY - rect.top) / rect.height;
    rotateY.set((nx - 0.5) * 16);
    rotateX.set(-(ny - 0.5) * 12);
    setGlare({ x: nx * 100, y: ny * 100, on: true });
  }
  function onPointerLeave(): void {
    rotateX.set(0);
    rotateY.set(0);
    setGlare((g) => ({ ...g, on: false }));
  }

  const record = slides[Math.min(index, slides.length - 1)] ?? null;
  const safeIndex = Math.min(index, slides.length - 1);
  const go = (dir: 1 | -1): void => onIndex((index + dir + slides.length) % slides.length);

  return (
    <div
      className="tpl-widget tpl-tilt"
      style={{ width: w, height: h }}
      {...hoverProps}
      role="region"
      aria-label={`Customer reviews — ${slides.length} review${slides.length === 1 ? '' : 's'}`}
    >
      <motion.div
        ref={cardRef}
        className="tpl-tilt-card"
        style={{ rotateX, rotateY, width: w, height: h }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={safeIndex}
            className="tpl-widget-frame"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <SchemaSurface schema={schema} record={record} animate ctaHref={ctaHref} />
          </motion.div>
        </AnimatePresence>
        <span
          className="tpl-tilt-glare"
          aria-hidden
          style={{
            opacity: glare.on ? 1 : 0,
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.10) 34%, rgba(255,255,255,0) 62%)`,
          }}
        />
      </motion.div>
      {slides.length > 1 && (
        <>
          <Arrow side="prev" onClick={() => go(-1)} />
          <Arrow side="next" onClick={() => go(1)} />
          <Dots count={slides.length} index={safeIndex} onPick={onIndex} />
        </>
      )}
      {paused && <span className="visually-hidden">Paused</span>}
    </div>
  );
}

/**
 * Wheel — a 3D ring of cards rotating around the vertical axis. Cards sit on
 * a cylinder (rotateY(i·step) translateZ(radius)); the ring rotates to bring
 * the active card front. Drag to spin, hover to pause, cursor to tilt.
 */
function WheelWidget({
  schema,
  slides,
  index,
  onIndex,
  paused,
  hoverProps,
  ctaHref,
}: {
  schema: StudioSchema;
  slides: Array<StudioRecord | null>;
  index: number;
  onIndex: (i: number) => void;
  paused: boolean;
  hoverProps: HoverProps;
  ctaHref: string | null;
}) {
  const w = schema.canvas.width;
  const h = schema.canvas.height;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const n = slides.length;
  const step = 360 / n;
  // Radius so neighbouring cards just touch: (w/2) / tan(π/n).
  const radius = Math.round(w / 2 / Math.tan(Math.PI / n));

  const rotY = useMotionValue(0);
  const rotRef = useRef(0);
  const spring = { type: 'spring', stiffness: 90, damping: 18 } as const;

  // Arrows / dots / auto-advance rotate the ring to the active card.
  useEffect(() => {
    rotRef.current = -index * step;
    animate(rotY, rotRef.current, spring);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step]);

  // Scene parallax: the ring leans toward the cursor.
  const sceneRx = useSpring(0, { stiffness: 120, damping: 18 });
  const sceneRy = useSpring(0, { stiffness: 120, damping: 18 });
  const dragRef = useRef<{ x: number; base: number } | null>(null);

  function onPointerDown(e: React.PointerEvent): void {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, base: rotRef.current };
  }
  function onPointerMove(e: React.PointerEvent): void {
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect) {
      sceneRy.set(((e.clientX - rect.left) / rect.width - 0.5) * 10);
      sceneRx.set(-((e.clientY - rect.top) / rect.height - 0.5) * 6);
    }
    const d = dragRef.current;
    if (!d) return;
    rotY.set(d.base + (e.clientX - d.x) * 0.25);
  }
  function onPointerUp(e: React.PointerEvent): void {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    const dist = e.clientX - d.x;
    if (dist < -60) onIndex((index + 1) % n);
    else if (dist > 60) onIndex((index - 1 + n) % n);
    else {
      rotRef.current = -index * step;
      animate(rotY, rotRef.current, spring);
    }
  }
  function onPointerLeave(): void {
    sceneRx.set(0);
    sceneRy.set(0);
    dragRef.current = null;
    rotRef.current = -index * step;
    animate(rotY, rotRef.current, spring);
  }

  const go = (dir: 1 | -1): void => onIndex((index + dir + n) % n);

  return (
    <div
      ref={stageRef}
      className="tpl-widget tpl-wheel"
      style={{ width: w, height: h }}
      {...hoverProps}
      role="region"
      aria-label={`Customer reviews — ${n} reviews on a 3D wheel, drag to spin`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <motion.div className="tpl-wheel-scene" style={{ rotateX: sceneRx, rotateY: sceneRy }}>
        <motion.div className="tpl-wheel-ring" style={{ rotateY: rotY }}>
          {slides.map((r, i) => (
            <div
              key={i}
              className={`tpl-wheel-card ${i === index ? 'is-active' : ''}`}
              style={{ width: w, height: h, transform: `rotateY(${i * step}deg) translateZ(${radius}px)`, backfaceVisibility: 'hidden' }}
              onClick={() => {
                if (Math.abs(dragRef.current?.x ?? 0) >= 0 && i !== index && !dragRef.current) onIndex(i);
              }}
            >
              <SchemaSurface schema={schema} record={r} animate ctaHref={i === index ? ctaHref : null} />
            </div>
          ))}
        </motion.div>
      </motion.div>
      <Arrow side="prev" onClick={() => go(-1)} />
      <Arrow side="next" onClick={() => go(1)} />
      <Dots count={n} index={index} onPick={onIndex} />
      {paused && <span className="visually-hidden">Paused</span>}
    </div>
  );
}

/**
 * Stack — a deck of cards. The top card can be dragged aside (either
 * direction) and swings away; the next review is already waiting behind it,
 * slightly smaller and deeper, and steps forward.
 */
function StackWidget({
  schema,
  slides,
  index,
  onIndex,
  paused,
  hoverProps,
  ctaHref,
}: {
  schema: StudioSchema;
  slides: Array<StudioRecord | null>;
  index: number;
  onIndex: (i: number) => void;
  paused: boolean;
  hoverProps: HoverProps;
  ctaHref: string | null;
}) {
  const w = schema.canvas.width;
  const h = schema.canvas.height;
  const n = slides.length;
  const go = (dir: 1 | -1): void => onIndex((index + dir + n) % n);

  return (
    <div
      className="tpl-widget tpl-stack"
      style={{ width: w, height: h }}
      {...hoverProps}
      role="region"
      aria-label={`Customer reviews — ${n} reviews in a deck, swipe the top card`}
    >
      <div className="tpl-stack-pile">
        {/* Cards waiting behind: deeper and smaller for every step back. */}
        {[3, 2, 1].map((k) => {
          const i = (index + k) % n;
          return (
            <div
              key={k}
              className="tpl-stack-behind"
              style={{
                width: w,
                height: h,
                zIndex: 20 - k,
                transform: `translateY(${k * 14}px) scale(${1 - k * 0.05}) translateZ(${-k * 80}px)`,
                filter: `brightness(${1 - k * 0.12})`,
              }}
              aria-hidden={k > 2}
            >
              <SchemaSurface schema={schema} record={slides[i]} />
            </div>
          );
        })}
        {/* The top card: draggable, swings away when dismissed. */}
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            className="tpl-stack-front"
            style={{ width: w, height: h, zIndex: 30 }}
            drag
            dragConstraints={{ left: -70, right: 70, top: -24, bottom: 24 }}
            dragElastic={0.55}
            onDragEnd={(_e, info) => {
              if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 420) onIndex((index + 1) % n);
            }}
            exit={{ x: 340, rotate: 14, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
          >
            <SchemaSurface schema={schema} record={slides[index]} animate ctaHref={ctaHref} />
          </motion.div>
        </AnimatePresence>
      </div>
      <Arrow side="prev" onClick={() => go(-1)} />
      <Arrow side="next" onClick={() => go(1)} />
      <Dots count={n} index={index} onPick={onIndex} />
      {paused && <span className="visually-hidden">Paused</span>}
    </div>
  );
}
