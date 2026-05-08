"use client";

import { create } from "zustand";

type UIState = {
  /** Desktop sidebar collapsed state. Persists in-memory only for now. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;

  /** Mobile sheet (off-canvas nav) — reserved for future overflow menus. */
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (value: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),

  mobileMenuOpen: false,
  setMobileMenuOpen: (value) => set({ mobileMenuOpen: value }),
}));
