---
name: project-overview
description: Game Asset Tool คืออะไร — เป้าหมายผลิตภัณฑ์, ผู้ใช้, 10 tools ที่มี, architecture, stack, roadmap (อ่านตอนเริ่ม session หรือทบทวนภาพรวม)
metadata:
  type: overview
  status: active
  scope: global
  updated: 2026-08-07
---

# Game Asset Tool — ภาพรวม

## โปรเจคนี้คืออะไร

เว็บแอพ **ชุดเครื่องมือทำ asset สำหรับเกม ที่รันบน browser ล้วน** — เปิดเว็บแล้วใช้ได้เลย
ไม่ต้องติดตั้ง ไม่ต้องสมัคร ไม่มี backend ไฟล์ของผู้ใช้ไม่เคยออกจากเครื่อง (ประมวลผลด้วย Canvas + File API ทั้งหมด)

**แก้ปัญหาอะไร:** เครื่องมือทำ asset เกมระดับโลก (TexturePacker, Tiled Map Editor, Aseprite) เป็น desktop app
ต้องโหลด/ติดตั้ง บางตัวเสียเงิน — โปรเจคนี้ยกความสามารถหลักมาไว้บนเว็บฟรี ใช้ได้ทุกเครื่องที่มี browser

**ให้ใครใช้:** indie / hobbyist game developer สาย **Cocos Creator, Phaser, Unity, Godot, LibGDX, GameMaker**
ผู้ใช้หลักพูดไทย (UI ไทยผสมอังกฤษ, `<html lang="th">`) แต่ศัพท์เทคนิคคงเป็นอังกฤษ

**จุดขาย:** ฟรี · ไม่ต้องติดตั้ง · privacy (ไฟล์อยู่บนเครื่อง) · export ได้หลาย engine format ในที่เดียว

## Tools ที่มีวันนี้ (10 route)

| Route | ทำอะไร |
| ----- | ------ |
| `/` | Landing — รวมทางเข้าทุก tool |
| `/pixel-editor` | วาด pixel art ทีละจุด |
| `/texture-editor` | แก้/ปรับแต่ง texture |
| `/tilemap-editor` | วาง tilemap หลาย layer (tool ที่ใหญ่สุด — มี `useTilemapEditor` เป็นสมองแยก) |
| `/spritesheet-editor` | ตัด/จัด spritesheet + animation frame |
| `/atlas-packer` | pack sprite เป็น atlas (MaxRects) + export metadata หลาย format |
| `/color-palette` | สร้าง/แก้ palette |
| `/multi-export` | export ชุดใหญ่ทีเดียวหลาย format (ใช้ jszip) |
| `/image-shuffle` | สลับ/จัดเรียงภาพ |
| `/reduce-photo-size` | บีบขนาดไฟล์ภาพ JPEG/PNG/WebP แบบ batch (ใช้ upng-js — เป้าคือ **ลดขนาดไฟล์ ไม่ใช่ลด resolution**) |

> เพิ่ม tool ใหม่ → ใช้ `/new-tool` (จะสร้าง spec ใน `.claude/memory/tools/`)

## แนวคิด architecture

Clean-architecture-ish 3 ชั้น + Atomic Design — ทิศพึ่งพา **presentation → infrastructure → domain** (ห้ามย้อน)

```
app/                          routing เท่านั้น (page/layout/favicon)
src/domain/types/             type/contract ล้วน — ไม่มี React ไม่มี browser API
src/infrastructure/           adapter ออกนอก: atlas packer/exporter, localStorage
src/presentation/             components (atoms/molecules/templates/<feature>) · hooks · stores · contexts
public/styles/                CSS ทั้งหมด (ดู ADR-0002 ว่าทำไมไม่อยู่ใน app/ หรือ src/)
```

- **1 route = 1 tool = 1 folder ใน `components/`** — logic หนักๆ ย้ายไป hook ต่อ feature (`useTilemapEditor`, `useAtlasPacker`)
- กฎเต็มอยู่ที่ [`.claude/rules/frontend-next.md`](../../rules/frontend-next.md)

## Stack

Next.js **15.5.9** App Router + Turbopack · React **19.1.2** · TypeScript strict · Tailwind **v4** CSS-first ·
Zustand **5** + persist · jszip · upng-js · **npm** · ไม่มี DB/auth/API route

**ยังไม่มี:** test framework · prettier · CI · pre-commit hook · dependency-cruiser
→ gate จริง = `npm run lint` + `npx tsc --noEmit` + `npm run build` (ดู [[known-drift]] และ ADR-0002)

## Roadmap

spec ตัวจริงคือ [`TODO.md`](../../../TODO.md) (554 บรรทัด) — สถานะปัจจุบัน:

1. ✅ Sprint 1–15 — 10 tools ใช้งานได้
2. 🔄 Sprint 16 — stamp brush, selection fill, layer opacity slider (tilemap)
3. ⬜ Phase 6–8 — export matrix ให้ครบทุก engine, project management, advanced features

**หนี้ที่ต้องทยอยล้าง** (ไม่ใช่ feature แต่กันโปรเจคพัง): God component ใน tilemap/atlas/texture ·
page pattern ที่ปนกัน 3 แบบ · font 404 — รายละเอียดใน [[known-drift]]
