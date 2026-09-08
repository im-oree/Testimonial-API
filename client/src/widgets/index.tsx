/**
 * Widget design library — the plug-and-play registry.
 *
 * One file per design in ./designs, all implementing the same WidgetDesignProps
 * contract (see ./types): author picture-or-initials, name, rating, message,
 * date + optional CTA. Every design looks different but renders the same data,
 * so any design can be swapped in for any product without touching the rest of
 * the system ("things every widget should have, expressed differently").
 *
 * Usage:
 *   const { meta, component: Widget } = getWidgetDesign('carousel');
 *   <Widget items={wall.testimonials} tokens={tokens} cta={cta} />
 */
import './designs.css';
import type { ComponentType } from 'react';
import type { WidgetDesignProps, WidgetItem, WidgetTokens } from './types';
import ClassicWidget from './designs/classic';
import SpotlightWidget from './designs/spotlight';
import CarouselWidget from './designs/carousel';
import WallWidget from './designs/wall';
import MarqueeWidget from './designs/marquee';
import OrbitWidget from './designs/orbit';

export type { WidgetDesignProps, WidgetItem, WidgetTokens } from './types';

export interface WidgetDesignMeta {
  id: string;
  name: string;
  tagline: string;
  category: 'Grid' | 'Spotlight' | 'Carousel' | 'Wall' | 'Marquee' | 'Orbit';
  features: string[];
}

export interface WidgetRegistryEntry {
  meta: WidgetDesignMeta;
  component: ComponentType<WidgetDesignProps>;
}

export const WIDGET_DESIGNS: WidgetRegistryEntry[] = [
  {
    meta: {
      id: 'classic',
      name: 'Classic grid',
      tagline: 'Clean cards in a tidy responsive grid — the dependable default.',
      category: 'Grid',
      features: ['Avatar or initials', 'Stars and date', 'Hover lift'],
    },
    component: ClassicWidget,
  },
  {
    meta: {
      id: 'spotlight',
      name: 'Spotlight',
      tagline: 'One featured review leads the wall, the rest follow in a quiet grid.',
      category: 'Spotlight',
      features: ['Cursor-follow tilt card', 'Big featured quote', 'Highlights your best review'],
    },
    component: SpotlightWidget,
  },
  {
    meta: {
      id: 'carousel',
      name: 'Carousel',
      tagline: 'One review at a time with dot navigation and gentle auto-rotation.',
      category: 'Carousel',
      features: ['Auto-rotates', 'Pauses on hover', 'Dot navigation'],
    },
    component: CarouselWidget,
  },
  {
    meta: {
      id: 'wall',
      name: 'Wall of love',
      tagline: 'Masonry columns of customer quotes — the classic social-proof wall.',
      category: 'Wall',
      features: ['Masonry layout', 'Compact cards', 'Scales to any width'],
    },
    component: WallWidget,
  },
  {
    meta: {
      id: 'marquee',
      name: 'Marquee',
      tagline: 'Endless scrolling review strips — a live ticker of happy customers.',
      category: 'Marquee',
      features: ['Two scrolling strips', 'Pauses on hover', 'Infinite loop'],
    },
    component: MarqueeWidget,
  },
  {
    meta: {
      id: 'orbit',
      name: 'Orbit',
      tagline: 'Author photos orbit the page; hover one to read that review.',
      category: 'Orbit',
      features: ['Circular avatar ring', 'Hover to reveal', 'Auto-advance centre'],
    },
    component: OrbitWidget,
  },
];

export const DEFAULT_WIDGET_DESIGN = 'classic';

export function getWidgetDesign(id?: string | null): WidgetRegistryEntry {
  return WIDGET_DESIGNS.find((d) => d.meta.id === id) ?? WIDGET_DESIGNS[0];
}

/** Sample content used for gallery previews when a product has no reviews yet. */
export const SAMPLE_ITEMS: WidgetItem[] = [
  {
    id: 'sample-1',
    authorName: 'Ada Okafor',
    content: 'Absolutely love it — onboarding took minutes and the support team is superb.',
    rating: 5,
    createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
  },
  {
    id: 'sample-2',
    authorName: 'Marcus Chen',
    content: 'We moved our reviews over in an afternoon. Everything just works.',
    rating: 5,
    createdAt: new Date(Date.now() - 6 * 864e5).toISOString(),
  },
  {
    id: 'sample-3',
    authorName: 'Lena Fischer',
    content: 'Clean, fast and the moderation queue keeps our page professional.',
    rating: 4,
    createdAt: new Date(Date.now() - 11 * 864e5).toISOString(),
  },
  {
    id: 'sample-4',
    authorName: 'Tunde Adeyemi',
    content: 'The embed was live on our WordPress site before lunch.',
    rating: 5,
    createdAt: new Date(Date.now() - 19 * 864e5).toISOString(),
  },
  {
    id: 'sample-5',
    authorName: 'Priya Raman',
    content: 'Customers trust the wall — our conversion on the landing page went up noticeably.',
    rating: 5,
    createdAt: new Date(Date.now() - 32 * 864e5).toISOString(),
  },
];

export const SAMPLE_TOKENS: WidgetTokens = {
  primary: '#0ea5a0',
  soft: '#e0f5f4',
  accent: '#7c6fe0',
  radiusPx: 14,
  font: 'system',
};
