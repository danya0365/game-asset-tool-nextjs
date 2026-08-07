"use client";

import { useThemeStore } from "@/src/presentation/stores/themeStore";
import { useEffect } from "react";

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ซิงค์ค่าจาก store → attribute บน <html>
 *
 * ⚠️ ไม่บล็อกการ render ระหว่างรอ mount — ค่าเริ่มต้นถูก apply ไปแล้วโดย
 * ThemeScript ตั้งแต่ก่อน first paint (ดู ThemeScript.tsx) ตัวนี้แค่ตามให้ทันเวลาผู้ใช้สลับธีม
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const template = useThemeStore((s) => s.template);
  const dark = useThemeStore((s) => s.dark);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", template);
    root.classList.toggle("dark", dark);
  }, [template, dark]);

  return <>{children}</>;
}
