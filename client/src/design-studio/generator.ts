/**
 * DOC 7C §12 — the design generator engine.
 *
 * Turns a plain-language description into a complete, valid StudioSchema.
 * No external AI service: a deterministic keyword synthesizer seeded by the
 * prompt (plus a nonce so "regenerate" explores variations). It reads the
 * words for colours, mood, motion and shape, then composes the same element
 * grammar the hand-made templates use — always with the three required
 * bindings (review text, reviewer name, rating).
 */
import type { ShaderPreset, StudioElement, StudioSchema, WidgetBehavior } from './types';
import { DEFAULT_BEHAVIOR } from './types';

/* ------------------------------------------------------------------ palettes */

const COLOR_WORDS: Record<string, [number, number, number]> = {
  gold: [42, 88, 52], amber: [38, 90, 52], yellow: [50, 92, 55], orange: [25, 90, 55],
  coral: [10, 82, 62], red: [355, 78, 52], crimson: [348, 72, 48], rose: [350, 80, 64],
  pink: [330, 78, 66], magenta: [315, 76, 58], purple: [275, 68, 58], violet: [262, 74, 62],
  lavender: [270, 58, 72], indigo: [248, 62, 56], royal: [245, 70, 55], blue: [220, 82, 56],
  navy: [225, 66, 38], sky: [200, 84, 62], cyan: [190, 88, 56], electric: [196, 94, 58],
  teal: [175, 72, 46], mint: [160, 70, 50], green: [150, 64, 42], emerald: [155, 70, 46],
  forest: [145, 48, 32], lime: [90, 70, 52], brown: [28, 42, 44], sand: [36, 48, 66],
  cream: [42, 60, 90], silver: [220, 10, 70], gray: [220, 8, 55], grey: [220, 8, 55],
  slate: [222, 20, 42], charcoal: [225, 14, 16], black: [230, 16, 8], white: [220, 20, 96],
  neon: [185, 95, 58],
};

const DARK_WORDS = /dark|night|midnight|black|neon|space|deep|charcoal|noir/;
const LIGHT_WORDS = /light|bright|white|minimal|clean|pastel|airy|soft/;

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

interface Palette {
  bg: string;
  card: string;
  ink: string;
  sub: string;
  accent: string;
  accentSoft: string;
  dark: boolean;
}

function paletteFor(prompt: string, rng: () => number): Palette {
  const words = prompt.toLowerCase().match(/[a-z]+/g) ?? [];
  const found: Array<[number, number, number]> = [];
  for (const w of words) {
    const c = COLOR_WORDS[w];
    if (c && !found.some((f) => f[0] === c[0] && f[1] === c[1])) found.push(c);
  }
  const hueBase = found[0] ?? [222 + Math.floor(rng() * 140), 70, 50];
  const accentH = found[0] ?? [188, 88, 55];
  const second = found[1] ?? null;

  const dark = DARK_WORDS.test(prompt) || (!LIGHT_WORDS.test(prompt) && found.length === 0 && rng() > 0.55);
  const h = hueBase[0];
  const aH = second ? second[0] : accentH[0];

  if (dark) {
    return {
      dark: true,
      bg: hsl(h, 26, 6 + rng() * 3),
      card: hsl(h, 24, 11 + rng() * 4),
      ink: hsl(h, 22, 95),
      sub: hsl(aH, 34, 74),
      accent: hsl(aH, Math.min(96, accentH[1] + 8), 60),
      accentSoft: hsl(aH, 60, 24),
    };
  }
  return {
    dark: false,
    bg: hsl(h, 44, 95 + rng() * 3),
    card: '#ffffff',
    ink: hsl(h, 34, 15),
    sub: hsl(h, 14, 46),
    accent: hsl(aH, 74, 44),
    accentSoft: hsl(aH, 66, 92),
  };
}

/* ------------------------------------------------------------------- motion */

type Mode = WidgetBehavior['mode'];

const MODE_RULES: Array<[RegExp, Mode]> = [
  [/wheel|ring|orbit|ferris|rotate|cylinder/, 'wheel'],
  [/coverflow|cover flow|fan|3d|depth|perspective/, 'coverflow'],
  [/stack|swipe|flick|deck of|pile/, 'stack'],
  [/marquee|ticker|stream|news ?feed|scroll(ing)? (strip|banner)/, 'marquee'],
  [/tilt|parallax|mouse/, 'tilt'],
  [/carousel|slides?/, 'carousel'],
  [/spotlight|one (review )?at a time|at a time|single review|cross-?fade|focus/, 'cycle'],
];

function modeFor(prompt: string, fallback: Mode | 'auto', rng: () => number): Mode {
  if (fallback !== 'auto') return fallback;
  for (const [re, mode] of MODE_RULES) if (re.test(prompt.toLowerCase())) return mode;
  const defaults: Mode[] = ['cycle', 'carousel', 'coverflow', 'tilt'];
  return defaults[Math.floor(rng() * defaults.length)];
}

