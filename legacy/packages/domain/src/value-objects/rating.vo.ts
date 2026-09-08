import type { RatingType } from '../entities/testimonial.entity';
import { DomainError } from '../errors/domain.error';

/**
 * Rating value object — encodes the per-ratingType invariants:
 *  - star5: integer 1..5
 *  - nps:   integer 0..10
 *  - thumbs: -1 | 0 | 1  (down | neutral | up)
 *  - none:  null (no rating collected)
 */
export class Rating {
  private constructor(
    readonly type: RatingType,
    readonly value: number | null,
  ) {}

  static of(type: RatingType, value: number | null): Rating {
    if (type === 'none') {
      if (value !== null) {
        throw new DomainError('VALIDATION_ERROR', 'ratingType "none" cannot carry a numeric rating');
      }
      return new Rating('none', null);
    }

    if (value === null) {
      throw new DomainError('VALIDATION_ERROR', `ratingType "${type}" requires a numeric rating`);
    }

    const bounds: Record<Exclude<RatingType, 'none'>, [number, number]> = {
      star5: [1, 5],
      nps: [0, 10],
      thumbs: [-1, 1],
    };

    const [min, max] = bounds[type as Exclude<RatingType, 'none'>];
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new DomainError(
        'VALIDATION_ERROR',
        `rating ${value} is out of bounds for ratingType "${type}" (expected integer ${min}..${max})`,
        { ratingType: type, value, min, max },
      );
    }
    return new Rating(type, value);
  }

  /** Normalizes any rating to a displayable 1..5 scale (for widgets/dashboard). */
  toStarScale(): number | null {
    switch (this.type) {
      case 'none':
        return null;
      case 'star5':
        return this.value;
      case 'nps':
        // 0-10 NPS → 1..5 star scale
        return this.value === null ? null : Math.max(1, Math.min(5, Math.round((this.value / 10) * 5)));
      case 'thumbs':
        return this.value === 1 ? 5 : this.value === 0 ? 3 : 1;
    }
  }
}
