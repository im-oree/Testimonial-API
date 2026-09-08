import { describe, expect, it } from 'vitest';
import {
  PALETTE_SHADES,
  applyTenantTheme,
  clearTenantTheme,
  generatePalette,
  hexToHsl,
  hexToRgb,
  paletteToStyleObject,
  type HslPalette,
} from '../src/lib/theme-engine';

describe('theme-engine (Doc 5 §9.2/9.3)', () => {
  it('hexToRgb parses #RRGGBB', () => {
    expect(hexToRgb('#4F46E5')).toEqual({ r: 79, g: 70, b: 229 });
  });

  it('hexToHsl converts #FF5733 → 11 100% 60%', () => {
    expect(hexToHsl('#FF5733')).toEqual({ h: 11, s: 100, l: 60 });
  });

  it('throws on invalid hex', () => {
    expect(() => hexToRgb('#12')).toThrow(/Invalid brand color/);
    expect(() => generatePalette('nope')).toThrow(/Invalid brand color/);
  });

  it('generates exactly the 11 canonical shades', () => {
    const p = generatePalette('#4F46E5');
    expect(Object.keys(p).sort((a, b) => Number(a) - Number(b))).toEqual(
      [...PALETTE_SHADES].sort((a, b) => a - b).map(String),
    );
  });

  it('shade 500 keeps the input color', () => {
    const p = generatePalette('#FF5733');
    expect(p[500]).toBe('11 100% 60%');
  });

  it('lightness strictly descends from 50 → 950', () => {
    const p = generatePalette('#FF5733');
    const l = (v: string): number => Number(v.split(' ')[2].replace('%', ''));
    for (let i = 1; i < PALETTE_SHADES.length; i += 1) {
      expect(l(p[PALETTE_SHADES[i]])).toBeLessThan(l(p[PALETTE_SHADES[i - 1]]));
    }
    expect(l(p[50])).toBeLessThanOrEqual(98);
    expect(l(p[950])).toBeGreaterThanOrEqual(5);
  });

  it('clamps saturation into [10%, 100%] even for desaturated input', () => {
    const p = generatePalette('#888888'); // s = 0
    for (const shade of PALETTE_SHADES) {
      const s = Number(p[shade].split(' ')[1].replace('%', ''));
      expect(s).toBeGreaterThanOrEqual(10);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it('accepts an Hsl input object directly', () => {
    const p = generatePalette({ h: 200, s: 100, l: 50 });
    expect(p[500]).toBe('200 100% 50%');
  });

  it('paletteToStyleObject emits --primary-* CSS vars for SSR <html style>', () => {
    const style = paletteToStyleObject(generatePalette('#FF5733')) as Record<string, string>;
    expect(style['--primary-500']).toBe('11 100% 60%');
    expect(style['--primary-950']).toBeDefined();
  });

  it('apply/clear are safe no-ops outside a browser', () => {
    expect(() => {
      applyTenantTheme('#FF5733');
      clearTenantTheme();
    }).not.toThrow();
  });
});

// keep type used for documentation value
export type { HslPalette };
