'use client';

/**
 * App root providers (Doc 4 §1 + Doc 5 §2.2):
 *  - ReactQueryProvider: QueryClient wired into api-client interceptors.
 *  - ThemeProviders: next-themes — toggles `.dark` on <html>.
 */
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { setApiQueryClient } from '../lib/api-client';

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  // Interceptor needs the client for PERM_STALE /me refetch.
  setApiQueryClient(queryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function ThemeProviders({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
