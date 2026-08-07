"use client";

import { useThemeStore } from "@/src/presentation/stores/themeStore";

export function ThemeToggle() {
  const dark = useThemeStore((s) => s.dark);
  const toggleDark = useThemeStore((s) => s.toggleDark);

  return (
    <button
      onClick={toggleDark}
      className="ie-button ie-button-sm flex items-center gap-1"
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {dark ? (
        <>
          <span className="text-xs">☀️</span>
          <span className="hidden sm:inline text-xs">Light</span>
        </>
      ) : (
        <>
          <span className="text-xs">🌙</span>
          <span className="hidden sm:inline text-xs">Dark</span>
        </>
      )}
    </button>
  );
}
