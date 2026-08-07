# SETUP — ตั้งค่าเครื่องใหม่ (AI agent / Claude Code)

โปรเจคนี้เก็บ config ของผู้ช่วย AI (**Pixel**) ไว้ใน git ทั้งหมด (ดู [ADR-0001](.claude/memory/decisions/0001-agent-toolkit.md))
เมื่อ `git clone` เครื่องใหม่ ทำตามนี้:

## 1. กด accept workspace-trust (บังคับ)

เปิดโปรเจคใน Claude Code แล้ว **กด accept workspace-trust 1 ครั้ง** —
ค่า `autoMemoryDirectory` และ hooks (`format.sh`, `commit-reminder.sh`) ถึงจะทำงาน

## 2. ตรวจ path ของ memory

`.claude/settings.json` → `autoMemoryDirectory` ชี้ `~/game-asset-tool-nextjs/.claude/memory`
ถ้าพี่ clone ไปไว้ที่อื่น/เปลี่ยนชื่อโฟลเดอร์ → แก้ค่านี้ให้ตรง (จุดเดียว)

## 3. ติดตั้ง dependency

```bash
npm ci
```

⚠️ **ใช้ `npm ci` ไม่ใช่ `npm install`** — ตอนนี้ `node_modules` บนเครื่องเดิมค้างอยู่ที่ next `15.5.7`
ทั้งที่ lockfile ระบุ `15.5.9` (รวม RSC CVE fix) ดู `.claude/memory/reference/known-drift.md`

## 4. Hooks (auto-format) — ต้องมี Prettier ถึงจะ format

hook `format.sh` เรียก `npx --no-install prettier` — **โปรเจคนี้ยังไม่ได้ลง Prettier** hook จึงเงียบ (ไม่ error)
ถ้าอยากให้ auto-format ทำงาน: `npm i -D prettier` (ดู ADR-0002 ว่าทำไมยังไม่ลง)

## 5. รันโปรเจค

```bash
npm run dev     # http://localhost:3000
```

Gate ก่อนบอกเสร็จ: `npm run lint` · `npx tsc --noEmit` · `npm run build`

## 6. (ถ้าจะใช้) MCP — GitHub server

1. `cp .mcp.json.example .mcp.json` (`.mcp.json` ถูก gitignore)
2. สร้าง GitHub personal access token แล้วใส่ใน `.claude/settings.local.json`:
   ```json
   { "env": { "GITHUB_TOKEN": "ghp_xxx" } }
   ```
3. รีสตาร์ท session

## 7. Model / auth

โปรเจคนี้ใช้ auth/model ปกติของ Claude Code
ถ้าอยากตั้งค่า env เฉพาะเครื่อง → สร้าง `.claude/settings.local.json` (gitignore) เอง

---

## ไฟล์ที่ gitignore (สร้างใหม่ต่อเครื่อง)

- `.claude/settings.local.json` — env/ค่าเฉพาะเครื่อง (เช่น GITHUB_TOKEN)
- `.mcp.json` — config MCP จริง (คัดจาก `.mcp.json.example`)
- `CLAUDE.local.md` — note ส่วนตัวต่อเครื่อง (ถ้ามี)
