'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';

/** Session shape returned by POST /v1/auth/login and GET /v1/auth/me. */
export interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
    role: string; // 'owner' | 'admin' | 'editor' | 'viewer' | 'platform_staff' | ...
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    appId?: string;
    brandColor?: string | null;
  } | null;
  permissions: string[]; // effective permission codes
  permissionsVersion: number;
  impersonating?: { tenantId: string; tenantName: string; byStaffId: string } | null;
  requiresMfa?: boolean;
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await apiClient.get<MeResponse>('/v1/auth/me');
  return res.data;
}

export function useMe(): UseQueryResult<MeResponse> {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
