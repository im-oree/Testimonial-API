/* eslint-disable no-console */
// ============================================================
// Doc 5 — "The Hair & Makeup" §A theme-foundation checklist.
// Run: npx tsx scripts/check-doc5.ts
//
// Static/structural evidence only (mirrors check-doc1/2/4). The Tailwind CLI
// compile gate for all three apps (shared preset + globals.css → CSS with
// bg-primary-500, dark: variants, animate-* keyframes) is part of the §A
// evidence and is re-run in the progress log. Browser items (computed-style
// inspection, colorblind simulator, Lighthouse, Storybook) stay ⬜ per
// docs/05-hair-and-makeup.md.
// ============================================================
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const CFG = join(ROOT, 'packages/config');
const UI = join(ROOT, 'packages/ui/src');
const APPS = ['web'].map((a) => join(ROOT, 'apps', a)); // single-website consolidation 2026-09-08

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(ok: boolean, label: string): void {
  if (ok) passed += 1;
  else {
    failed += 1;
    failures.push(label);
    console.error(`  ✗ FAIL ${label}`);
  }
}
const read = (p: string): string => readFileSync(p, 'utf8');
const file = (...parts: string[]): string => join(...parts);

const PRIMARY_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const LIGHT_VARS = [
  '--background', '--background-subtle', '--background-muted', '--background-elevated',
  '--foreground', '--foreground-secondary', '--foreground-tertiary', '--foreground-inverse',
  '--border', '--border-subtle', '--border-strong', '--ring', '--radius',
];
const NEW_COMPONENTS = ['Sheet', 'SidebarItem', 'Topbar', 'PageHeader', 'RatingStars', 'StatusBadge', 'SourceBadge', 'Alert', 'Skeleton', 'NotificationBell', 'FormField', 'FormFileUpload'];

