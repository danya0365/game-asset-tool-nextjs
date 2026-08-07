---
paths:
  - "app/**"
  - "src/**"
  - "public/styles/**"
---

# Frontend Rules — Next.js App Router (client-side canvas app)

> โหลดตอนแตะ frontend · ต่อยอดจาก [code-standards.md](code-standards.md) + [definition-of-done.md](definition-of-done.md)
> โครง = hexagonal-ish 3 ชั้น **ปรับให้ตรง repo นี้จริง** (ดู [ADR-0002](../memory/decisions/0002-frontend-structure.md) ว่าต่างจาก template ตรงไหน ทำไม)

## 0) เช็ค version ที่ติดตั้งจริงก่อนเขียน — **บังคับ**

Next/React version อาจต่างจากที่จำมา (breaking change) — **ห้ามเดาจากความจำ**

```bash
node -p "require('next/package.json').version"    # version ที่ติดตั้งจริง
node -p "require('react/package.json').version"
```

⚠️ **โปรเจคนี้ `node_modules` ไม่ตรงกับ lockfile** — `package.json`/`package-lock.json` ระบุ next **15.5.9**
แต่ที่ติดตั้งอยู่คือ **15.5.7** → ถ้าจะพึ่ง behavior ของ 15.5.9 (รวมถึง RSC CVE fix ที่ merge เข้ามา) **ต้อง `npm ci` ก่อน**

Next เวอร์ชันนี้**ไม่ได้แถม docs มาใน `node_modules`** — เช็ค API ที่ไม่มั่นใจจาก type จริง
(`node_modules/next/*.d.ts`, `node_modules/next/dist/`) หรือถามพี่ อย่าเขียนจากความจำแล้วเดาว่าถูก

## 1) Boundary

- **ไม่มี backend** — ทุกอย่างอยู่ใน browser: Canvas 2D, File API, `localStorage`, Web Worker (ถ้ามีวันหลัง)
  ถ้าวันหนึ่งจะต่อ service ข้างนอก **ต้องเขียน ADR ก่อน** เพราะทำลายจุดขาย "ไฟล์ไม่ออกจากเครื่อง"
- **type แชร์จาก `src/domain/types/`** ด้วย `import type` — ห้าม redefine shape ซ้ำในแต่ละ tool
- **No secret ใน client bundle** — ทุกอย่างที่นี่คือ client ถ้าวันหลังมี key เฉพาะ `NEXT_PUBLIC_*` ที่ตั้งใจให้ public เท่านั้น
- **ไฟล์ผู้ใช้เป็นข้อมูลส่วนตัว** — ห้าม log ชื่อไฟล์/เนื้อภาพ/`dataURL` ลง console หรือ telemetry

## 2) โครง 3 ชั้น — `app/` = routing เท่านั้น

> ⚠️ **`app/` มีได้แค่ route/metadata file** (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `favicon.ico`)
> — ห้ามมี component / hook / logic / `.css` / asset / folder อื่น

```
app/                       route เท่านั้น — page.tsx ต่อ tool + layout.tsx + favicon.ico
src/
  domain/types/            type/contract ล้วน — ไม่มี React ไม่มี browser API (center บริสุทธิ์)
  infrastructure/          adapter + algorithm หนัก:
    atlas/                   maxrects-packer.ts (packing) · atlas-exporter.ts (แปลงเป็น format ของ engine)
    storage/                 projectStorage.ts (localStorage: .gat project + recents)
  presentation/
    components/atoms|molecules|templates/   UI ใช้ซ้ำข้าม tool (Atomic Design)
    components/<tool>/                      UI เฉพาะ tool — 1 folder ต่อ 1 route
    hooks/                                  state + side-effect + Canvas/File API (ตัวขับ infrastructure)
    lib/                                    pure view helper — ไม่มี React ไม่มี side-effect (cn.ts)
    contexts/  stores/                      React provider · Zustand global state
public/styles/             CSS ทั้งหมด (ไม่ใช่ app/globals.css — ดู ADR-0002)
  theme.css                  ชั้น map @theme inline (var() ล้วน)
  themes/<id>.css            ค่าจริงต่อธีม — hex อยู่ที่นี่ที่เดียวในโปรเจค
  index.css  components.css  ie5.css
```

