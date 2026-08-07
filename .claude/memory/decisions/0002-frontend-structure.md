---
name: adr-0002-frontend-structure
description: ADR-0002 — โครง frontend ของโปรเจคนี้ต่างจาก template hexagonal ตรงไหนและทำไม (infrastructure ไม่ใช่ data, CSS อยู่ public/styles, ยังไม่ลง dependency-cruiser/prettier/test) อ่านเมื่อสงสัยว่าทำไมกฎถึงเขียนแบบนี้ หรือจะเปลี่ยนโครง/ลง tooling
metadata:
  type: decision
  status: active
  scope: global
  updated: 2026-08-07
---

# ADR-0002 — โครง frontend + ระดับ enforcement ที่เลือก

## บริบท

ตอนวาง agent toolkit (2026-08-07) มี template กฎ frontend มาให้จาก skill `frontend-hexagonal`
แต่ template เขียนบนสมมติฐานที่**ไม่ตรงกับ repo นี้เลย**:

| template สมมติ | ของจริงในโปรเจคนี้ |
| -------------- | ------------------ |
| monorepo `apps/<app>/src/**` | flat root — `app/` + `src/` ที่ราก |
| layer ชื่อ `domain / data / presentation` | `domain / infrastructure / presentation` |
| มี backend แยก → server action / API layer | **ไม่มี backend เลย** — Canvas + File API + localStorage |
| CSS อยู่ `src/presentation/styles/` | อยู่ `public/styles/` |
| `pnpm gate` + dependency-cruiser + `max-lines` | มีแค่ `npm run lint` + `npm run build` |

ถ้าก๊อป template มาทั้งดุ้น จะได้กฎที่ชี้ไปโฟลเดอร์ที่ไม่มีอยู่จริง — กฎที่ผิดแย่กว่าไม่มีกฎ
เพราะ agent จะพยายามทำตามแล้วสร้างโครงซ้อนขึ้นมาใหม่

## การตัดสินใจ

**1. เขียน `.claude/rules/frontend-next.md` ใหม่ให้ตรงของจริง** ไม่ก๊อป template

**2. คงชื่อ layer เป็น `domain / infrastructure / presentation`** (ไม่ rename เป็น `data` ตาม template)
โค้ด ~16,000 บรรทัดใช้ชื่อนี้อยู่แล้ว การ rename = แตะทุกไฟล์เพื่อความสวยงามอย่างเดียว ไม่คุ้ม
ความหมายเหมือนกัน: ชั้นที่คุยกับโลกภายนอก (algorithm + localStorage)

**3. CSS อยู่ `public/styles/` ต่อไป** ทั้งที่ template บอกให้อยู่ใน `src/presentation/styles/`
เหตุผลที่ยอมรับได้: entry เดียว (`index.css`) import จาก `app/layout.tsx`, แยกเป็น 9 ไฟล์ตามหน้าที่
(theme / base / components / utilities / dark / fonts / landing / ie5) ซึ่งจัดระเบียบดีอยู่แล้ว
**กฎที่ยังต้องยึด: `app/` ห้ามมี `.css`** — ข้อนี้ทำถูกอยู่แล้ว (ไม่มี `app/globals.css`)

**4. ยังไม่ลง prettier / test framework / dependency-cruiser / `max-lines`** — พี่เลือกไว้รอบนี้ว่า
วาง toolkit + กฎก่อน ยังไม่แตะ `package.json` ⇒ กฎเรื่อง boundary และ God component
**enforce ด้วยรีวิวเท่านั้น** และต้องเขียนไว้ตรงๆ ในกฎว่า "ไม่มี tool จับ" ไม่ใช่ปล่อยให้เข้าใจผิดว่ามี gate

## เหตุผล

- **กฎต้องตรงกับของจริง** ถึงจะมีคนทำตาม — กฎที่ชี้ path ไม่มีจริงจะถูกเมินทั้งไฟล์
- **ไม่แตะ dependency ตอนวาง toolkit** — แยกเรื่อง "ตั้งกฎ" ออกจาก "เปลี่ยน build" คนละ risk กัน
  ถ้าลง `max-lines: 200` วันนี้ = lint แดงทันทีจาก God component 4 ไฟล์ กลายเป็นต้อง refactor ก่อนถึงจะ commit ได้
- **บอกความจริงเรื่อง enforcement** — เขียนว่า "มี gate" ทั้งที่ไม่มี คือการหลอกตัวเองที่จะทำให้หนี้โตเงียบๆ

## ผลที่ตามมา / ข้อควรระวัง

- ⚠️ กฎ boundary + God component **ไม่มีอะไรจับได้นอกจากคนอ่านโค้ด** — ถ้าเห็นหนี้เริ่มโต ให้เสนอพี่ลง tooling
- ⚠️ ไม่มี test = pure logic ใน `infrastructure/` (maxrects packer, atlas exporter, projectStorage)
  ซึ่ง**เป็นส่วนที่ test ง่ายและคุ้มที่สุด** ยังไม่ถูกครอบเลย — เป็นช่องโหว่ที่รู้ตัว ไม่ใช่การตัดสินใจว่าไม่ต้อง test
- ⚠️ hook `format.sh` เรียก `npx --no-install prettier` → **เงียบไปเฉยๆ** จนกว่าจะ `npm i -D prettier`

## เงื่อนไขที่ควรกลับมาทบทวน

ลง tooling เมื่อเจอข้อใดข้อหนึ่ง:
1. มีคนอื่นเข้ามาช่วยเขียน (รีวิวคนเดียวเอาไม่อยู่)
2. God component โตเกิน 4 ไฟล์ หรือ `TilemapEditorView.tsx` ทะลุ 4,500 บรรทัด
3. เริ่มแตะ `infrastructure/` บ่อย (packer/exporter) — ตรงนั้น bug เงียบและ test คุ้มมาก
4. เริ่มมี CI / deploy อัตโนมัติ

ลำดับที่แนะนำถ้าจะเริ่ม: **prettier → vitest ครอบ `infrastructure/` → `max-lines` (warn ก่อน) → dependency-cruiser**

ดู [[known-drift]] สำหรับรายการหนี้ที่บันทึกไว้แล้ว
