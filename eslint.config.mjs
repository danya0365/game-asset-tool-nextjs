import { FlatCompat } from "@eslint/eslintrc";
import react from "eslint-plugin-react";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * สี Tailwind ดิบที่ห้ามใช้ — ต้องผ่าน semantic token เท่านั้น
 * (ดู public/styles/theme.css สำหรับ token ที่มีให้ใช้)
 */
const RAW_COLORS =
  "white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

const COLOR_PREFIX =
  "bg|text|border|ring|from|via|to|fill|stroke|divide|outline|shadow|accent|caret|decoration|placeholder";

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  /* ============================================================
     token-pure className — บังคับระบบธีม semantic (skill: nextjs-semantic-theme)
     ปรัชญา: กฎที่ tool บังคับแล้ว ไม่ต้องท่องจำ — พิมพ์ผิดแล้ว lint แดงทันที
     ============================================================ */
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    plugins: { react },
    rules: {
      /* ── inline style ── */
      "react/forbid-dom-props": [
        "error",
        {
          forbid: [
            {
              propName: "style",
              message:
                "ใช้ className + token แทน — style ได้เฉพาะค่า dynamic ตอน runtime (ผ่าน CSS var + eslint-disable ตรงจุด)",
            },
          ],
        },
      ],
      "react/forbid-component-props": [
        "error",
        {
          forbid: [
            { propName: "style", message: "ส่ง className แทน style ให้ component" },
          ],
        },
      ],

      "no-restricted-syntax": [
        "error",
        {
          /* 1) hex ใน arbitrary value: bg-[#f97316] */
          selector: "Literal[value=/\\[[^\\]]*#[0-9a-fA-F]{3,8}/]",
          message:
            "ห้าม hardcode hex ใน className — ย้ายค่าไป public/styles/themes/*.css แล้วใช้ utility (bg-brand-500, bg-chrome ฯลฯ)",
        },
        {
          /* 2) สี Tailwind ดิบ: bg-white / text-gray-500 / bg-red-500/20
             ⚠️ ห้ามใส่ `/` ใน regex — esquery ตัด selector ตรงนั้น (จะพังทั้ง config)
             ไม่ต้องมี group opacity เพราะ pattern หลักจับ `bg-red-500` ที่อยู่ใน `bg-red-500/20` อยู่แล้ว */
          selector: `Literal[value=/\\b(${COLOR_PREFIX})-(${RAW_COLORS})(-[0-9]{2,3})?\\b/]`,
          message:
            "ห้ามใช้สี Tailwind ดิบ — ใช้ semantic token: text-foreground / text-muted / bg-card / bg-chrome / border-border / bg-brand-* / text-success|warning|error / text-on-brand",
        },
        {
          /* 3) [var(--x)] = token ยังไม่ register */
          selector: "Literal[value=/\\[[^\\]]*var\\(--/]",
          message:
            "ห้าม [var(--token)] ใน className — ไป register token ใน public/styles/theme.css แล้วใช้ utility (rounded-md / shadow-md / bg-brand-500) · ค่า dynamic ตอน runtime เท่านั้นที่ยกเว้นได้ (+eslint-disable ตรงจุด)",
        },
        {
          /* 4a) template literal ที่มี ${...} */
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > TemplateLiteral[expressions.length>0]",
          message:
            'ห้าม interpolation ดิบใน className — ครอบ cn() แทน: cn("base", cond ? "a" : "b") · ไม่งั้น class ที่ชนกันจะโผล่ทั้งคู่ ไม่ merge',
        },
        {
          /* 4b) ternary ดิบ */
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > ConditionalExpression",
          message: 'ห้าม ternary ดิบใน className — ครอบ cn(): cn(cond ? "a" : "b")',
        },
        {
          /* 4c) &&/|| ดิบ */
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > LogicalExpression",
          message: 'ห้าม logical (&&/||) ดิบใน className — ครอบ cn(): cn(cond && "x")',
        },
      ],
    },
  },

  /* CSS ทั้งหมดต้องอยู่ใน public/styles/ — กันไฟล์ style หลุดเข้า app/ หรือ src/ */
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["*.css", "!**/public/styles/index.css"],
              message:
                "CSS ทั้งหมดอยู่ที่ public/styles/ และ import จุดเดียวใน app/layout.tsx เท่านั้น",
            },
          ],
        },
      ],
    },
  },

  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