- ทิศพึ่งพา: **presentation → infrastructure → domain** (ห้ามย้อน ห้าม circular)
- **`domain/` ห้าม import** React / next / infrastructure / presentation
- **`infrastructure/` ห้าม import** presentation (แต่ import domain ได้)
- **component ห้ามเรียก `infrastructure/` ตรง** — ผ่าน hook เท่านั้น (side-effect รวมที่ hook ที่เดียว)
- **folder = kebab-case** ให้ตรงชื่อ route · **component export = PascalCase** · **hook = `use` + camelCase**
- ใน `app/` import ด้วย alias **`@/src/...`** (alias `@/*` ชี้ **repo root**) · ภายใน `src/` ใช้ relative

## 3) แยกความรับผิดชอบ — กัน God component

> **God component เปลือง re-render** (setState จุดเดียว → UI ทั้งก้อน render ใหม่แม้ส่วนที่ไม่เกี่ยว) + รีวิว/แก้ยาก
> แอปนี้เป็น canvas editor ที่ re-render บ่อยอยู่แล้ว — ปัญหานี้แพงกว่าแอปทั่วไป

- **type/contract → `domain/`** · **algorithm + I/O → `infrastructure/`** (unit test ได้ ไม่ต้องมี DOM)
- **state + effect + Canvas ref → `hooks/use<Feature>.ts`** · **UI → `components/<tool>/`**
- **View หลัก = orchestrator บางๆ** — ต่อ hook เข้ากับ sub-component (toolbar / canvas / panel / dialog แยกไฟล์)
- **panel/toolbar/dialog แยกเป็น component ของตัวเอง** = แยก re-render boundary
- style ที่ซ้ำ → primitive ใน `components/atoms|molecules/` หรือ class `ie-*`
- **1 หน่วย = 1 หน้าที่ — อย่าทำเกิน**

### หนี้ God component ที่มีอยู่จริง — **shrink-only**

ตัวเลข ณ 2026-08-07 · **ห้ามทำให้ยาวขึ้น** ถ้าแตะไฟล์เหล่านี้ ให้ถือโอกาสแยกส่วนที่แตะออกมาเป็น component/hook ใหม่

| ไฟล์ | บรรทัด |
| ---- | ------ |
| `components/tilemap-editor/TilemapEditorView.tsx` | **3,983** |
| `hooks/useTilemapEditor.ts` | 1,728 |
| `components/atlas-packer/AtlasPackerView.tsx` | 1,306 |
| `components/texture-editor/TextureEditorView.tsx` | 1,198 |

## 4) Client-side rules (แอปนี้ไม่มี server data)

Next 15 default = Server Component แต่ tool ทุกตัวเป็น interactive canvas → **View เป็น client**
สิ่งที่ต้องได้จากฝั่ง server มีอย่างเดียวคือ **`metadata` (SEO)** — เลยต้องแยกให้ถูก:

### Page pattern ที่ต้องการ

```tsx
// app/<tool>/page.tsx  — Server Component ไม่มี "use client"
import type { Metadata } from "next";
import { FooBarView } from "@/src/presentation/components/foo-bar/FooBarView";

export const metadata: Metadata = { title: "...", description: "..." };

export default function FooBarPage() {
  return <FooBarView />;
}
```

- **`page.tsx` ห้ามมี `"use client"`** — ใส่ `"use client"` ที่ `<Tool>View.tsx` แทน
- **ทุก page ต้อง `export const metadata`** — ถ้า page เป็น client จะ export ไม่ได้ = เสีย SEO ไปเลย
- **View export แบบ named** (`export function FooBarView`) ไม่ใช่ default

⚠️ ตอนนี้ **มีแค่ 4 จาก 10 หน้าที่ทำถูก** (`/`, `/atlas-packer`, `/color-palette`, `/pixel-editor`) —
รายละเอียดหน้าที่เหลือดู [[known-drift]] · **แตะหน้าไหนก็แก้หน้านั้นให้เข้ารูป** อย่าเพิ่มหน้าใหม่ที่ผิดรูป

