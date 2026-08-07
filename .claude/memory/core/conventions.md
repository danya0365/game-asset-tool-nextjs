---
name: conventions
description: มาตรฐานโค้ด/naming/การวางไฟล์/git ของ Game Asset Tool (อ่านก่อนเขียนโค้ดใหม่ หรือเมื่อสงสัยว่าควรวางไฟล์/ตั้งชื่อยังไง) — สรุปสั้น ตัวเต็มอยู่ใน rules/
metadata:
  type: convention
  status: active
  scope: global
  updated: 2026-08-07
---

# Coding Conventions (Game Asset Tool)

> มาตรฐานเต็มโหลดอัตโนมัติตอนแตะโค้ด: [`code-standards.md`](../../rules/code-standards.md) ·
> [`frontend-next.md`](../../rules/frontend-next.md) · [`definition-of-done.md`](../../rules/definition-of-done.md)
> ไฟล์นี้สรุปให้จำง่าย

## วางไฟล์ตรงไหน

| ของที่จะเขียน | ไปที่ |
| ------------- | ----- |
| type / contract ล้วน (ไม่มี React ไม่มี browser API) | `src/domain/types/` |
| algorithm / adapter ออกนอก (packer, exporter, localStorage) | `src/infrastructure/<หมวด>/` |
| UI ของ tool ใดtool หนึ่ง | `src/presentation/components/<tool>/` |
| UI ที่ใช้ซ้ำข้าม tool | `src/presentation/components/{atoms,molecules,templates}/` |
| state + side-effect + Canvas/File API | `src/presentation/hooks/use<Feature>.ts` |
| helper ล้วน ไม่มี React/side-effect | `src/presentation/lib/` |
| global state | `src/presentation/stores/` (Zustand) |
| **ค่าสี (hex)** | `public/styles/themes/ie5.css` **ที่เดียว** (ดู ADR-0003) |
| CSS อื่นๆ | `public/styles/` เท่านั้น (ดู ADR-0002) |
| route | `app/<tool>/page.tsx` — **routing เท่านั้น ห้ามมี logic/component** |

## Naming

- **component file = PascalCase** ตามชื่อ export (`TilemapEditorView.tsx`) · **hook = camelCase** ขึ้นต้น `use` (`useAtlasPacker.ts`)
- **folder = kebab-case** (`atlas-packer/`, `reduce-photo-size/`) ให้ตรงกับชื่อ route
- View หลักของ tool ชื่อ `<Tool>View` และ **export แบบ named** (`export function AtlasPackerView`)
  ⚠️ ตอนนี้มี 5 ไฟล์ที่ยังเป็น default export — ดู [[known-drift]] แก้เมื่อได้แตะไฟล์นั้น

## Import

- ใน `app/` ใช้ alias **`@/src/...`** (alias `@/*` ชี้ **repo root** ไม่ใช่ `src`)
- ภายใน `src/` ใช้ relative path
- type จาก `src/domain/types/` ใช้ `import type` — **ห้าม redefine shape ซ้ำ**

## TypeScript

- `strict: true` — เลี่ยง `any` โดยเฉพาะที่ boundary ของ Canvas/File API (`ImageData`, `Blob`, `File`)
- ⚠️ `tsconfig.json` **ไม่ได้เปิด** `noUncheckedIndexedAccess` / `noUnusedLocals` → index array/object ต้องระวังเอง

## Styling — semantic token (lint บังคับ · ADR-0003)

- Tailwind **v4 CSS-first** — ไม่มี `tailwind.config.*`
- 4 ชั้น: `next/font` → `themes/ie5.css` (ค่าจริง) → `theme.css` (map, `var()` ล้วน) → `index.css` (entry)
- **ห้ามใช้สี Tailwind ดิบ** (`bg-white`/`text-gray-500`) → `bg-card` / `text-muted` — **lint จับให้**
- **ไม่ต้องเขียน `dark:` เลย** — token สลับค่าเองใน `[data-theme="ie5"].dark`
- **condition ใน className ต้องผ่าน `cn()`** (`src/presentation/lib/cn.ts`)
- **ใช้ class `ie-*` ที่มีอยู่แล้ว** ก่อนเขียน utility เอง (นิยามใน `public/styles/ie5.css`)
- ค่า dynamic ตอน runtime เท่านั้นที่ใช้ `style={{}}` ได้ + `eslint-disable` พร้อมเหตุผลตรงจุด

## Git

- **`develop` = สายทำงาน · `main` = release** — ห้าม commit ตรง `main` งานใหม่แตก `feature/*` จาก `develop`
- commit **เมื่อพี่สั่งเท่านั้น** (กฎเหล็กใน `AGENTS.md`)
- commit message: **conventional** (`feat:`/`fix:`/`chore:`/`docs:`/`refactor:`) เนื้อความไทยได้

## Gate ก่อนบอกเสร็จ

```bash
npm run lint · npx tsc --noEmit · npm run build
```
⚠️ ไม่มี test framework — ถ้าเพิ่ม logic แล้วไม่ได้ test **ต้องบอกพี่ตรงๆ** ห้ามเคลมว่าเสร็จ
