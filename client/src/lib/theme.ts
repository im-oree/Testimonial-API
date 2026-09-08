/**
 * Client-side theme helpers (DOC 7). The server owns the preset catalogue and
 * the persisted tokens; this module only maps ids to concrete CSS values and
 * caches the tiny public preset list so editors render instantly after the
 * first fetch.
 */
import { api } from './api';
import type { ThemeFontId, ThemePresetSummary, ThemeRadiusId } from './types';

export const RADIUS_OPTIONS: Array<{ id: ThemeRadiusId; label: string; px: number }> = [
  { id: 'sm', label: 'Sharp', px: 8 },
  { id: 'md', label: 'Soft', px: 12 },
  { id: 'lg', label: 'Rounded', px: 18 },
];

export const FONT_OPTIONS: Array<{ id: ThemeFontId; label: string; stack: string }> = [
  { id: 'system', label: 'System (Inter / Segoe)', stack: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: 'serif', label: 'Serif', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'mono', label: 'Mono', stack: "'SF Mono', Consolas, monospace" },
];

/** Blend a hex colour toward white — mirrors the server-side soft token. */
export function softOf(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return '#eef0fc';
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.86);
  const r = mix((n >> 16) & 0xff);
  const g = mix((n >> 8) & 0xff);
  const b = mix(n & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function textOn(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return '#161a2e';
  const n = parseInt(m[1], 16);
  const lum = 0.2126 * ((n >> 16) & 0xff) + 0.7152 * ((n >> 8) & 0xff) + 0.0722 * (n & 0xff);
  return lum > 150 ? '#161a2e' : '#ffffff';
}

/** Public template catalogue — fetched on demand so platform edits appear instantly. */
export function fetchThemePresets(): Promise<ThemePresetSummary[]> {
  return api
    .get<{ presets: ThemePresetSummary[] }>('/v1/public/theme-presets')
    .then((d) => d.presets)
    .catch(() => []);
}

/** Active preset id given a draft token set ('' = custom). */
export function matchingPreset(
  presets: ThemePresetSummary[],
  t: { primary: string; accent: string; radius: ThemeRadiusId; font: ThemeFontId },
): string {
  const hit = presets.find(
    (p) => p.primary.toLowerCase() === t.primary.toLowerCase() && p.accent.toLowerCase() === t.accent.toLowerCase() && p.radius === t.radius && p.font === t.font,
  );
  return hit?.id ?? 'custom';
}
