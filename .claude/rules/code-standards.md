---
paths:
  - "app/**"
  - "src/**"
  - "public/styles/**"
---

# Code Standards — Game Asset Tool

> โหลดตอนแตะโค้ดจริง · ปรัชญา: **กฎที่ tool บังคับแล้ว ไม่ต้องท่องจำ — รู้ว่ามี gate อะไร + รันยังไง ก็พอ**
> กฎเฉพาะ frontend (โครง layer, God component, page pattern) → [frontend-next.md](frontend-next.md)
> 🚦 **ก่อนบอกว่า "เสร็จ" ต้องผ่าน [Definition of Done](definition-of-done.md)** ทุกครั้ง

## กฎไหนใครบังคับ — รู้แค่นี้พอ

| กฎ | ใครบังคับ | คำสั่ง |
| --- | --------- | ------ |
| lint / react-hooks / next best practice | **eslint** (flat config + `next/core-web-vitals` + `next/typescript`) | `npm run lint` |
| **สีต้องผ่าน semantic token** (ห้าม hex / สี Tailwind ดิบ / `[var()]`) | **eslint** `no-restricted-syntax` | `npm run lint` |
| **condition ใน className ต้องผ่าน `cn()`** | **eslint** `no-restricted-syntax` | `npm run lint` |
| **ห้าม inline `style`** (ยกเว้นค่า runtime + disable ตรงจุด) | **eslint** `react/forbid-dom-props` | `npm run lint` |
| **CSS ต้องอยู่ `public/styles/`** | **eslint** `no-restricted-imports` | `npm run lint` |
| type ถูก / ไม่มี `any` หลุดที่ signature | **tsc strict** | `npx tsc --noEmit` ⚠️ ยังไม่มี script |
| build ผ่านจริง (Turbopack + RSC boundary) | **next build** | `npm run build` |
| format | ❌ **ไม่มีใครบังคับ** — ยังไม่ได้ลง prettier | — |
| test | ❌ **ไม่มีใครบังคับ** — ยังไม่มี test framework | — |
| boundary ระหว่าง layer | ❌ **ไม่มีใครบังคับ** — ยังไม่ลง dependency-cruiser → **enforce ด้วยรีวิว** | — |
| ขนาดไฟล์ / God component | ❌ **ไม่มีใครบังคับ** — ยังไม่เปิด `max-lines` → **enforce ด้วยรีวิว** | — |

⚠️ **ห้ามอ่าน exit code ผ่าน `tail`/`head`** — จะได้ exit code ของ `tail` ใช้ `cmd > /tmp/x.log 2>&1; echo EXIT=$?`

## หลักที่ยึดด้วยวินัย (ไม่มี gate อัตโนมัติ)

- **Typed & strict** — เลี่ยง `any` โดยเฉพาะที่ boundary ของ Canvas/File API (`ImageData`, `Blob`, `File`, `CanvasRenderingContext2D`)
  ⚠️ `tsconfig.json` ไม่ได้เปิด `noUncheckedIndexedAccess` → index array/typed-array ต้องเช็คเอง
- **Boundaries ชัด** — ทิศพึ่งพา **presentation → infrastructure → domain** ห้ามย้อน ห้าม circular
  `domain/` ต้องบริสุทธิ์ (ไม่มี React ไม่มี browser API) · algorithm หนักๆ (packing, encode) อยู่ `infrastructure/`
- **1 หน่วย = 1 หน้าที่** — logic ของ tool ย้ายเข้า hook, component ทำแค่ render (รายละเอียด → frontend-next.md)
- **ไม่มี secret** — โปรเจคนี้ไม่มี backend/API key อยู่แล้ว ถ้าวันหลังมี ต้องอยู่ใน env และ `.env*` ถูก gitignore แล้ว
- **Error handling ชัด** — งานที่ผู้ใช้เห็น (โหลดไฟล์, decode, export) ต้อง handle failure แล้วบอกผู้ใช้ ไม่ใช่ throw เงียบ
- **จัดการ memory ของ browser** — `URL.createObjectURL` ต้องคู่กับ `revokeObjectURL` เสมอ (เคยหลุดมาแล้วใน reduce-photo-size)
  · canvas ที่ไม่ใช้แล้วควรปล่อย · ไฟล์ batch ขนาดใหญ่อย่าถือ Blob ทั้งหมดพร้อมกันถ้าไม่จำเป็น

## หนี้ที่บันทึกไว้ — **มีแต่ลดลง ห้ามโตขึ้น**

ตัวเลข ณ 2026-08-07 · ถ้าแตะไฟล์เหล่านี้ **ห้ามทำให้ยาวขึ้น** ถ้าไม่ลดได้อย่างน้อยต้องไม่เพิ่ม

| ไฟล์ | บรรทัด |
| ---- | ------ |
| `src/presentation/components/tilemap-editor/TilemapEditorView.tsx` | **3,983** |
| `src/presentation/hooks/useTilemapEditor.ts` | 1,728 |
| `src/presentation/components/atlas-packer/AtlasPackerView.tsx` | 1,306 |
| `src/presentation/components/texture-editor/TextureEditorView.tsx` | 1,198 |

หนี้เชิงโครงสร้างอื่น (page pattern ปนกัน, font 404, dep ใน TODO.md ที่ไม่ได้ลงจริง) → [[known-drift]]

## Test conventions

ยังไม่มี test framework — **นี่คือช่องโหว่ที่รู้ตัว** ไม่ใช่การตัดสินใจว่าไม่ต้อง test (ดู ADR-0002)

- ตอนนี้: เพิ่ม/แก้ logic แล้ว **ต้อง verify บน browser จริง** และรายงานตรงว่าไม่มี automated test
- เมื่อลง test แล้ว: pure logic ใน `domain/` + `infrastructure/` (packer, exporter, storage) = unit test ก่อนเป็นอันดับแรก — คุ้มสุดเพราะไม่ต้องมี DOM

## Git & commit

- **`develop` = สายทำงาน · `main` = release** — งานใหม่แตก `feature/*` จาก `develop` ห้าม commit ตรง `main`
- commit **เมื่อพี่สั่งเท่านั้น** (กฎเหล็กใน `AGENTS.md`)
- commit message: **conventional** (`feat:`/`fix:`/`chore:`/`docs:`/`refactor:`) เนื้อความไทยได้

## Doc/Decision

กฎใหม่ที่ตกลงกัน → เติมที่นี่ + [conventions.md](../memory/core/conventions.md) ·
ตัดสินใจใหญ่ → ADR ใน `.claude/memory/decisions/` (`/new-adr`)
