import { PhotoEditorView } from "@/src/presentation/components/photo-editor/PhotoEditorView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photo Editor - Game Asset Tool",
  description:
    "Crop, rotate and resize photos in the browser. Export JPEG, PNG or WebP without uploading anything.",
};

export default function PhotoEditorPage() {
  return <PhotoEditorView />;
}
