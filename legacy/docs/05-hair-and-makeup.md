<!-- DOC 5 — THE HAIR & MAKEUP. Fetched verbatim from GitHub repo `im-oree/Testimonial-API`, branch `main`, file `next.md` (SHA 1df22bae9ebf22cefd1c8cdf868ea773ca58efe5, 55341 bytes) via `gh api` on 2026-09-08. Status legend: ✅ verified in-sandbox · ⬜ needs a browser/device/CI runner · 🔶 partial. Evidence + progress log appended at the bottom; checklists are the doc's own. -->

# DOC 5 — THE HAIR & MAKEUP
## Complete Design System, Visual Language & Theming Engine

This document skins every structural component defined in Doc 4. It provides exact color values, typography scales, spacing tokens, Tailwind configuration, component-level class specifications, animation parameters, dark mode implementation, and the white-label theming engine that lets each tenant's dashboard and widgets reflect their own brand identity.

---

## 0. Design Philosophy

**Three words: Calm, Confident, Clear.**

- **Calm**: generous whitespace, muted neutrals, no visual noise. The dashboard is a workspace, not a billboard.
- **Confident**: bold type hierarchy, decisive color accents, strong contrast on interactive elements. The user should never wonder "can I click this?"
- **Clear**: one primary action per view, consistent iconography, predictable layout patterns. Data should be scannable in under 3 seconds.

**Visual references**: Linear, Vercel Dashboard, Stripe Dashboard, Raycast. Not: flashy marketing SaaS with gradients and illustrations.

---

## 1. Tailwind Configuration — Full Theme

### 1.1 `tailwind.config.ts` (shared across all apps via `packages/config/`)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    '../../packages/ui/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // ── COLORS ──────────────────────────────────────────
      colors: {
        // Semantic neutrals (slate-based, not pure gray — warmer, less harsh)
        background: {
          DEFAULT: 'hsl(var(--background))',
          subtle: 'hsl(var(--background-subtle))',
          muted: 'hsl(var(--background-muted))',
          elevated: 'hsl(var(--background-elevated))',
        },
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          secondary: 'hsl(var(--foreground-secondary))',
          tertiary: 'hsl(var(--foreground-tertiary))',
          inverse: 'hsl(var(--foreground-inverse))',
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          subtle: 'hsl(var(--border-subtle))',
          strong: 'hsl(var(--border-strong))',
        },
        // Brand accent (dynamically overridden per tenant via CSS variables)
        primary: {
          50: 'hsl(var(--primary-50))',
          100: 'hsl(var(--primary-100))',
          200: 'hsl(var(--primary-200))',
          300: 'hsl(var(--primary-300))',
          400: 'hsl(var(--primary-400))',
          500: 'hsl(var(--primary-500))',  // main accent
          600: 'hsl(var(--primary-600))',
          700: 'hsl(var(--primary-700))',
          800: 'hsl(var(--primary-800))',
          900: 'hsl(var(--primary-900))',
          950: 'hsl(var(--primary-950))',
        },
        // Semantic status colors (fixed, not brand-dependent)
        success: {
          DEFAULT: 'hsl(142 71% 45%)',
          light: 'hsl(142 71% 95%)',
          dark: 'hsl(142 71% 30%)',
          foreground: 'hsl(142 71% 20%)',
        },
        warning: {
          DEFAULT: 'hsl(38 92% 50%)',
          light: 'hsl(38 92% 95%)',
          dark: 'hsl(38 92% 35%)',
          foreground: 'hsl(38 92% 20%)',
        },
        error: {
          DEFAULT: 'hsl(0 84% 60%)',
          light: 'hsl(0 84% 96%)',
          dark: 'hsl(0 84% 45%)',
          foreground: 'hsl(0 84% 25%)',
        },
        info: {
          DEFAULT: 'hsl(217 91% 60%)',
          light: 'hsl(217 91% 96%)',
          dark: 'hsl(217 91% 45%)',
          foreground: 'hsl(217 91% 25%)',
        },
        // Chart palette (6 colors, accessible contrast, distinguishable in colorblind sim)
        chart: {
          1: 'hsl(var(--primary-500))',
          2: 'hsl(142 71% 45%)',
          3: 'hsl(38 92% 50%)',
          4: 'hsl(280 67% 60%)',
          5: 'hsl(197 85% 50%)',
          6: 'hsl(340 75% 55%)',
        },
      },

      // ── TYPOGRAPHY ──────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],   // 10px — badges, labels
        'xs': ['0.75rem', { lineHeight: '1rem' }],           // 12px — captions, table cells
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],       // 14px — body secondary, inputs
        'base': ['1rem', { lineHeight: '1.5rem' }],          // 16px — body primary
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],       // 18px — lead text
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],        // 20px — h4
        '2xl': ['1.5rem', { lineHeight: '2rem' }],           // 24px — h3
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],      // 30px — h2
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],        // 36px — h1
        '5xl': ['3rem', { lineHeight: '1.15' }],             // 48px — hero (public forms)
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      letterSpacing: {
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
      },

      // ── SPACING ─────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',   // 18px — input height sweet spot
        '13': '3.25rem',     // 52px — topbar height
        '15': '3.75rem',     // 60px — sidebar item height
        '18': '4.5rem',      // 72px — page header height
        '88': '22rem',       // 352px — sidebar width expanded
        '128': '32rem',      // 512px — max content width for forms
      },

      // ── BORDERS ─────────────────────────────────────────
      borderRadius: {
        'sm': '0.375rem',    // 6px — inputs, badges
        'md': '0.5rem',      // 8px — buttons, small cards
        'lg': '0.75rem',     // 12px — cards, dialogs
        'xl': '1rem',        // 16px — large cards, modals
        '2xl': '1.25rem',    // 20px — hero sections
      },
      borderWidth: {
        DEFAULT: '1px',
        '2': '2px',
      },

      // ── SHADOWS ─────────────────────────────────────────
      boxShadow: {
        'xs': '0 1px 2px 0 hsl(0 0% 0% / 0.03)',
        'sm': '0 1px 3px 0 hsl(0 0% 0% / 0.06), 0 1px 2px -1px hsl(0 0% 0% / 0.06)',
        'md': '0 4px 6px -1px hsl(0 0% 0% / 0.07), 0 2px 4px -2px hsl(0 0% 0% / 0.05)',
        'lg': '0 10px 15px -3px hsl(0 0% 0% / 0.08), 0 4px 6px -4px hsl(0 0% 0% / 0.04)',
        'xl': '0 20px 25px -5px hsl(0 0% 0% / 0.08), 0 8px 10px -6px hsl(0 0% 0% / 0.04)',
        'inner-subtle': 'inset 0 1px 2px 0 hsl(0 0% 0% / 0.04)',
        'glow-primary': '0 0 20px hsl(var(--primary-500) / 0.15)',
      },

      // ── ANIMATION ───────────────────────────────────────
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'slide-in-left': 'slide-in-left 0.25s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
      },

      // ── Z-INDEX ─────────────────────────────────────────
      zIndex: {
        'dropdown': '50',
        'sticky': '60',
        'overlay': '70',
        'modal': '80',
        'popover': '90',
        'toast': '100',
        'tooltip': '110',
        'command': '120',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),   // for Framer Motion interop
    require('@tailwindcss/typography'), // for rich text rendering
  ],
};

