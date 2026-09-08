/**
 * Theme system (DOC 7 foundation, per the additive brief on next.md).
 *
 * Tailwind-presets-ish design tokens: a small catalogue of presets that seed a
 * tenant's tokens, with every value fully adjustable afterwards. Tokens are
 * stored on the tenant row server-side (never in localStorage), and the
 * resolved theme is re-materialised on every save so public reads (wall, form,
 * embeds) get a single pre-computed payload — one read, no preset re-mapping
 * at request time.
 *
 * Legacy fields stay in sync: `tenant.brandColor` mirrors `theme.primary` so
 * existing workspace chrome (sidebar avatar, accent chips) keeps working.
 */

export type ThemeRadius = 'sm' | 'md' | 'lg';
export type ThemeFont = 'system' | 'serif' | 'mono';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primary: string; // brand colour
  accent: string; // secondary highlight
  radius: ThemeRadius;
  font: ThemeFont;
}

/** What is persisted on the tenant row after a save. */
export interface StoredTheme {
  presetId: string;
  primary: string;
  accent: string;
  radius: ThemeRadius;
  font: ThemeFont;
  version: number;
  updatedAt: string;
}

/** The resolved, read-optimised theme handed to every consumer. */
export interface ResolvedTheme {
  presetId: string;
  primary: string;
  soft: string; // light wash derived from primary (pre-computed for reads)
  accent: string;
  radius: ThemeRadius;
  radiusPx: number;
  font: ThemeFont;
  version: number;
  updatedAt: string | null;
}

export const RADIUS_PX: Record<ThemeRadius, number> = { sm: 8, md: 12, lg: 18 };

export const FONT_STACKS: Record<ThemeFont, string> = {
  system:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', 'Iowan Old Style', serif",
  mono: "'SF Mono', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep navy with teal accents — calm and professional.',
    primary: '#1b2559',
    accent: '#0ea5a0',
    radius: 'md',
    font: 'system',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Clear blue with a bright cyan highlight.',
    primary: '#0369a1',
    accent: '#06b6d4',
    radius: 'lg',
    font: 'system',
  },
  {
    id: 'royal',
    name: 'Royal',
    description: 'Violet paired with fuchsia — bold and modern.',
    primary: '#6d28d9',
    accent: '#c026d3',
    radius: 'md',
    font: 'system',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep green with a lime kick.',
    primary: '#047857',
    accent: '#65a30d',
    radius: 'sm',
    font: 'system',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Ember orange with warm amber highlights.',
    primary: '#c2410c',
    accent: '#f59e0b',
    radius: 'md',
    font: 'system',
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Berry pink with a soft rose accent.',
    primary: '#be123c',
    accent: '#ec4899',
    radius: 'lg',
    font: 'system',
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Minimal ink-grey — let the reviews do the talking.',
    primary: '#1e293b',
    accent: '#475569',
    radius: 'sm',
    font: 'system',
  },
];

export const RADIUS_IDS: ThemeRadius[] = ['sm', 'md', 'lg'];
export const FONT_IDS: ThemeFont[] = ['system', 'serif', 'mono'];
export const PRESET_IDS = new Set<string>(THEME_PRESETS.map((p) => p.id));

export const PRESET_BY_ID: Record<string, ThemePreset> = Object.fromEntries(
  THEME_PRESETS.map((p) => [p.id, p]),
);

export const DEFAULT_PRESET: ThemePreset = PRESET_BY_ID['midnight'];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_RE.test(value);
}

/** Blend a hex colour toward white — used for the soft/wash token. */
export function hexSoft(hex: string): string {
  if (!HEX_RE.test(hex)) return '#eef0fc';
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.86);
  const r = mix((n >> 16) & 0xff);
  const g = mix((n >> 8) & 0xff);
  const b = mix(n & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Contrasting readable text colour (black or white) for a background hex. */
export function textOn(hex: string): string {
  if (!HEX_RE.test(hex)) return '#161a2e';
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.2126 * ((n >> 16) & 0xff) + 0.7152 * ((n >> 8) & 0xff) + 0.0722 * (n & 0xff);
  return lum > 150 ? '#161a2e' : '#ffffff';
}

export interface ThemeCarrier {
  brandColor: string | null;
  theme?: StoredTheme | null;
}

/**
 * The single read path. Stored tokens win; anything missing falls back to the
 * preset they came from; tenants without a stored theme fall back to their
 * legacy brandColor (or the default preset). `soft`/`radiusPx` are computed
 * here once, so consumers never re-derive them.
 */
export function resolveTheme(carrier: ThemeCarrier): ResolvedTheme {
  const stored = carrier.theme ?? null;
  const preset = (stored?.presetId && PRESET_BY_ID[stored.presetId]) || DEFAULT_PRESET;
  const primary = stored?.primary ?? carrier.brandColor ?? preset.primary;
  const accent = stored?.accent ?? preset.accent;
  const radius = stored?.radius ?? preset.radius;
  const font = stored?.font ?? preset.font;
  return {
    presetId: stored?.presetId ?? 'custom',
    primary,
    soft: hexSoft(primary),
    accent,
    radius,
    radiusPx: RADIUS_PX[radius],
    font,
    version: stored?.version ?? 0,
    updatedAt: stored?.updatedAt ?? null,
  };
}

/** Public-safe preset summary (no internals, tiny payload). */
export function presetSummary(p: ThemePreset) {
  return { id: p.id, name: p.name, description: p.description, primary: p.primary, accent: p.accent, radius: p.radius, font: p.font };
}

export interface ThemePatch {
  presetId?: string;
  primary?: string;
  accent?: string;
  radius?: ThemeRadius;
  font?: ThemeFont;
}

/** Route-level body validation shared by the tenant + platform theme writers. */
export function parseThemePatch(
  body: Record<string, unknown>,
): { ok: true; patch: ThemePatch } | { ok: false; error: string } {
  const patch: ThemePatch = {};
  if (body.presetId !== undefined && body.presetId !== null) {
    const id = String(body.presetId);
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)) return { ok: false, error: 'Template id must be 1-40 letters/digits/_/-.' };
    patch.presetId = id;
  }
  const checkColor = (key: 'primary' | 'accent'): string | null => {
    const raw = body[key];
    if (raw === undefined || raw === null) return null;
    if (typeof raw !== 'string' || !isValidHexColor(raw.trim())) {
      return `${key === 'primary' ? 'Brand' : 'Accent'} colour must be a 6-digit hex like #1B2559.`;
    }
    return null;
  };
  const pErr = checkColor('primary');
  if (pErr) return { ok: false, error: pErr };
  if (typeof body.primary === 'string') patch.primary = body.primary.trim();
  const aErr = checkColor('accent');
  if (aErr) return { ok: false, error: aErr };
  if (typeof body.accent === 'string') patch.accent = body.accent.trim();
  if (body.radius !== undefined && body.radius !== null) {
    if (!RADIUS_IDS.includes(body.radius as ThemeRadius)) return { ok: false, error: 'Radius must be sm, md or lg.' };
    patch.radius = body.radius as ThemeRadius;
  }
  if (body.font !== undefined && body.font !== null) {
    if (!FONT_IDS.includes(body.font as ThemeFont)) return { ok: false, error: 'Font must be system, serif or mono.' };
    patch.font = body.font as ThemeFont;
  }
  return { ok: true, patch };
}
