/**
 * Orbit — the circular "avatar orbit" from the DOC-7 example: author photos
 * arranged in a ring, one review shown in the centre. Hover/focus an avatar
 * to read that person's review; the centre auto-advances when idle.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { WidgetDesignProps } from '../types';
import { Avatar, CtaRow, StarsInline, timeLabel, WidgetEmpty, fontStack } from '../primitives';

export default function OrbitWidget({ items, tokens, cta }: WidgetDesignProps) {
  const ringRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 520, h: 330 });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Keep the ring geometry in sync with the container width (fluid embed).
  useLayoutEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.max(el.clientWidth, 240);
      const h = Math.round(Math.min(360, Math.max(w * 0.78, 280)));
      setSize({ w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = window.setInterval(() => setActive((i) => (i + 1) % items.length), 4600);
    return () => window.clearInterval(t);
  }, [paused, items.length]);

  if (items.length === 0) return <WidgetEmpty tokens={tokens} cta={cta} />;

  const shown = items.slice(0, 12);
  const current = shown[Math.min(active, shown.length - 1)];
  const cx = size.w / 2;
  const cy = size.h / 2;
  const R = Math.max(Math.min(size.w, size.h) / 2 - 46, 62);
  const cardW = Math.min(190, Math.max(150, size.w * 0.36));

  return (
    <div style={{ fontFamily: fontStack(tokens.font), maxWidth: 720, margin: '0 auto' }}>
      <div
        ref={ringRef}
        className="wdg-orbit"
        style={{ position: 'relative', height: size.h, width: '100%' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* faint orbital guide */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: cx - R,
            top: cy - R,
            width: R * 2,
            height: R * 2,
            borderRadius: '50%',
            border: `1.5px dashed ${tokens.primary}30`,
            pointerEvents: 'none',
          }}
        />
        {shown.map((it, i) => {
          const rad = (i / shown.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + R * Math.cos(rad);
          const y = cy + R * Math.sin(rad);
          const isActive = i === Math.min(active, shown.length - 1);
          return (
            <button
              key={it.id}
              type="button"
              title={it.authorName}
              aria-label={`Read review by ${it.authorName}`}
              aria-pressed={isActive}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className="wdg-orbit-avatar"
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
                padding: 0,
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '50%',
                outlineOffset: 3,
                width: 46,
                height: 46,
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: isActive ? 50 : 44,
                  height: isActive ? 50 : 44,
                  transition: 'all .22s ease',
                  borderRadius: '50%',
                  border: isActive ? `3px solid ${tokens.accent}` : `2.5px solid ${tokens.primary}55`,
                  boxShadow: isActive ? `0 8px 18px -6px ${tokens.primary}aa` : 'none',
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <span style={{ display: 'block', transform: isActive ? 'scale(1)' : 'scale(.92)', transition: 'transform .22s ease' }}>
                  <Avatar item={it} tokens={tokens} size={isActive ? 44 : 39} />
                </span>
              </span>
            </button>
          );
        })}

        {/* centre card — the person whose avatar is active */}
        <div
          className="wdg-orbit-card"
          key={current.id}
          style={{
            position: 'absolute',
            left: cx - cardW / 2,
            top: cy - cardW / 2,
            width: cardW,
            minHeight: Math.min(cardW, size.h - 24),
            maxHeight: size.h - 18,
            overflow: 'auto',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            background: `linear-gradient(165deg, ${tokens.soft}, #fff 70%)`,
            border: `1px solid ${tokens.primary}22`,
            borderRadius: tokens.radiusPx,
            padding: 14,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: '#20243a' }}>{current.authorName}</div>
          <StarsInline rating={current.rating} size={15} />
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.5,
              color: '#3a3f55',
              display: '-webkit-box',
              WebkitLineClamp: 6,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {current.content}
          </p>
          <div style={{ fontSize: 11, color: '#9aa0b0' }}>{timeLabel(current.createdAt)}</div>
        </div>
      </div>
      <CtaRow cta={cta} tokens={tokens} align="center" />
    </div>
  );
}