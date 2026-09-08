/**
 * Doc 5 §9 — white-label theming engine.
 *
 * Given one tenant brand color (hex), generates the full 11-shade
 * primary palette (50–950) and injects it as CSS variables on <html>,
 * re-theming every component that uses var(--primary-*) (Doc 5 §9.1).
 *
 * Pure helpers (hexToHsl / generatePalette / paletteToStyleObject) are
 * SSR-safe and unit-tested (packages/ui/test/theme-engine.test.ts).
 */
import type { CSSProperties } from 'react';

export interface Hsl {
  h: number; // 0–360
  s: number; // 0–100
  l: number; // 0–100
}

export const PALETTE_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type PaletteShade = (typeof PALETTE_SHADES)[number];
export type HslPalette = Record<PaletteShade, string>; // "H S% L%" tuples

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

function normalizeHex(hex: string): string {
  let h = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Invalid brand color hex: "${hex}"`);
  return `#${h}`;
}

/** #RRGGBB → {r,g,b} 0–255. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = normalizeHex(hex);
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

/** #RRGGBB → HSL (doc §9.3 step 1). */
export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Saturation multipliers per shade (doc §9.3 step 2). */
const SATURATION_FACTOR: Record<PaletteShade, number> = {
  50: 0.3, 100: 0.5, 200: 0.7, 300: 0.85, 400: 0.95,
  500: 1,
  600: 0.9, 700: 0.8, 800: 0.7, 900: 0.6, 950: 0.5,
};

const LIGHTNESS: Record<PaletteShade, { l: number; factor?: number }> = {
  50: { l: 97 },
  100: { l: 94 },
  200: { l: 89 },
  300: { l: 82 },
  400: { l: 74 },
  500: { l: -1 }, // the original color
  600: { l: -1, factor: 0.88 },
  700: { l: -1, factor: 0.75 },
  800: { l: -1, factor: 0.6 },
  900: { l: -1, factor: 0.45 },
  950: { l: -1, factor: 0.25 },
};

/**
 * Generates the 11-shade palette from a base HSL color (doc §9.3).
 * 500 = the input color; returns "H S% L%" strings ready for CSS vars.
 */
export function generatePalette(input: string | Hsl): HslPalette {
  const base: Hsl = typeof input === 'string' ? hexToHsl(input) : input;
  const out = {} as HslPalette;
  for (const shade of PALETTE_SHADES) {
    const cfg = LIGHTNESS[shade];
    const l =
      cfg.l >= 0 ? cfg.l : clamp(base.l * (cfg.factor ?? 1), 5, 98);
    const s = clamp(base.s * SATURATION_FACTOR[shade], 10, 100);
    out[shade] = `${base.h} ${s}% ${Math.round(clamp(l, 5, 98))}%`;
  }
  return out;
}

/** palette → CSSProperties with --primary-* keys (SSR <html style> injection, §9.4). */
export function paletteToStyleObject(palette: HslPalette): CSSProperties {
  const style: Record<string, string> = {};
  for (const shade of PALETTE_SHADES) style[`--primary-${shade}`] = palette[shade];
  return style as CSSProperties;
}

const isBrowser = typeof window !== 'undefined';

/** Client: inject palette as CSS vars on <html> (doc §9.2). */
export function applyTenantTheme(brandColorHex: string): void {
  if (!isBrowser) return;
  const palette = generatePalette(brandColorHex);
  const root = document.documentElement;
  for (const shade of PALETTE_SHADES) root.style.setProperty(`--primary-${shade}`, palette[shade]);
}

/** Client: remove injected vars, restoring the default indigo palette. */
export function clearTenantTheme(): void {
  if (!isBrowser) return;
  const root = document.documentElement;
  for (const shade of PALETTE_SHADES) root.style.removeProperty(`--primary-${shade}`);
}
