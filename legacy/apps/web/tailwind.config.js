/**
 * Doc 5 §1 — per-app Tailwind config. Theme lives in the shared preset
 * (packages/config/tailwind/preset.cjs); only content globs differ here.
 */
const preset = require('../../packages/config/tailwind/preset.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    '../../packages/ui/src/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.ts',
    './stores/**/*.ts',
  ],
};
