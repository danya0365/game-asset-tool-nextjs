import { PixelEditorView } from "@/src/presentation/components/pixel-editor/PixelEditorView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixel Editor - Game Asset Tool",
  description:
    "Create pixel art with layers, zoom, pan, and grid. Perfect for game sprites and icons.",
};

export default function PixelEditorPage() {
  return <PixelEditorView />;
}
