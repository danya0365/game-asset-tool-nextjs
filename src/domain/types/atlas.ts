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

export type SortMethod =
  | "none"
  | "name"
  | "name-desc"
  | "width"
  | "width-desc"
  | "height"
  | "height-desc"
  | "area"
  | "area-desc"
  | "perimeter"
  | "perimeter-desc";

export interface SortOption {
  id: SortMethod;
  name: string;
  icon: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { id: "none", name: "None (Original Order)", icon: "📝" },
  { id: "name", name: "Name (A-Z)", icon: "🔤" },
  { id: "name-desc", name: "Name (Z-A)", icon: "🔤" },
  { id: "width", name: "Width (Small → Large)", icon: "↔️" },
  { id: "width-desc", name: "Width (Large → Small)", icon: "↔️" },
  { id: "height", name: "Height (Small → Large)", icon: "↕️" },
  { id: "height-desc", name: "Height (Large → Small)", icon: "↕️" },
  { id: "area", name: "Area (Small → Large)", icon: "📐" },
  { id: "area-desc", name: "Area (Large → Small)", icon: "📐" },
  { id: "perimeter", name: "Perimeter (Small → Large)", icon: "🔲" },
  { id: "perimeter-desc", name: "Perimeter (Large → Small)", icon: "🔲" },
];

export type LayoutMode = "optimal" | "horizontal" | "vertical" | "grid";

export interface LayoutOption {
  id: LayoutMode;
  name: string;
  icon: string;
  description: string;
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: "optimal",
    name: "Optimal (MaxRects)",
    icon: "🧩",
    description: "Best space efficiency",
  },
  {
    id: "horizontal",
    name: "Horizontal Strip",
    icon: "➡️",
    description: "All sprites in a row",
  },
  {
    id: "vertical",
    name: "Vertical Strip",
    icon: "⬇️",
    description: "All sprites in a column",
  },
  {
    id: "grid",
    name: "Grid",
    icon: "⬜",
    description: "Sprites in a grid pattern",
  },
];

export interface AtlasSettings {
  maxWidth: number;
  maxHeight: number;
  padding: number;
  powerOfTwo: boolean;
  allowRotation: boolean;
  trimAlpha: boolean;
  extrude: number;
  algorithm: "maxrects" | "shelf" | "basic";
  sortMethod: SortMethod;
  layoutMode: LayoutMode;
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
  sortMethod: "name",
  layoutMode: "optimal",
};
