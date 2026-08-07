---
name: known-drift
description: รายการ drift/หนี้ที่ตรวจพบจริงในโค้ดและยังไม่ได้แก้ (page pattern ปนกัน 3 แบบ, tech stack ใน TODO.md ที่ไม่ตรงจริง) — อ่านก่อนแก้ของพวกนี้ หรือเมื่อสงสัยว่า "ทำไมโค้ดตรงนี้ไม่เหมือนกัน"
metadata:
  type: reference
  status: active
  scope: global
  updated: 2026-08-07
---

# Known Drift — ของที่ไม่ตรงกันในโปรเจค

> **แก้ข้อไหนเสร็จ → ลบข้อนั้นออกจากไฟล์นี้** ไฟล์นี้ควรสั้นลงเรื่อยๆ ไม่ใช่ยาวขึ้น

## 1. Page pattern ปนกัน 3 แบบ (ถูกแค่ 4/10 หน้า)

กฎที่ต้องการ: `page.tsx` = Server Component + `export const metadata` + import View แบบ **named**
(ดู [`frontend-next.md`](../../rules/frontend-next.md) §4)

| แบบ | หน้า | ปัญหา |
| --- | ---- | ----- |
| ✅ ถูก | `/`, `/atlas-packer`, `/color-palette`, `/pixel-editor` | — |
| ❌ `"use client"` + **ไม่มี metadata** + default export | `/image-shuffle`, `/multi-export`, `/spritesheet-editor`, `/texture-editor`, `/reduce-photo-size` | **เสีย SEO metadata ทั้งหน้า** + client bundle ใหญ่กว่าที่ควร |
| ⚠️ server + named แต่**ไม่มี metadata** | `/tilemap-editor` | เสีย SEO อย่างเดียว แก้ง่ายสุด (เติม `export const metadata` พอ) |

**วิธีแก้ทีละหน้า** (ทำตอนที่ได้แตะหน้านั้นอยู่แล้ว อย่ายกมาทำรวดเดียว):
ย้าย `"use client"` จาก `page.tsx` ไปบรรทัดแรกของ `<Tool>View.tsx` → เปลี่ยน default export เป็น named →
เติม `export const metadata` ใน `page.tsx`

## 2. `TODO.md` ลิสต์ dependency ที่ไม่ได้ติดตั้งจริง

`TODO.md` (tech stack section) เขียนถึง **react-hook-form, zod, Fabric.js/Konva.js, localforage (IndexedDB)**
แต่ `package.json` ไม่มีสักตัว — ของจริงคือ:

- form/validation → เขียนมือ ไม่มี library
- canvas → **Canvas 2D API ดิบ** ไม่มี Fabric/Konva
- storage → **`localStorage` ธรรมดา** ที่ `src/infrastructure/storage/projectStorage.ts`

⇒ **อย่าเชื่อ tech stack ใน `TODO.md`** ให้เชื่อ `package.json` · `TODO.md` เชื่อได้เฉพาะส่วน feature/sprint

## 3. `README.md` ยังเป็น boilerplate ของ `create-next-app`

ไม่มีข้อมูลโปรเจคเลยสักบรรทัด — ภาพรวมจริงอยู่ที่ [[project-overview]] และ `TODO.md`

---

## ✅ แก้แล้ว (2026-08-07 — เก็บไว้อ้างอิงชั่วคราว)

- ~~ฟอนต์ 404: `fonts.css` ชี้ `/fonts/MiSans_Thai/*` ที่ไม่มีจริง~~ → ย้ายไป `next/font/google` (Noto Sans Thai) ดู [[adr-0003-semantic-theme]]
- ~~`--font-playfair` อ้างตัวเอง~~ → ลบพร้อม `theme.css` เดิม
- ~~`node_modules` ค้างที่ next 15.5.7 ทั้งที่ lockfile ระบุ 15.5.9~~ → `npm install` ดึงขึ้น 15.5.9 แล้ว
- ~~`utilities.css` อ้าง `--color-overlay` / `--color-primary` ที่ไม่เคยประกาศ~~ → ลบไฟล์ (dead CSS ทั้งไฟล์)