const SHADER_RULES: Array<[RegExp, ShaderPreset]> = [
  [/aurora|northern lights/, 'aurora'],
  [/plasma|liquid|lava|blob/, 'plasma'],
  [/star|space|galaxy|cosmos|night sky/, 'stars'],
  [/mesh|gradient backdrop|flowing/, 'mesh'],
];

/* ------------------------------------------------------------------ geometry */

const CANVAS: Record<Mode, { w: number; h: number }> = {
  cycle: { w: 600, h: 440 },
  carousel: { w: 700, h: 430 },
  coverflow: { w: 900, h: 520 },
  wheel: { w: 900, h: 560 },
  stack: { w: 480, h: 430 },
  tilt: { w: 520, h: 420 },
  marquee: { w: 1000, h: 220 },
};

/* -------------------------------------------------------------------- naming */

function nameFor(prompt: string, mode: Mode): string {
  const words = (prompt.toLowerCase().match(/[a-z]+/g) ?? [])
    .filter((w) => !['a', 'an', 'the', 'with', 'and', 'of', 'in', 'on', 'my', 'widget', 'testimonial', 'testimonials', 'review', 'reviews', 'design', 'that', 'show', 'shows', 'showing', 'display', 'displays'].includes(w));
  const stop = new Set(['carousel', 'coverflow', 'wheel', 'stack', 'marquee', 'tilt', 'cycle', 'dark', 'light', 'themed', 'theme', 'style', 'styled']);
  const picked: string[] = [];
  for (const w of words) {
    if (picked.length >= 2) break;
    if (!stop.has(w) && w.length > 2) picked.push(w[0].toUpperCase() + w.slice(1));
  }
  const family = mode === 'cycle' ? 'Spotlight' : mode[0].toUpperCase() + mode.slice(1);
  return picked.length ? `${picked.join(' ')} ${family}` : `Generated ${family}`;
}

/* ---------------------------------------------------------------------- rng */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ----------------------------------------------------------------- elements */

let uid = 0;
function el(part: string, base: Partial<StudioElement> & Pick<StudioElement, 'type' | 'layout'>): StudioElement {
  uid += 1;
  return {
    id: `ai-${uid}`,
    name: part,
    visible: true,
    style: { background: null, radius: 0, opacity: 1 },
    typography: null,
    text: null,
    imageUrl: null,
    binding: null,
    animation: null,
    shader: null,
    ...base,
  };
}

/* ------------------------------------------------------------------ generate */

export interface GeneratedDesign {
  schema: StudioSchema;
  name: string;
  notes: string[];
}