export default config;
```

---

## 2. CSS Variables — Light & Dark Mode

### 2.1 `globals.css` — root theme tokens

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ── Neutrals (Light Mode) ──────────────────────── */
    --background: 0 0% 100%;             /* pure white */
    --background-subtle: 220 14% 96%;    /* slate-50, page bg */
    --background-muted: 220 13% 91%;     /* slate-100, disabled bg */
    --background-elevated: 0 0% 100%;    /* white, cards/dialogs */

    --foreground: 222 47% 11%;           /* slate-900, primary text */
    --foreground-secondary: 215 16% 47%; /* slate-500, secondary text */
    --foreground-tertiary: 215 20% 65%;  /* slate-400, placeholders */
    --foreground-inverse: 0 0% 100%;     /* white on dark bg */

    --border: 220 13% 91%;              /* slate-200 */
    --border-subtle: 220 14% 96%;       /* slate-100 */
    --border-strong: 215 16% 47%;       /* slate-500, focus rings */

    /* ── Brand Accent (default: Indigo) ─────────────── */
    /* These are overridden per-tenant via the theming engine (§9) */
    --primary-50: 226 100% 97%;
    --primary-100: 226 100% 94%;
    --primary-200: 228 96% 89%;
    --primary-300: 230 94% 82%;
    --primary-400: 234 89% 74%;
    --primary-500: 239 84% 67%;          /* #4F46E5 — the default */
    --primary-600: 243 75% 59%;
    --primary-700: 245 58% 51%;
    --primary-800: 244 55% 41%;
    --primary-900: 242 47% 34%;
    --primary-950: 240 40% 20%;

    /* ── Misc ───────────────────────────────────────── */
    --ring: var(--primary-500);
    --radius: 0.75rem;
  }

  .dark {
    /* ── Neutrals (Dark Mode) ───────────────────────── */
    --background: 222 47% 6%;            /* near-black */
    --background-subtle: 222 47% 9%;     /* slate-900 */
    --background-muted: 217 33% 17%;     /* slate-800 */
    --background-elevated: 222 47% 11%;  /* slate-900, cards */

    --foreground: 210 40% 98%;           /* slate-50 */
    --foreground-secondary: 215 20% 65%; /* slate-400 */
    --foreground-tertiary: 215 16% 47%;  /* slate-500 */
    --foreground-inverse: 222 47% 11%;   /* dark text on light bg */

    --border: 217 33% 17%;              /* slate-800 */
    --border-subtle: 222 47% 9%;        /* slate-900 */
    --border-strong: 215 20% 65%;       /* slate-400 */

    /* ── Brand Accent (Dark Mode adjustments) ───────── */
    --primary-50: 226 50% 12%;
    --primary-100: 228 50% 16%;
    --primary-200: 230 50% 22%;
    --primary-300: 232 60% 32%;
    --primary-400: 236 70% 50%;
    --primary-500: 239 84% 67%;          /* same hue, works in both */
    --primary-600: 243 75% 59%;
    --primary-700: 245 58% 51%;
    --primary-800: 244 55% 41%;
    --primary-900: 242 47% 34%;
    --primary-950: 240 40% 20%;

    --ring: var(--primary-400);
  }
}
```

### 2.2 How dark mode activates

```typescript
// packages/ui/hooks/use-theme.ts
import { useTheme as useNextTheme } from 'next-themes';

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  return {
    theme,           // 'light' | 'dark' | 'system' (user preference)
    resolvedTheme,   // 'light' | 'dark' (actual applied)
    setTheme,
    isDark: resolvedTheme === 'dark',
  };
}
```

The `next-themes` provider in the root layout adds/removes the `.dark` class on `<html>` based on user preference + OS preference. All components use `dark:` Tailwind variants, which reference the CSS variables above — no component-level JS logic needed for dark mode.

---

## 3. Typography System

### 3.1 Heading hierarchy

| Level | Tailwind classes | Usage |
|---|---|---|
| H1 (Page title) | `text-3xl font-bold tracking-tight text-foreground` | Page headers, only one per page |
| H2 (Section) | `text-2xl font-semibold tracking-tight text-foreground` | Major sections within a page |
| H3 (Subsection) | `text-xl font-semibold text-foreground` | Card titles, tab panel headers |
| H4 (Label heading) | `text-lg font-medium text-foreground` | Dialog titles, stat card labels |
| H5 (Small heading) | `text-base font-medium text-foreground` | Table group headers, form section labels |

### 3.2 Body text

| Variant | Tailwind classes | Usage |
|---|---|---|
| Body large | `text-base text-foreground leading-relaxed` | Lead paragraphs, onboarding copy |
| Body default | `text-sm text-foreground` | Primary content, table cells, form labels |
| Body secondary | `text-sm text-foreground-secondary` | Descriptions, helper text, timestamps |
| Body tertiary | `text-xs text-foreground-tertiary` | Captions, footnotes, metadata |
| Mono | `font-mono text-sm text-foreground` | Code, API keys, IDs, embed snippets |

### 3.3 Font loading

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

// Applied to <html className={`${inter.variable} ${jetbrains.variable}`}>
```

`display: 'swap'` ensures text is visible immediately (no FOIT), with the custom font swapping in within ~200ms.

---

## 4. Spacing & Layout System

### 4.1 Page layout grid

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar (w-64 / w-16 collapsed)  │  Main content area       │
│  ┌──────────────────────────────┐  │  ┌────────────────────┐  │
│  │ Logo + nav items             │  │  │ Topbar (h-13)      │  │
│  │                              │  │  ├────────────────────┤  │
│  │                              │  │  │                    │  │
│  │                              │  │  │  Content (p-6)     │  │
│  │                              │  │  │  max-w-7xl mx-auto │  │
│  │                              │  │  │                    │  │
│  └──────────────────────────────┘  │  └────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

- **Sidebar width**: `w-64` (256px) expanded, `w-16` (64px) collapsed (icon-only mode), transition `duration-200 ease-in-out`
- **Topbar height**: `h-13` (52px), sticky at top
- **Content padding**: `p-6` (24px) on all sides
- **Content max-width**: `max-w-7xl` (1280px) centered, prevents ultra-wide stretching on large monitors
- **Page header**: `mb-6` (24px) bottom margin, flex row with title left and actions right

### 4.2 Card spacing

```
Card grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4
Card padding: p-5 (20px)
Card internal spacing: space-y-3 (12px between child elements)
```

### 4.3 Form spacing

```
Form field gap: space-y-4 (16px)
Label-to-input gap: gap-1.5 (6px)
Form section gap: space-y-6 (24px)
Form actions (buttons): pt-4 flex gap-3 justify-end
```

### 4.4 Table spacing

```
Table cell padding: px-4 py-3 (16px horizontal, 12px vertical)
Table header: px-4 py-3 text-xs font-medium uppercase tracking-wide text-foreground-tertiary
Row hover: hover:bg-background-subtle transition-colors duration-100
Row selected: bg-primary-50 dark:bg-primary-950/30
```

---

## 5. Component Styling Specifications

Every component from Doc 4 §6, now with exact visual specs.

### 5.1 Primitives

#### `Button`
```
Variants:
  primary:   bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700
             shadow-sm hover:shadow-md transition-all duration-150
             focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
  secondary: bg-background text-foreground border border-border hover:bg-background-subtle
             active:bg-background-muted transition-colors duration-150
  ghost:     bg-transparent text-foreground-secondary hover:bg-background-subtle
             hover:text-foreground transition-colors duration-150
  destructive: bg-error text-white hover:bg-error-dark active:bg-error-dark
               focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2
  link:      bg-transparent text-primary-500 hover:text-primary-600 underline
             underline-offset-4 hover:underline-offset-2 transition-all duration-150

Sizes:
  sm:  h-8 px-3 text-xs rounded-md gap-1.5
  md:  h-9 px-4 text-sm rounded-md gap-2       (default)
  lg:  h-10 px-5 text-sm rounded-lg gap-2
  xl:  h-12 px-6 text-base rounded-lg gap-2.5

States:
  loading: opacity-70 pointer-events-none, spinner icon replaces leading icon
  disabled: opacity-50 pointer-events-none cursor-not-allowed
```

#### `Input`
```
Base:    h-9 w-full rounded-md border border-border bg-background px-3 py-1.5
         text-sm text-foreground placeholder:text-foreground-tertiary
         transition-colors duration-150
Focus:   outline-none ring-2 ring-primary-500/20 border-primary-500
Error:   border-error focus:ring-error/20 focus:border-error
Disabled: bg-background-muted text-foreground-tertiary cursor-not-allowed
With icon: pl-9 (icon positioned absolute left-3 top-1/2 -translate-y-1/2)
```

#### `Textarea`
```
Base:    min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2
         text-sm text-foreground placeholder:text-foreground-tertiary
         resize-y transition-colors duration-150
Focus:   same as Input
Character count: text-xs text-foreground-tertiary text-right mt-1
```

#### `Select`
```
Trigger: same visual spec as Input, with chevron-down icon right-3
Dropdown: bg-background-elevated border border-border rounded-lg shadow-lg
          p-1 min-w-[var(--radix-select-trigger-width)]
Option:   px-3 py-2 text-sm rounded-md cursor-pointer
          hover:bg-background-subtle focus:bg-primary-50 focus:text-primary-700
          data-[state=checked]:bg-primary-50 data-[state=checked]:text-primary-700
          data-[state=checked]:font-medium
```

#### `Dialog`
```
Overlay:  fixed inset-0 bg-black/50 backdrop-blur-sm z-overlay animate-fade-in
Content:  fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          bg-background-elevated border border-border rounded-xl shadow-xl
          z-modal animate-scale-in
