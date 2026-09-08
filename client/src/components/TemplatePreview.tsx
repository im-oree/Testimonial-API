/**
 * TemplatePreview — a widget template's schema rendered live, scaled to fit
 * whatever box it sits in. One renderer shared by the template picker, the
 * marketplace and the builder, so a template always looks like itself.
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
      if (w > 0) setScale(Math.min(maxScale, w / schema.canvas.width));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [schema.canvas.width, maxScale]);

  return (
    <div
      ref={boxRef}
      className="tpl-preview"
      style={{ aspectRatio: `${schema.canvas.width} / ${schema.canvas.height}`, ...style }}
    >
      <div
        className="tpl-preview-inner"
        style={{
          width: schema.canvas.width,
          height: schema.canvas.height,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <SchemaSurface schema={schema} record={record} />
      </div>
    </div>
  );
}
