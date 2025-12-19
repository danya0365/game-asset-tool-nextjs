import { ColorPaletteView } from "@/src/presentation/components/color-palette/ColorPaletteView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Color Palette - Game Asset Tool",
  description:
    "Create and manage color palettes for your game. Supports RGB/HSV/HEX, preset game palettes, and multiple export formats.",
};

export default function ColorPalettePage() {
  return <ColorPaletteView />;
}
