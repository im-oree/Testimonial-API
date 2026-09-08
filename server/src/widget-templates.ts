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

export type TemplateElementType = 'heading' | 'text' | 'image' | 'rating-stars' | 'button' | 'container' | 'spacer' | 'shader';

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
  /** GLSL backdrop config (shader elements only). */
  shader: { preset: 'aurora' | 'plasma' | 'mesh' | 'stars'; speed: number } | null;
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
  mode: 'cycle' | 'carousel' | 'marquee' | 'coverflow' | 'tilt' | 'wheel' | 'stack';
  autoPlay: boolean;
  intervalSec: number;
  pauseOnHover: boolean;
  direction: 'left' | 'right';
  speedPx: number;
  maxRecords: number;
  /** Coverflow tuning (optional — the studio slider values): card gap × card width, z-depth per step, max side rotation. */
  spacing?: number;
  depth?: number;
  angle?: number;
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
    shader: null,
    ...p,
  } as TemplateElement;
}

const SAMPLE_QUOTE = 'The embed was live on our site before lunch and reviews started arriving the same day.';
const SAMPLE_AUTHOR = 'Ada Okafor';


/* ───────────────────────────────────────────────────────────────────────────
 * The 3D carousel family — twenty motion-first templates generated from
 * compact specs. Every one keeps the required rating components; the visual
 * variety comes from the layout variant, the palette and the behavior
 * (coverflow depth fans, rotating 3D wheels, swipeable stacks).
 * ─────────────────────────────────────────────────────────────────────────── */

type CarouselMode = 'coverflow' | 'wheel' | 'stack' | 'carousel';
type LayoutVariant = 'focus' | 'editorial' | 'split' | 'wide';

interface CarouselSpec {
  id: string;
  name: string;
  blurb: string;
  mode: CarouselMode;
  variant: LayoutVariant;
  w: number;
  h: number;
  canvas: string;
  card: string;
  cardOpacity?: number;
  ink: string;
  sub: string;
  accent: string;
  intervalSec?: number;
  maxRecords?: number;
  spacing?: number;
  depth?: number;
  angle?: number;
}

