"use client";

import {
  DEFAULT_TEMPLATE,
  THEME_STORAGE_KEY,
  type ThemeState,
  type ThemeTemplate,
} from "@/src/domain/types/theme";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      template: DEFAULT_TEMPLATE,
      dark: false,
      setTemplate: (template: ThemeTemplate) => set({ template }),
      setDark: (dark: boolean) => set({ dark }),
      toggleDark: () => set((state) => ({ dark: !state.dark })),
    }),
    {
      // ⚠️ ต้องตรงกับ key ที่ ThemeScript อ่านตอน first paint (กัน FOUC)
      name: THEME_STORAGE_KEY,
    }
  )
);
