/** Doc 4 — tenant dashboard (§2.1 tenant UI store — active app + shell prefs). Structural skeleton; visual pass in Doc 5. */
'use client';

import { create } from 'zustand';

interface UiState {
  activeAppId: string | null;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  setActiveApp: (appId: string) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

/**
 * Zustand store for shell state (Doc 4 §2). The active app scopes every
 * React Query key via queryKeys, so switching apps re-scopes all data views.
 */
export const useUiStore = create<UiState>((set) => ({
  activeAppId: null,
  sidebarCollapsed: false,
  theme: 'light',
  setActiveApp: (appId) => set({ activeAppId: appId }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
}));
