/** Marquee — two endless scrolling strips; pauses when you hover them. */
import type { WidgetDesignProps } from '../types';
import { Avatar, StarsInline, WidgetEmpty } from '../primitives';

function strip(items: WidgetDesignProps['items'], tokens: WidgetDesignProps['tokens'], reverse = false) {
  return (
    <div className={`wdg-marquee-track${reverse ? ' wdg-marquee-rev' : ''}`}>
      {[...items, ...items].map((it, i) => (
        <div key={`${it.id}-${i}`} className="wdg-marquee-item" style={{ background: '#fff', border: '1px solid #ececf3', borderRadius: tokens.radiusPx }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar item={it} tokens={tokens} size={30} />
            <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{it.authorName}</span>
          </div>
          <StarsInline rating={it.rating} size={13} />
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 12.5,
              lineHeight: 1.45,
              color: '#3a3f55',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {it.content}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function MarqueeWidget(props: WidgetDesignProps) {
  const { items, cta, tokens } = props;
  if (items.length === 0) return <WidgetEmpty tokens={tokens} cta={cta} />;
  const half = Math.ceil(items.length / 2);
  const top = items.slice(0, half);
  const bottom = items.slice(half);
  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div className="wdg-marquee wdg-marquee-top">{strip(top, tokens, false)}</div>
      {bottom.length > 0 && <div className="wdg-marquee">{strip(bottom, tokens, true)}</div>}
      {cta && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a href={cta.href} style={{ display: 'inline-block', padding: '9px 18px', borderRadius: 8, background: tokens.primary, color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
            {cta.label}
          </a>
        </div>
      )}
    </div>
  );
}
