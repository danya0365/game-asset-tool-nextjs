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

// Brush pattern for multi-tile selection
export interface BrushTile {
  tileId: number;
  offsetX: number; // Relative X position from brush origin
  offsetY: number; // Relative Y position from brush origin
}

export interface BrushPattern {
  tiles: BrushTile[];
  width: number; // Width in tiles
  height: number; // Height in tiles
}

// Auto-tile configuration for terrain matching
export interface AutoTileRule {
  id: string;
  name: string;
  // Bitmask tiles: index represents neighbor configuration
  // Bit positions: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW
  tiles: {
    // 4-bit simplified (N, E, S, W only) - 16 tiles
    center: number; // 0b1111 - all sides connected
    single: number; // 0b0000 - no connections
    endN: number; // 0b0001 - only north
    endE: number; // 0b0010 - only east
    endS: number; // 0b0100 - only south
    endW: number; // 0b1000 - only west
    cornerNE: number; // 0b0011 - north + east
    cornerSE: number; // 0b0110 - south + east
    cornerSW: number; // 0b1100 - south + west
    cornerNW: number; // 0b1001 - north + west
    edgeN: number; // 0b1011 - all except north
    edgeE: number; // 0b1101 - all except east
    edgeS: number; // 0b0111 - all except south
    edgeW: number; // 0b1110 - all except west
    pipeH: number; // 0b1010 - horizontal pipe (W + E)
    pipeV: number; // 0b0101 - vertical pipe (N + S)
  };
  terrainId: number; // The "paint" tile ID that triggers this auto-tile
}

export interface AutoTileTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  // Grid position mapping for 4x4 or 3x3 tileset layout
  layout: "3x3" | "4x4" | "blob47";
}

// Tile Group for building variations (houses, trees, etc.)
export interface TileGroupPart {
  name: string; // "top", "middle", "bottom"
  tiles: BrushTile[];
  width: number;
  height: number;
  repeatable: boolean; // Can this part be repeated (like middle floors)
}

export interface TileGroup {
  id: string;
  name: string;
  parts: TileGroupPart[];
  previewTileId?: number; // First tile for preview
}

export interface TilemapEditorState {
  tilemap: Tilemap | null;
  activeTileset: Tileset | null;
  activeLayer: string | null;
  selectedTiles: number[]; // Array of selected tile IDs for multi-tile brush
  brushPattern: BrushPattern | null; // Multi-tile brush pattern
  tileGroups: TileGroup[]; // Saved tile groups for building variations
  activeTileGroup: TileGroup | null; // Currently selected tile group
  autoTileRules: AutoTileRule[]; // Auto-tile configurations
  activeAutoTileRule: AutoTileRule | null; // Currently active auto-tile rule
  tool: TilemapTool;
  showGrid: boolean;
  zoom: number;
  pan: { x: number; y: number };
  isLoading: boolean;
  error: string | null;
}

export type TilemapTool =
  | "pencil"
  | "eraser"
  | "bucket"
  | "select"
  | "picker"
  | "pan"
  | "autotile";

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
