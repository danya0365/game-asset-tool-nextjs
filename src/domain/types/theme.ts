/**
 * ธีม = "template" (หน้าตา/skin) × "dark" (โหมดสว่าง-มืด) — สองแกนแยกกัน
 *
 * template ผูกกับ attribute `data-theme` บน <html>
 * dark ผูกกับ class `.dark` บน <html>
 * ค่าจริงของสีอยู่ที่ public/styles/themes/<template>.css
 */
export const THEME_TEMPLATES = ["ie5"] as const;

export type ThemeTemplate = (typeof THEME_TEMPLATES)[number];

/** ธีมที่ใช้เมื่อยังไม่เคยเลือก — ต้องตรงกับ :root ใน themes/ie5.css */
export const DEFAULT_TEMPLATE: ThemeTemplate = "ie5";

/** key ของ localStorage — ต้องตรงกันทั้ง store และ ThemeScript (inline ใน <head>) */
export const THEME_STORAGE_KEY = "theme-storage";

export interface ThemeState {
  /** skin ที่เลือกอยู่ */
  template: ThemeTemplate;
  /** โหมดมืด */
  dark: boolean;
  setTemplate: (template: ThemeTemplate) => void;
  setDark: (dark: boolean) => void;
  toggleDark: () => void;
}