Sizes:
  sm: w-full max-w-md
  md: w-full max-w-lg      (default)
  lg: w-full max-w-2xl
  xl: w-full max-w-4xl
Header:   px-6 pt-6 pb-2
Title:    text-lg font-semibold text-foreground
Desc:     text-sm text-foreground-secondary mt-1
Body:     px-6 py-4
Footer:   px-6 pb-6 pt-2 flex justify-end gap-3
Close:    absolute right-4 top-4 h-8 w-8 rounded-md hover:bg-background-subtle
          flex items-center justify-center text-foreground-secondary
```

#### `Sheet` (side panel)
```
Overlay:  same as Dialog
Content:  fixed top-0 bottom-0 bg-background-elevated border-l border-border
          shadow-xl z-modal
  right:  right-0 w-full max-w-md animate-slide-in-right    (default)
  left:   left-0 w-full max-w-md animate-slide-in-left
Header:   px-6 py-4 border-b border-border flex items-center justify-between
Body:     px-6 py-4 overflow-y-auto flex-1
```

#### `Badge`
```
Base:     inline-flex items-center rounded-full px-2.5 py-0.5
          text-2xs font-medium transition-colors
Variants:
  success: bg-success-light text-success-foreground dark:bg-success-dark/30 dark:text-success
  warning: bg-warning-light text-warning-foreground dark:bg-warning-dark/30 dark:text-warning
  error:   bg-error-light text-error-foreground dark:bg-error-dark/30 dark:text-error
  info:    bg-info-light text-info-foreground dark:bg-info-dark/30 dark:text-info
  neutral: bg-background-muted text-foreground-secondary
  primary: bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300
```

#### `Avatar`
```
Sizes:
  xs: h-6 w-6 text-2xs
  sm: h-8 w-8 text-xs       (default, table rows)
  md: h-10 w-10 text-sm     (cards, detail views)
  lg: h-12 w-12 text-base   (profile headers)
  xl: h-16 w-16 text-lg     (public testimonials)
Base:   rounded-full bg-primary-100 text-primary-700 font-medium
        overflow-hidden ring-2 ring-background
Image:  object-cover w-full h-full
Fallback: flex items-center justify-center (initials)
```

#### `Switch`
```
Track:    h-5 w-9 rounded-full bg-background-muted border border-border
          data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500
          transition-colors duration-200
Thumb:    h-4 w-4 rounded-full bg-white shadow-sm
          data-[state=checked]:translate-x-4 transition-transform duration-200
```

#### `Tabs`
```
TabList:  flex gap-1 p-1 bg-background-subtle rounded-lg w-fit
Tab:      px-3 py-1.5 text-sm font-medium rounded-md text-foreground-secondary
          hover:text-foreground transition-colors duration-150
          data-[state=active]:bg-background-elevated data-[state=active]:text-foreground
          data-[state=active]:shadow-xs
Content:  mt-4 animate-fade-in
```

#### `ColorPicker`
```
Trigger:  h-9 w-9 rounded-md border border-border shadow-inner-subtle
          cursor-pointer hover:ring-2 hover:ring-primary-500/30 transition-all
Popover:  p-3 bg-background-elevated border border-border rounded-lg shadow-lg
Saturation: w-48 h-32 rounded-md cursor-crosshair
Hue slider: w-48 h-3 rounded-full mt-3
Hex input:  h-8 w-24 mt-2 text-xs font-mono
Presets:    grid grid-cols-6 gap-1.5 mt-3 (6 preset swatches from tenant brand palette)
```

### 5.2 Layout Components

#### `Sidebar`
```
Container: fixed left-0 top-0 bottom-0 w-64 bg-background-elevated border-r border-border
           flex flex-col z-sticky transition-all duration-200
           data-[collapsed]:w-16
Logo area: h-13 px-4 flex items-center gap-3 border-b border-border
           Logo image: h-7 w-auto
           Logo text: font-semibold text-foreground (hidden when collapsed)
Nav:       flex-1 overflow-y-auto py-3 px-2 space-y-0.5
Footer:    p-3 border-t border-border (user avatar + settings)
```

#### `SidebarItem`
```
Base:      flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
           text-foreground-secondary hover:bg-background-subtle hover:text-foreground
           transition-colors duration-100 cursor-pointer
Active:    bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300
           font-semibold
Icon:      h-4 w-4 shrink-0
Label:     truncate (hidden when collapsed, shown as tooltip)
Badge:     ml-auto h-5 min-w-5 px-1.5 rounded-full text-2xs font-medium
           bg-error text-white flex items-center justify-center (for pending count)
```

#### `Topbar`
```
Container: h-13 px-6 flex items-center justify-between border-b border-border
           bg-background/80 backdrop-blur-md sticky top-0 z-sticky
Left:      flex items-center gap-3 (sidebar toggle + breadcrumb)
Right:     flex items-center gap-2 (search trigger + notification bell + user menu)
Search:    h-8 px-3 rounded-md bg-background-subtle text-foreground-tertiary text-sm
           flex items-center gap-2 hover:bg-background-muted transition-colors
           "⌘K" hint: text-2xs text-foreground-tertiary ml-4
```

#### `PageHeader`
```
Container: flex items-center justify-between mb-6
Title:     text-3xl font-bold tracking-tight text-foreground
Desc:      text-sm text-foreground-secondary mt-1
Actions:   flex items-center gap-2
```

#### `ImpersonationBanner`
```
Container: bg-warning text-warning-foreground px-4 py-2 text-sm font-medium
           flex items-center justify-center gap-2 sticky top-13 z-sticky
Icon:      AlertTriangle h-4 w-4
Text:      "Viewing as {tenantName} — all actions are logged"
Exit btn:  ml-4 h-6 px-2 rounded text-xs bg-warning-dark/20 hover:bg-warning-dark/30
```

### 5.3 Data Display Components

#### `StatCard`
```
Container: bg-background-elevated border border-border rounded-xl p-5
           hover:shadow-md transition-shadow duration-200
Icon:      h-10 w-10 rounded-lg bg-primary-50 text-primary-500
           flex items-center justify-center mb-3
Label:     text-sm font-medium text-foreground-secondary
Value:     text-2xl font-bold text-foreground mt-1
Trend:     flex items-center gap-1 text-xs mt-2
  up:      text-success "↑ 12%"
  down:    text-error "↓ 3%"
  neutral: text-foreground-tertiary "→ 0%"
```

#### `DataTable`
```
Container: bg-background-elevated border border-border rounded-xl overflow-hidden
Header row: bg-background-subtle border-b border-border
Header cell: px-4 py-3 text-xs font-medium uppercase tracking-wide
             text-foreground-tertiary text-left cursor-pointer select-none
             hover:text-foreground transition-colors
Sort icon:   ml-1 h-3 w-3 inline (chevron-up/down/both)
Body row:    border-b border-border-subtle last:border-0
             hover:bg-background-subtle/50 transition-colors duration-100
Body cell:   px-4 py-3 text-sm text-foreground
Empty state: py-12 text-center (EmptyState component)
Loading:     5 skeleton rows (Skeleton component with shimmer animation)
```

#### `RatingStars`
```
Star:       h-4 w-4 (sm) | h-5 w-5 (md) | h-6 w-6 (lg)
Filled:     text-warning (hsl(38 92% 50%))
Empty:      text-foreground-tertiary/30
Half:       linear-gradient split (SVG clip-path)
Spacing:    gap-0.5
Interactive variant: cursor-pointer hover:scale-110 transition-transform (for form inputs)
```

#### `StatusBadge` (maps TestimonialStatus)
```
pending:   bg-warning-light text-warning-foreground dot: bg-warning
approved:  bg-success-light text-success-foreground dot: bg-success
rejected:  bg-error-light text-error-foreground dot: bg-error
archived:  bg-background-muted text-foreground-tertiary dot: bg-foreground-tertiary
active:    bg-success-light text-success-foreground dot: bg-success
disabled:  bg-background-muted text-foreground-tertiary dot: bg-foreground-tertiary
suspended: bg-error-light text-error-foreground dot: bg-error
Each:      inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-medium
Dot:       h-1.5 w-1.5 rounded-full
```

#### `SourceBadge` (maps TestimonialSource)
```
manual:         icon: PenLine, label: "Manual", color: neutral
form:           icon: FileText, label: "Form", color: info
api:            icon: Code, label: "API", color: primary
twitter_import: icon: Twitter, label: "Twitter", color: info (sky blue)
csv_import:     icon: FileSpreadsheet, label: "CSV", color: neutral
Each:           inline-flex items-center gap-1 rounded-md px-2 py-0.5
                text-2xs font-medium bg-background-subtle text-foreground-secondary
