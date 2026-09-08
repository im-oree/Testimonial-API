/** Skeleton loaders — shimmer placeholders for data pages while they fetch. */
import type { CSSProperties } from 'react';

function Bar({ width, height, style }: { width?: number | string; height: number; style?: CSSProperties }) {
  return (
    <span
      className="sk"
      style={{ width: width ?? '100%', height, display: 'block', margin: '8px 0', ...style }}
      aria-hidden
    />
  );
}

/** A table-shaped skeleton (card + thead-like bars + body rows). */
export function SkeletonTable({ rows = 6, cols = 5, rowHeight = 16, bare = false }: { rows?: number; cols?: number; rowHeight?: number; bare?: boolean }) {
  const inner = (
    <>
      <div style={{ display: 'flex', gap: 24, padding: '10px 14px 6px 18px', opacity: 0.55 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <span key={i} className="sk sk-head" style={{ width: `${Math.max(8, 80 / cols)}%`, height: 10 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 24, padding: '12px 14px', borderTop: '1px solid #f1f2f4' }}>
          <span className="sk" style={{ width: '38%', height: rowHeight }} />
          <span className="sk" style={{ width: '22%', height: rowHeight }} />
          <span className="sk" style={{ width: '15%', height: rowHeight }} />
          <span className="sk" style={{ width: '12%', height: rowHeight }} />
          <span className="sk" style={{ width: '10%', height: rowHeight }} />
        </div>
      ))}
    </>
  );
  return bare ? <div aria-busy="true">{inner}</div> : <div className="card table-card" aria-busy="true">{inner}</div>;
}

/** Stat card grid skeleton. */
export function SkeletonStats({ count = 6 }: { count?: number }) {
  return (
    <div className="stat-grid" aria-busy="true" aria-label="Loading stats">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card stat-card">
          <Bar width="45%" height={22} />
          <Bar width="75%" height={11} />
        </div>
      ))}
    </div>
  );
}

/** Chart placeholder skeleton inside a card. */
export function SkeletonChart({ height = 240, title = true }: { height?: number; title?: boolean }) {
  return (
    <div className="card" aria-busy="true" aria-label="Loading chart">
      {title && (
        <div className="chart-head">
          <Bar width="40%" height={14} />
        </div>
      )}
      <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: 10, padding: '10px 8px 0' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="sk" style={{ flex: 1, height: `${25 + ((i * 13) % 55)}%`, maxHeight: '88%' }} />
        ))}
      </div>
    </div>
  );
}

/** Generic card skeleton — grid (default), stack of cards, or a two-col pair. */
export function SkeletonCards({ count = 4, height = 150, wrap = 'grid' }: { count?: number; height?: number; wrap?: 'grid' | 'stack' | 'two-col' }) {
  const cards = Array.from({ length: count }).map((_, i) => (
    <div key={i} className="card" style={{ height, marginBottom: wrap === 'stack' ? 14 : 0 }}>
      <Bar width="60%" height={15} />
      <Bar width="85%" height={11} />
      <Bar width="40%" height={11} />
    </div>
  ));
  if (wrap === 'stack') return <>{cards}</>;
  if (wrap === 'two-col') return <div className="two-col" aria-busy="true">{cards}</div>;
  return (
    <div className="product-grid" aria-busy="true" aria-label="Loading">
      {cards}
    </div>
  );
}

/** Small list skeleton (audit/team/moderation style rows). */
export function SkeletonList({ rows = 8, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div className="card" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 20, padding: '14px 4px', borderBottom: '1px solid #f1f2f4' }}>
          <span className="sk" style={{ width: `${46 - cols}%`, height: 12 }} />
          <span className="sk" style={{ width: '30%', height: 12 }} />
          <span className="sk" style={{ width: '18%', height: 12 }} />
        </div>
      ))}
    </div>
  );
}
