/**
 * Doc 5 §A — shared Tailwind configuration entry point.
 * The single source of theme truth is ./tailwind/preset.cjs (§1, verbatim).
 * Each Next app's `tailwind.config.js` consumes the preset via `presets` and
 * only supplies its own `content` globs. Verified by compiling all three apps
 * with the Tailwind CLI (custom classes like bg-primary-500 must emit).
 */
import { createRequire } from 'node:module';
import type { Config } from 'tailwindcss';

const require = createRequire(import.meta.url);
const preset = require('./tailwind/preset.cjs') as Config;

const config: Config = { presets: [preset], content: [] };

export default config;
