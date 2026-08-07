import {
  DEFAULT_TEMPLATE,
  THEME_STORAGE_KEY,
  THEME_TEMPLATES,
} from "@/src/domain/types/theme";

/**
 * Script แบบ blocking ใน <head> — อ่านธีมจาก localStorage แล้ว apply **ก่อน first paint**
 *
 * ทำไมต้องมี: ถ้ารอ React mount แล้วค่อยใส่ `.dark` ผู้ใช้ที่เลือก dark ไว้จะเห็น
 * ธีมสว่างแวบนึงก่อน (FOUC) — ของเดิมแก้ปัญหานี้ด้วยการ "ไม่ render อะไรเลยจนกว่าจะ mount"
 * ซึ่งทำให้หน้าว่างตอนโหลดและเสียประโยชน์ของ SSR ไปทั้งหมด
 *
 * ⚠️ key + รูปแบบข้อมูลต้องตรงกับ zustand persist (`{ state: { template, dark } }`)
 */
export function ThemeScript() {
  const script = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var s = raw ? (JSON.parse(raw).state || {}) : {};
    var allowed = ${JSON.stringify(THEME_TEMPLATES)};
    var t = allowed.indexOf(s.template) !== -1 ? s.template : ${JSON.stringify(DEFAULT_TEMPLATE)};
    var d = document.documentElement;
    d.setAttribute("data-theme", t);
    if (s.dark) d.classList.add("dark");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", ${JSON.stringify(DEFAULT_TEMPLATE)});
  }
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
