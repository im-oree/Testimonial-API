/**
 * Widget template registry — the product's core catalogue.
 *
 * A WIDGET TEMPLATE is a fixed-dimension, editable design for embedding on
 * external websites. Every template must carry the required rating-system
 * components — one element bound to each of REQUIRED_WIDGET_FIELDS — plus any
 * number of decorative extras (headings, images, buttons, spacers) for design
 * reasons. The fixed dimensions mean a developer embedding the widget knows
 * exactly what space it occupies before it loads.
 *
 * Templates are plain schema JSON in the DOC 7B studio shape: applying one
 * copies its schema onto the product, where the design studio customises it
 * (colours, typography, positions, extras). The public embed renders that
 * saved schema with live review records through the same runtime the studio
 * preview uses — editing and live output can never drift apart.
 *
 * Bound elements keep sample copy in `text` so the template reads well while
 * editing and on empty walls; a live record overwrites it at render time.
 */

export type TemplateElementType = 'heading' | 'text' | 'image' | 'rating-stars' | 'button' | 'container' | 'spacer';

export interface TemplateElement {
  id: string;
  type: TemplateElementType;
  name: string;
  visible: boolean;
  layout: { x: number; y: number; width: number; height: number; z: number };
  style: { background: string | null; radius: number; opacity: number };
  typography: { fontSize: number; fontWeight: number; color: string; align: 'left' | 'center' | 'right' } | null;
  text: string | null;
  imageUrl: string | null;
  binding: { bindingKey: 'review_text' | 'reviewer_name' | 'review_rating'; property: string } | null;
  animation: { type: string; durationMs: number; delayMs: number } | null;
}

export interface TemplateSchema {
  name: string;
  canvas: { width: number; height: number; background: string };
  version: number;
  elements: TemplateElement[];
  /** Live multi-review behavior of the embedded widget. */
  behavior?: TemplateBehavior;
}

/**
 * How a widget presents many reviews inside its fixed frame — the answer to
 * "what happens when more reviews come in": cycle one at a time, swipe a
 * carousel, or stream a marquee.
 */
export interface TemplateBehavior {
  mode: 'cycle' | 'carousel' | 'marquee';
  autoPlay: boolean;
  intervalSec: number;
  pauseOnHover: boolean;
  direction: 'left' | 'right';
  speedPx: number;
  maxRecords: number;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  width: number;
  height: number;
  features: string[];
  schema: TemplateSchema;
}

/** The components every widget must render to qualify as a widget. */
export const REQUIRED_WIDGET_FIELDS = ['review_text', 'reviewer_name', 'review_rating'] as const;

/** Legacy binding keys resolve to the same canonical fields. */
const LEGACY_KEYS: Record<string, string> = {
  content: 'review_text',
  authorName: 'reviewer_name',
  rating: 'review_rating',
};

function el(p: Partial<TemplateElement> & Pick<TemplateElement, 'id' | 'type' | 'layout'>): TemplateElement {
  const textish = p.type === 'heading' || p.type === 'text' || p.type === 'button';
  return {
    name: p.type,
    visible: true,
    style: { background: null, radius: 0, opacity: 1 },
    typography: textish ? { fontSize: 16, fontWeight: 400, color: '#334155', align: 'left' } : null,
    text: textish ? (p.type === 'button' ? 'Add a review' : 'Text') : null,
    imageUrl: null,
    binding: null,
    animation: null,
    ...p,
  } as TemplateElement;
}

