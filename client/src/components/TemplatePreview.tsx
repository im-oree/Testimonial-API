/**
 * TemplatePreview — a widget template's schema rendered live, letterboxed
 * into a FIXED 16:11 frame so every card in every grid is the same shape
 * (and an empty or missing preview keeps the shell instead of collapsing).
 * One renderer shared by the template picker, the marketplace, the builder,
 * the designs gallery and the platform catalogue.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { SchemaSurface } from '../design-studio/runtime';
import type { StudioRecord, StudioSchema } from '../design-studio/types';

export const SAMPLE_RECORD: StudioRecord = {
  content: 'The embed was live on our site before lunch and reviews started arriving the same day.',
  authorName: 'Ada Okafor',
  rating: 5,
};

export function TemplatePreview({
  schema,
  record = SAMPLE_RECORD,
  maxScale = 1,
  style,
}: {
  schema: StudioSchema;
  record?: StudioRecord | null;
  maxScale?: number;
  style?: CSSProperties;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = (): void => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w > 0 && h > 0) {
        // Fit the widget inside the frame at its true proportions.
        setScale(Math.min(maxScale, w / schema.canvas.width, h / schema.canvas.height));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [schema.canvas.width, schema.canvas.height, maxScale]);

  return (
    <div ref={boxRef} className="tpl-preview" style={style}>
      <div
        className="tpl-preview-inner"
        style={{
          width: schema.canvas.width,
          height: schema.canvas.height,
          transform: `scale(${scale})`,
        }}
      >
        <SchemaSurface schema={schema} record={record} />
      </div>
    </div>
  );
}