```

#### `JsonViewer`
```
Container: bg-background-subtle rounded-lg p-4 font-mono text-xs overflow-auto max-h-96
Key:       text-primary-600 dark:text-primary-400
String:    text-success-dark dark:text-success
Number:    text-warning-dark dark:text-warning
Boolean:   text-info-dark dark:text-info
Null:      text-foreground-tertiary italic
Bracket:   text-foreground-secondary
Collapse:  cursor-pointer hover:bg-background-muted rounded px-1 -mx-1
```

#### `CodeBlock`
```
Container: relative bg-slate-950 text-slate-200 rounded-lg p-4 font-mono text-xs
           overflow-x-auto border border-slate-800
Copy btn:  absolute top-2 right-2 h-7 px-2 rounded bg-slate-800 text-slate-400
           hover:bg-slate-700 hover:text-slate-200 text-2xs flex items-center gap-1
Syntax:    keywords: text-purple-400, strings: text-green-400,
           attributes: text-sky-400, tags: text-red-400, comments: text-slate-500
```

### 5.4 Feedback Components

#### `Toast` (Sonner)
```
Container: bg-background-elevated border border-border rounded-lg shadow-lg
           px-4 py-3 flex items-start gap-3 max-w-sm animate-fade-in-up
Icon:      h-4 w-4 mt-0.5 shrink-0
  success: text-success
  error:   text-error
  info:    text-info
  loading: text-primary-500 animate-spin
Title:     text-sm font-medium text-foreground
Desc:      text-xs text-foreground-secondary mt-0.5
Close:     h-4 w-4 text-foreground-tertiary hover:text-foreground ml-auto
Position:  bottom-right, gap-2 between stacked toasts
Duration:  4000ms default, 6000ms for errors, infinite for loading
```

#### `Alert`
```
Container: rounded-lg px-4 py-3 flex items-start gap-3 border
  info:    bg-info-light border-info/20 text-info-foreground
  success: bg-success-light border-success/20 text-success-foreground
  warning: bg-warning-light border-warning/20 text-warning-foreground
  error:   bg-error-light border-error/20 text-error-foreground
Icon:      h-4 w-4 mt-0.5 shrink-0
Title:     text-sm font-medium
Desc:      text-xs mt-0.5 opacity-90
```

#### `Skeleton`
```
Base:       rounded-md bg-background-muted animate-shimmer
            background: linear-gradient(90deg, hsl(var(--background-muted)) 25%,
                        hsl(var(--background-subtle)) 50%,
                        hsl(var(--background-muted)) 75%)
            background-size: 200% 100%
Variants:
  text:     h-4 w-full (single line)
  title:    h-7 w-48
  avatar:   h-10 w-10 rounded-full
  card:     h-32 w-full rounded-xl
  table:    h-12 w-full (per row, 5 rows)
  chart:    h-64 w-full rounded-xl
```

#### `EmptyState`
```
Container: py-16 px-4 flex flex-col items-center text-center
Icon:      h-12 w-12 text-foreground-tertiary/50 mb-4
Title:     text-lg font-semibold text-foreground
Desc:      text-sm text-foreground-secondary mt-1 max-w-sm
Action:    mt-4 (Button component, primary or secondary)
```

#### `NotificationBell`
```
Bell icon: h-5 w-5 text-foreground-secondary hover:text-foreground cursor-pointer
           relative transition-colors
Badge:     absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-error text-white
           text-2xs font-bold flex items-center justify-center px-1
           animate-scale-in (on new notification)
Dropdown:  w-80 max-h-96 overflow-y-auto bg-background-elevated border border-border
           rounded-xl shadow-xl p-0
Item:      px-4 py-3 border-b border-border-subtle hover:bg-background-subtle
           cursor-pointer transition-colors
  unread:  bg-primary-50/50 dark:bg-primary-950/20
  title:   text-sm font-medium text-foreground
  desc:    text-xs text-foreground-secondary mt-0.5
  time:    text-2xs text-foreground-tertiary mt-1
Footer:    px-4 py-2 text-center text-xs text-primary-500 hover:text-primary-600
           border-t border-border cursor-pointer
```

### 5.5 Form Components

#### `FormField`
```
Container: space-y-1.5
Label:     text-sm font-medium text-foreground flex items-center gap-1
Required:  text-error text-xs "*" after label
Error:     text-xs text-error mt-1 flex items-center gap-1 (AlertCircle icon)
Hint:      text-xs text-foreground-tertiary mt-1
```

#### `FormFileUpload`
```
Dropzone:  border-2 border-dashed border-border rounded-lg p-8
           flex flex-col items-center justify-center gap-2
           hover:border-primary-500 hover:bg-primary-50/30
           transition-all duration-200 cursor-pointer
  active:  border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/20
Icon:      h-8 w-8 text-foreground-tertiary
Text:      text-sm text-foreground-secondary
  bold:    text-primary-500 font-medium ("Click to upload")
Hint:      text-xs text-foreground-tertiary ("PNG, JPG up to 5MB")
Preview:   mt-3 relative h-20 w-20 rounded-lg overflow-hidden border border-border
Remove:    absolute -top-1 -right-1 h-5 w-5 rounded-full bg-error text-white
           flex items-center justify-center text-xs cursor-pointer
Progress:  h-1 w-full bg-background-muted rounded-full mt-2 overflow-hidden
  bar:     h-full bg-primary-500 transition-all duration-300
```

### 5.6 Chart Components

#### `ChartCard`
```
Container: bg-background-elevated border border-border rounded-xl p-5
Header:    flex items-center justify-between mb-4
Title:     text-sm font-semibold text-foreground
Subtitle:  text-xs text-foreground-secondary
Controls:  flex items-center gap-1 (period selector buttons: 7d/30d/90d/1y)
  active:  bg-primary-50 text-primary-700 rounded-md px-2 py-1 text-xs font-medium
Body:      h-64 (default chart height)
Loading:   Skeleton variant="chart"
Empty:     "No data for this period" centered, text-foreground-tertiary text-sm
```

#### Recharts global style overrides
```
Grid lines:    stroke: hsl(var(--border-subtle)), strokeDasharray: "4 4"
Axis labels:   fill: hsl(var(--foreground-tertiary)), fontSize: 11, fontFamily: Inter
Tooltip:       bg: hsl(var(--background-elevated)), border: 1px solid hsl(var(--border)),
               borderRadius: 8, boxShadow: lg, padding: 12, fontSize: 12
Tooltip label: fontWeight: 600, color: hsl(var(--foreground))
Tooltip value: color: hsl(var(--foreground-secondary))
Line stroke:   strokeWidth: 2, dot: false (show on hover only)
Area fill:     opacity: 0.1, gradient from primary-500 to transparent
Bar fill:      radius: [4, 4, 0, 0], maxBarSize: 40
Pie:           innerRadius: 60, outerRadius: 90, paddingAngle: 2, strokeWidth: 0
Legend:        fontSize: 12, iconType: "circle", iconSize: 8
```

---

## 6. Animation Guidelines (Framer Motion)

### 6.1 Philosophy
Animations should be **functional, not decorative**. They communicate state changes, guide attention, and provide spatial context. Never animate for the sake of delight alone — this is a business tool.

### 6.2 Timing tokens

| Duration | Use case |
|---|---|
| 100ms | Hover state color changes, focus rings |
| 150ms | Button press, scale-in for dropdowns |
| 200ms | Fade-in for toasts, sidebar collapse |
| 250ms | Sheet slide-in, dialog scale-in |
| 300ms | Page transitions, card fade-in-up |
| 500ms | Chart data transitions (Recharts built-in) |

### 6.3 Easing curves

| Name | CSS value | Use case |
|---|---|---|
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Elements entering (fast start, gentle stop) |
| `ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Elements leaving (gentle start, fast stop) |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetric transitions (sidebar, theme) |
| `spring` | `type: "spring", stiffness: 400, damping: 30` | Playful micro-interactions (badge pop, toggle) |

### 6.4 Where animations are used (and where they are NOT)

