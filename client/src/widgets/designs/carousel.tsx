/** Carousel — one review at a time, auto-rotates, pauses on hover, dot nav. */
import { useEffect, useState } from 'react';
import type { WidgetDesignProps } from '../types';
import { Avatar, StarsInline, timeLabel, WidgetEmpty, fontStack } from '../primitives';

const INTERVAL_MS = 4800;

export default function CarouselWidget({ items, tokens, cta }: WidgetDesignProps) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % items.length), INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [paused, items.length]);

  if (items.length === 0) return <WidgetEmpty tokens={tokens} cta={cta} />;
  const item = items[Math.min(idx, items.length - 1)];

  return (
    <div
      style={{ fontFamily: fontStack(tokens.font), maxWidth: 680, margin: '0 auto' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        style={{
          background: '#fff',
          border: `1px solid ${tokens.primary}22`,
          borderRadius: tokens.radiusPx,
          padding: '30px 26px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          minHeight: 250,
          justifyContent: 'center',
        }}
      >
        <Avatar item={item} tokens={tokens} size={52} />
        <StarsInline rating={item.rating} size={18} />
        <blockquote style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: '#2b2f45', maxWidth: 500 }}>{item.content}</blockquote>
        <div style={{ fontWeight: 700, color: tokens.primary }}>{item.authorName}</div>
        <div style={{ fontSize: 12, color: '#9aa0b0' }}>{timeLabel(item.createdAt)}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 }}>
        {items.slice(0, 8).map((it, i) => (
          <button
            key={it.id}
            type="button"
            aria-label={`Review ${i + 1}`}
            onClick={() => setIdx(i)}
            style={{
              width: i === idx ? 18 : 7,
              height: 7,
              borderRadius: 4,
              border: 0,
              background: i === idx ? tokens.primary : tokens.primary + '44',
              cursor: 'pointer',
              transition: 'width .2s ease',
              padding: 0,
            }}
          />
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        {cta && (
          <a href={cta.href} style={{ display: 'inline-block', padding: '9px 18px', borderRadius: 8, background: tokens.primary, color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
            {cta.label}
          </a>
        )}
      </div>
    </div>
  );
}