/**
 * Doc 5 §2.2 — theme hook over next-themes. The ThemeProviders component in
 * the root layout adds/removes `.dark` on <html>; components reference the
 * CSS variables via Tailwind `dark:` variants, so no JS logic is needed per
 * component for dark mode.
 */
'use client';

import { useTheme as useNextTheme } from 'next-themes';

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  return {
    theme, // 'light' | 'dark' | 'system' (user preference)
    resolvedTheme, // 'light' | 'dark' (actual applied)
    setTheme,
    isDark: resolvedTheme === 'dark',
  };
}