| Element | Animation | Type |
|---|---|---|
| Page transition | `fade-in-up 300ms ease-out` | Framer Motion `AnimatePresence` |
| Dialog open | `scale-in 150ms ease-out` | CSS animation (via Radix) |
| Sheet open | `slide-in-right 250ms ease-out` | CSS animation (via Radix) |
| Toast appear | `fade-in-up 200ms ease-out` | Sonner built-in |
| Dropdown open | `scale-in 150ms ease-out` + `opacity` | CSS animation (via Radix) |
| Sidebar collapse | `width 200ms ease-in-out` | CSS transition |
| Kanban card drag | spring physics | dnd-kit built-in |
| Badge count change | `scale 1 → 1.2 → 1` spring | Framer Motion |
| Stat card value change | number counter animation | Framer Motion `useSpring` |
| Chart data update | Recharts `isAnimationActive` | Recharts built-in 500ms |
| Skeleton loading | `shimmer 1.5s linear infinite` | CSS animation |
| Button hover | `shadow-sm → shadow-md 150ms` | CSS transition |
| **Table row hover** | **color only, 100ms** | **CSS transition, NO movement** |
| **Form validation** | **none** | **instant color change, no shake** |
| **Page scroll** | **none** | **no parallax, no scroll-triggered** |

### 6.5 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Respects OS-level accessibility settings. All Framer Motion animations also check `useReducedMotion()` hook and skip to final state.

---

## 7. Iconography

### 7.1 Library: Lucide React

All icons from `lucide-react`. Consistent 24x24 viewBox, 2px stroke, round linecap/linejoin.

### 7.2 Sizing convention

| Context | Size | Tailwind |
|---|---|---|
| Inline with text (xs) | 12px | `h-3 w-3` |
| Inline with text (sm) | 14px | `h-3.5 w-3.5` |
| Buttons, nav items | 16px | `h-4 w-4` |
| Card icons, stat cards | 20px | `h-5 w-5` |
| Section headers | 24px | `h-6 w-6` |
| Empty states, hero | 48px | `h-12 w-12` |

### 7.3 Color convention

Icons inherit text color via `currentColor` — no explicit color props. They take on the color of their parent element's `text-*` class.

### 7.4 Key icon mappings

| Concept | Icon |
|---|---|
| Dashboard | `LayoutDashboard` |
| Apps | `Boxes` |
| Testimonials | `MessageSquare` |
| Forms | `FileText` |
| Widgets | `Layout` |
| Integrations | `Plug` |
| Webhooks | `Webhook` |
| Team | `Users` |
| Branding | `Palette` |
| Billing | `CreditCard` |
| Settings | `Settings` |
| AI | `Sparkles` |
| Security | `Shield` |
| Audit | `ScrollText` |
| Templates | `Layers` |
| Plans | `Crown` |
| Search | `Search` |
| Notifications | `Bell` |
| Add/Create | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Approve | `Check` |
| Reject | `X` |
| Copy | `Copy` |
| External link | `ExternalLink` |
| Upload | `Upload` |
| Download | `Download` |
| Filter | `Filter` |
| Sort | `ArrowUpDown` |
| Chevron | `ChevronDown` / `ChevronRight` |
| Star (filled) | `Star` (fill="currentColor") |
| Star (empty) | `Star` |
| Warning | `AlertTriangle` |
| Error | `AlertCircle` |
| Success | `CheckCircle2` |
| Info | `Info` |
| Loading | `Loader2` (with `animate-spin`) |

---

## 8. Dark Mode — Component-Level Specifications

Dark mode is handled entirely via CSS variables (§2) and Tailwind `dark:` variants. Here are the key component-level adjustments beyond the variable swap:

| Component | Light-specific | Dark-specific |
|---|---|---|
| Cards | `bg-white border-slate-200` | `bg-slate-900 border-slate-800` |
| Inputs | `bg-white border-slate-200` | `bg-slate-900/50 border-slate-700` |
| Sidebar | `bg-white border-slate-200` | `bg-slate-950 border-slate-800` |
| Topbar | `bg-white/80 backdrop-blur` | `bg-slate-950/80 backdrop-blur` |
| Dialog overlay | `bg-black/50` | `bg-black/70` |
| Code block | `bg-slate-950` (same in both) | `bg-slate-950` (no change needed) |
| Success badge | `bg-green-50 text-green-800` | `bg-green-950/30 text-green-400` |
| Error badge | `bg-red-50 text-red-800` | `bg-red-950/30 text-red-400` |
| Warning badge | `bg-amber-50 text-amber-800` | `bg-amber-950/30 text-amber-400` |
| Table hover | `hover:bg-slate-50` | `hover:bg-slate-800/50` |
| Skeleton | `bg-slate-100` | `bg-slate-800` |
| Shadows | `shadow-sm` (visible) | `shadow-sm` (barely visible, rely on borders instead) |
| Charts grid | `stroke: slate-200` | `stroke: slate-800` |
| Chart tooltip | `bg-white border-slate-200` | `bg-slate-900 border-slate-700` |

**Key principle for dark mode:** reduce shadow reliance and increase border reliance. Shadows are invisible on dark backgrounds; borders provide the necessary depth separation.

---

## 9. White-Label Theming Engine

This is the system that lets each tenant's dashboard and public widgets reflect their own brand identity.

### 9.1 How it works

```
1. Tenant sets brandColor in dashboard (e.g., "#FF5733")
2. Backend stores it: tenants/{id}.brandColor = "#FF5733"
3. On dashboard load, GET /v1/dashboard/tenant returns brandColor
4. ThemeProvider converts hex → HSL → generates full 50-950 palette
5. Palette is injected as CSS variables on <html> via style attribute
6. All components already use var(--primary-*) → they instantly re-theme
```

### 9.2 Color palette generation

```typescript
// packages/ui/lib/theme-engine.ts
import { hexToHsl, generatePalette } from 'color2k'; // or custom implementation

export function applyTenantTheme(brandColorHex: string) {
  const hsl = hexToHsl(brandColorHex);
  const palette = generatePalette(hsl); // generates 50-950 shades

  const root = document.documentElement;
  Object.entries(palette).forEach(([shade, hslValue]) => {
    root.style.setProperty(`--primary-${shade}`, hslValue);
  });
}

export function clearTenantTheme() {
  const root = document.documentElement;
  for (let i = 50; i <= 950; i += 50) {
    root.style.removeProperty(`--primary-${i}`);
  }
  root.style.removeProperty('--primary-950');
}
```

### 9.3 Palette generation algorithm

Given a single hex color (e.g., `#FF5733`):

```
1. Convert to HSL: hsl(11, 100%, 60%)
2. Generate 11 shades (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950):
   - 50:  H, S*0.3, 97%     (very light tint)
   - 100: H, S*0.5, 94%
   - 200: H, S*0.7, 89%
   - 300: H, S*0.85, 82%
   - 400: H, S*0.95, 74%
   - 500: H, S, L            (the original color)
   - 600: H, S*0.9, L*0.88
   - 700: H, S*0.8, L*0.75
   - 800: H, S*0.7, L*0.60
   - 900: H, S*0.6, L*0.45
   - 950: H, S*0.5, L*0.25
3. Clamp all saturation values to [10%, 100%] and lightness to [5%, 98%]
4. Return as HSL strings: "11 100% 97%", "11 100% 94%", etc.
```

This produces a harmonious 11-shade palette from a single input color, matching the structure of Tailwind's built-in color scales.

### 9.4 Integration points

```typescript
// apps/tenant-dashboard/app/(dashboard)/layout.tsx
function DashboardLayout({ children }) {
  const { data: tenant } = useTenant();

  useEffect(() => {
    if (tenant?.brandColor) {
      applyTenantTheme(tenant.brandColor);
    }
    return () => clearTenantTheme();
  }, [tenant?.brandColor]);

  return ( /* ... */ );
}
```

```typescript
// apps/public-forms/app/[tenantSlug]/[formSlug]/layout.tsx
// Server-side: inject brand color into SSR HTML
export default async function FormLayout({ params, children }) {
  const form = await fetchForm(params.formSlug);
  const brandColor = form.tenantBranding.brandColor;
  const palette = generatePaletteServerSide(brandColor);

  return (
    <html style={paletteToStyleObject(palette)}>
      <body>{children}</body>
    </html>
  );
}
```

### 9.5 Widget theming

The embeddable widget (`widget.js`) also supports theming:

```html
<script src="https://cdn.testimonialapi.dev/widget.js"
        data-app="app_xxx"
        data-widget="wdg_xxx"
        data-theme-color="#FF5733"    <!-- optional override -->
        async></script>
```

