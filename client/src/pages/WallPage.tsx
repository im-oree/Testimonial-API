/**
 * Public testimonial wall — no login needed. Shows a product's approved
 * reviews with an empty state and a teal "Add a Review +" CTA that opens the
 * product's public form. Mirrors the embeddable widget surface in a browser.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import type { PublicWall } from '../lib/types';
import { ErrorBanner, RatingStars } from '../components/ui';
import { FONT_OPTIONS } from '../lib/theme';

export default function WallPage() {
  const { appSlug = '' } = useParams();

  const [wall, setWall] = useState<PublicWall | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    api
      .get<PublicWall>(`/v1/public/walls/${appSlug}`)
      .then((w) => {
        if (alive) setWall(w);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'Wall not found.');
      });
    return () => {
      alive = false;
    };
  }, [appSlug]);

  if (error) {
    return (
      <div className="wall">
        <ErrorBanner message={error} />
      </div>
    );
  }
  if (!wall) {
    return (
      <div className="wall">
        <div className="block-center">
          <span className="spinner spinner-lg" aria-hidden />
        </div>
      </div>
    );
  }

  const count = wall.testimonials.length;
  const rated = wall.testimonials.filter((t) => t.rating);
  const avgRating = rated.length ? Math.round((rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length) * 10) / 10 : null;

  // DOC-7 theme: the API sends pre-resolved tokens; every value below falls
  // back to the previous look so older payloads still render identically.
  const th = wall.theme;
  const vars = {
    '--brand': th?.primary ?? wall.brandColor,
    '--accent': th?.accent ?? '#0ea5a0',
    '--radius': th ? `${th.radiusPx}px` : '14px',
    '--font-stack': FONT_OPTIONS.find((f) => f.id === th?.font)?.stack ?? 'inherit',
  } as React.CSSProperties;

  return (
    <div className="wall" style={vars}>
      <div className="wall-card">
        <header className="wall-head">
          <div className="eyebrow">Loved by customers</div>
          {wall.logoUrl && <img src={wall.logoUrl} alt={`${wall.tenantName} logo`} className="wall-logo" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
          <h1>{wall.app.name}</h1>
          <p className="muted">
            Real reviews collected on <strong>{wall.tenantName}</strong> — moderated and published automatically.
          </p>
        </header>

        {count === 0 ? (
          <div className="wall-empty">
            <div className="wall-empty-icon">★</div>
            <h2>No reviews yet</h2>
            <p className="muted">Be the first to share your experience with {wall.app.name}. It takes less than a minute.</p>
            {wall.form && (
              <Link to={`/forms/${wall.form.slug}`} className="btn btn-teal">
                Add a Review +
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="wall-actions">
              <span className="muted small">
                {count} review{count === 1 ? '' : 's'}
                {avgRating !== null && (
                  <>
                    {' '}· average <RatingStars value={avgRating} size="sm" /> {avgRating.toFixed(1)}
                  </>
                )}
              </span>
              {wall.form && (
                <Link to={`/forms/${wall.form.slug}`} className="btn btn-teal">
                  Add a Review +
                </Link>
              )}
            </div>
            <ul className="wall-list">
              {wall.testimonials.map((t) => (
                <li key={t.id} className="wall-item">
                  <div className="wall-item-head">
                    <RatingStars value={t.rating ?? undefined} size="sm" />
                    <span className="muted small">{timeAgo(t.createdAt)}</span>
                  </div>
                  <p className="wall-quote">“{t.content}”</p>
                  <div className="muted small strong">— {t.authorName}</div>
                </li>
              ))}
            </ul>
          </>
        )}

        <footer className="wall-foot">
          <span>Powered by Zojatech — collect testimonials on any website.</span>
        </footer>
      </div>
    </div>
  );
}