function main(): void {
  console.log('Doc 5 — The Hair & Makeup: §A theme foundation\n');

  // ---- A1. shared tailwind config -------------------------------------------------
  console.log('A1. packages/config theme');
  check(existsSync(file(CFG, 'tailwind.config.ts')), 'tailwind.config.ts exists in packages/config');
  check(existsSync(file(CFG, 'tailwind/preset.cjs')), 'shared preset exists (tailwind/preset.cjs)');
  const preset = read(file(CFG, 'tailwind/preset.cjs'));
  check(preset.includes("darkMode: 'class'"), 'darkMode: class');
  for (const k of [...PRIMARY_SHADES]) check(preset.includes(`hsl(var(--primary-${k}))`), `primary-${k} mapped to CSS var`);
  const SEMANTIC_HSL: Record<string, string> = { success: '142 71% 45%', warning: '38 92% 50%', error: '0 84% 60%', info: '217 91% 60%' };
  for (const c of ['success', 'warning', 'error', 'info']) {
    check(preset.includes(`${c}: {`) && preset.includes(`hsl(${SEMANTIC_HSL[c]})`) && preset.includes('light:') && preset.includes('dark:') && preset.includes('foreground:'), `semantic ${c} colors declared`);
  }
  check(preset.includes('chart: {') && preset.includes("2: 'hsl(142 71% 45%)'"), '6-color chart palette declared');
  for (const kw of ['fontFamily', "'2xs':", "'4.5':", "'13':", "'88':", "'128':", "'glow-primary':", 'fade-in-up', 'slide-in-right', 'shimmer 1.5s linear infinite', "overlay: '70'", "toast: '100'", "require('tailwindcss-animate')", "require('@tailwindcss/typography')"]) {
    check(preset.includes(kw), `preset token/plugin: ${kw}`);
  }

  // ---- A2/A3. globals.css per app -------------------------------------------------
  console.log('A2–A3. globals.css token sets (apps/web)');
  for (const app of APPS) {
    const g = read(file(app, 'app/globals.css'));
    check(g.includes('@tailwind base') && g.includes('@tailwind utilities'), `${app}: tailwind directives`);
    check(g.includes(':root {') && g.includes('.dark {'), `${app}: :root + .dark blocks`);
    for (const v of LIGHT_VARS) check(g.includes(`--${v.slice(2)}:`) || g.includes(`${v}:`), `${app}: var ${v}`);
    for (const s of PRIMARY_SHADES) {
      check(g.includes(`--primary-${s}:`), `${app}: light --primary-${s}`);
      const afterDark = g.slice(g.indexOf('.dark'));
      check(afterDark.includes(`--primary-${s}:`), `${app}: dark --primary-${s}`);
    }
    check(g.includes('@media (prefers-reduced-motion: reduce)'), `${app}: reduced-motion block`);
    check(g.includes('@media print'), `${app}: print styles`);
    check(existsSync(file(app, 'postcss.config.js')), `${app}: postcss.config.js`);
    check(existsSync(file(app, 'tailwind.config.js')), `${app}: tailwind.config.js`);
    const tc = read(file(app, 'tailwind.config.js'));
    check(tc.includes('../../packages/config/tailwind/preset.cjs'), `${app}: consumes shared preset`);
  }

  // ---- fonts + theme provider + use-theme ----------------------------------------
  console.log('Fonts + theme provider');
  for (const app of APPS) {
    const l = read(file(app, 'app/layout.tsx'));
    check(l.includes("from 'next/font/google'") && l.includes('Inter(') && l.includes('JetBrains_Mono('), `${app}: next/font Inter + JetBrains Mono`);
    check(l.includes("display: 'swap'"), `${app}: display swap`);
    check(l.includes('inter.variable') && l.includes('jetbrains.variable'), `${app}: font variables on <html>`);
    check(l.includes('ThemeProviders'), `${app}: root layout mounts ThemeProviders`);
  }
  check(existsSync(file(UI, 'hooks/use-theme.ts')), 'use-theme.ts exists');
  const ut = read(file(UI, 'hooks/use-theme.ts'));
  check(ut.includes('next-themes') && ut.includes('isDark'), 'use-theme wraps next-themes');
  const providers = read(file(UI, 'components/providers.tsx'));
  check(providers.includes('ThemeProvider') && providers.includes('attribute="class"'), 'ThemeProviders toggles .dark class');

  // ---- theme engine ----------------------------------------------------------------
  console.log('§9 theme engine');
  check(existsSync(file(UI, 'lib/theme-engine.ts')), 'theme-engine.ts exists');
  const te = read(file(UI, 'lib/theme-engine.ts'));
  for (const fn of ['hexToHsl', 'generatePalette', 'applyTenantTheme', 'clearTenantTheme', 'paletteToStyleObject']) {
    check(te.includes(`export function ${fn}`) || te.includes(`export const ${fn}`), `theme-engine exports ${fn}`);
  }
  check(te.includes('PALETTE_SHADES'), '11-shade palette constant');
  const layout = read(file(join(ROOT, 'apps/web'), 'app/app/layout.tsx'));
  check(layout.includes('applyTenantTheme') && layout.includes('brandColor'), 'tenant workspace layout (/app) applies brandColor (§9.4)');

  // ---- §5 class pass across the component inventory --------------------------------
  console.log('§5 component classes');
  const byCat = (cat: string): string[] =>
    readdirSync(file(UI, 'components', cat)).filter((f) => f.endsWith('.tsx')).map((f) => f.replace('.tsx', ''));
  const all = [...byCat('primitives'), ...byCat('layout'), ...byCat('data-display'), ...byCat('feedback'), ...byCat('forms'), ...byCat('charts')];
  for (const c of NEW_COMPONENTS) check(all.includes(c), `${c} exists`);
  for (const c of ['Button', 'Input', 'Dialog', 'Sidebar', 'DataTable', 'StatusBadge', 'Skeleton', 'Alert', 'FormField', 'ChartCard']) {
    check(all.includes(c), `${c} exists`);
  }
  const button = read(file(UI, 'components/primitives/Button.tsx'));
  check(button.includes('bg-primary-500') && button.includes('hover:bg-primary-600') && button.includes('focus-visible:ring-2'), 'Button primary/focus classes');
  check(button.includes('opacity-50') && button.includes('opacity-70'), 'Button disabled + loading states');
  const input = read(file(UI, 'components/primitives/Input.tsx'));
  check(input.includes('focus:ring-2') && input.includes('placeholder:text-foreground-tertiary') && input.includes('disabled:bg-background-muted'), 'Input focus/placeholder/disabled classes');
  const badge = read(file(UI, 'components/primitives/Badge.tsx'));
  check(['success', 'warning', 'error', 'info', 'neutral', 'primary'].every((t) => badge.includes(`${t}:`) || badge.includes(t)), 'Badge 6 variants');
  const dt = read(file(UI, 'components/data-display/DataTable.tsx'));
  check(dt.includes('uppercase') && dt.includes('text-foreground-tertiary') && dt.includes('hover:bg-background-subtle/50'), 'DataTable header/hover spec');
  const sidebar = read(file(UI, 'components/layout/Sidebar.tsx'));
  check(sidebar.includes('w-64') && sidebar.includes("'w-16'") && sidebar.includes('border-r'), 'Sidebar width/collapse');
  const dialog = read(file(UI, 'components/primitives/Dialog.tsx'));
  check(dialog.includes('z-overlay') && dialog.includes('bg-black/50') && dialog.includes('backdrop-blur'), 'Dialog overlay z/blur');
  const sheet = read(file(UI, 'components/primitives/Sheet.tsx'));
  check(sheet.includes('animate-slide-in-right') && sheet.includes('animate-slide-in-left'), 'Sheet slide animations');
  const skeleton = read(file(UI, 'components/feedback/Skeleton.tsx'));
  check(skeleton.includes('animate-shimmer'), 'Skeleton shimmer');
  const alert = read(file(UI, 'components/feedback/Alert.tsx'));
  check(alert.includes('bg-info-light') && alert.includes('bg-error-light'), 'Alert tones');
  const catalog = read(file(UI, 'components/ui.tsx'));
  check(catalog.split('\n').filter((l) => l.startsWith('export * from')).length >= 63, 'catalog barrel ≥ 63 exports');

  console.log(`\nDoc 5 §A structural checks: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('Failures:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

main();