The widget runtime reads `data-theme-color` (or falls back to the widget's `styleOverrides.primaryColor` from the API response), generates the palette, and injects it into the Shadow DOM root — completely isolated from the host page's CSS.

### 9.6 Logo injection

```tsx
// Sidebar logo area
{tenant?.logoUrl ? (
  <img src={tenant.logoUrl} alt={tenant.name} className="h-7 w-auto object-contain" />
) : (
  <div className="h-7 w-7 rounded-md bg-primary-500 flex items-center justify-center
                  text-white font-bold text-sm">
    {tenant?.name?.charAt(0).toUpperCase()}
  </div>
)}
```

---

## 10. Dashboard-Specific Visual Patterns

### 10.1 Overview page layout

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: "Overview"                          [period ▾] │
├────────┬────────┬────────┬──────────────────────────────────┤
│StatCard│StatCard│StatCard│StatCard                          │
│Total   │Pending │Avg     │Apps                              │
│  89    │  7     │ 4.6 ★  │  3                              │
├────────┴────────┴────────┴──────────────────────────────────┤
│ Testimonials Over Time (LineChart, 2/3 width) │ Source (Pie)│
│                                               │  (1/3)      │
├───────────────────────────────────────────────┴─────────────┤
│ Rating Distribution (BarChart, 1/2) │ Pending CTA Card (1/2)│
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Testimonials page layout (table mode)

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: "Testimonials"     [+ Add] [Import CSV] [▾ View]│
├─────────────────────────────────────────────────────────────┤
│ [Status ▾] [Tags ▾] [Rating ▾] [Source ▾]  [🔍 Search...] │
├─────┬──────────┬───────────────┬──────┬────────┬─────┬─────┤
│  ☐  │ Author   │ Message       │ ★    │ Status │ Src │ ... │
├─────┼──────────┼───────────────┼──────┼────────┼─────┼─────┤
│  ☐  │ 👤 Ada   │ "This tool..."│ ★★★★★│ ● Appr │ 📝  │ ⋯  │
│  ☐  │ 👤 Ben   │ "Amazing..." │ ★★★★ │ ● Pend │ 🐦  │ ⋯  │
│  ☐  │ 👤 Cara  │ "Saved us..."│ ★★★★★│ ● Appr │ 🔗  │ ⋯  │
├─────┴──────────┴───────────────┴──────┴────────┴─────┴─────┤
│ [Bulk: 2 selected → Approve | Reject | Tag]                │
├─────────────────────────────────────────────────────────────┤
│ ← 1 2 3 ... 8 →          20 per page     142 total         │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Testimonials page layout (kanban mode)

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Pending (7)  │ Approved (78)│ Rejected (3) │ Archived (1) │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │👤 Ada    │ │ │👤 Ben    │ │ │👤 Spam   │ │ │👤 Old    │ │
│ │★★★★★    │ │ │★★★★     │ │ │★        │ │ │★★★      │ │
│ │"Amazing..│ │ │"Great... │ │ │"Buy now..│ │ │"Was ok.. │ │
│ │ 📝 Form  │ │ │ 🐦 Twit  │ │ │ 📝 Form  │ │ │ 🔗 API   │ │
│ │[✓][✗]    │ │ │[📦]      │ │ │[↩]      │ │ │[↩]      │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │
│ ┌──────────┐ │ ┌──────────┐ │              │              │
│ │ ...      │ │ │ ...      │ │              │              │
│ └──────────┘ │ └──────────┘ │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### 10.4 Widget builder layout

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: "Edit Widget: Homepage Carousel"  [Save] [Pub]  │
├─────────────────────────┬───────────────────────────────────┤
│ Config Panel (w-80)     │ Preview Pane (flex-1)             │
│ ┌─────────────────────┐ │ ┌───────────────────────────────┐ │
│ │ Template: Carousel  │ │ │                               │ │
│ │                     │ │ │  ┌─────┐ ┌─────┐ ┌─────┐     │ │
│ │ Filters             │ │ │  │ 👤  │ │ 👤  │ │ 👤  │     │ │
│ │  Tags: [onboarding] │ │ │  │ ★★★★★│ │ ★★★★ │ │ ★★★★★│     │ │
│ │  Min Rating: 4  ━━  │ │ │  │"This│ │"Grea│ │"Amaz│     │ │
│ │  Featured: [✓]      │ │ │  │ tool│ │ t pr│ │ ing"│     │ │
│ │  Limit: 10      ━━  │ │ │  └─────┘ └─────┘ └─────┘     │ │
│ │                     │ │ │         ← →                    │ │
│ │ Style               │ │ │                               │ │
│ │  Color: [■ #4F46E5] │ │ └───────────────────────────────┘ │
│ │  Show Rating: [✓]   │ │                                   │ │
│ │  Show Avatar: [✓]   │ │ Embed Code:                       │ │
│ │  Autoplay: 4s   ━━  │ │ [Script] [iframe] [React]  [Copy] │ │
│ └─────────────────────┘ │                                   │ │
└─────────────────────────┴───────────────────────────────────┘
```

---

## 11. Responsive Breakpoints

| Breakpoint | Width | Layout changes |
|---|---|---|
| `sm` | 640px | Stack stat cards 2×2, hide table columns |
| `md` | 768px | Sidebar collapses to icon-only, stat cards 2×2 |
| `lg` | 1024px | Full sidebar, stat cards 4×1, 3-col widget grid |
| `xl` | 1280px | Max content width reached, extra whitespace |
| `2xl` | 1536px | No further changes, content stays at `max-w-7xl` |

Mobile (< 640px): sidebar becomes a slide-over Sheet triggered by hamburger menu. Tables become scrollable horizontally. Stat cards stack 1×4. Kanban becomes a single-column scrollable list.

---

## 12. Print Styles

```css
@media print {
  .sidebar, .topbar, .impersonation-banner, .notification-bell { display: none !important; }
  .main-content { margin: 0 !important; padding: 0 !important; }
  .card { break-inside: avoid; box-shadow: none !important; border: 1px solid #ddd !important; }
  body { color: #000 !important; background: #fff !important; }
}
```

---

# ✅ DOC 5 — REQUIREMENTS CHECKLIST & DEFINITION OF DONE

## A. Theme Configuration Checks

- [ ] `tailwind.config.ts` exists in `packages/config/` and is imported by all three Next.js apps — verified by checking that custom colors (e.g., `bg-primary-500`, `text-foreground-secondary`) compile without errors in all apps
- [ ] `globals.css` contains the full CSS variable set for both `:root` (light) and `.dark` (dark) — verified by inspecting computed styles in browser DevTools
- [ ] All 11 primary shades (50–950) are defined as CSS variables in both light and dark mode — verified
- [ ] All semantic status colors (success, warning, error, info) are defined with DEFAULT, light, dark, and foreground variants — verified
- [ ] Chart palette contains 6 distinct colors that pass the Coblis colorblind simulator (deuteranopia, protanopia, tritanopia) — verified by screenshotting a pie chart with all 6 colors and running it through the simulator
- [ ] Font loading uses `display: 'swap'` and fonts render correctly within 500ms of page load — verified via Lighthouse "Avoid invisible text during font load" audit

## B. Component Styling Checks

- [ ] Every component listed in Doc 4 §6 has visual styling matching the specifications in §5 of this document — verified by rendering each component in Storybook and comparing against the spec
- [ ] `Button` renders correctly in all 5 variants (primary, secondary, ghost, destructive, link) × 4 sizes (sm, md, lg, xl) × 3 states (default, loading, disabled) = 60 combinations — all visible in Storybook
- [ ] `Input` shows correct focus ring (2px primary-500/20), error state (red border + red ring), and disabled state (muted bg) — verified
- [ ] `Dialog` overlay has backdrop blur and correct z-index layering (modal above overlay above content) — verified by opening a dialog over a scrolled page
- [ ] `DataTable` header is uppercase, tracking-wide, tertiary color; rows have hover highlight; selected rows have primary tint — verified
- [ ] `Badge` renders correctly in all 6 variants with correct light/dark mode

---


---

<!-- Doc 5 continuation (checklist §B remainder → §M Sign-Off Gate), delivered in
     chat on 2026-09-08 after the earlier next.md pull (SHA 1df22bae…, which was
     truncated mid-§B). Appended verbatim; the earlier partial "Badge" item above
     is superseded by the full item below. -->

# DOC 5 — REQUIREMENTS CHECKLIST (continued)

## B. Component Styling Checks (continued)

- [ ] `Badge` renders correctly in all 6 variants (success, warning, error, info, neutral, primary) with correct light/dark mode color mappings — verified in both themes
- [ ] `Avatar` renders correctly in all 5 sizes (xs through xl), with image, with initials fallback, and with the 2px background-colored ring — verified
- [ ] `Tabs` underline/active state uses `bg-background-elevated` + `shadow-xs` pill style (not a bottom border line) — verified matching §5.1 spec
- [ ] `Switch` thumb translates smoothly with `duration-200` and track color transitions between muted (off) and primary-500 (on) — verified
- [ ] `Select` dropdown width matches trigger width (`--radix-select-trigger-width`), options have hover highlight and checked state — verified
- [ ] `Toast` appears bottom-right, stacks correctly with `gap-2`, auto-dismisses at 4s (6s for errors), and shows correct icon color per variant — verified
- [ ] `Skeleton` shimmer animation runs at 1.5s linear infinite with the correct gradient (muted → subtle → muted) — verified
- [ ] `EmptyState` renders centered with 16px vertical padding, muted icon, and optional action button — verified on testimonials list with zero items
- [ ] `CodeBlock` renders with dark background (`bg-slate-950`) in both light and dark mode (no change needed), syntax highlighting colors match §5.3 spec — verified with script, iframe, and React embed code snippets
- [ ] `ColorPicker` opens a popover with saturation panel, hue slider, hex input, and 6 preset swatches — verified
- [ ] `ChartCard` renders with title, subtitle, period selector buttons, and 256px chart height — verified for all 4 chart types (Line, Area, Bar, Pie)
- [ ] `StatCard` shows icon in a primary-tinted rounded box, large bold value, and trend indicator with correct color (green up, red down, gray neutral) — verified
- [ ] `NotificationBell` shows unread count badge with `animate-scale-in`, dropdown lists items with unread highlight, and "Mark all read" footer — verified
- [ ] `FormFileUpload` dropzone shows dashed border, hover state (primary tint), drag-active state (primary ring), file preview with remove button, and upload progress bar — verified
- [ ] `ImpersonationBanner` renders as a sticky yellow bar below the topbar with warning icon, tenant name, and exit button — verified

## C. Dark Mode Checks

- [ ] Toggling between light and dark mode via the theme switcher in the user menu correctly applies the `.dark` class to `<html>` and all CSS variables update — verified
- [ ] Cards, inputs, sidebar, topbar, dialogs, badges, tables, skeletons, and chart tooltips all render correctly in dark mode with no white-on-white or black-on-black contrast failures — verified by full-page screenshot comparison
- [ ] Dark mode shadows are reduced and borders are more prominent (per §8 principle) — verified that card separation is clear in dark mode despite near-invisible shadows
- [ ] Status badges maintain readable contrast in dark mode (using the `dark:bg-*-dark/30 dark:text-*` pattern from §5.1) — verified for all 4 status colors
- [ ] Code block appearance is identical in both modes (always dark background) — verified
- [ ] `prefers-color-scheme: dark` OS setting is respected when theme is set to "system" — verified by toggling OS dark mode
- [ ] No flash of wrong theme on page load (FOUC) — verified by checking that `next-themes` script runs before paint (suppressHydrationWarning on `<html>`, inline theme script in `<head>`)

## D. White-Label Theming Checks

- [ ] `applyTenantTheme("#FF5733")` correctly generates an 11-shade palette and injects CSS variables — verified by inspecting computed styles on `<html>` after calling the function
- [ ] Changing a tenant's `brandColor` in the branding settings page immediately re-themes the entire dashboard (sidebar active state, primary buttons, focus rings, chart accent, badges) without page reload — verified
- [ ] The generated palette from an arbitrary hex color produces visually harmonious shades (no muddy mid-tones, no neon extremes) — verified by testing with 10 diverse input colors: red, orange, yellow, green, teal, blue, indigo, purple, pink, and a near-gray
- [ ] `clearTenantTheme()` removes all injected CSS variables and the dashboard reverts to the default indigo palette — verified
- [ ] Public form pages render with the tenant's brand color applied server-side (SSR) — verified by viewing the page source and confirming the `style` attribute on `<html>` contains the generated palette
- [ ] Widget embed (`widget.js`) applies the theme color from `data-theme-color` attribute inside its Shadow DOM without leaking styles to or from the host page — verified by embedding a widget on a page with conflicting CSS
- [ ] Tenant logo renders correctly in the sidebar (image if `logoUrl` exists, initial letter fallback if not) and in public forms — verified
- [ ] Extreme brand colors (near-white `#FFFFF0`, near-black `#1A1A1A`, fully saturated `#FF0000`) do not break contrast ratios or produce unreadable text — verified by running the palette generator on each and checking that `primary-500` text on white and `primary-50` text on `primary-900` both pass WCAG AA

## E. Typography Checks

- [ ] Inter font loads and applies to all body text, headings, and UI elements — verified via DevTools Computed tab
- [ ] JetBrains Mono font loads and applies to all code blocks, API key displays, embed snippets, and JSON viewers — verified
- [ ] Heading hierarchy (H1–H5) is visually distinct and follows the size/weight spec from §3.1 — verified by rendering all 5 levels on a single test page
- [ ] Body text variants (large, default, secondary, tertiary) are distinguishable by size and color — verified
- [ ] Font sizes never drop below 10px (`text-2xs`) for any readable content — verified by searching the codebase for any `text-[8px]` or smaller
- [ ] Line heights follow the spec (headings: tight, body: relaxed) — verified

## F. Spacing & Layout Checks

- [ ] Sidebar is 256px expanded, 64px collapsed, with smooth 200ms transition — verified by measuring in DevTools
- [ ] Topbar is 52px (`h-13`) and sticky — verified by scrolling a long page
- [ ] Content area has 24px padding and max-width 1280px centered — verified
- [ ] Card grids are responsive: 1 col mobile, 2 col tablet, 3–4 col desktop — verified by resizing browser
- [ ] Form fields have 16px gap, labels have 6px gap to inputs — verified
- [ ] Table cells have 16px horizontal, 12px vertical padding — verified

## G. Animation Checks

- [ ] Page transitions use `fade-in-up 300ms ease-out` — verified by navigating between pages and observing the content entrance
- [ ] Dialog open uses `scale-in 150ms` — verified
- [ ] Sheet slide-in uses `slide-in-right 250ms` — verified
- [ ] Toast entrance uses `fade-in-up 200ms` — verified
- [ ] Sidebar collapse/expand animates width over 200ms — verified
- [ ] Badge count change pops with spring animation — verified by approving a testimonial and watching the pending count badge
- [ ] No animation causes layout shift (CLS = 0 for animated elements) — verified via Lighthouse
- [ ] `prefers-reduced-motion: reduce` disables all animations — verified by enabling the OS setting and confirming all transitions snap to final state instantly
- [ ] No gratuitous animations: table rows do not animate on hover (color only), form validation does not shake, page scroll has no parallax — verified

## H. Iconography Checks

- [ ] All icons are from `lucide-react` — verified by searching imports for any other icon library
- [ ] Icon sizes follow the convention: 16px in buttons/nav, 20px in cards, 24px in headers, 48px in empty states — verified
- [ ] Icons use `currentColor` (no explicit color props) — verified by searching for `color=` props on Lucide components
- [ ] All icon mappings from §7.4 are used consistently (e.g., `MessageSquare` for testimonials everywhere, not `MessageCircle` in some places) — verified

## I. Responsive Checks

- [ ] At 375px (iPhone SE): sidebar is a Sheet overlay, stat cards stack 1×4, tables scroll horizontally, kanban is single-column — verified
- [ ] At 768px (iPad): sidebar collapses to icon-only, stat cards 2×2, 2-col widget grid — verified
- [ ] At 1024px (laptop): full sidebar, 4-col stat cards, 3-col widget grid — verified
- [ ] At 1440px+ (desktop): content capped at `max-w-7xl`, no stretching — verified
- [ ] Touch targets are minimum 44×44px on mobile — verified by inspecting button and link tap areas

## J. Accessibility Checks (visual layer)

- [ ] All text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text) in both light and dark mode — verified using the WebAIM Contrast Checker on all foreground/background combinations from the CSS variables
- [ ] Focus indicators are visible on all interactive elements (2px ring, primary color, 2px offset) — verified by tabbing through every page
- [ ] Status badges are not color-only — they include a dot icon AND text label, so colorblind users can distinguish pending/approved/rejected — verified
- [ ] Chart colors are distinguishable in all three colorblind simulation modes — verified via Coblis
- [ ] Error states use icon + text + color (not color alone) — verified on form validation errors
- [ ] Reduced motion preference is respected — verified (same as §G)

## K. Performance Checks (visual layer)

- [ ] Total CSS bundle (Tailwind purged) is <50KB gzipped — verified via `next build` output
- [ ] No unused CSS classes in production build — verified via PurgeCSS/`content` config in `tailwind.config.ts`
- [ ] Font files are subset to Latin only and use `display: swap` — verified via network tab (Inter Latin ~20KB, JetBrains Mono Latin ~15KB)
- [ ] No layout shift caused by font loading (CLS contribution from fonts = 0) — verified via Lighthouse
- [ ] Animations use `transform` and `opacity` only (GPU-composited, no layout/paint triggers) — verified by inspecting keyframe definitions in §1.1

## L. Documentation Artifacts

- [ ] Storybook (or equivalent) deployed with all components from §5 rendered in all variants, all sizes, and both light/dark modes — accessible at `storybook.testimonialapi.dev`
- [ ] Design tokens documented in a `DESIGN_TOKENS.md` file listing every CSS variable, its light value, its dark value, and its usage context
- [ ] Color palette generator tested and documented with example outputs for 10 diverse input colors
- [ ] Figma (or equivalent) design file exists with all dashboard pages, matching the visual specs in §10 — linked in the repo README

## M. Sign-Off Gate

Doc 5 is only complete when:

1. A designer reviews the live staging deployment of both dashboards in light and dark mode and confirms the visual output matches the intent described in this document — no "it looks off" feedback unresolved.
2. A QA tester runs through every component in Storybook in both themes and confirms no visual regressions, no broken variants, no missing states.
3. Lighthouse Accessibility score ≥95 on all dashboard pages and public form pages, in both light and dark mode.
4. The white-label theming engine is tested with 10 diverse brand colors and produces visually acceptable results in every case — no broken contrast, no muddy palettes, no unreadable text.
5. CI is green on: Tailwind build (no warnings), Storybook build, Lighthouse CI (performance + accessibility thresholds), and visual regression tests (Chromatic or Percy) comparing against approved baselines.
6. This checklist is fully checked and attached to the milestone PR.

**A component that looks correct in light mode but breaks in dark mode is not considered done. Both themes are first-class, not afterthoughts.**

## Progress log (dated evidence, newest last)
### 2026-09-08 (later) — Single-website consolidation (see docs/04 progress log)
Doc-5 theme evidence now lives in **one app**: `apps/web` — single `tailwind.config.js`,
`postcss.config.js`, `app/globals.css` (byte-identical copies were merged), single root layout with
`next/font` Inter/JetBrains Mono + ThemeProviders, tenant brand-color shell at `apps/web/app/app/layout.tsx`
(`/app/*`). `scripts/check-doc5.ts` re-targeted → **123/0** (was 214/0 across three apps; per-app rows
collapsed to one app, zero failures). Component inventory/class pass in `packages/ui` unchanged.
### 2026-09-08 — §A theme-foundation slice (user pick: "Build Doc-5 §A now")
**Gate numbers:** `scripts/check-doc5.ts` → **214/0** · `turbo run typecheck` 10/10 · `turbo run test` 9 tasks green (incl. ui theme-engine unit suite 10/10) · Tailwind CLI compile gate on all three apps (custom classes + dark variants emit from real sources) · check-doc1 167/0 · check-doc2 87/0 · check-doc4 189/0 (no regressions).

**Landed:**
- `packages/config/tailwind/preset.cjs` — Doc 5 §1 theme verbatim (CSS-var color tokens incl. 11 primary shades + semantic success/warning/error/info with DEFAULT/light/dark/foreground + chart 1–6, Inter/JetBrains Mono, full type/spacing/shadow/keyframes/z-index scale, `tailwindcss-animate` + `@tailwindcss/typography` plugins, `darkMode:'class'`); `packages/config/tailwind.config.ts` typed entry (DoD A1 file). Deps installed (tailwindcss v3, postcss, autoprefixer, plugins, next-themes, lucide-react).
- Each app: `tailwind.config.js` (presets: shared; content incl. `packages/ui/src`), `postcss.config.js`, `globals.css` — Doc 5 §2 token set verbatim for `:root` + `.dark` (all 11 primary shades in both modes), §6.5 reduced-motion block, §12 print styles.
- Root layouts (3 apps): `next/font` Inter + JetBrains Mono with `display:'swap'` + `--font-*` variables on `<html>`; tenant/platform mount `ThemeProviders` (next-themes → `.dark` on `<html>`). New `packages/ui/src/components/providers.tsx` `ThemeProviders`; `packages/ui/src/hooks/use-theme.ts` per §2.2.
- `packages/ui/src/lib/theme-engine.ts` — §9 engine (custom hex→HSL + 11-shade generator, no color2k dep): `hexToRgb/hexToHsl/generatePalette/applyTenantTheme/clearTenantTheme/paletteToStyleObject`; unit-tested `packages/ui/test/theme-engine.test.ts` (10 tests: canonical shades, 500 round-trip `#FF5733`→`11 100% 60%`, strict lightness descent, saturation clamps [10,100], SSR style objects, browser-guard no-ops). Tenant `(dashboard)` layout applies `brandColor` from `/me` + cleanup (→§9.4 dashboard path).
- §5 class pass: component generator regenerated the full inventory — **63 files** now carry the doc's exact Tailwind classes (Button 5 variants × sm/md/lg/xl × loading/disabled, Input/Textarea focus+error+disabled, Dialog/Sheet overlay blur + z-layers + slide/scale keyframes, Badge 6 tones, Avatar sizes, Switch thumb translate, Tabs active state, Sidebar `w-64`/`w-16` + active SidebarItem, Topbar `h-13`, PageHeader, StatCard trend arrows, DataTable uppercase header/hover/selection + 5-row skeleton loading, StatusBadge/SourceBadge maps, RatingStars, Alert, Skeleton `animate-shimmer`, NotificationBell, FormField, FormFileUpload, chart cards, EmptyState/LoadingState/ErrorState per spec). Catalog barrel regenerated (63 `export *` rows).

**Checklist status (doc's own letters, verbatim checklist untouched above):**
- §A.1 ✅ in-sandbox via Tailwind CLI compile of all three apps (custom colors compile without errors). Final "compiles inside `next build`" evidence stays under the §J/browser gate.
- §A.2 ✅ file-level (full `:root` + `.dark` var set present in each app's globals.css); DevTools computed-style inspection ⬜ browser.
- §A.3 ✅ both modes, all 11 shades (checked per app). §A.4 ✅ DEFAULT/light/dark/foreground variants each defined.
- §A.5 ⬜ Coblis colorblind screenshot (browser). §A.6 ⬜ Lighthouse font audit (next/font `display:'swap'` wiring ✅ structural).
- §B items ⬜ Storybook/browser; class specs present across the 63-file inventory (structural evidence in check-doc5 §5 group).
- DoD letter sections after §B are **not in the pushed next.md yet** (file truncated at §B's Badge item, SHA 1df22bae…) — checklist resumption + sign-off gate wait for the remainder.

**Deferred to later slices (noted, not silently dropped):** §7 iconography pass (lucide wiring inside components), §6.4 Framer Motion + Sonner/Recharts runtime wiring, §9.5 widget Shadow-DOM theming + §9.6 logo injection (widget-runtime), §9.4 public-forms SSR branding — blocked on route reconciliation (Doc-5 `[tenantSlug]/[formSlug]` vs Doc-4 `app/forms/[slug]`), dashboard shell (sidebar/topbar/page patterns from §4/§10) restructure, Storybook/Playwright/Lighthouse harnesses.

**2026-09-08 (later same day) — continuation received via chat.** The remainder of the Doc-5 checklist (§B rest → §M Sign-Off Gate) was delivered in a follow-up message and spliced in verbatim above (the earlier truncated `Badge` item is superseded by the full item; provenance comment marks the splice). Doc 5's own checklist is now structurally complete: 87 checkbox items across A–L + the 6-part §M Sign-Off Gate. All boxes remain ⬜ pending browser/CI/Storybook/designer evidence; in-sandbox structural evidence stands as recorded in the 2026-09-08 §A entry above.