const SAMPLE_QUOTE = 'The embed was live on our site before lunch and reviews started arriving the same day.';
const SAMPLE_AUTHOR = 'Ada Okafor';

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'quote-card',
    name: 'Quote Card',
    description: 'The dependable classic — one review, big and centred, on a soft card. Works everywhere.',
    category: 'Card',
    width: 720,
    height: 560,
    features: ['Centred quote', 'Large stars', 'CTA button'],
    schema: {
      name: 'Quote card',
      canvas: { width: 720, height: 560, background: '#f6f7fc' },
      version: 1,
      elements: [
        el({
          id: 'tpl_qc_card', type: 'container', name: 'Card', layout: { x: 60, y: 60, width: 600, height: 400, z: 1 },
          style: { background: '#ffffff', radius: 22, opacity: 1 },
        }),
        el({
          id: 'tpl_qc_stars', type: 'rating-stars', name: 'Rating', layout: { x: 300, y: 104, width: 120, height: 26, z: 10 },
          binding: { bindingKey: 'review_rating', property: 'rating' }, animation: { type: 'fade-in', durationMs: 500, delayMs: 0 },
        }),
        el({
          id: 'tpl_qc_quote', type: 'text', name: 'Review', text: SAMPLE_QUOTE,
          layout: { x: 120, y: 152, width: 480, height: 160, z: 10 },
          typography: { fontSize: 19, fontWeight: 400, color: '#334155', align: 'center' },
          binding: { bindingKey: 'review_text', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 600, delayMs: 80 },
        }),
        el({
          id: 'tpl_qc_author', type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
          layout: { x: 120, y: 326, width: 480, height: 28, z: 10 },
          typography: { fontSize: 16, fontWeight: 700, color: '#1b2559', align: 'center' },
          binding: { bindingKey: 'reviewer_name', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 500, delayMs: 160 },
        }),
        el({
          id: 'tpl_qc_sub', type: 'text', name: 'Verified line', text: 'Verified customer review',
          layout: { x: 120, y: 358, width: 480, height: 20, z: 10 },
          typography: { fontSize: 12, fontWeight: 400, color: '#94a3b8', align: 'center' },
        }),
        el({
          id: 'tpl_qc_cta', type: 'button', name: 'CTA', text: 'Add a review',
          layout: { x: 270, y: 490, width: 180, height: 44, z: 10 },
          style: { background: '#0ea5a0', radius: 12, opacity: 1 },
          typography: { fontSize: 15, fontWeight: 600, color: '#ffffff', align: 'center' },
        }),
      ],
      behavior: { mode: 'cycle', autoPlay: true, intervalSec: 6, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 0 },
    },
  },
  {
    id: 'hero-banner',
    name: 'Spotlight Hero',
    description: 'Wide dark banner with your pitch on the left and the featured review on the right. For landing pages.',
    category: 'Hero',
    width: 1200,
    height: 420,
    features: ['Split layout', 'Featured review card', 'Brand CTA'],
    schema: {
      name: 'Spotlight hero',
      canvas: { width: 1200, height: 420, background: '#1b2559' },
      version: 1,
      elements: [
        el({
          id: 'tpl_hb_heading', type: 'heading', name: 'Pitch', text: 'Loved by our customers',
          layout: { x: 70, y: 116, width: 440, height: 42, z: 10 },
          typography: { fontSize: 30, fontWeight: 700, color: '#ffffff', align: 'left' },
          animation: { type: 'slide-in-left', durationMs: 600, delayMs: 0 },
        }),
        el({
          id: 'tpl_hb_sub', type: 'text', name: 'Sub line', text: 'Real reviews, collected on our own site and moderated by our team.',
          layout: { x: 70, y: 168, width: 420, height: 48, z: 10 },
          typography: { fontSize: 14, fontWeight: 400, color: '#c7d2fe', align: 'left' },
        }),
        el({
          id: 'tpl_hb_cta', type: 'button', name: 'CTA', text: 'Read all reviews',
          layout: { x: 70, y: 250, width: 200, height: 46, z: 10 },
          style: { background: '#0ea5a0', radius: 12, opacity: 1 },
          typography: { fontSize: 15, fontWeight: 600, color: '#ffffff', align: 'center' },
        }),
        el({
          id: 'tpl_hb_card', type: 'container', name: 'Review card', layout: { x: 600, y: 50, width: 540, height: 320, z: 1 },
          style: { background: '#ffffff', radius: 24, opacity: 1 },
        }),
        el({
          id: 'tpl_hb_stars', type: 'rating-stars', name: 'Rating', layout: { x: 810, y: 100, width: 120, height: 28, z: 10 },
          binding: { bindingKey: 'review_rating', property: 'rating' },
        }),
        el({
          id: 'tpl_hb_quote', type: 'text', name: 'Review', text: SAMPLE_QUOTE,
          layout: { x: 650, y: 150, width: 440, height: 130, z: 10 },
          typography: { fontSize: 17, fontWeight: 400, color: '#334155', align: 'center' },
          binding: { bindingKey: 'review_text', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 600, delayMs: 100 },
        }),
        el({
          id: 'tpl_hb_author', type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
          layout: { x: 650, y: 292, width: 440, height: 26, z: 10 },
          typography: { fontSize: 15, fontWeight: 700, color: '#1b2559', align: 'center' },
          binding: { bindingKey: 'reviewer_name', property: 'text' },
        }),
      ],
      behavior: { mode: 'cycle', autoPlay: true, intervalSec: 8, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 0 },
    },
  },
  {
    id: 'slim-strip',
    name: 'Slim Strip',
    description: 'One slim line of social proof — stars, quote and author side by side. For footers and banners.',
    category: 'Strip',
    width: 1200,
    height: 200,
    features: ['Single-line layout', 'Fits footers', 'Low profile'],
    schema: {
      name: 'Slim strip',
      canvas: { width: 1200, height: 200, background: '#ffffff' },
      version: 1,
      elements: [
        el({
          id: 'tpl_ss_bg', type: 'container', name: 'Strip', layout: { x: 20, y: 20, width: 1160, height: 160, z: 1 },
          style: { background: '#f8fafc', radius: 16, opacity: 1 },
        }),
        el({
          id: 'tpl_ss_stars', type: 'rating-stars', name: 'Rating', layout: { x: 64, y: 87, width: 120, height: 26, z: 10 },
          binding: { bindingKey: 'review_rating', property: 'rating' },
        }),
        el({
          id: 'tpl_ss_quote', type: 'text', name: 'Review', text: SAMPLE_QUOTE,
          layout: { x: 214, y: 52, width: 620, height: 96, z: 10 },
          typography: { fontSize: 17, fontWeight: 400, color: '#334155', align: 'left' },
          binding: { bindingKey: 'review_text', property: 'text' },
        }),
        el({
          id: 'tpl_ss_author', type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
          layout: { x: 870, y: 70, width: 200, height: 26, z: 10 },
          typography: { fontSize: 15, fontWeight: 700, color: '#1b2559', align: 'left' },
          binding: { bindingKey: 'reviewer_name', property: 'text' },
        }),
        el({
          id: 'tpl_ss_sub', type: 'text', name: 'Verified line', text: 'Verified customer',
          layout: { x: 870, y: 100, width: 200, height: 20, z: 10 },
          typography: { fontSize: 12, fontWeight: 400, color: '#94a3b8', align: 'left' },
        }),
      ],
      behavior: { mode: 'marquee', autoPlay: true, intervalSec: 6, pauseOnHover: true, direction: 'left', speedPx: 70, maxRecords: 12 },
    },
  },
  {
    id: 'rating-badge',
    name: 'Rating Badge',
    description: 'Compact square with oversized stars — instant social proof for sidebars and corners.',
    category: 'Badge',
    width: 360,
    height: 320,
    features: ['Oversized stars', 'Compact footprint', 'Sidebar friendly'],
    schema: {
      name: 'Rating badge',
      canvas: { width: 360, height: 320, background: '#ffffff' },
      version: 1,
      elements: [
        el({
          id: 'tpl_rb_card', type: 'container', name: 'Card', layout: { x: 24, y: 24, width: 312, height: 272, z: 1 },
          style: { background: '#f0fdf9', radius: 20, opacity: 1 },
        }),
        el({
          id: 'tpl_rb_stars', type: 'rating-stars', name: 'Rating', layout: { x: 120, y: 58, width: 120, height: 44, z: 10 },
          binding: { bindingKey: 'review_rating', property: 'rating' },
          animation: { type: 'fade-in', durationMs: 500, delayMs: 0 },
        }),
        el({
          id: 'tpl_rb_heading', type: 'heading', name: 'Title', text: 'Rated by customers',
          layout: { x: 36, y: 118, width: 288, height: 24, z: 10 },
          typography: { fontSize: 15, fontWeight: 700, color: '#1b2559', align: 'center' },
        }),
        el({
          id: 'tpl_rb_quote', type: 'text', name: 'Review', text: SAMPLE_QUOTE,
          layout: { x: 40, y: 150, width: 280, height: 78, z: 10 },
          typography: { fontSize: 13, fontWeight: 400, color: '#475569', align: 'center' },
          binding: { bindingKey: 'review_text', property: 'text' },
        }),
        el({
          id: 'tpl_rb_author', type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
          layout: { x: 36, y: 238, width: 288, height: 22, z: 10 },
          typography: { fontSize: 13, fontWeight: 700, color: '#0f766e', align: 'center' },
          binding: { bindingKey: 'reviewer_name', property: 'text' },
        }),
      ],
      behavior: { mode: 'cycle', autoPlay: true, intervalSec: 5, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 0 },
    },
  },
  {
    id: 'story-card',
    name: 'Story Card',
    description: 'Portrait card with an avatar photo — the review reads like a customer story. For feeds and columns.',
    category: 'Card',
    width: 540,
    height: 760,
    features: ['Avatar photo', 'Portrait format', 'Story layout'],
    schema: {
      name: 'Story card',
      canvas: { width: 540, height: 760, background: '#f6f7fc' },
      version: 1,
      elements: [
        el({
          id: 'tpl_sc_card', type: 'container', name: 'Card', layout: { x: 40, y: 40, width: 460, height: 680, z: 1 },
          style: { background: '#ffffff', radius: 24, opacity: 1 },
        }),
        el({
          id: 'tpl_sc_avatar', type: 'image', name: 'Avatar photo',
          imageUrl: 'https://i.pravatar.cc/160?img=47',
          layout: { x: 190, y: 88, width: 160, height: 160, z: 10 },
          style: { background: null, radius: 80, opacity: 1 },
          animation: { type: 'fade-in-down', durationMs: 500, delayMs: 0 },
        }),
        el({
          id: 'tpl_sc_stars', type: 'rating-stars', name: 'Rating', layout: { x: 210, y: 272, width: 120, height: 28, z: 10 },
          binding: { bindingKey: 'review_rating', property: 'rating' },
        }),
        el({
          id: 'tpl_sc_quote', type: 'text', name: 'Review', text: SAMPLE_QUOTE,
          layout: { x: 80, y: 318, width: 380, height: 210, z: 10 },
          typography: { fontSize: 16, fontWeight: 400, color: '#475569', align: 'center' },
          binding: { bindingKey: 'review_text', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 600, delayMs: 100 },
        }),
        el({
          id: 'tpl_sc_author', type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
          layout: { x: 80, y: 544, width: 380, height: 26, z: 10 },
          typography: { fontSize: 16, fontWeight: 700, color: '#1b2559', align: 'center' },
          binding: { bindingKey: 'reviewer_name', property: 'text' },
        }),
        el({
          id: 'tpl_sc_sub', type: 'text', name: 'Since line', text: 'Customer since 2024',
          layout: { x: 80, y: 574, width: 380, height: 20, z: 10 },
          typography: { fontSize: 12, fontWeight: 400, color: '#94a3b8', align: 'center' },
        }),
        el({
          id: 'tpl_sc_cta', type: 'button', name: 'CTA', text: 'Add your story',
          layout: { x: 170, y: 636, width: 200, height: 44, z: 10 },
          style: { background: '#1b2559', radius: 12, opacity: 1 },
          typography: { fontSize: 14, fontWeight: 600, color: '#ffffff', align: 'center' },
        }),
      ],
      behavior: { mode: 'carousel', autoPlay: true, intervalSec: 6, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 0 },
    },
  },
  {
    id: 'bold-quote',
    name: 'Bold Statement',
    description: 'Dark, dramatic typography-first card with an oversized quote mark. For pricing and feature pages.',
    category: 'Hero',
    width: 800,
    height: 600,
    features: ['Oversized quote mark', 'Dark theme', 'Statement type'],
    schema: {
      name: 'Bold statement',
      canvas: { width: 800, height: 600, background: '#101736' },
      version: 1,
      elements: [
        el({
          id: 'tpl_bq_mark', type: 'text', name: 'Quote mark', text: '\u201C',
          layout: { x: 56, y: 8, width: 220, height: 150, z: 2 },
          typography: { fontSize: 130, fontWeight: 700, color: '#0ea5a0', align: 'left' },
          style: { background: null, radius: 0, opacity: 0.5 },
        }),
        el({
          id: 'tpl_bq_stars', type: 'rating-stars', name: 'Rating', layout: { x: 340, y: 176, width: 120, height: 30, z: 10 },
          binding: { bindingKey: 'review_rating', property: 'rating' },
        }),
        el({
          id: 'tpl_bq_quote', type: 'text', name: 'Review', text: SAMPLE_QUOTE,
          layout: { x: 110, y: 232, width: 580, height: 180, z: 10 },
          typography: { fontSize: 24, fontWeight: 500, color: '#ffffff', align: 'center' },
          binding: { bindingKey: 'review_text', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 700, delayMs: 80 },
        }),
        el({
          id: 'tpl_bq_author', type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
          layout: { x: 110, y: 436, width: 580, height: 28, z: 10 },
          typography: { fontSize: 16, fontWeight: 700, color: '#5eead4', align: 'center' },
          binding: { bindingKey: 'reviewer_name', property: 'text' },
        }),
        el({
          id: 'tpl_bq_sub', type: 'text', name: 'Verified line', text: 'Verified customer review',
          layout: { x: 110, y: 468, width: 580, height: 20, z: 10 },
          typography: { fontSize: 12, fontWeight: 400, color: '#818cf8', align: 'center' },
        }),
        el({
          id: 'tpl_bq_cta', type: 'button', name: 'CTA', text: 'Add a review',
          layout: { x: 330, y: 516, width: 140, height: 42, z: 10 },
          style: { background: '#0ea5a0', radius: 10, opacity: 1 },
          typography: { fontSize: 14, fontWeight: 600, color: '#ffffff', align: 'center' },
        }),
      ],
      behavior: { mode: 'cycle', autoPlay: true, intervalSec: 7, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 0 },
    },
  },
  {
    id: 'swipe-deck',
    name: 'Swipe Deck',
    description: 'Touch-friendly card deck — swipe or drag through reviews, with dots and arrows. Built for interaction.',
    category: 'Carousel',
    width: 640,
    height: 480,
    features: ['Swipe / drag', 'Dots + arrows', 'Auto-advance'],
    schema: {
      name: 'Swipe deck',
      canvas: { width: 640, height: 480, background: '#eef2ff' },
      version: 1,
      behavior: { mode: 'carousel', autoPlay: true, intervalSec: 5, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 0 },
      elements: [
        el({
          id: 'tpl_sd_card', type: 'container', name: 'Card', layout: { x: 50, y: 60, width: 540, height: 320, z: 1 },
          style: { background: '#ffffff', radius: 24, opacity: 1 },
        }),
        el({
          id: 'tpl_sd_stars', type: 'rating-stars', name: 'Rating', layout: { x: 260, y: 104, width: 120, height: 28, z: 10 },
          binding: { bindingKey: 'review_rating', property: 'rating' },
        }),
        el({
          id: 'tpl_sd_quote', type: 'text', name: 'Review', text: SAMPLE_QUOTE,
          layout: { x: 100, y: 150, width: 440, height: 150, z: 10 },
          typography: { fontSize: 18, fontWeight: 400, color: '#334155', align: 'center' },
          binding: { bindingKey: 'review_text', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 500, delayMs: 60 },
        }),
        el({
          id: 'tpl_sd_author', type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
          layout: { x: 100, y: 312, width: 440, height: 26, z: 10 },
          typography: { fontSize: 15, fontWeight: 700, color: '#1b2559', align: 'center' },
          binding: { bindingKey: 'reviewer_name', property: 'text' },
        }),
        el({
          id: 'tpl_sd_sub', type: 'text', name: 'Verified line', text: 'Swipe to read more',
          layout: { x: 100, y: 342, width: 440, height: 20, z: 10 },
          typography: { fontSize: 12, fontWeight: 400, color: '#6366f1', align: 'center' },
        }),
        el({
          id: 'tpl_sd_cta', type: 'button', name: 'CTA', text: 'Add a review',
          layout: { x: 240, y: 410, width: 160, height: 42, z: 10 },
          style: { background: '#4f46e5', radius: 21, opacity: 1 },
          typography: { fontSize: 14, fontWeight: 600, color: '#ffffff', align: 'center' },
        }),
      ],
    },
  },
];