export function generateDesign(prompt: string, opts: { mode?: Mode | 'auto'; nonce?: number; maxRecords?: number }): GeneratedDesign {
  const rng = mulberry32(hashString(prompt.trim().toLowerCase()) ^ ((opts.nonce ?? 0) * 2654435761));
  const mode = modeFor(prompt, opts.mode ?? 'auto', rng);
  const pal = paletteFor(prompt, rng);
  const { w: W, h: H } = CANVAS[mode];
  const notes: string[] = [];

  const sharp = /sharp|square|brutal|flat|crisp/.test(prompt.toLowerCase());
  const soft = /round|pill|soft|friendly|bubbly|playful/.test(prompt.toLowerCase());
  const radius = sharp ? 2 : soft ? 22 : 8 + Math.round(rng() * 8);
  const centered = /center(ed)?|symmetric/.test(prompt.toLowerCase());
  const bold = /bold|big|loud|impact|statement/.test(prompt.toLowerCase());
  const elegant = /elegant|luxur|premium|refined|editorial/.test(prompt.toLowerCase());
  const fast = /fast|quick|rapid/.test(prompt.toLowerCase());

  const elements: StudioElement[] = [];

  // Optional animated backdrop, only when asked for by name.
  let shader: ShaderPreset | null = null;
  for (const [re, preset] of SHADER_RULES) {
    if (re.test(prompt.toLowerCase())) {
      shader = preset;
      break;
    }
  }
  if (shader) {
    elements.push(
      el('backdrop', {
        type: 'shader',
        layout: { x: 0, y: 0, width: W, height: H, z: 0 },
        shader: { preset: shader, speed: 0.6 + rng() * 0.8 },
        animation: { type: 'fade-in', durationMs: 700, delayMs: 0 },
      }),
    );
    notes.push(`${shader} backdrop`);
  }

  // Card geometry — a floating card on the canvas, with breathing room.
  const pad = mode === 'marquee' ? 10 : Math.round(Math.min(W, H) * 0.06);
  const cardW = mode === 'marquee' ? W - 2 * pad : Math.round(W * (mode === 'wheel' || mode === 'coverflow' ? 0.62 : 0.8));
  const cardH = mode === 'marquee' ? H - 2 * pad : Math.round(H * 0.78);
  const cardX = Math.round((W - cardW) / 2);
  const cardY = Math.round((H - cardH) / 2);

  elements.push(
    el('card', {
      type: 'container',
      layout: { x: cardX, y: cardY, width: cardW, height: cardH, z: 1 },
      style: { background: pal.card, radius, opacity: 0.97 },
      animation: { type: 'fade-in-up', durationMs: 520, delayMs: 0 },
    }),
  );

  const innerX = cardX + Math.round(cardW * 0.08);
  const innerW = cardW - Math.round(cardW * 0.16);

  // Marquee strips read as a single line: quote + author side by side.
  if (mode === 'marquee') {
    const midY = cardY + Math.round(cardH / 2);
    elements.push(
      el('stars', {
        type: 'rating-stars',
        layout: { x: innerX, y: midY - 34, width: 108, height: 22, z: 10 },
        binding: { bindingKey: 'review_rating', property: 'rating' },
        style: { background: null, radius: 0, opacity: 1 },
      }),
      el('quote', {
        type: 'text',
        layout: { x: innerX, y: midY - 6, width: innerW, height: 40, z: 10 },
        binding: { bindingKey: 'review_text', property: 'text' },
        typography: { fontSize: elegant ? 14 : 16, fontWeight: 400, color: pal.ink, align: 'left' },
      }),
      el('author', {
        type: 'heading',
        layout: { x: innerX, y: midY + 36, width: innerW, height: 18, z: 10 },
        binding: { bindingKey: 'reviewer_name', property: 'text' },
        typography: { fontSize: 12, fontWeight: 700, color: pal.sub, align: 'left' },
      }),
    );
  } else {
    const quoteSize = bold ? 21 : elegant ? 16 : 18;
    let cursorY = cardY + Math.round(cardH * 0.12);

    elements.push(
      el('kicker', {
        type: 'text',
        text: 'WHAT CUSTOMERS SAY',
        layout: { x: innerX, y: cursorY, width: innerW, height: 16, z: 10 },
        typography: { fontSize: 10, fontWeight: 700, color: pal.accent, align: centered ? 'center' : 'left' },
        animation: { type: 'fade-in', durationMs: 450, delayMs: 60 },
      }),
    );
    cursorY += 34;

    const starsW = 116;
    elements.push(
      el('stars', {
        type: 'rating-stars',
        layout: {
          x: centered ? Math.round((W - starsW) / 2) : innerX,
          y: cursorY,
          width: starsW,
          height: 24,
          z: 10,
        },
        binding: { bindingKey: 'review_rating', property: 'rating' },
        animation: { type: 'fade-in', durationMs: 450, delayMs: 120 },
      }),
    );
    cursorY += 44;

    const quoteH = Math.round(cardH * 0.4);
    elements.push(
      el('quote', {
        type: 'text',
        layout: { x: innerX, y: cursorY, width: innerW, height: quoteH, z: 10 },
        binding: { bindingKey: 'review_text', property: 'text' },
        typography: { fontSize: quoteSize, fontWeight: elegant ? 500 : 400, color: pal.ink, align: centered ? 'center' : 'left' },
        animation: { type: 'fade-in-up', durationMs: 520, delayMs: 150 },
      }),
    );
    cursorY += quoteH + 18;

    elements.push(
      el('author', {
        type: 'heading',
        layout: { x: innerX, y: cursorY, width: innerW, height: 22, z: 10 },
        binding: { bindingKey: 'reviewer_name', property: 'text' },
        typography: { fontSize: 15, fontWeight: 700, color: pal.ink, align: centered ? 'center' : 'left' },
        animation: { type: 'fade-in-up', durationMs: 520, delayMs: 220 },
      }),
    );
    cursorY += 26;

    elements.push(
      el('footnote', {
        type: 'text',
        text: 'Verified customer review',
        layout: { x: innerX, y: cursorY, width: innerW, height: 16, z: 10 },
        typography: { fontSize: 10, fontWeight: 400, color: pal.sub, align: centered ? 'center' : 'left' },
        animation: { type: 'fade-in', durationMs: 450, delayMs: 280 },
      }),
    );
  }

  const behavior: WidgetBehavior = {
    ...DEFAULT_BEHAVIOR,
    mode,
    intervalSec: fast ? 3 : elegant ? 7 : 5,
    speedPx: fast ? 110 : 55,
    maxRecords: opts.maxRecords ?? 0,
    ...(mode === 'coverflow' ? { spacing: 0.34 + rng() * 0.18, depth: 150 + Math.round(rng() * 120), angle: 38 + Math.round(rng() * 16) } : {}),
  };

  const name = nameFor(prompt, mode);
  const schema: StudioSchema = {
    name,
    canvas: { width: W, height: H, background: pal.bg },
    version: 1,
    elements,
    behavior,
  };

  notes.unshift(`${mode} behavior`, pal.dark ? 'dark palette' : 'light palette', `${W} × ${H}`);
  return { schema, name, notes };
}

/* ------------------------------------------------------------- prompt ideas */

export const EXAMPLE_PROMPTS: string[] = [
  'A dark midnight carousel with gold star ratings and an elegant serif feel',
  'Minimal light spotlight, mint accents, one review at a time',
  'A neon 3D wheel of reviews on a deep space starfield',
  'Rounded coral stack you can swipe through, playful and bold',
  'Editorial coverflow with royal blue depth and sharp cards',
  'A fast teal marquee ticker strip for a busy landing page',
  'Luxury gold on charcoal, tilt card that follows the mouse',
  'A soft pastel aurora carousel with big friendly text',
];
