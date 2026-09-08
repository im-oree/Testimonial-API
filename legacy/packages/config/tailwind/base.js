// Tailwind preset — CONSUMED STARTING Doc 5 (Hair & Makeup).
// Placeholder keeps the packages/config/tailwind entry in the Doc 1 tree;
// the real theme (colors, fonts, animations, brand-color CSS var driving)
// is specified in docs/05-design-system.md and wired here.
//
// Base shape already known from README §23: neutral slate base + single
// dynamic accent (--brand-color, default #4F46E5) + Inter + 8px scale.

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--brand-color-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '0.75rem', // rounded-xl
      },
    },
  },
};
