export interface SpriteFrame {
  id: string;
  name: string;
  file: File;
  image: HTMLImageElement | null;
  width: number;
  height: number;
  x: number;
  y: number;
  rotated: boolean;
  trimmed: boolean;
  sourceSize: { w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
}

export interface AtlasSettings {
  maxWidth: number;
  maxHeight: number;
  padding: number;
  powerOfTwo: boolean;
  allowRotation: boolean;
  trimAlpha: boolean;
  extrude: number;
  algorithm: "maxrects" | "shelf" | "basic";
}

export interface PackedAtlas {
  width: number;
  height: number;
  frames: SpriteFrame[];
}

export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  icon: string;
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { id: "json-array", name: "JSON Array", extension: "json", icon: "📋" },
  { id: "json-hash", name: "JSON Hash", extension: "json", icon: "📋" },
  { id: "cocos", name: "Cocos Creator", extension: "plist", icon: "🎮" },
  { id: "phaser", name: "Phaser 3", extension: "json", icon: "🎯" },
  { id: "unity", name: "Unity", extension: "json", icon: "🎲" },
  { id: "css", name: "CSS Sprites", extension: "css", icon: "🎨" },
];

export const DEFAULT_ATLAS_SETTINGS: AtlasSettings = {
  maxWidth: 2048,
  maxHeight: 2048,
  padding: 2,
  powerOfTwo: true,
  allowRotation: false,
  trimAlpha: false,
  extrude: 0,
  algorithm: "maxrects",
};
