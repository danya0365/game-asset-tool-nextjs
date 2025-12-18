"use client";

import { useThemeStore } from "@/src/presentation/stores/themeStore";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="ie-button ie-button-sm flex items-center gap-1"
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      {theme === "light" ? (
        <>
          <span className="text-xs">🌙</span>
          <span className="hidden sm:inline text-xs">Dark</span>
        </>
      ) : (
        <>
          <span className="text-xs">☀️</span>
          <span className="hidden sm:inline text-xs">Light</span>
        </>
      )}
    </button>
  );
}
