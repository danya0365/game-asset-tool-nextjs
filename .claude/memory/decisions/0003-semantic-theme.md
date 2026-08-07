---
name: adr-0003-semantic-theme
description: ADR-0003 — ระบบธีมแบบ semantic token (gen-3) ที่วางแทน @theme แบบ hardcode เดิม + lint บังคับ token-pure className (อ่านเมื่อจะแตะสี/CSS/ธีม เพิ่มธีมใหม่ หรือสงสัยว่าทำไม lint ห้ามใช้ bg-gray-500)
metadata:
  type: decision
  status: active
  scope: global
  updated: 2026-08-07
---

# ADR-0003 — ระบบธีม semantic token + lint บังคับ

## บริบท

ระบบสีเดิมมีปัญหาเชิงโครงสร้าง:

1. `theme.css` ประกาศ `@theme` แล้ว **hardcode hex ทั้งหมด** รวมถึง alias สี Tailwind
   (`--color-gray-*`, `--color-green-*`) — เท่ากับ "สร้าง palette ใหม่ที่หน้าตาเหมือน Tailwind"
2. `dark.css` override `--color-*` ใน `.dark` แยกอีกไฟล์ → ต้องแก้ 2 ที่ทุกครั้ง
3. `ie5.css` (746 บรรทัด) hardcode hex ตรงๆ แล้วเขียน block `.dark .ie-*` ซ้ำอีก **~40 block**
4. component มี **สี Tailwind ดิบ 376 จุด** ใน 11 ไฟล์ ส่วนใหญ่เป็นคู่ `text-gray-700 dark:text-gray-300`
   ที่ต้องจำเองว่าคู่ไหนคู่กับอะไร
5. `fonts.css` ประกาศ `@font-face` 11 ตัวชี้ `/fonts/MiSans_Thai/*` ที่**ไม่มีอยู่จริง** → 404 เงียบ
6. `utilities.css` อ้าง `--color-overlay` / `--color-primary` ที่**ไม่เคยถูกประกาศ**
7. `ThemeProvider` กัน FOUC ด้วยการ **ไม่ render อะไรเลยจนกว่าจะ mount** → เสีย SSR ทั้งหน้า

ผลรวม: จะเพิ่มธีมที่ 2 ไม่ได้เลยโดยไม่แก้ทุกไฟล์ และไม่มีอะไรกันไม่ให้ dev คนถัดไปพิมพ์ `bg-gray-500`

## การตัดสินใจ

ใช้สถาปัตยกรรม **semantic theme gen-3** ตาม skill `nextjs-semantic-theme` โดยปรับให้เข้ากับ skin IE5

**1. แยก 4 ชั้นชัดเจน** — `next/font` → `themes/<id>.css` (ค่าจริง) → `theme.css` (map, var() ล้วน) → `index.css` (entry)
⇒ **hex อยู่ที่ `themes/*.css` ที่เดียวในโปรเจค**

**2. ชุด token ร่วมชุดเดียว สลับค่าด้วย `[data-theme]`** ไม่ namespace ต่อธีม
นอกจาก token มาตรฐานของ skill เพิ่มกลุ่มเฉพาะ skin: `chrome*` / `bevel-light` / `bevel-shadow` /
`inset` / `selection*` / `tooltip*` (Win98 3D bevel), `canvas*` / `terminal*` (พื้นที่ทำงานของ editor)

**3. dark = พลิกค่า token ไม่ใช่เขียนกฎซ้ำ** ⇒ ตัด `.dark .ie-*` ทิ้งทั้ง ~40 block และตัด
`dark:` ออกจาก className ทั้งหมด · **`--selection` ไม่พลิก** (ต้องเป็นพื้นเข้ม+ตัวอักษรขาวทั้งสองโหมด)

**4. `--on-brand` ใช้กับพื้นสีอิ่มตัวทุกชนิด** (brand *และ* status) — ไม่เพิ่ม `--on-success` แยก
เพราะ `--success`/`--warning`/`--error` พลิกเข้ม↔อ่อนตามจังหวะเดียวกับ `--brand-500` ค่าจึงตรงกันเสมอ

