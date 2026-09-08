/**
 * Testimonial API — single website root layout (2026-09-08 consolidation).
 * One Next.js app serves every audience: public landing + forms, the
 * tenant/company workspace (/app/*) and the platform staff console
 * (/platform/*). Shells are chosen by login role inside the /app and
 * /platform layouts; this root only provides fonts (Doc 5 §3.3), theme
 * providers (Doc 5 §2.2) and the React Query provider (Doc 4).
 */
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ReactQueryProvider, ThemeProviders } from '@testimonial-api/ui';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata = {
  title: 'Testimonial API',
  description: 'Collect, manage and display video and text testimonials.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning is required by next-themes: the client applies
    // the .dark class + color-scheme to <html> after SSR, which would
    // otherwise log a React hydration mismatch on every load.
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProviders>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </ThemeProviders>
      </body>
    </html>
  );
}
