import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * twMerge ตัวเปล่ารู้จักแค่ scale default ของ Tailwind — ไม่รู้ว่า `text-muted`
 * หรือ `bg-chrome` เป็น "สี" จึงไม่ dedupe ให้เวลา class ชนกัน
 * ต้องบอกชื่อ token ที่ register ไว้ใน @theme (public/styles/theme.css)
 *
 * ⚠️ SYNC: ลิสต์นี้ต้องตรงกับ theme.css — twMerge อ่าน CSS เองไม่ได้
 *    เพิ่ม token ใน theme.css เมื่อไหร่ ต้องมาเพิ่มที่นี่ด้วย
 *    (มี test คุมที่ src/presentation/lib/cn.test.ts ถ้าลง test runner แล้ว)
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        // surface
        "background",
        "foreground",
        "card",
        "card-foreground",
        "muted",
        "muted-surface",
        "border",
        "ring",
        // IE5 chrome
        "chrome",
        "chrome-hover",
        "chrome-active",
        "chrome-pressed",
        "bevel-light",
        "bevel-shadow",
        "inset",
        "tooltip",
        "tooltip-foreground",
        "selection",
        "selection-foreground",
        // brand + on-brand
        "brand-50",
        "brand-100",
        "brand-200",
        "brand-300",
        "brand-400",
        "brand-500",
        "brand-600",
        "brand-700",
        "brand-800",
        "brand-900",
        "on-brand",
        // accent
        "accent-100",
        "accent-400",
        "accent-500",
        "accent-600",
        // status
        "success",
        "success-surface",
        "warning",
        "warning-surface",
        "error",
        "error-surface",
        // canvas
        "canvas",
        "canvas-grid",
        "overlay",
      ],
      radius: ["pill"],
      shadow: ["btn"],
    },
  },
});

/**
 * รวม className แบบ conditional ให้ deterministic
 *
 * ทำไมต้องใช้: condition ดิบใน className (`` `p-2 ${on ? "a" : "b"}` ``) ทำให้ base
 * กับ branch ที่ชนกันปรากฏทั้งคู่ ผลลัพธ์ขึ้นกับลำดับใน CSS ไม่ใช่ลำดับที่เขียน
 * cn() ให้ **class ที่มาทีหลังชนะ** เสมอ — บังคับด้วย ESLint (ดู eslint.config.mjs)
 *
 * @example cn("ie-button", isActive && "ie-button-active", disabled && "opacity-50")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
