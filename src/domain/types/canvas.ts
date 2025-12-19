// Canvas state and types for the editor

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  pixelPerfect: boolean;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  minZoom: number;
  maxZoom: number;
}

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  imageData: ImageData | null;
}

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion";

export const BLEND_MODES: { id: BlendMode; name: string }[] = [
  { id: "normal", name: "Normal" },
  { id: "multiply", name: "Multiply" },
  { id: "screen", name: "Screen" },
  { id: "overlay", name: "Overlay" },
  { id: "darken", name: "Darken" },
  { id: "lighten", name: "Lighten" },
  { id: "color-dodge", name: "Color Dodge" },
  { id: "color-burn", name: "Color Burn" },
  { id: "hard-light", name: "Hard Light" },
  { id: "soft-light", name: "Soft Light" },
  { id: "difference", name: "Difference" },
  { id: "exclusion", name: "Exclusion" },
];

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  width: 64,
  height: 64,
  backgroundColor: "#FFFFFF",
  showGrid: true,
  gridSize: 1,
  gridColor: "#CCCCCC",
  pixelPerfect: true,
};

export const DEFAULT_VIEWPORT: ViewportState = {
  zoom: 8,
  panX: 0,
  panY: 0,
  minZoom: 1,
  maxZoom: 64,
};

export function createLayer(
  name: string,
  _width?: number,
  _height?: number
): CanvasLayer {
  // width and height are reserved for future ImageData initialization
  void _width;
  void _height;
  return {
    id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    visible: true,
    locked: false,
    opacity: 100,
    blendMode: "normal",
    imageData: null,
  };
}

// Zoom levels for step zoom
export const ZOOM_LEVELS = [1, 2, 4, 8, 16, 32, 64];

export function getNextZoomLevel(
  currentZoom: number,
  direction: "in" | "out"
): number {
  const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= currentZoom);

  if (direction === "in") {
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    return ZOOM_LEVELS[nextIndex] ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  } else {
    const prevIndex = Math.max(currentIndex - 1, 0);
    return ZOOM_LEVELS[prevIndex] ?? ZOOM_LEVELS[0];
  }
}

// Convert screen coordinates to canvas coordinates
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  containerRect: DOMRect,
  canvasSize: Size
): Point {
  // Calculate where the canvas is drawn (centered in container + pan offset)
  const canvasWidth = canvasSize.width * viewport.zoom;
  const canvasHeight = canvasSize.height * viewport.zoom;
  const offsetX = (containerRect.width - canvasWidth) / 2 + viewport.panX;
  const offsetY = (containerRect.height - canvasHeight) / 2 + viewport.panY;

  return {
    x: Math.floor((screenX - offsetX) / viewport.zoom),
    y: Math.floor((screenY - offsetY) / viewport.zoom),
  };
}

// Convert canvas coordinates to screen coordinates
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: ViewportState,
  canvasRect: DOMRect
): Point {
  const centerX = canvasRect.width / 2;
  const centerY = canvasRect.height / 2;

  return {
    x: canvasX * viewport.zoom + centerX + viewport.panX,
    y: canvasY * viewport.zoom + centerY + viewport.panY,
  };
}
