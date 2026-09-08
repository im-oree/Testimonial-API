/**
 * TemplateWidget — the live, embeddable widget.
 *
 * Renders a product's template-based design (the same StudioSchema the design
 * studio edits) at its exact fixed dimensions, cycling through the product's
 * approved reviews with a gentle cross-fade. Runs inside the embed iframe on
 * external websites: no app chrome, no auth — the schema and records both come
 * from the public wall endpoint.
 *
 * Because it shares SchemaSurface with the studio canvas and preview, what you
 * edit is pixel-for-pixel what your visitors see.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SchemaSurface } from '../design-studio/runtime';
import type { StudioRecord, StudioSchema } from '../design-studio/types';

const CYCLE_MS = 6000;

export function TemplateWidget({
  schema,
  records,
  ctaHref = null,
}: {
  schema: StudioSchema;
  records: StudioRecord[];
  ctaHref?: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Auto-advance through the reviews; pauses while a visitor hovers.
  useEffect(() => {
    if (paused || records.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % records.length), CYCLE_MS);
    return () => window.clearInterval(t);
  }, [paused, records.length]);

  const record = records.length > 0 ? (records[index] ?? records[0]) : null;
  const w = schema.canvas.width;
  const h = schema.canvas.height;

  return (
    <div
      ref={wrapRef}
      className="tpl-widget"
      style={{ width: w, height: h }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onMouseDown={() => setPaused(true)}
      role="region"
      aria-label={`Customer reviews widget — ${records.length} review${records.length === 1 ? '' : 's'}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={records.length > 0 ? index : 'empty'}
          className="tpl-widget-frame"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <SchemaSurface schema={schema} record={record} animate ctaHref={ctaHref} />
        </motion.div>
      </AnimatePresence>

      {records.length > 1 && (
        <>
          <button
            type="button"
            className="tpl-widget-nav tpl-widget-prev"
            aria-label="Previous review"
            onClick={() => setIndex((i) => (i - 1 + records.length) % records.length)}
          >
            ‹
          </button>
          <button
            type="button"
            className="tpl-widget-nav tpl-widget-next"
            aria-label="Next review"
            onClick={() => setIndex((i) => (i + 1) % records.length)}
          >
            ›
          </button>
          <div className="tpl-widget-dots" role="tablist" aria-label="Reviews">
            {records.map((_r, i) => (
              <button
                key={i}
                type="button"
                className={`tpl-widget-dot ${i === index ? 'active' : ''}`}
                aria-label={`Show review ${i + 1}`}
                aria-selected={i === index}
                role="tab"
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
