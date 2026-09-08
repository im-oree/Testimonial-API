/** Tiny hook: the display name of one of the signed-in company's apps. */
import { useEffect, useState } from 'react';
import { api } from './api';
import type { AppSummary } from './types';

export function useAppName(appId: string | undefined): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!appId) {
      setName(null);
      return;
    }
    let alive = true;
    api
      .get<{ rows: AppSummary[] }>('/v1/apps?perPage=200')
      .then((d) => {
        if (alive) setName(d.rows.find((a) => a.id === appId)?.name ?? null);
      })
      .catch(() => {
        if (alive) setName(null);
      });
    return () => {
      alive = false;
    };
  }, [appId]);
  return name;
}
