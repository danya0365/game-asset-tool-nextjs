import { LandingView } from "@/src/presentation/components/landing/LandingView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Asset Tool - เครื่องมือสร้าง Asset สำหรับเกม",
  description:
    "เว็บแอพสำหรับสร้างและจัดการ Texture, Tilemap, Tileset, Spritesheet สำหรับ Game Development",
};

export default function HomePage() {
  return <LandingView />;
}
