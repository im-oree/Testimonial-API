/**
 * Spotlight — a featured review (with follow-cursor tilt) leads the wall,
 * the rest fall into a calm grid below it.
 */
import { useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import type { WidgetDesignProps } from '../types';
import { Avatar, StarsInline, timeLabel, WidgetEmpty, fontStack } from '../primitives';

export default function SpotlightWidget({ items, tokens, cta }: WidgetDesignProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<CSSProperties>({});

  if (items.length === 0) return <WidgetEmpty tokens={tokens} cta={cta} />;
  const [first, ...rest] = items;

  function move(e: MouseEvent<HTMLDivElement>): void {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({
      transform: `perspective(760px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-2px)`,
      transition: 'transform .12s ease-out',
    });
  }

  return (
    <div style={{ fontFamily: fontStack(tokens.font) }}>
      <div
        ref={ref}
        onMouseMove={move}
        onMouseLeave={() => setTilt({ transform: 'perspective(760px)', transition: 'transform .35s ease' })}
        style={{
          ...tilt,
          maxWidth: 640,
          margin: '0 auto 22px',
          textAlign: 'center',
          background: `linear-gradient(165deg, ${tokens.soft}, #fff 62%)`,
          border: `1px solid ${tokens.primary}22`,
          borderTop: `4px solid ${tokens.accent}`,
          borderRadius: tokens.radiusPx,
          padding: '26px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Avatar item={first} tokens={tokens} size={54} />
        <StarsInline rating={first.rating} size={18} />
        <blockquote
          style={{
            margin: 0,
            fontSize: 17,
            lineHeight: 1.6,
            color: '#23263a',
            maxWidth: 520,
            quotes: 'none',
          }}
        >
          {first.content}
        </blockquote>
        <div style={{ fontWeight: 700, color: tokens.primary }}>{first.authorName}</div>
        <div style={{ fontSize: 12, color: '#9aa0b0' }}>{timeLabel(first.createdAt)}</div>
      </div>

      {rest.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: 12,
          }}
        >
          {rest.map((it) => (
            <div
              key={it.id}
              style={{
                background: '#fff',
                border: '1px solid #ececf3',
                borderRadius: tokens.radiusPx,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar item={it} tokens={tokens} size={30} />
                <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.authorName}</span>
              </div>
              <StarsInline rating={it.rating} />
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: '#3a3f55',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {it.content}
              </p>
            </div>
          ))}
        </div>
      )}
      {cta && (
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <a href={cta.href} style={{ display: 'inline-block', padding: '9px 18px', borderRadius: 8, background: tokens.primary, color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
            {cta.label}
          </a>
        </div>
      )}
    </div>
  );
}