/** The template a product gets before it picks one itself. */
export function defaultWidgetTemplate(): WidgetTemplate {
  return WIDGET_TEMPLATES[0];
}

export function widgetTemplateById(id: string): WidgetTemplate | undefined {
  return WIDGET_TEMPLATES.find((t) => t.id === id);
}

/** Public summary rows (schemas included — the picker renders live previews). */
export function widgetTemplateRows(): Array<Omit<WidgetTemplate, 'schema'> & { schema: TemplateSchema }> {
  return WIDGET_TEMPLATES.map((t) => ({ ...t }));
}

/**
 * Widget contract check: a schema only counts as a widget when at least one
 * element is bound to every required field. Used by the save endpoint so a
 * broken design can never reach the public embed.
 */
export function missingWidgetFields(schema: unknown): string[] {
  const elements = (schema as { elements?: unknown } | null | undefined)?.elements;
  if (!schema || typeof schema !== 'object' || !Array.isArray(elements)) {
    return [...REQUIRED_WIDGET_FIELDS];
  }
  const bound = new Set(
    (elements as Array<{ binding?: { bindingKey?: string } | null }>)
      .map((e) => e?.binding?.bindingKey)
      .filter((k): k is string => Boolean(k))
      .map((k) => LEGACY_KEYS[k] ?? k),
  );
  return REQUIRED_WIDGET_FIELDS.filter((f) => !bound.has(f));
}

/** Read the fixed canvas dimensions off a saved schema (with a sane fallback). */
export function schemaCanvasSize(schema: unknown): { width: number; height: number } {
  const canvas = (schema as { canvas?: { width?: unknown; height?: unknown } } | null)?.canvas;
  const width = Number(canvas?.width);
  const height = Number(canvas?.height);
  return {
    width: Number.isFinite(width) && width >= 120 && width <= 2400 ? Math.round(width) : defaultWidgetTemplate().width,
    height: Number.isFinite(height) && height >= 100 && height <= 2400 ? Math.round(height) : defaultWidgetTemplate().height,
  };
}
