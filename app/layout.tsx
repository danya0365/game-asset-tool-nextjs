import { DEFAULT_TEMPLATE } from "@/src/domain/types/theme";
import { ThemeProvider } from "@/src/presentation/contexts/ThemeProvider";
import { ThemeScript } from "@/src/presentation/contexts/ThemeScript";
import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "../public/styles/index.css";

/* ชั้นที่ 1 ของระบบธีม — next/font ให้ CSS variable ที่ themes/*.css เอาไปชี้ต่อ
   (ของเดิมประกาศ @font-face ชี้ /fonts/MiSans_Thai/* ที่ไม่มีอยู่จริง → 404 เงียบๆ)
   mono ใช้ system stack — .ie-kbd แสดงแต่ shortcut ภาษาอังกฤษ ไม่คุ้มโหลดฟอนต์เพิ่ม */
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Game Asset Tool - เครื่องมือสร้าง Asset สำหรับเกม",
  description:
    "เว็บแอพสำหรับสร้างและจัดการ Texture, Tilemap, Tileset, Spritesheet สำหรับ Game Development รองรับ Export หลาย format เช่น Cocos Creator, Phaser, Unity",
  keywords: [
    "game asset",
    "texture packer",
    "tilemap editor",
    "spritesheet",
    "game development",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      // ThemeScript แก้ค่าสองอันนี้ฝั่ง client ก่อน hydrate → ต้อง suppress
      data-theme={DEFAULT_TEMPLATE}
      className={notoSansThai.variable}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased overflow-hidden">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