### React 19 / hooks

- **ห้าม `setState` ใน effect เพื่อ fetch/init ตอน mount** — init canvas จาก event (`onLoad`, `onDrop`) หรือ ref callback
- **ห้ามเขียน `ref.current` ตอน render** — เขียนใน effect / event handler เท่านั้น
- Canvas ref + `ImageData` เป็น mutable state ที่อยู่นอก React — **อย่าเอาไปใส่ `useState`** ใช้ `useRef` แล้ว trigger re-render ด้วย state เล็กๆ แยก
- งานหนัก (pack, encode, batch) ที่บล็อก UI → คิดถึง Web Worker ก่อนจะยอมให้จอค้าง

### Resource ต้องปล่อย

- `URL.createObjectURL` → **ต้องมี `revokeObjectURL` คู่เสมอ** (เคยหลุดมาแล้วใน reduce-photo-size)
- `useEffect` ที่ผูก listener/animation frame ต้องมี cleanup ครบ
- batch หลายไฟล์ → อย่าถือ `Blob`/`ImageData` ทั้งชุดพร้อมกันถ้าไม่จำเป็น

## 5) Styling — ระบบ semantic theme (บังคับด้วย lint · ดู [ADR-0003](../memory/decisions/0003-semantic-theme.md))

### สถาปัตยกรรม 4 ชั้น — ห้ามข้ามชั้น

```
app/layout.tsx        next/font → --font-noto-thai            (ชั้นฟอนต์)
themes/ie5.css        ค่าจริง (hex) ต่อธีม :root + .dark      (ชั้น palette — hex อยู่ที่นี่ที่เดียว)
theme.css             @theme inline map token → utility        (var() ล้วน — ห้ามมี hex)
index.css             @import ตามลำดับ + @layer base           (entry)
```

⚠️ **ห้ามสลับลำดับ `@import`** — `tailwindcss` ต้องมาก่อนสุด
⚠️ CSS ทั้งหมดอยู่ **`public/styles/`** — ไม่มี `app/globals.css` (lint บังคับผ่าน `no-restricted-imports`)

### กฎเหล็กของ className — **lint จับให้ ไม่ต้องท่องจำ**

| ❌ ห้าม | ✅ ใช้แทน |
| ------ | -------- |
| `bg-[#c0c0c0]` (hex) | ย้ายค่าเข้า `themes/ie5.css` แล้วใช้ utility |
| `bg-white` `text-gray-500` (สี Tailwind ดิบ) | `bg-card` `text-muted` |
| `rounded-[var(--radius-md)]` | register token ใน `theme.css` → `rounded-md` |
| `` className={`p-2 ${on ? "a" : "b"}`} `` | `className={cn("p-2", on ? "a" : "b")}` |
| `style={{ color: "red" }}` | className + token |

**`cn()` อยู่ที่ [`src/presentation/lib/cn.ts`](../../src/presentation/lib/cn.ts)** — clsx + tailwind-merge
ที่สอนให้รู้จัก token ของโปรเจค (`extendTailwindMerge`) เพื่อให้ class ที่ชนกัน merge ถูก
⚠️ **เพิ่ม token ใน `theme.css` แล้วต้องไปเพิ่มชื่อใน `cn.ts` ด้วย** — twMerge อ่าน CSS เองไม่ได้

**ข้อยกเว้นเดียว = ค่า dynamic ตอน runtime** (สีที่ผู้ใช้เลือก, zoom, ขนาดจากภาพที่โหลด)
→ `style={{}}` ได้ พร้อม `// eslint-disable-next-line react/forbid-dom-props -- <เหตุผล>` ตรงจุด
ถ้า disable เยอะผิดปกติ = สัญญาณว่ายังมี token ที่ควร register แต่ยังไม่ register

### Token ที่มีให้ใช้