const CAROUSEL_SPECS: CarouselSpec[] = [
  { id: 'prism-flow', name: 'Prism Flow', blurb: 'Violet glass cards fan out in 3D and lean toward the cursor. Drag the row or click a side card.', mode: 'coverflow', variant: 'focus', w: 900, h: 520, canvas: '#120b26', card: '#1d1440', cardOpacity: 0.94, ink: '#ede9fe', sub: '#8b7fc7', accent: '#a78bfa', spacing: 0.36, depth: 220, angle: 44 },
  { id: 'sunset-deck', name: 'Sunset Deck', blurb: 'Warm amber side panel, coral cards fanned in depth — a friendly coverflow for consumer brands.', mode: 'coverflow', variant: 'split', w: 860, h: 500, canvas: '#fff7ed', card: '#ffffff', ink: '#431407', sub: '#b45309', accent: '#ea580c', spacing: 0.44, depth: 180, angle: 50 },
  { id: 'mint-editorial', name: 'Mint Editorial', blurb: 'A quiet editorial layout — big left-aligned quote, thin rule, cards gliding in 3D depth.', mode: 'coverflow', variant: 'editorial', w: 820, h: 500, canvas: '#f0fdf9', card: '#ffffff', ink: '#134e4a', sub: '#14b8a6', accent: '#0d9488' },
  { id: 'mono-focus', name: 'Mono Focus', blurb: 'Monochrome slate with one accent — the 3D fan does the talking. Tunes cleanly to any brand.', mode: 'coverflow', variant: 'focus', w: 780, h: 520, canvas: '#f1f2f6', card: '#ffffff', ink: '#0f172a', sub: '#64748b', accent: '#0f172a', spacing: 0.4, depth: 200, angle: 46 },
  { id: 'ocean-depth', name: 'Ocean Depth', blurb: 'Deep-sea glass: translucent cards over navy, fanning far back in z-depth as they recede.', mode: 'coverflow', variant: 'focus', w: 880, h: 540, canvas: '#04121f', card: '#0c2a3f', cardOpacity: 0.9, ink: '#e0f2fe', sub: '#7da7c4', accent: '#38bdf8', spacing: 0.46, depth: 260, angle: 52 },
  { id: 'candy-fan', name: 'Candy Fan', blurb: 'A compact pink fan — small footprint, big personality, all the 3D controls in the studio.', mode: 'coverflow', variant: 'focus', w: 640, h: 460, canvas: '#fdf2f8', card: '#ffffff', ink: '#500724', sub: '#be185d', accent: '#ec4899', spacing: 0.34, depth: 150, angle: 42 },
  { id: 'forest-lean', name: 'Forest Lean', blurb: 'A wide evergreen banner whose review cards lean and drift apart in perspective.', mode: 'coverflow', variant: 'wide', w: 960, h: 460, canvas: '#f7faf7', card: '#ffffff', ink: '#14281d', sub: '#4d7c0f', accent: '#16a34a', spacing: 0.4, depth: 190, angle: 46 },
  { id: 'royal-arc', name: 'Royal Arc', blurb: 'Royal purple and gold — cards arc around a centered quote like exhibits in a gallery.', mode: 'coverflow', variant: 'focus', w: 820, h: 540, canvas: '#1a1033', card: '#251a47', cardOpacity: 0.95, ink: '#f5f3ff', sub: '#9d8bd6', accent: '#fbbf24', spacing: 0.42, depth: 210, angle: 48 },
  { id: 'neon-orbit', name: 'Neon Orbit', blurb: 'Cards ride a glowing 3D ring that spins toward whoever is reading. Drag it — it has momentum.', mode: 'wheel', variant: 'focus', w: 900, h: 560, canvas: '#0a0a12', card: '#141428', cardOpacity: 0.96, ink: '#e4e4ff', sub: '#6ee7ff', accent: '#22d3ee' },
  { id: 'cobalt-ring', name: 'Cobalt Ring', blurb: 'A cobalt carousel wheel — steady rotation, cursor parallax, dots to jump anywhere.', mode: 'wheel', variant: 'focus', w: 880, h: 540, canvas: '#f4f7ff', card: '#ffffff', ink: '#17255c', sub: '#3b82f6', accent: '#2563eb' },
  { id: 'sand-rotate', name: 'Sand Rotate', blurb: 'Warm sand tones on a light ring — an approachable 3D carousel for portfolio sites.', mode: 'wheel', variant: 'editorial', w: 840, h: 520, canvas: '#fefce8', card: '#ffffff', ink: '#422006', sub: '#a16207', accent: '#d97706' },
  { id: 'midnight-ring', name: 'Midnight Ring', blurb: 'The night version — dark ring, silver text, cards catching light as they rotate to the front.', mode: 'wheel', variant: 'focus', w: 900, h: 560, canvas: '#090d1a', card: '#131a2e', cardOpacity: 0.95, ink: '#e8ecf8', sub: '#8593b8', accent: '#818cf8' },
  { id: 'teal-orbit', name: 'Teal Orbit', blurb: 'A compact teal wheel — tidy on sidebars and footers, still fully 3D and draggable.', mode: 'wheel', variant: 'focus', w: 660, h: 480, canvas: '#f0fdfa', card: '#ffffff', ink: '#134e4a', sub: '#0d9488', accent: '#14b8a6' },
  { id: 'violet-ring', name: 'Violet Ring', blurb: 'Violet cards orbit on a wide stage — the ring tilts with the cursor like a gyroscope.', mode: 'wheel', variant: 'wide', w: 940, h: 520, canvas: '#1c1240', card: '#2a1d5c', cardOpacity: 0.94, ink: '#f3efff', sub: '#a996e8', accent: '#c084fc' },
  { id: 'paper-stack', name: 'Paper Stack', blurb: 'A neat paper deck — drag the top card off and the next review steps forward.', mode: 'stack', variant: 'editorial', w: 720, h: 520, canvas: '#faf9f6', card: '#ffffff', ink: '#292524', sub: '#a8a29e', accent: '#f59e0b' },
  { id: 'slate-deck', name: 'Slate Deck', blurb: 'A dark card deck with spring physics — swipe the front card either way to deal the next.', mode: 'stack', variant: 'focus', w: 700, h: 500, canvas: '#111827', card: '#1f2937', cardOpacity: 0.97, ink: '#f9fafb', sub: '#9ca3af', accent: '#34d399' },
  { id: 'coral-stack', name: 'Coral Stack', blurb: 'Coral-toned stack with soft shadows — playful, compact, and touch-friendly.', mode: 'stack', variant: 'focus', w: 600, h: 440, canvas: '#fff5f2', card: '#ffffff', ink: '#4c0519', sub: '#fb7185', accent: '#f43f5e' },
  { id: 'gold-stack', name: 'Gold Stack', blurb: 'Charcoal and gold — premium cards stacked with depth, dismissed with a flick.', mode: 'stack', variant: 'focus', w: 720, h: 540, canvas: '#171410', card: '#241f18', cardOpacity: 0.96, ink: '#faf6ea', sub: '#b9a97e', accent: '#eab308' },
  { id: 'drift-strip', name: 'Drift Strip', blurb: 'A low, wide strip that swipes horizontally — made for page footers and feature rows.', mode: 'carousel', variant: 'wide', w: 1000, h: 380, canvas: '#f8fafc', card: '#ffffff', ink: '#0f172a', sub: '#64748b', accent: '#0ea5e9' },
  { id: 'pulse-deck', name: 'Pulse Deck', blurb: 'Indigo swipe deck with fling inertia — flick through reviews one card at a time.', mode: 'carousel', variant: 'focus', w: 660, h: 480, canvas: '#eef2ff', card: '#ffffff', ink: '#312e81', sub: '#818cf8', accent: '#4f46e5' },
];