**5. lint บังคับ 5 ชั้น** (`eslint.config.mjs`) — ห้าม hex / สีดิบ / `[var()]` / condition ดิบใน className / inline `style`
บวก `no-restricted-imports` กัน `.css` หลุดเข้า `app/` หรือ `src/`
ข้อยกเว้นเดียว = ค่า dynamic ตอน runtime → `eslint-disable` ตรงจุดพร้อมเหตุผล (ปัจจุบัน 50 จุด ทั้งหมดเป็น canvas editor จริง)

**6. `cn()`** (`src/presentation/lib/cn.ts`) = clsx + `extendTailwindMerge` ที่รู้จัก token ของโปรเจค

**7. FOUC แก้ด้วย ThemeScript** — inline blocking script ใน `<head>` อ่าน localStorage แล้ว
set `data-theme` + `.dark` **ก่อน first paint** ⇒ `ThemeProvider` กลับมา render ลูกตามปกติ ได้ SSR คืน

**8. ฟอนต์ย้ายไป `next/font/google` (Noto Sans Thai)** — เลิกไล่หาไฟล์ MiSans ที่หายไป

**9. ลบ dead CSS** — `base.css` `landing.css` `utilities.css` (~180 บรรทัด) ไม่มี class ไหนถูกใช้เลย
และ `landing.css` ยัง **override `animate-pulse` ของ Tailwind** ทับของจริงอยู่

## เหตุผล

- **เพิ่มธีมใหม่ = เพิ่มไฟล์เดียว** ไม่ต้องแตะ component — เป็นเป้าหมายหลักของการรื้อรอบนี้
- **ลบความจำที่ไม่จำเป็น** — เดิมต้องจำว่า `text-gray-700` คู่กับ `dark:text-gray-300` ตอนนี้เหลือ `text-foreground`
- **กฎที่มี tool บังคับ ไม่ต้องท่องจำ** — พิมพ์ `bg-gray-500` แล้ว lint แดงทันที ไม่ต้องรอรีวิว
- **แก้ของพังไปด้วยในตัว** — ฟอนต์ 404, token ที่ไม่มีจริง, FOUC ที่แลกมาด้วย SSR

## ผลที่ตามมา / ข้อควรระวัง

- ⚠️ **`cn.ts` ต้อง sync กับ `theme.css` ด้วยมือ** — twMerge อ่าน CSS ไม่ได้ เพิ่ม token แล้วลืมเพิ่มที่ `cn.ts`
  = class สีที่ชนกันจะไม่ merge (เงียบๆ ไม่ error)
- ⚠️ **regex ใน `no-restricted-syntax` ห้ามมี `/`** — esquery ตัด selector ตรงนั้นแล้ว config พังทั้งไฟล์
  (เจอมาแล้ว: group `(\/[0-9]{1,3})?` สำหรับ opacity ทำ lint ล่มทั้งโปรเจค)
- ⚠️ **`--canvas` และ `--terminal` ตั้งใจให้เข้มทั้งสองโหมด** — ไม่ใช่ลืม override
  (asset ส่วนใหญ่เป็นภาพสว่าง/โปร่งใส ต้องมีพื้นเข้มถึงจะเห็นขอบ)
- หน้าตาเปลี่ยนไปจากเดิมเล็กน้อย: ฟอนต์เป็น Noto Sans Thai จริง (เดิม fallback `system-ui`) ·
  overlay ของ dialog เป็น 0.5/0.65 แทน 0.5/0.7 ที่ปนกัน
- ยังมีธีมเดียว (`ie5`) — โครง `[data-theme]` วางไว้แล้วเพื่อรองรับธีมที่ 2 (พี่เลือกยังไม่ทำรอบนี้)

## Verify ที่ทำแล้ว (2026-08-07)

`npm run lint` 0 error · `npx tsc --noEmit` 0 error · `npm run build` ผ่าน ·
เปิด browser จริง 5 route ทั้ง light/dark → 0 console error, ไม่มี element ไหนพื้นค้างสีสว่างตอน dark,
ฟอนต์ Noto Sans Thai โหลดจริง, `body` ไม่ scroll ·
ทดสอบกฎ lint ด้วยไฟล์ probe → จับครบ 7/7 ชั้น

ดู [[known-drift]] สำหรับหนี้ที่ยังเหลือ
