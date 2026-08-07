---
paths:
  - "app/**"
  - "src/**"
  - "public/styles/**"
---

# Definition of Done — เช็คก่อนบอกว่า "เสร็จ" (ทุก session / ทุก AI / พกข้ามโปรเจคได้)

> **กฎข้อเดียวที่สำคัญสุด:** ห้ามบอกพี่ว่างาน "เสร็จ" จนกว่าจะผ่าน checklist นี้ครบ —
> ไม่ว่าจะ session ไหน, AI ตัวไหน, มี persona Pixel หรือไม่. นี่คือมาตรฐานตายตัว ไม่ใช่ทางเลือก.

## ✅ Checklist ก่อนปิดงาน (เรียงตามลำดับ)

### 1. Gate เขียวครบ — **บังคับเสมอ**

```bash
npm run lint      > /tmp/lint.log  2>&1; echo "LINT=$?"
npx tsc --noEmit  > /tmp/tsc.log   2>&1; echo "TSC=$?"
npm run build     > /tmp/build.log 2>&1; echo "BUILD=$?"
```

ต้องเขียวทั้ง 3 ตัว.

⚠️ **ห้าม pipe ผ่าน `tail`/`head` แล้วอ่าน exit code** — จะได้ exit code ของ `tail` ทำให้รายงานว่าผ่านทั้งที่พัง
เขียน log ลงไฟล์แล้วอ่าน `$?` ตามด้านบนเสมอ

> ยังไม่มี `npm run gate` รวบเป็นคำสั่งเดียว — ถ้าวันหลังลง prettier/test/dependency-cruiser
> ให้รวบเป็น script เดียวแล้วอัปเดตบล็อกนี้

### 2. Test ครอบของใหม่ — **โปรเจคนี้ยังไม่มี test harness**

**ห้ามเคลมว่า "test ผ่าน" เพราะไม่มีอะไรให้ผ่าน** — ที่ต้องทำแทนคือ:

- เพิ่ม/แก้ logic แล้ว → **บอกพี่ตรงๆ** ว่า "ไม่มี automated test ครอบ ตรวจด้วยการ verify บน browser จริง"
- ถ้า logic นั้นเป็น pure function ใน `domain/` หรือ `infrastructure/` (packer, exporter, storage)
  → **เสนอพี่ว่าควรลง test framework** ตรงนั้นคุ้มสุดเพราะไม่ต้องมี DOM (ดู ADR-0002)

### 3. Verify บน real-flow — **บังคับแทบทุกงานในโปรเจคนี้**

แอปนี้เป็น Canvas/File API ล้วน — **typecheck ผ่าน ≠ ภาพออกถูก**. ถ้างานแตะ flow ที่ผู้ใช้เห็น:

- รัน `npm run dev` แล้ว**ลองจริงบน browser**: โหลดไฟล์เข้า → ทำ operation → export ออกมาดู
- ตรวจของที่ typecheck จับไม่ได้: ภาพเพี้ยน/ขอบหาย · สีผิดใน dark mode · หน้า scroll (ผิดกฎ full-screen) ·
  console error · memory leak (`URL.createObjectURL` ที่ไม่ได้ revoke)
- ⚠️ **ถ้ายังไม่ได้เปิด browser ดู → ห้ามเคลมว่า "เสร็จ/พิสูจน์แล้ว"** ต้องบอกตรงๆ ว่า
  "โค้ดเขียวแต่ยังไม่ได้ verify บนจริง" + บอกวิธีรัน

> งานที่ไม่แตะ flow จริง (refactor type ล้วน, แก้ doc/memory) → ข้อ 3 ไม่บังคับ

### 4. Commit สะอาด

- conventional message (`feat:`/`fix:`/`docs:`…) · subject ไทยได้ · body ≤100 char/บรรทัด
- ปิดท้าย `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- แตก `feature/*` จาก `develop` — **ห้าม commit ตรง `main`**
- ไม่มี secret/คีย์หลุด · `.env*` ต้อง gitignore (ตั้งไว้แล้ว)
- งานใหญ่ → **commit ทีละ increment ที่เขียว** (ไม่กองรวมก้อนเดียว)
- ⚠️ commit **เมื่อพี่สั่งเท่านั้น** (กฎเหล็กใน AGENTS.md)

### 5. รายงานตรง (ห้าม overclaim)

บอกชัด: ผ่านอะไร / ข้ามอะไร / เหลืออะไร. ถ้า lint หรือ build fail หรือข้าม step ให้พูดตรง พร้อม output.
"เสร็จและพิสูจน์แล้ว" = ผ่านข้อ 1 + 3 จริงเท่านั้น.

## สรุปสั้น (จำ 1 บรรทัด)

> **lint/tsc/build เขียว → เปิด browser ลองจริง → commit สะอาด (เมื่อสั่ง) → รายงานตรง ไม่มี test ก็บอกว่าไม่มี**

ดูมาตรฐานโค้ดเต็ม: [code-standards.md](code-standards.md) · กฎ frontend: [frontend-next.md](frontend-next.md)