/** Layout variants — each builds the element list for one spec. */
function carouselElements(s: CarouselSpec): TemplateElement[] {
  const { w, h } = s;
  const shortQuote = 'Support that actually answers. This deck of reviews runs itself.';

  if (s.variant === 'editorial') {
    const mx = Math.round(w * 0.09);
    return [
      el({
        id: `el_${s.id}_stars`, type: 'rating-stars', name: 'Rating', layout: { x: mx, y: Math.round(h * 0.14), width: 120, height: 28, z: 10 },
        binding: { bindingKey: 'review_rating', property: 'rating' }, animation: { type: 'fade-in', durationMs: 450, delayMs: 0 },
      }),
      el({
        id: `el_${s.id}_quote`, type: 'text', name: 'Review', text: SAMPLE_QUOTE,
        layout: { x: mx, y: Math.round(h * 0.26), width: Math.round(w * 0.82), height: Math.round(h * 0.38), z: 10 },
        typography: { fontSize: Math.round(Math.min(30, w / 28)), fontWeight: 400, color: s.ink, align: 'left' },
        binding: { bindingKey: 'review_text', property: 'text' },
        animation: { type: 'fade-in-up', durationMs: 550, delayMs: 80 },
      }),
      el({
        id: `el_${s.id}_rule`, type: 'container', name: 'Accent rule', layout: { x: mx, y: Math.round(h * 0.68), width: 46, height: 3, z: 10 },
        style: { background: s.accent, radius: 2, opacity: 1 },
      }),
      el({
        id: `el_${s.id}_author`, type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
        layout: { x: mx, y: Math.round(h * 0.72), width: Math.round(w * 0.5), height: 26, z: 10 },
        typography: { fontSize: 16, fontWeight: 700, color: s.ink, align: 'left' },
        binding: { bindingKey: 'reviewer_name', property: 'text' },
        animation: { type: 'fade-in-up', durationMs: 500, delayMs: 140 },
      }),
      el({
        id: `el_${s.id}_hint`, type: 'text', name: 'Hint', text: 'Verified customer review',
        layout: { x: mx, y: Math.round(h * 0.72) + 30, width: Math.round(w * 0.5), height: 18, z: 10 },
        typography: { fontSize: 11, fontWeight: 400, color: s.sub, align: 'left' },
      }),
    ];
  }

  if (s.variant === 'split') {
    const panelW = Math.round(w * 0.34);
    return [
      el({
        id: `el_${s.id}_panel`, type: 'container', name: 'Side panel', layout: { x: 0, y: 0, width: panelW, height: h, z: 1 },
        style: { background: s.accent, radius: 0, opacity: 1 },
      }),
      el({
        id: `el_${s.id}_eyebrow`, type: 'text', name: 'Eyebrow', text: 'CUSTOMER STORIES',
        layout: { x: Math.round(panelW * 0.14), y: Math.round(h * 0.2), width: Math.round(panelW * 0.75), height: 18, z: 10 },
        typography: { fontSize: 11, fontWeight: 700, color: '#ffffff', align: 'left' },
      }),
      el({
        id: `el_${s.id}_stars`, type: 'rating-stars', name: 'Rating', layout: { x: Math.round(panelW * 0.14), y: Math.round(h * 0.28), width: 120, height: 28, z: 10 },
        binding: { bindingKey: 'review_rating', property: 'rating' }, animation: { type: 'fade-in', durationMs: 450, delayMs: 0 },
      }),
      el({
        id: `el_${s.id}_author`, type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
        layout: { x: Math.round(panelW * 0.14), y: Math.round(h * 0.4), width: Math.round(panelW * 0.75), height: 26, z: 10 },
        typography: { fontSize: 17, fontWeight: 700, color: '#ffffff', align: 'left' },
        binding: { bindingKey: 'reviewer_name', property: 'text' },
        animation: { type: 'fade-in-up', durationMs: 500, delayMs: 120 },
      }),
      el({
        id: `el_${s.id}_card`, type: 'container', name: 'Card', layout: { x: panelW + Math.round(w * 0.05), y: Math.round(h * 0.12), width: Math.round(w * 0.94) - panelW - Math.round(w * 0.1), height: Math.round(h * 0.76), z: 5 },
        style: { background: s.card, radius: 22, opacity: s.cardOpacity ?? 1 },
      }),
      el({
        id: `el_${s.id}_quote`, type: 'text', name: 'Review', text: shortQuote,
        layout: { x: panelW + Math.round(w * 0.09), y: Math.round(h * 0.26), width: Math.round(w * 0.94) - panelW - Math.round(w * 0.18), height: Math.round(h * 0.44), z: 10 },
        typography: { fontSize: 20, fontWeight: 400, color: s.ink, align: 'left' },
        binding: { bindingKey: 'review_text', property: 'text' },
        animation: { type: 'fade-in-up', durationMs: 550, delayMs: 80 },
      }),
      el({
        id: `el_${s.id}_hint`, type: 'text', name: 'Hint', text: 'Drag the deck to browse',
        layout: { x: panelW + Math.round(w * 0.09), y: Math.round(h * 0.74), width: 260, height: 18, z: 10 },
        typography: { fontSize: 11, fontWeight: 400, color: s.sub, align: 'left' },
      }),
    ];
  }

  if (s.variant === 'wide') {
    const mx = Math.round(w * 0.05);
    const cardW = Math.round(w * 0.9);
    return [
      el({
        id: `el_${s.id}_card`, type: 'container', name: 'Card', layout: { x: mx, y: Math.round(h * 0.08), width: cardW, height: Math.round(h * 0.8), z: 1 },
        style: { background: s.card, radius: 22, opacity: s.cardOpacity ?? 1 },
      }),
      el({
        id: `el_${s.id}_stars`, type: 'rating-stars', name: 'Rating', layout: { x: mx + Math.round(cardW * 0.06), y: Math.round(h * 0.22), width: 120, height: 28, z: 10 },
        binding: { bindingKey: 'review_rating', property: 'rating' }, animation: { type: 'fade-in', durationMs: 450, delayMs: 0 },
      }),
      el({
        id: `el_${s.id}_quote`, type: 'text', name: 'Review', text: shortQuote,
        layout: { x: mx + Math.round(cardW * 0.06), y: Math.round(h * 0.34), width: Math.round(cardW * 0.6), height: Math.round(h * 0.36), z: 10 },
        typography: { fontSize: 21, fontWeight: 400, color: s.ink, align: 'left' },
        binding: { bindingKey: 'review_text', property: 'text' },
        animation: { type: 'fade-in-up', durationMs: 550, delayMs: 80 },
      }),
      el({
        id: `el_${s.id}_author`, type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
        layout: { x: mx + Math.round(cardW * 0.68), y: Math.round(h * 0.62), width: Math.round(cardW * 0.28), height: 24, z: 10 },
        typography: { fontSize: 15, fontWeight: 700, color: s.ink, align: 'right' },
        binding: { bindingKey: 'reviewer_name', property: 'text' },
        animation: { type: 'fade-in-up', durationMs: 500, delayMs: 140 },
      }),
      el({
        id: `el_${s.id}_hint`, type: 'text', name: 'Hint', text: 'Verified review',
        layout: { x: mx + Math.round(cardW * 0.68), y: Math.round(h * 0.62) + 28, width: Math.round(cardW * 0.28), height: 18, z: 10 },
        typography: { fontSize: 11, fontWeight: 400, color: s.sub, align: 'right' },
      }),
    ];
  }

  // focus (default): a centered card with the full quote.
  const cardW = Math.round(w * 0.74);
  const cardH = Math.round(h * 0.74);
  const cardX = Math.round((w - cardW) / 2);
  const cardY = Math.round((h - cardH) / 2);
  return [
    el({
      id: `el_${s.id}_card`, type: 'container', name: 'Card', layout: { x: cardX, y: cardY, width: cardW, height: cardH, z: 1 },
      style: { background: s.card, radius: 24, opacity: s.cardOpacity ?? 1 },
    }),
    el({
      id: `el_${s.id}_eyebrow`, type: 'text', name: 'Eyebrow', text: 'WHAT CUSTOMERS SAY',
      layout: { x: cardX, y: cardY + Math.round(cardH * 0.1), width: cardW, height: 18, z: 10 },
      typography: { fontSize: 11, fontWeight: 700, color: s.accent, align: 'center' },
    }),
    el({
      id: `el_${s.id}_stars`, type: 'rating-stars', name: 'Rating', layout: { x: Math.round((w - 120) / 2), y: cardY + Math.round(cardH * 0.2), width: 120, height: 28, z: 10 },
      binding: { bindingKey: 'review_rating', property: 'rating' }, animation: { type: 'fade-in', durationMs: 450, delayMs: 0 },
    }),
    el({
      id: `el_${s.id}_quote`, type: 'text', name: 'Review', text: SAMPLE_QUOTE,
      layout: { x: cardX + Math.round(cardW * 0.09), y: cardY + Math.round(cardH * 0.3), width: Math.round(cardW * 0.82), height: Math.round(cardH * 0.34), z: 10 },
      typography: { fontSize: 20, fontWeight: 400, color: s.ink, align: 'center' },
      binding: { bindingKey: 'review_text', property: 'text' },
      animation: { type: 'fade-in-up', durationMs: 550, delayMs: 80 },
    }),
    el({
      id: `el_${s.id}_author`, type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
      layout: { x: cardX + Math.round(cardW * 0.09), y: cardY + Math.round(cardH * 0.7), width: Math.round(cardW * 0.82), height: 24, z: 10 },
      typography: { fontSize: 15, fontWeight: 700, color: s.ink, align: 'center' },
      binding: { bindingKey: 'reviewer_name', property: 'text' },
      animation: { type: 'fade-in-up', durationMs: 500, delayMs: 140 },
    }),
    el({
      id: `el_${s.id}_hint`, type: 'text', name: 'Hint', text: 'Verified customer review',
      layout: { x: cardX + Math.round(cardW * 0.09), y: cardY + Math.round(cardH * 0.7) + 28, width: Math.round(cardW * 0.82), height: 18, z: 10 },
      typography: { fontSize: 11, fontWeight: 400, color: s.sub, align: 'center' },
    }),
  ];
}