- **surface:** `background` `foreground` `card` `card-foreground` `muted` `muted-surface` `border` `ring`
- **IE5 chrome:** `chrome` `chrome-hover` `chrome-active` `chrome-pressed` `bevel-light` `bevel-shadow` `inset` `tooltip` `selection` `selection-foreground`
- **brand:** `brand-50`…`brand-900` + **`on-brand`** (ตัวอักษรบนพื้นสีอิ่มตัว — brand *และ* status)
- **accent:** `accent-100/400/500/600` · **status:** `success` `warning` `error` + `*-surface`
- **canvas:** `canvas` `canvas-grid` `overlay` `terminal` `terminal-foreground`
- **radius/shadow:** `rounded-sm/md/lg/xl/pill` `shadow-xs/sm/md/btn` (IE5 = มุมเหลี่ยม, เงาแข็ง)

ตารางเต็ม + ค่าจริงดู [`public/styles/theme.css`](../../public/styles/theme.css) และ [`themes/ie5.css`](../../public/styles/themes/ie5.css)

### dark mode

- **class-based** `@custom-variant dark (&:is(.dark *))` — ไม่ใช่ `prefers-color-scheme`
- token สลับค่าเองใน `[data-theme="ie5"].dark` ⇒ **ไม่ต้องเขียน `dark:` ใน className** และ
  **ไม่ต้องมี block `.dark .x` ใน CSS** (ของเดิมมี ~40 block — ตัดทิ้งหมดแล้ว)
- ThemeScript (inline blocking ใน `<head>`) apply ธีมก่อน first paint → ไม่มี FOUC
  ⚠️ **ห้ามแก้ ThemeProvider ให้บล็อกการ render รอ mount** — ของเดิมทำแบบนั้นแล้วเสีย SSR ทั้งหน้า

### เพิ่มธีมใหม่

สร้าง `public/styles/themes/<id>.css` (light + dark ครบทุก token) → `@import` ใน `index.css` →
เพิ่ม id ใน `THEME_TEMPLATES` ([`src/domain/types/theme.ts`](../../src/domain/types/theme.ts)) → เพิ่มปุ่มใน switcher
**ไม่ต้องแตะ component สักไฟล์**

### อื่นๆ

- **ใช้ class `ie-*` ที่มีอยู่แล้วก่อน** (`ie-window` `ie-panel` `ie-groupbox` `ie-button` `ie-listview` …) — เขียน utility ซ้ำเองทำให้ skin หลุดความสม่ำเสมอ
- **Full screen ห้าม scroll** — layout ใหม่ต้องไม่ทำให้ `body` เลื่อนได้ ใช้ flex/grid + `overflow` ภายใน panel

## 6) Enforce จริง

| กฎ | บังคับด้วย |
| --- | --------- |
| lint / react-hooks | ✅ `npm run lint` |
| **สีต้องผ่าน token (ห้าม hex / สีดิบ / `[var()]`)** | ✅ `npm run lint` (`no-restricted-syntax`) |
| **condition ใน className ต้องผ่าน `cn()`** | ✅ `npm run lint` |
| **ห้าม inline `style`** | ✅ `npm run lint` (`react/forbid-dom-props`) |
| **CSS ต้องอยู่ `public/styles/`** | ✅ `npm run lint` (`no-restricted-imports`) |
| type | ✅ `npx tsc --noEmit` |
| build + RSC boundary (`"use client"` ผิดที่) | ✅ `npm run build` |
| boundary ระหว่าง layer | ❌ **รีวิวเท่านั้น** (ยังไม่ลง dependency-cruiser) |
| ขนาดไฟล์ / God component | ❌ **รีวิวเท่านั้น** (ยังไม่เปิด `max-lines`) |
| `app/` มีแต่ route | ❌ **รีวิวเท่านั้น** (ยังไม่มี `check:app-routing`) |

> 3 ข้อล่างยัง**ไม่มีอะไรจับได้นอกจากคนอ่านโค้ด** — ถ้าเห็นหนี้เริ่มโต เสนอพี่ให้ลง dependency-cruiser + `max-lines`

**ก่อนบอกเสร็จ:** lint + tsc + build เขียว → **เปิด browser ลองจริง** (ภาพออกถูก, dark mode ถูก, ไม่ scroll, ไม่มี console error) ตาม [DoD](definition-of-done.md)
