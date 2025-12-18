"use client";

import { useThemeStore } from "@/src/presentation/stores/themeStore";
import { useEffect, useState } from "react";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    }
  }, [theme, mounted]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#c0c0c0]">{children}</div>;
  }

  return <>{children}</>;
}