/** Behavior defaults per carousel mode (the studio sliders can retune all of it). */
function carouselBehavior(s: CarouselSpec): TemplateBehavior {
  const base = { autoPlay: true, pauseOnHover: true, direction: 'left' as const, speedPx: 60 };
  if (s.mode === 'wheel') return { mode: 'wheel', ...base, intervalSec: s.intervalSec ?? 4, maxRecords: s.maxRecords ?? 6 };
  if (s.mode === 'stack') return { mode: 'stack', ...base, intervalSec: s.intervalSec ?? 6, maxRecords: s.maxRecords ?? 5 };
  if (s.mode === 'carousel') return { mode: 'carousel', ...base, intervalSec: s.intervalSec ?? 5, maxRecords: s.maxRecords ?? 0 };
  return {
    mode: 'coverflow',
    ...base,
    intervalSec: s.intervalSec ?? 5,
    maxRecords: s.maxRecords ?? 8,
    spacing: s.spacing ?? 0.42,
    depth: s.depth ?? 190,
    angle: s.angle ?? 48,
  };
}

/** The generated 3D carousel family — twenty templates from the spec table. */
export function carouselFamilyTemplates(): WidgetTemplate[] {
  return CAROUSEL_SPECS.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.blurb,
    category: 'Carousel',
    width: s.w,
    height: s.h,
    features:
      s.mode === 'wheel'
        ? ['3D rotating ring', 'Drag to spin', 'Cursor parallax']
        : s.mode === 'stack'
          ? ['Card deck', 'Swipe the top card', 'Spring physics']
          : s.mode === 'coverflow'
            ? ['3D depth fan', 'Leans with the cursor', 'Adjustable in studio']
            : ['Swipe / drag', 'Fling inertia', 'Dots + arrows'],
    schema: {
      name: s.name,
      canvas: { width: s.w, height: s.h, background: s.canvas },
      version: 1,
      behavior: carouselBehavior(s),
      elements: carouselElements(s),
    },
  }));
}

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
  {
    id: 'coverflow-deck',
    name: 'Coverflow Deck',
    description: 'A 3D depth carousel — reviews fan out in perspective, the scene leans with your cursor, drag or click a side card to pull it forward.',
    category: 'Carousel',
    width: 960,
    height: 540,
    features: ['3D perspective', 'Mouse-reactive scene', 'Drag + click-to-focus'],
    schema: {
      name: 'Coverflow deck',
      canvas: { width: 960, height: 540, background: '#0b1020' },
      version: 1,
      behavior: { mode: 'coverflow', autoPlay: true, intervalSec: 5, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 8 },
      elements: [
        el({
          id: 'tpl_cf_card', type: 'container', name: 'Glass card', layout: { x: 220, y: 70, width: 520, height: 360, z: 1 },
          style: { background: '#151d38', radius: 26, opacity: 0.92 },
        }),
        el({
          id: 'tpl_cf_eyebrow', type: 'text', name: 'Eyebrow', text: 'WHAT CUSTOMERS SAY',
          layout: { x: 220, y: 108, width: 520, height: 20, z: 10 },
          typography: { fontSize: 11, fontWeight: 700, color: '#7dd3fc', align: 'center' },
        }),
        el({
          id: 'tpl_cf_stars', type: 'rating-stars', name: 'Rating', layout: { x: 420, y: 146, width: 120, height: 28, z: 10 },
          binding: { bindingKey: 'review_rating', property: 'rating' }, animation: { type: 'fade-in', durationMs: 500, delayMs: 0 },
        }),
        el({
          id: 'tpl_cf_quote', type: 'text', name: 'Review', text: SAMPLE_QUOTE,
          layout: { x: 270, y: 192, width: 420, height: 140, z: 10 },
          typography: { fontSize: 19, fontWeight: 400, color: '#e2e8f0', align: 'center' },
          binding: { bindingKey: 'review_text', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 550, delayMs: 80 },
        }),
        el({
          id: 'tpl_cf_author', type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
          layout: { x: 270, y: 344, width: 420, height: 26, z: 10 },
          typography: { fontSize: 15, fontWeight: 700, color: '#f8fafc', align: 'center' },
          binding: { bindingKey: 'reviewer_name', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 500, delayMs: 140 },
        }),
        el({
          id: 'tpl_cf_hint', type: 'text', name: 'Hint', text: 'Drag the deck — or click a card to bring it forward',
          layout: { x: 230, y: 462, width: 500, height: 20, z: 10 },
          typography: { fontSize: 12, fontWeight: 400, color: '#64748b', align: 'center' },
        }),
      ],
    },
  },
  {
    id: 'tilt-card',
    name: 'Tilt Card',
    description: 'A card with presence — it leans toward the visitor’s cursor, catches a moving glare and springs back. One review at a time.',
    category: 'Spotlight',
    width: 560,
    height: 460,
    features: ['Mouse-reactive 3D tilt', 'Cursor glare', 'Spring physics'],
    schema: {
      name: 'Tilt card',
      canvas: { width: 560, height: 460, background: '#f4f4fb' },
      version: 1,
      behavior: { mode: 'tilt', autoPlay: true, intervalSec: 6, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 0 },
      elements: [
        el({
          id: 'tpl_tc_card', type: 'container', name: 'Card', layout: { x: 50, y: 46, width: 460, height: 330, z: 1 },
          style: { background: '#ffffff', radius: 24, opacity: 1 },
        }),
        el({
          id: 'tpl_tc_stars', type: 'rating-stars', name: 'Rating', layout: { x: 220, y: 88, width: 120, height: 30, z: 10 },
          binding: { bindingKey: 'review_rating', property: 'rating' }, animation: { type: 'fade-in', durationMs: 450, delayMs: 0 },
        }),
        el({
          id: 'tpl_tc_quote', type: 'text', name: 'Review', text: SAMPLE_QUOTE,
          layout: { x: 100, y: 134, width: 360, height: 150, z: 10 },
          typography: { fontSize: 18, fontWeight: 400, color: '#334155', align: 'center' },
          binding: { bindingKey: 'review_text', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 500, delayMs: 60 },
        }),
        el({
          id: 'tpl_tc_author', type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
          layout: { x: 100, y: 296, width: 360, height: 24, z: 10 },
          typography: { fontSize: 15, fontWeight: 700, color: '#1b2559', align: 'center' },
          binding: { bindingKey: 'reviewer_name', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 450, delayMs: 120 },
        }),
        el({
          id: 'tpl_tc_sub', type: 'text', name: 'Verified line', text: 'Move your cursor over the card',
          layout: { x: 100, y: 326, width: 360, height: 18, z: 10 },
          typography: { fontSize: 11, fontWeight: 400, color: '#94a3b8', align: 'center' },
        }),
        el({
          id: 'tpl_tc_cta', type: 'button', name: 'CTA', text: 'Add a review',
          layout: { x: 195, y: 402, width: 170, height: 42, z: 10 },
          style: { background: '#0ea5a0', radius: 21, opacity: 1 },
          typography: { fontSize: 14, fontWeight: 600, color: '#ffffff', align: 'center' },
        }),
      ],
    },
  },
  {
    id: 'aurora-glass',
    name: 'Aurora Glass',
    description: 'A glassmorphic review card floating over a live GLSL aurora — a real fragment shader animating behind your reviews.',
    category: 'Spotlight',
    width: 720,
    height: 560,
    features: ['GLSL shader backdrop', 'Glass card', 'Cross-fade cycle'],
    schema: {
      name: 'Aurora glass',
      canvas: { width: 720, height: 560, background: '#060b1b' },
      version: 1,
      behavior: { mode: 'cycle', autoPlay: true, intervalSec: 6, pauseOnHover: true, direction: 'left', speedPx: 60, maxRecords: 0 },
      elements: [
        el({
          id: 'tpl_ag_shader', type: 'shader', name: 'Aurora backdrop', layout: { x: 0, y: 0, width: 720, height: 560, z: 0 },
          style: { background: null, radius: 0, opacity: 1 },
          shader: { preset: 'aurora', speed: 0.8 },
        }),
        el({
          id: 'tpl_ag_card', type: 'container', name: 'Glass card', layout: { x: 90, y: 90, width: 540, height: 380, z: 5 },
          style: { background: '#ffffff', radius: 24, opacity: 0.1 },
        }),
        el({
          id: 'tpl_ag_eyebrow', type: 'text', name: 'Eyebrow', text: 'LOVED BY CUSTOMERS',
          layout: { x: 150, y: 128, width: 420, height: 18, z: 10 },
          typography: { fontSize: 11, fontWeight: 700, color: '#a5f3fc', align: 'center' },
        }),
        el({
          id: 'tpl_ag_stars', type: 'rating-stars', name: 'Rating', layout: { x: 300, y: 158, width: 120, height: 30, z: 10 },
          binding: { bindingKey: 'review_rating', property: 'rating' }, animation: { type: 'fade-in', durationMs: 450, delayMs: 0 },
        }),
        el({
          id: 'tpl_ag_quote', type: 'text', name: 'Review', text: SAMPLE_QUOTE,
          layout: { x: 150, y: 202, width: 420, height: 160, z: 10 },
          typography: { fontSize: 19, fontWeight: 400, color: '#f1f5f9', align: 'center' },
          binding: { bindingKey: 'review_text', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 550, delayMs: 80 },
        }),
        el({
          id: 'tpl_ag_author', type: 'heading', name: 'Reviewer', text: SAMPLE_AUTHOR,
          layout: { x: 150, y: 380, width: 420, height: 26, z: 10 },
          typography: { fontSize: 15, fontWeight: 700, color: '#ffffff', align: 'center' },
          binding: { bindingKey: 'reviewer_name', property: 'text' },
          animation: { type: 'fade-in-up', durationMs: 500, delayMs: 150 },
        }),
        el({
          id: 'tpl_ag_cta', type: 'button', name: 'CTA', text: 'Add a review',
          layout: { x: 270, y: 500, width: 180, height: 42, z: 10 },
          style: { background: '#0ea5a0', radius: 21, opacity: 1 },
          typography: { fontSize: 14, fontWeight: 600, color: '#ffffff', align: 'center' },
        }),
      ],
    },
  },
  ...carouselFamilyTemplates(),
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
