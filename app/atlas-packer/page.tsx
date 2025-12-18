import { AtlasPackerView } from "@/src/presentation/components/atlas-packer/AtlasPackerView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atlas Packer - Game Asset Tool",
  description:
    "Pack multiple sprites into a single texture atlas. Export to Cocos Creator, Phaser, Unity and more.",
};

export default function AtlasPackerPage() {
  return <AtlasPackerView />;
}
