export interface Tile {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  collision?: boolean;
  animated?: boolean;
  frames?: number[];
  properties?: Record<string, unknown>;
}

export interface Tileset {
  id: string;
  name: string;
  image: HTMLImageElement | null;
  imageUrl: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  tiles: Tile[];
  spacing: number;
  margin: number;
}

export interface TilemapLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  data: number[][]; // 2D array of tile IDs (-1 = empty)
  type: "tile" | "collision" | "object";
}

export interface Tilemap {
  id: string;
  name: string;
  width: number; // in tiles
  height: number; // in tiles
  tileWidth: number;
  tileHeight: number;
  layers: TilemapLayer[];
  tilesets: Tileset[];
  backgroundColor?: string;
}

export interface TilemapEditorState {
  tilemap: Tilemap | null;
  activeTileset: Tileset | null;
  activeLayer: string | null;
  selectedTiles: number[]; // Array of selected tile IDs for multi-tile brush
  tool: TilemapTool;
  showGrid: boolean;
  zoom: number;
  pan: { x: number; y: number };
  isLoading: boolean;
  error: string | null;
}

export type TilemapTool = "pencil" | "eraser" | "bucket" | "select" | "picker";

export const TILE_SIZES = [8, 16, 32, 64] as const;

export const DEFAULT_TILEMAP: Omit<Tilemap, "id"> = {
  name: "Untitled Tilemap",
  width: 20,
  height: 15,
  tileWidth: 16,
  tileHeight: 16,
  layers: [],
  tilesets: [],
  backgroundColor: "#1a1a2e",
};

export const DEFAULT_LAYER: Omit<TilemapLayer, "id" | "data"> = {
  name: "Layer 1",
  visible: true,
  locked: false,
  opacity: 1,
  type: "tile",
};

export interface TilemapExportFormat {
  id: string;
  name: string;
  extension: string;
  icon: string;
}

export const TILEMAP_EXPORT_FORMATS: TilemapExportFormat[] = [
  { id: "json", name: "JSON", extension: "json", icon: "📋" },
  { id: "tiled", name: "Tiled (TMX)", extension: "tmx", icon: "🗺️" },
  { id: "csv", name: "CSV", extension: "csv", icon: "📊" },
];
