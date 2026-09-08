/** Doc 4 — platform dashboard (§2.2 impersonation store). Structural skeleton; visual pass in Doc 5. */
'use client';

import { create } from 'zustand';

export interface ImpersonationState {
  isImpersonating: boolean;
  tenantId: string | null;
  tenantName: string | null;
  byStaffId: string | null;
  startImpersonation: (tenantId: string, tenantName: string, byStaffId: string) => void;
  endImpersonation: () => void;
}

/**
 * Platform-staff → tenant impersonation. When active, the dashboard shell
 * renders <ImpersonationBanner> and the API client attaches the impersonation
 * header; ending it refetches /me (Doc 4 §B).
 */
export const useImpersonationStore = create<ImpersonationState>((set) => ({
  isImpersonating: false,
  tenantId: null,
  tenantName: null,
  byStaffId: null,
  startImpersonation: (tenantId, tenantName, byStaffId) =>
    set({ isImpersonating: true, tenantId, tenantName, byStaffId }),
  endImpersonation: () =>
    set({ isImpersonating: false, tenantId: null, tenantName: null, byStaffId: null }),
}));
