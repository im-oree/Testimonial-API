/** Doc 4 §7 hook pattern helpers: uniform loading/empty/error/refetch shape. */
import type { ReactNode } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { fetchMe, type MeResponse } from '../hooks/use-me';

export type Fetchable<T> = {
  data: T | undefined;
  loading: boolean;
  error: unknown;
  refetch: () => void;
};

export function loadQueryData<T>(
  enabled: boolean,
  fetch: () => Promise<T>,
  setData: (d: T) => void,
  setLoading: (b: boolean) => void,
  setError: (e: unknown) => void,
): void {
  if (!enabled) return;
  void fetch()
    .then((d) => {
      setData(d);
      setLoading(false);
    })
    .catch((e: unknown) => {
      setError(e);
      setLoading(false);
    });
}

export async function injectQueryData(
  qc: QueryClient,
  queryKey: QueryKey,
  updater: (prev: unknown) => unknown,
): Promise<void> {
  qc.setQueryData(queryKey, updater);
  await qc.invalidateQueries({ queryKey });
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string };

export type { MeResponse };
export { fetchMe };
export type { ReactNode };
