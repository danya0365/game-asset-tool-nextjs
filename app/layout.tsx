import { ThemeProvider } from "@/src/presentation/contexts/ThemeProvider";
import type { Metadata } from "next";
import "../public/styles/index.css";

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
    <html lang="th" suppressHydrationWarning>
      <body className="antialiased overflow-hidden">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
