---
description: สร้าง memory spec ของ tool ใหม่ใน Game Asset Tool (1 tool = 1 route = 1 folder ใน components/)
argument-hint: "[ชื่อ tool เช่น Normal Map Generator]"
---

สร้าง memory spec สำหรับ tool ใหม่ตาม convention ใน `.claude/memory/MEMORY-GUIDE.md`
ชื่อ tool: **$ARGUMENTS**

ทำตามขั้นตอนนี้:

1. แปลงชื่อเป็น kebab-case → สร้างไฟล์ `.claude/memory/tools/<slug>.md`
   (slug ต้องเป็นตัวเดียวกับที่จะใช้เป็น route `app/<slug>/` และ folder `src/presentation/components/<slug>/`)
2. frontmatter มาตรฐาน (`type: module`, `status: active`, `scope: <slug>`, `updated` = วันนี้)
3. โครงเนื้อหา spec — เว้นที่ให้เติม ถ้ายังไม่รู้ให้ **ถามพี่ทีละจุด** อย่าเดา:
   - **หน้าที่/ขอบเขต** — tool นี้แก้ปัญหาอะไรให้ game dev, ไม่ทำอะไร
   - **Input** — รับไฟล์อะไร (png/jpg/webp/json/tmx…), drag-drop หรือเลือกไฟล์, batch ได้ไหม
   - **Output / export format** — export เป็นอะไรบ้าง (engine ไหน: Cocos/Phaser/Unity/Godot/…), ZIP หรือไฟล์เดียว
   - **State ที่ถือ** — อะไรอยู่ใน `useState` อะไรต้องอยู่ใน `useRef` (canvas/ImageData), persist ลง localStorage ไหม
   - **Algorithm / infrastructure ที่ต้องมี** — ต้องเขียนอะไรใหม่ใน `src/infrastructure/` หรือใช้ของเดิมซ้ำได้
     (เช็คก่อน: `atlas/maxrects-packer.ts`, `atlas/atlas-exporter.ts`, `storage/projectStorage.ts`)
   - **ปม technical ที่ต้องระวัง** — งานหนักบล็อก UI ไหม (ต้อง Web Worker?), memory (`revokeObjectURL`),
     ภาพใหญ่เกิน canvas limit, สีเพี้ยนตอน re-encode
   - **UI ตาม skin IE5** — ใช้ `ie-*` class ไหนบ้าง, layout เต็มจอห้าม scroll
   - **Test ที่ควรมี** — ส่วนไหนเป็น pure function ที่ test ได้โดยไม่ต้องมี DOM
4. เพิ่ม pointer ใน section "Tools" ของ `.claude/memory/MEMORY.md` (บรรทัดเดียว + บอกว่าอ่านเมื่อไหร่)
5. เตือนกฎที่ต้องทำตามตอน scaffold โค้ด (ดู `.claude/rules/frontend-next.md`):
   - `app/<slug>/page.tsx` = **Server Component + `export const metadata`** ห้ามใส่ `"use client"`
   - `"use client"` อยู่ที่ `src/presentation/components/<slug>/<Tool>View.tsx` และ **export แบบ named**
   - logic/state ไปอยู่ `src/presentation/hooks/use<Tool>.ts` ไม่ยัดใน View
   - เพิ่มการ์ดเข้า landing page (`components/landing/LandingView.tsx`)
6. ถามพี่ว่าจะให้ scaffold โครงโค้ดต่อเลยไหม
