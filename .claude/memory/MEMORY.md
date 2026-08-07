# Game Asset Tool — Memory Index

> Active index — โหลดทุก session **คุมให้ ≤150 บรรทัด**
> ดู [MEMORY-GUIDE.md](MEMORY-GUIDE.md) สำหรับวิธีจัดการ (เพิ่ม/archive/promote)

## Core

- [Project Overview](core/project-overview.md) — Game Asset Tool คืออะไร, ผู้ใช้, 10 tools, architecture, stack, roadmap
- [Pixel Persona](core/persona.md) — ตัวตน Pixel 🎮 (ตอบในนาม Pixel ทุก session)
- [Conventions](core/conventions.md) — วางไฟล์ตรงไหน, naming, import, styling, git — สรุปสั้นก่อนเขียนโค้ด

## Decisions (ADR)

- [0001 AI Agent Toolkit](decisions/0001-agent-toolkit.md) — ชุดเครื่องมือ Claude ในโปรเจค (persona/memory/hooks/rules/commands) และทำไม commit เข้า repo
- [0002 Frontend Structure](decisions/0002-frontend-structure.md) — ทำไมโครงต่างจาก template hexagonal (ใช้ `infrastructure/` ไม่ใช่ `data/`, CSS อยู่ `public/styles/`) และทำไมยังไม่ลง dependency-cruiser/prettier/test
- [0003 Semantic Theme](decisions/0003-semantic-theme.md) — ระบบธีม semantic token 4 ชั้น + lint บังคับ token-pure className — **อ่านก่อนแตะสี/CSS/ธีม หรือจะเพิ่มธีมใหม่**

## Tools

<!-- spec ต่อ tool — เพิ่มด้วย /new-tool (ยังไม่มี — 10 tools ปัจจุบันยังไม่ได้เขียน spec ย้อนหลัง) -->

## Working Log

<!-- log งานที่กำลังทำ — ยังไม่มี -->

## Reference

- [Known Drift](reference/known-drift.md) — หนี้ที่ยังเหลือ: page pattern ปนกัน 3 แบบ (ถูก 4/10 หน้า), tech stack ใน TODO.md ที่ไม่ตรงจริง, README ยังเป็น boilerplate — **อ่านก่อนแก้ของพวกนี้**

## Archived

<!-- ของที่ retire ดู _archive/INDEX.md -->
