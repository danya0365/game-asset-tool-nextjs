"use client";

import type {
  AutoTileRule,
  BrushTile,
  TileGroup,
  TileGroupPart,
  Tilemap,
  TilemapEditorState,
  TilemapLayer,
  TilemapTool,
  Tileset,
} from "@/src/domain/types/tilemap";
import { DEFAULT_LAYER, DEFAULT_TILEMAP } from "@/src/domain/types/tilemap";
import { useCallback, useRef, useState } from "react";

const MAX_HISTORY_SIZE = 50;

interface HistoryEntry {
  layers: TilemapLayer[];
  description: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createEmptyLayerData(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array(width).fill(-1));
}

function cloneLayers(layers: TilemapLayer[]): TilemapLayer[] {
  return layers.map((layer) => ({
    ...layer,
    data: layer.data.map((row) => [...row]),
  }));
}

export function useTilemapEditor() {
  const [state, setState] = useState<TilemapEditorState>({
    tilemap: null,
    activeTileset: null,
    activeLayer: null,
    selectedTiles: [],
    brushPattern: null,
    tileGroups: [],
    activeTileGroup: null,
    autoTileRules: [],
    activeAutoTileRule: null,
    tool: "pencil",
    showGrid: true,
    zoom: 1,
    pan: { x: 0, y: 0 },
    isLoading: false,
    error: null,
  });

  // History for undo/redo
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);

  // Save current state to history
  const saveToHistory = useCallback(
    (description: string) => {
      if (!state.tilemap) return;

      const entry: HistoryEntry = {
        layers: cloneLayers(state.tilemap.layers),
        description,
      };

      // Remove any redo history after current index
      historyRef.current = historyRef.current.slice(
        0,
        historyIndexRef.current + 1
      );

      // Add new entry
      historyRef.current.push(entry);

      // Limit history size
      if (historyRef.current.length > MAX_HISTORY_SIZE) {
        historyRef.current.shift();
      } else {
        historyIndexRef.current++;
      }
    },
    [state.tilemap]
  );

  // Undo action
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0 || !state.tilemap) return false;

    historyIndexRef.current--;
    const entry = historyRef.current[historyIndexRef.current];

    if (entry) {
      setState((prev) => ({
        ...prev,
        tilemap: prev.tilemap
          ? { ...prev.tilemap, layers: cloneLayers(entry.layers) }
          : null,
      }));
      return true;
    }
    return false;
  }, [state.tilemap]);

  // Redo action
  const redo = useCallback(() => {
    if (
      historyIndexRef.current >= historyRef.current.length - 1 ||
      !state.tilemap
    )
      return false;

    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current];

    if (entry) {
      setState((prev) => ({
        ...prev,
        tilemap: prev.tilemap
          ? { ...prev.tilemap, layers: cloneLayers(entry.layers) }
          : null,
      }));
      return true;
    }
    return false;
  }, [state.tilemap]);

  // Check if undo/redo available
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // Create new tilemap
  const createTilemap = useCallback(
    (width: number, height: number, tileWidth: number, tileHeight: number) => {
      const layerId = generateId();
      setState((prev) => {
        const newTilemap: Tilemap = {
          ...DEFAULT_TILEMAP,
          id: generateId(),
          width,
          height,
          tileWidth,
          tileHeight,
          layers: [
            {
              ...DEFAULT_LAYER,
              id: layerId,
              data: createEmptyLayerData(width, height),
            },
          ],
          // Include existing activeTileset if any
          tilesets: prev.activeTileset ? [prev.activeTileset] : [],
        };

        return {
          ...prev,
          tilemap: newTilemap,
          activeLayer: layerId,
          error: null,
        };
      });
    },
    []
  );

  // Load tileset from image
  const loadTileset = useCallback(
    async (file: File, tileWidth: number, tileHeight: number) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const imageUrl = URL.createObjectURL(file);
        const image = await loadImage(imageUrl);

        const columns = Math.floor(image.width / tileWidth);
        const rows = Math.floor(image.height / tileHeight);

        const tileset: Tileset = {
          id: generateId(),
          name: file.name.replace(/\.[^/.]+$/, ""),
          image,
          imageUrl,
          tileWidth,
          tileHeight,
          columns,
          rows,
          tiles: [],
          spacing: 0,
          margin: 0,
        };

        // Generate tile data
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < columns; x++) {
            tileset.tiles.push({
              id: y * columns + x,
              x: x * tileWidth,
              y: y * tileHeight,
              width: tileWidth,
              height: tileHeight,
            });
          }
        }

        setState((prev) => ({
          ...prev,
          tilemap: prev.tilemap
            ? {
                ...prev.tilemap,
                tilesets: [...prev.tilemap.tilesets, tileset],
              }
            : prev.tilemap,
          activeTileset: tileset,
          isLoading: false,
        }));

        return tileset;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load tileset",
        }));
        return null;
      }
    },
    []
  );

  // Set active tileset
  const setActiveTileset = useCallback((tilesetId: string | Tileset | null) => {
    setState((prev) => {
      if (!prev.tilemap) return prev;
      if (typeof tilesetId === "string") {
        const tileset = prev.tilemap.tilesets.find((t) => t.id === tilesetId);
        if (!tileset) return prev;
        return {
          ...prev,
          activeTileset: tileset,
          selectedTiles: [], // Clear selection when switching tilesets
        };
      } else {
        return {
          ...prev,
          activeTileset: tilesetId,
        };
      }
    });
  }, []);

  // Remove tileset
  const removeTileset = useCallback((tilesetId: string) => {
    setState((prev) => {
      if (!prev.tilemap || prev.tilemap.tilesets.length <= 1) return prev;
      const newTilesets = prev.tilemap.tilesets.filter(
        (t) => t.id !== tilesetId
      );
      const needNewActive = prev.activeTileset?.id === tilesetId;
      return {
        ...prev,
        tilemap: {
          ...prev.tilemap,
          tilesets: newTilesets,
        },
        activeTileset: needNewActive ? newTilesets[0] : prev.activeTileset,
        selectedTiles: needNewActive ? [] : prev.selectedTiles,
      };
    });
  }, []);

  // Add new layer
  const addLayer = useCallback(
    (name: string, type: TilemapLayer["type"] = "tile") => {
      setState((prev) => {
        if (!prev.tilemap) return prev;

        const layerId = generateId();
        const newLayer: TilemapLayer = {
          ...DEFAULT_LAYER,
          id: layerId,
          name,
          type,
          data: createEmptyLayerData(prev.tilemap.width, prev.tilemap.height),
        };

        return {
          ...prev,
          tilemap: {
            ...prev.tilemap,
            layers: [...prev.tilemap.layers, newLayer],
          },
          activeLayer: layerId,
        };
      });
    },
    []
  );

  // Remove layer
  const removeLayer = useCallback((layerId: string) => {
    setState((prev) => {
      if (!prev.tilemap || prev.tilemap.layers.length <= 1) return prev;

      const newLayers = prev.tilemap.layers.filter((l) => l.id !== layerId);
      const newActiveLayer =
        prev.activeLayer === layerId
          ? newLayers[0]?.id || null
          : prev.activeLayer;

      return {
        ...prev,
        tilemap: {
          ...prev.tilemap,
          layers: newLayers,
        },
        activeLayer: newActiveLayer,
      };
    });
  }, []);

  // Toggle layer visibility
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setState((prev) => {
      if (!prev.tilemap) return prev;

      return {
        ...prev,
        tilemap: {
          ...prev.tilemap,
          layers: prev.tilemap.layers.map((l) =>
            l.id === layerId ? { ...l, visible: !l.visible } : l
          ),
        },
      };
    });
  }, []);

  // Set active layer
  const setActiveLayer = useCallback((layerId: string) => {
    setState((prev) => ({ ...prev, activeLayer: layerId }));
  }, []);

  // Select tiles for brush
  const selectTiles = useCallback((tileIds: number[]) => {
    setState((prev) => ({ ...prev, selectedTiles: tileIds }));
  }, []);

  // Select tiles area for multi-tile brush (from tileset grid coordinates)
  const selectTilesArea = useCallback(
    (startX: number, startY: number, endX: number, endY: number) => {
      setState((prev) => {
        if (!prev.activeTileset) return prev;

        // Normalize coordinates (ensure start < end)
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const tiles: BrushTile[] = [];
        const selectedTileIds: number[] = [];

        for (let dy = 0; dy < height; dy++) {
          for (let dx = 0; dx < width; dx++) {
            const tileX = minX + dx;
            const tileY = minY + dy;
            const tileId = tileY * prev.activeTileset.columns + tileX;

            if (tileId >= 0 && tileId < prev.activeTileset.tiles.length) {
              tiles.push({ tileId, offsetX: dx, offsetY: dy });
              selectedTileIds.push(tileId);
            }
          }
        }

        return {
          ...prev,
          selectedTiles: selectedTileIds,
          brushPattern: { tiles, width, height },
        };
      });
    },
    []
  );

  // Paint with brush pattern at position
  const paintBrush = useCallback((x: number, y: number) => {
    setState((prev) => {
      if (!prev.tilemap || !prev.activeLayer || !prev.brushPattern) return prev;

      const layerIndex = prev.tilemap.layers.findIndex(
        (l) => l.id === prev.activeLayer
      );
      if (layerIndex === -1) return prev;

      const layer = prev.tilemap.layers[layerIndex];
      if (layer.locked) return prev;

      // Create new data with brush pattern applied
      const newData = layer.data.map((row) => [...row]);

      for (const brushTile of prev.brushPattern.tiles) {
        const tileX = x + brushTile.offsetX;
        const tileY = y + brushTile.offsetY;

        if (
          tileX >= 0 &&
          tileX < prev.tilemap.width &&
          tileY >= 0 &&
          tileY < prev.tilemap.height
        ) {
          newData[tileY][tileX] = brushTile.tileId;
        }
      }

      const newLayers = [...prev.tilemap.layers];
      newLayers[layerIndex] = { ...layer, data: newData };

      return {
        ...prev,
        tilemap: {
          ...prev.tilemap,
          layers: newLayers,
        },
      };
    });
  }, []);

  // Paint tile at position
  const paintTile = useCallback((x: number, y: number, tileId: number) => {
    setState((prev) => {
      if (!prev.tilemap || !prev.activeLayer) return prev;

      const layerIndex = prev.tilemap.layers.findIndex(
        (l) => l.id === prev.activeLayer
      );
      if (layerIndex === -1) return prev;

      const layer = prev.tilemap.layers[layerIndex];
      if (layer.locked) return prev;
      if (
        x < 0 ||
        x >= prev.tilemap.width ||
        y < 0 ||
        y >= prev.tilemap.height
      ) {
        return prev;
      }

      const newData = layer.data.map((row, rowIndex) =>
        rowIndex === y
          ? row.map((cell, colIndex) => (colIndex === x ? tileId : cell))
          : row
      );

      const newLayers = [...prev.tilemap.layers];
      newLayers[layerIndex] = { ...layer, data: newData };

      return {
        ...prev,
        tilemap: {
          ...prev.tilemap,
          layers: newLayers,
        },
      };
    });
  }, []);

  // Erase tile at position
  const eraseTile = useCallback(
    (x: number, y: number) => {
      paintTile(x, y, -1);
    },
    [paintTile]
  );

  // Bucket fill
  const bucketFill = useCallback(
    (startX: number, startY: number, newTileId: number) => {
      setState((prev) => {
        if (!prev.tilemap || !prev.activeLayer) return prev;

        const layerIndex = prev.tilemap.layers.findIndex(
          (l) => l.id === prev.activeLayer
        );
        if (layerIndex === -1) return prev;

        const layer = prev.tilemap.layers[layerIndex];
        if (layer.locked) return prev;

        const width = prev.tilemap.width;
        const height = prev.tilemap.height;

        if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
          return prev;
        }

        const targetTileId = layer.data[startY][startX];
        if (targetTileId === newTileId) return prev;

        // Deep copy the data
        const newData = layer.data.map((row) => [...row]);

        // Flood fill algorithm
        const stack: [number, number][] = [[startX, startY]];
        const visited = new Set<string>();

        while (stack.length > 0) {
          const [x, y] = stack.pop()!;
          const key = `${x},${y}`;

          if (visited.has(key)) continue;
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          if (newData[y][x] !== targetTileId) continue;

          visited.add(key);
          newData[y][x] = newTileId;

          stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        const newLayers = [...prev.tilemap.layers];
        newLayers[layerIndex] = { ...layer, data: newData };

        return {
          ...prev,
          tilemap: {
            ...prev.tilemap,
            layers: newLayers,
          },
        };
      });
    },
    []
  );

  // Pick tile at position
  const pickTile = useCallback((x: number, y: number) => {
    setState((prev) => {
      if (!prev.tilemap || !prev.activeLayer) return prev;

      const layer = prev.tilemap.layers.find((l) => l.id === prev.activeLayer);
      if (!layer) return prev;

      if (
        x < 0 ||
        x >= prev.tilemap.width ||
        y < 0 ||
        y >= prev.tilemap.height
      ) {
        return prev;
      }

      const tileId = layer.data[y][x];
      if (tileId === -1) return prev;

      return {
        ...prev,
        selectedTiles: [tileId],
      };
    });
  }, []);

  // Set tool
  const setTool = useCallback((tool: TilemapTool) => {
    setState((prev) => ({ ...prev, tool }));
  }, []);

  // ===== TILE GROUP FUNCTIONS =====

  // Create a simple tile group from current brush pattern (for stamps like carpet, furniture, etc.)
  const createSimpleTileGroup = useCallback((name: string) => {
    setState((prev) => {
      if (!prev.brushPattern || prev.brushPattern.tiles.length === 0) {
        return prev;
      }

      const newGroup: TileGroup = {
        id: generateId(),
        name,
        parts: [
          {
            name: "main",
            tiles: [...prev.brushPattern.tiles],
            width: prev.brushPattern.width,
            height: prev.brushPattern.height,
            repeatable: false,
          },
        ],
        previewTileId: prev.brushPattern.tiles[0]?.tileId,
      };

      return {
        ...prev,
        tileGroups: [...prev.tileGroups, newGroup],
        activeTileGroup: newGroup,
      };
    });
  }, []);

  // Create a freeform tile group from custom tile array
  const createFreeformTileGroup = useCallback(
    (
      name: string,
      tiles: { tileId: number; offsetX: number; offsetY: number }[],
      width: number,
      height: number
    ) => {
      setState((prev) => {
        if (tiles.length === 0) return prev;

        const newGroup: TileGroup = {
          id: generateId(),
          name,
          parts: [
            {
              name: "main",
              tiles,
              width,
              height,
              repeatable: false,
            },
          ],
          previewTileId: tiles[0]?.tileId,
        };

        return {
          ...prev,
          tileGroups: [...prev.tileGroups, newGroup],
          activeTileGroup: newGroup,
        };
      });
    },
    []
  );

  // Create a new tile group from current brush pattern (for building variations)
  const createTileGroup = useCallback(
    (name: string, partName: string, repeatable: boolean = false) => {
      setState((prev) => {
        if (!prev.brushPattern || prev.brushPattern.tiles.length === 0) {
          return prev;
        }

        const newPart: TileGroupPart = {
          name: partName,
          tiles: [...prev.brushPattern.tiles],
          width: prev.brushPattern.width,
          height: prev.brushPattern.height,
          repeatable,
        };

        const newGroup: TileGroup = {
          id: generateId(),
          name,
          parts: [newPart],
          previewTileId: prev.brushPattern.tiles[0]?.tileId,
        };

        return {
          ...prev,
          tileGroups: [...prev.tileGroups, newGroup],
          activeTileGroup: newGroup,
        };
      });
    },
    []
  );

  // Add a part to an existing tile group
  const addTileGroupPart = useCallback(
    (groupId: string, partName: string, repeatable: boolean = false) => {
      setState((prev) => {
        if (!prev.brushPattern || prev.brushPattern.tiles.length === 0) {
          return prev;
        }

        const newPart: TileGroupPart = {
          name: partName,
          tiles: [...prev.brushPattern.tiles],
          width: prev.brushPattern.width,
          height: prev.brushPattern.height,
          repeatable,
        };

        return {
          ...prev,
          tileGroups: prev.tileGroups.map((g) =>
            g.id === groupId ? { ...g, parts: [...g.parts, newPart] } : g
          ),
        };
      });
    },
    []
  );

  // Delete a tile group
  const deleteTileGroup = useCallback((groupId: string) => {
    setState((prev) => ({
      ...prev,
      tileGroups: prev.tileGroups.filter((g) => g.id !== groupId),
      activeTileGroup:
        prev.activeTileGroup?.id === groupId ? null : prev.activeTileGroup,
    }));
  }, []);

  // Set active tile group
  const setActiveTileGroup = useCallback((group: TileGroup | null) => {
    setState((prev) => ({ ...prev, activeTileGroup: group }));
  }, []);

  // Paint tile group (simple stamp or building variations)
  const paintTileGroup = useCallback(
    (x: number, y: number, repeatCount: number = 0) => {
      setState((prev) => {
        if (!prev.tilemap || !prev.activeLayer || !prev.activeTileGroup) {
          return prev;
        }

        const layerIndex = prev.tilemap.layers.findIndex(
          (l) => l.id === prev.activeLayer
        );
        if (layerIndex === -1) return prev;

        const layer = prev.tilemap.layers[layerIndex];
        if (layer.locked) return prev;

        const newData = layer.data.map((row) => [...row]);
        const group = prev.activeTileGroup;

        // Check if this is a simple group (has "main" part)
        const mainPart = group.parts.find((p) => p.name === "main");
        if (mainPart) {
          // Simple stamp - just paint all tiles at their offsets
          for (const tile of mainPart.tiles) {
            const tileX = x + tile.offsetX;
            const tileY = y + tile.offsetY;
            if (
              tileX >= 0 &&
              tileX < prev.tilemap.width &&
              tileY >= 0 &&
              tileY < prev.tilemap.height
            ) {
              newData[tileY][tileX] = tile.tileId;
            }
          }

          const newLayers = [...prev.tilemap.layers];
          newLayers[layerIndex] = { ...layer, data: newData };

          return {
            ...prev,
            tilemap: {
              ...prev.tilemap,
              layers: newLayers,
            },
          };
        }

        // Building variations mode (top/middle/bottom parts)
        const topPart = group.parts.find((p) => p.name === "top");
        const middlePart = group.parts.find(
          (p) => p.name === "middle" && p.repeatable
        );
        const bottomPart = group.parts.find((p) => p.name === "bottom");

        let currentY = y;

        // Paint top part first (at the top visually, lowest Y)
        if (topPart) {
          for (const tile of topPart.tiles) {
            const tileX = x + tile.offsetX;
            const tileY = currentY + tile.offsetY;
            if (
              tileX >= 0 &&
              tileX < prev.tilemap.width &&
              tileY >= 0 &&
              tileY < prev.tilemap.height
            ) {
              newData[tileY][tileX] = tile.tileId;
            }
          }
          currentY += topPart.height;
        }

        // Paint middle parts (repeated)
        if (middlePart) {
          for (let i = 0; i < repeatCount; i++) {
            for (const tile of middlePart.tiles) {
              const tileX = x + tile.offsetX;
              const tileY = currentY + tile.offsetY;
              if (
                tileX >= 0 &&
                tileX < prev.tilemap.width &&
                tileY >= 0 &&
                tileY < prev.tilemap.height
              ) {
                newData[tileY][tileX] = tile.tileId;
              }
            }
            currentY += middlePart.height;
          }
        }

        // Paint bottom part last
        if (bottomPart) {
          for (const tile of bottomPart.tiles) {
            const tileX = x + tile.offsetX;
            const tileY = currentY + tile.offsetY;
            if (
              tileX >= 0 &&
              tileX < prev.tilemap.width &&
              tileY >= 0 &&
              tileY < prev.tilemap.height
            ) {
              newData[tileY][tileX] = tile.tileId;
            }
          }
        }

        const newLayers = [...prev.tilemap.layers];
        newLayers[layerIndex] = { ...layer, data: newData };

        return {
          ...prev,
          tilemap: {
            ...prev.tilemap,
            layers: newLayers,
          },
        };
      });
    },
    []
  );

  // Toggle grid
  const toggleGrid = useCallback(() => {
    setState((prev) => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  // Rename layer
  const renameLayer = useCallback((layerId: string, newName: string) => {
    setState((prev) => {
      if (!prev.tilemap) return prev;
      return {
        ...prev,
        tilemap: {
          ...prev.tilemap,
          layers: prev.tilemap.layers.map((l) =>
            l.id === layerId ? { ...l, name: newName } : l
          ),
        },
      };
    });
  }, []);

  // Clear layer (fill with empty tiles)
  const clearLayer = useCallback((layerId: string) => {
    setState((prev) => {
      if (!prev.tilemap) return prev;
      return {
        ...prev,
        tilemap: {
          ...prev.tilemap,
          layers: prev.tilemap.layers.map((l) =>
            l.id === layerId
              ? {
                  ...l,
                  data: createEmptyLayerData(
                    prev.tilemap!.width,
                    prev.tilemap!.height
                  ),
                }
              : l
          ),
        },
      };
    });
  }, []);

  // Move layer up/down
  const moveLayer = useCallback((layerId: string, direction: "up" | "down") => {
    setState((prev) => {
      if (!prev.tilemap) return prev;
      const layers = [...prev.tilemap.layers];
      const index = layers.findIndex((l) => l.id === layerId);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= layers.length) return prev;
      [layers[index], layers[newIndex]] = [layers[newIndex], layers[index]];
      return {
        ...prev,
        tilemap: { ...prev.tilemap, layers },
      };
    });
  }, []);

  // Zoom controls
  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.25, Math.min(4, zoom)) }));
  }, []);

  const zoomIn = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: Math.min(4, prev.zoom + 0.25) }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.25, prev.zoom - 0.25) }));
  }, []);

  const resetZoom = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }));
  }, []);

  // Pan controls
  const setPan = useCallback((pan: { x: number; y: number }) => {
    setState((prev) => ({ ...prev, pan }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Export formats
  type ExportFormat =
    | "json"
    | "tiled"
    | "csv"
    | "phaser"
    | "godot"
    | "ldtk"
    | "cocos";

  // Export tilemap to Custom JSON
  const exportToJson = useCallback((): string | null => {
    if (!state.tilemap) return null;

    const exportData = {
      name: state.tilemap.name,
      width: state.tilemap.width,
      height: state.tilemap.height,
      tileWidth: state.tilemap.tileWidth,
      tileHeight: state.tilemap.tileHeight,
      backgroundColor: state.tilemap.backgroundColor,
      layers: state.tilemap.layers.map((layer) => ({
        name: layer.name,
        type: layer.type,
        visible: layer.visible,
        opacity: layer.opacity,
        data: layer.data,
      })),
      tilesets: state.tilemap.tilesets.map((tileset) => ({
        name: tileset.name,
        imageUrl: tileset.imageUrl,
        tileWidth: tileset.tileWidth,
        tileHeight: tileset.tileHeight,
        columns: tileset.columns,
        rows: tileset.rows,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }, [state.tilemap]);

  // Export to Tiled JSON format (.json / .tmj)
  const exportToTiled = useCallback((): string | null => {
    if (!state.tilemap) return null;

    const tiledData = {
      compressionlevel: -1,
      height: state.tilemap.height,
      width: state.tilemap.width,
      infinite: false,
      nextlayerid: state.tilemap.layers.length + 1,
      nextobjectid: 1,
      orientation: "orthogonal",
      renderorder: "right-down",
      tiledversion: "1.10.2",
      tileheight: state.tilemap.tileHeight,
      tilewidth: state.tilemap.tileWidth,
      type: "map",
      version: "1.10",
      layers: state.tilemap.layers.map((layer, index) => ({
        id: index + 1,
        name: layer.name,
        type: "tilelayer",
        visible: layer.visible,
        opacity: layer.opacity,
        x: 0,
        y: 0,
        width: state.tilemap!.width,
        height: state.tilemap!.height,
        data: layer.data.flat().map((t) => (t === -1 ? 0 : t + 1)),
      })),
      tilesets: state.tilemap.tilesets.map((tileset, index) => ({
        firstgid: index === 0 ? 1 : index * tileset.columns * tileset.rows + 1,
        name: tileset.name,
        image: tileset.name + ".png",
        imagewidth: tileset.image?.width || tileset.columns * tileset.tileWidth,
        imageheight: tileset.image?.height || tileset.rows * tileset.tileHeight,
        tilewidth: tileset.tileWidth,
        tileheight: tileset.tileHeight,
        tilecount: tileset.columns * tileset.rows,
        columns: tileset.columns,
        margin: tileset.margin,
        spacing: tileset.spacing,
      })),
    };

    return JSON.stringify(tiledData, null, 2);
  }, [state.tilemap]);

  // Export to CSV format
  const exportToCsv = useCallback((): string | null => {
    if (!state.tilemap) return null;

    const csvParts: string[] = [];
    state.tilemap.layers.forEach((layer) => {
      csvParts.push(`# Layer: ${layer.name}`);
      layer.data.forEach((row) => {
        csvParts.push(row.join(","));
      });
      csvParts.push("");
    });

    return csvParts.join("\n");
  }, [state.tilemap]);

  // Export to Phaser 3 format
  const exportToPhaser = useCallback((): string | null => {
    if (!state.tilemap) return null;

    const phaserData = {
      name: state.tilemap.name,
      width: state.tilemap.width,
      height: state.tilemap.height,
      tileWidth: state.tilemap.tileWidth,
      tileHeight: state.tilemap.tileHeight,
      layers: state.tilemap.layers.map((layer) => ({
        name: layer.name,
        visible: layer.visible,
        alpha: layer.opacity,
        data: layer.data.flat().map((t) => (t === -1 ? 0 : t + 1)),
      })),
      tilesets: state.tilemap.tilesets.map((tileset, index) => ({
        name: tileset.name,
        image: tileset.name,
        firstgid: index === 0 ? 1 : index * tileset.columns * tileset.rows + 1,
        tileWidth: tileset.tileWidth,
        tileHeight: tileset.tileHeight,
        tileCount: tileset.columns * tileset.rows,
        columns: tileset.columns,
      })),
    };

    return JSON.stringify(phaserData, null, 2);
  }, [state.tilemap]);

  // Export to Godot TileMap resource format
  const exportToGodot = useCallback((): string | null => {
    if (!state.tilemap) return null;

    const lines: string[] = [
      '[gd_resource type="TileMap" format=3]',
      "",
      "[resource]",
      `tile_size = Vector2i(${state.tilemap.tileWidth}, ${state.tilemap.tileHeight})`,
    ];

    state.tilemap.layers.forEach((layer, layerIndex) => {
      lines.push(`layer_${layerIndex}/name = "${layer.name}"`);
      lines.push(`layer_${layerIndex}/enabled = ${layer.visible}`);

      const tileData: string[] = [];
      layer.data.forEach((row, y) => {
        row.forEach((tile, x) => {
          if (tile !== -1) {
            tileData.push(
              `Vector2i(${x}, ${y}): { "source_id": 0, "atlas_coords": Vector2i(${
                tile % (state.tilemap?.tilesets[0]?.columns || 1)
              }, ${Math.floor(
                tile / (state.tilemap?.tilesets[0]?.columns || 1)
              )}) }`
            );
          }
        });
      });

      if (tileData.length > 0) {
        lines.push(
          `layer_${layerIndex}/tile_data = { ${tileData.join(", ")} }`
        );
      }
    });

    return lines.join("\n");
  }, [state.tilemap]);

  // Export to LDtk format
  const exportToLdtk = useCallback((): string | null => {
    if (!state.tilemap) return null;

    const ldtkData = {
      __header__: {
        fileType: "LDtk Project JSON",
        app: "Game Asset Tool",
        appAuthor: "Custom Export",
        appVersion: "1.0.0",
      },
      jsonVersion: "1.5.3",
      defaultGridSize: state.tilemap.tileWidth,
      defaultPivotX: 0,
      defaultPivotY: 0,
      worldLayout: "Free",
      levels: [
        {
          identifier: state.tilemap.name || "Level_0",
          uid: 0,
          worldX: 0,
          worldY: 0,
          pxWid: state.tilemap.width * state.tilemap.tileWidth,
          pxHei: state.tilemap.height * state.tilemap.tileHeight,
          layerInstances: state.tilemap.layers.map((layer, index) => ({
            __identifier: layer.name,
            __type: "Tiles",
            __cWid: state.tilemap!.width,
            __cHei: state.tilemap!.height,
            __gridSize: state.tilemap!.tileWidth,
            visible: layer.visible,
            opacity: layer.opacity,
            gridTiles: layer.data.flatMap((row, y) =>
              row
                .map((tile, x) =>
                  tile !== -1
                    ? {
                        px: [
                          x * state.tilemap!.tileWidth,
                          y * state.tilemap!.tileHeight,
                        ],
                        src: [
                          (tile % (state.tilemap!.tilesets[0]?.columns || 1)) *
                            state.tilemap!.tileWidth,
                          Math.floor(
                            tile / (state.tilemap!.tilesets[0]?.columns || 1)
                          ) * state.tilemap!.tileHeight,
                        ],
                        t: tile,
                      }
                    : null
                )
                .filter(Boolean)
            ),
          })),
        },
      ],
      defs: {
        tilesets: state.tilemap.tilesets.map((tileset, uid) => ({
          identifier: tileset.name,
          uid,
          relPath: tileset.name + ".png",
          pxWid: tileset.image?.width || tileset.columns * tileset.tileWidth,
          pxHei: tileset.image?.height || tileset.rows * tileset.tileHeight,
          tileGridSize: tileset.tileWidth,
        })),
      },
    };

    return JSON.stringify(ldtkData, null, 2);
  }, [state.tilemap]);

  // Export to Cocos Creator format
  const exportToCocos = useCallback((): string | null => {
    if (!state.tilemap) return null;

    // Cocos Creator TiledMap compatible format
    const cocosData = {
      // TMX-like structure for Cocos Creator
      version: "1.0",
      orientation: "orthogonal",
      renderorder: "right-down",
      width: state.tilemap.width,
      height: state.tilemap.height,
      tilewidth: state.tilemap.tileWidth,
      tileheight: state.tilemap.tileHeight,
      infinite: false,
      nextlayerid: state.tilemap.layers.length + 1,
      nextobjectid: 1,
      layers: state.tilemap.layers.map((layer, index) => ({
        id: index + 1,
        name: layer.name,
        type: "tilelayer",
        visible: layer.visible,
        opacity: layer.opacity,
        x: 0,
        y: 0,
        width: state.tilemap!.width,
        height: state.tilemap!.height,
        // Cocos Creator uses 0 for empty tiles, 1-based index for tiles
        data: layer.data.flat().map((t) => (t === -1 ? 0 : t + 1)),
        encoding: "csv",
      })),
      tilesets: state.tilemap.tilesets.map((tileset, index) => ({
        firstgid: index === 0 ? 1 : index * tileset.columns * tileset.rows + 1,
        name: tileset.name,
        image: tileset.name + ".png",
        imagewidth: tileset.image?.width || tileset.columns * tileset.tileWidth,
        imageheight: tileset.image?.height || tileset.rows * tileset.tileHeight,
        tilewidth: tileset.tileWidth,
        tileheight: tileset.tileHeight,
        tilecount: tileset.columns * tileset.rows,
        columns: tileset.columns,
        margin: 0,
        spacing: 0,
      })),
      // Cocos Creator specific meta
      meta: {
        app: "Game Asset Tool",
        format: "Cocos Creator TileMap",
        version: "3.x",
      },
    };

    return JSON.stringify(cocosData, null, 2);
  }, [state.tilemap]);

  // Main export function
  const exportTilemap = useCallback(
    (
      format: ExportFormat
    ): { data: string | null; extension: string; mimeType: string } => {
      switch (format) {
        case "tiled":
          return {
            data: exportToTiled(),
            extension: ".tmj",
            mimeType: "application/json",
          };
        case "csv":
          return {
            data: exportToCsv(),
            extension: ".csv",
            mimeType: "text/csv",
          };
        case "phaser":
          return {
            data: exportToPhaser(),
            extension: ".json",
            mimeType: "application/json",
          };
        case "godot":
          return {
            data: exportToGodot(),
            extension: ".tres",
            mimeType: "text/plain",
          };
        case "ldtk":
          return {
            data: exportToLdtk(),
            extension: ".ldtk",
            mimeType: "application/json",
          };
        case "cocos":
          return {
            data: exportToCocos(),
            extension: ".tmj",
            mimeType: "application/json",
          };
        case "json":
        default:
          return {
            data: exportToJson(),
            extension: ".json",
            mimeType: "application/json",
          };
      }
    },
    [
      exportToJson,
      exportToTiled,
      exportToCsv,
      exportToPhaser,
      exportToGodot,
      exportToLdtk,
      exportToCocos,
    ]
  );

  // Import tilemap from JSON
  const importFromJson = useCallback(
    async (jsonString: string): Promise<boolean> => {
      try {
        const data = JSON.parse(jsonString);

        // Validate required fields
        if (!data.width || !data.height || !data.layers) {
          throw new Error("Invalid tilemap format: missing required fields");
        }

        // Load tilesets if present
        const loadedTilesets: Tileset[] = [];
        if (data.tilesets && Array.isArray(data.tilesets)) {
          for (const ts of data.tilesets) {
            const tileset: Tileset = {
              id: crypto.randomUUID(),
              name: ts.name || "Imported Tileset",
              imageUrl: ts.imageUrl || "",
              tileWidth: ts.tileWidth || data.tileWidth || 16,
              tileHeight: ts.tileHeight || data.tileHeight || 16,
              columns: ts.columns || 1,
              rows: ts.rows || 1,
              margin: ts.margin || 0,
              spacing: ts.spacing || 0,
              image: null,
              tiles: ts.tiles || [],
            };

            // Try to load the image if imageUrl is a data URL
            if (ts.imageUrl && ts.imageUrl.startsWith("data:")) {
              try {
                tileset.image = await loadImage(ts.imageUrl);
              } catch {
                console.warn("Failed to load tileset image");
              }
            }

            loadedTilesets.push(tileset);
          }
        }

        // Create layers from imported data
        const importedLayers: TilemapLayer[] = data.layers.map(
          (
            layer: {
              name?: string;
              type?: string;
              visible?: boolean;
              opacity?: number;
              data?: number[][] | number[];
            },
            index: number
          ) => {
            // Handle flat array data (convert to 2D)
            let layerData: number[][];
            if (Array.isArray(layer.data)) {
              if (Array.isArray(layer.data[0])) {
                // Already 2D array
                layerData = layer.data as number[][];
              } else {
                // Flat array, convert to 2D
                const flatData = layer.data as number[];
                layerData = [];
                for (let y = 0; y < data.height; y++) {
                  const row: number[] = [];
                  for (let x = 0; x < data.width; x++) {
                    const idx = y * data.width + x;
                    // Convert 1-based (Tiled format) to 0-based, 0 becomes -1 (empty)
                    const tile = flatData[idx] || 0;
                    row.push(tile === 0 ? -1 : tile - 1);
                  }
                  layerData.push(row);
                }
              }
            } else {
              // No data, create empty layer
              layerData = Array.from({ length: data.height }, () =>
                Array.from({ length: data.width }, () => -1)
              );
            }

            return {
              id: crypto.randomUUID(),
              name: layer.name || `Layer ${index + 1}`,
              type: (layer.type as "tile" | "collision" | "object") || "tile",
              visible: layer.visible !== false,
              locked: false,
              opacity: layer.opacity ?? 1,
              data: layerData,
            };
          }
        );

        // Create the tilemap
        const importedTilemap: Tilemap = {
          id: crypto.randomUUID(),
          name: data.name || "Imported Tilemap",
          width: data.width,
          height: data.height,
          tileWidth: data.tileWidth || data.tilewidth || 16,
          tileHeight: data.tileHeight || data.tileheight || 16,
          layers: importedLayers,
          tilesets: loadedTilesets,
          backgroundColor: data.backgroundColor,
        };

        setState((prev) => ({
          ...prev,
          tilemap: importedTilemap,
          activeLayerId: importedLayers[0]?.id || null,
          activeTilesetId: loadedTilesets[0]?.id || null,
          error: null,
        }));

        return true;
      } catch (error) {
        console.error("Import error:", error);
        setState((prev) => ({
          ...prev,
          error: `Import failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        }));
        return false;
      }
    },
    []
  );

  // Resize tilemap
  const resizeTilemap = useCallback((newWidth: number, newHeight: number) => {
    setState((prev) => {
      if (!prev.tilemap) return prev;

      const resizedLayers = prev.tilemap.layers.map((layer) => {
        const newData: number[][] = [];
        for (let y = 0; y < newHeight; y++) {
          const row: number[] = [];
          for (let x = 0; x < newWidth; x++) {
            row.push(
              y < layer.data.length && x < layer.data[y].length
                ? layer.data[y][x]
                : -1
            );
          }
          newData.push(row);
        }
        return { ...layer, data: newData };
      });

      return {
        ...prev,
        tilemap: {
          ...prev.tilemap,
          width: newWidth,
          height: newHeight,
          layers: resizedLayers,
        },
      };
    });
  }, []);

  // Create auto-tile rule from selected tiles (expects 16 tiles in specific order)
  const createAutoTileRule = useCallback(
    (name: string, tileIds: number[], terrainId: number) => {
      if (tileIds.length < 16) {
        console.warn("Auto-tile requires 16 tiles");
        return;
      }

      const rule: AutoTileRule = {
        id: generateId(),
        name,
        terrainId,
        tiles: {
          single: tileIds[0], // isolated
          endN: tileIds[1], // only north connected
          endE: tileIds[2], // only east connected
          cornerNE: tileIds[3], // north + east
          endS: tileIds[4], // only south connected
          pipeV: tileIds[5], // north + south (vertical)
          cornerSE: tileIds[6], // south + east
          edgeW: tileIds[7], // all except west (T-junction)
          endW: tileIds[8], // only west connected
          cornerNW: tileIds[9], // north + west
          pipeH: tileIds[10], // east + west (horizontal)
          edgeS: tileIds[11], // all except south
          cornerSW: tileIds[12], // south + west
          edgeE: tileIds[13], // all except east
          edgeN: tileIds[14], // all except north
          center: tileIds[15], // all sides connected
        },
      };

      setState((prev) => ({
        ...prev,
        autoTileRules: [...prev.autoTileRules, rule],
        activeAutoTileRule: rule,
      }));
    },
    []
  );

  // Delete auto-tile rule
  const deleteAutoTileRule = useCallback((ruleId: string) => {
    setState((prev) => ({
      ...prev,
      autoTileRules: prev.autoTileRules.filter((r) => r.id !== ruleId),
      activeAutoTileRule:
        prev.activeAutoTileRule?.id === ruleId ? null : prev.activeAutoTileRule,
    }));
  }, []);

  // Set active auto-tile rule
  const setActiveAutoTileRule = useCallback((rule: AutoTileRule | null) => {
    setState((prev) => ({ ...prev, activeAutoTileRule: rule }));
  }, []);

  // Get tile based on neighbor bitmask (4-bit: N=1, E=2, S=4, W=8)
  const getTileFromBitmask = useCallback(
    (rule: AutoTileRule, bitmask: number): number => {
      const { tiles } = rule;
      switch (bitmask) {
        case 0b0000:
          return tiles.single;
        case 0b0001:
          return tiles.endN;
        case 0b0010:
          return tiles.endE;
        case 0b0011:
          return tiles.cornerNE;
        case 0b0100:
          return tiles.endS;
        case 0b0101:
          return tiles.pipeV;
        case 0b0110:
          return tiles.cornerSE;
        case 0b0111:
          return tiles.edgeW;
        case 0b1000:
          return tiles.endW;
        case 0b1001:
          return tiles.cornerNW;
        case 0b1010:
          return tiles.pipeH;
        case 0b1011:
          return tiles.edgeS;
        case 0b1100:
          return tiles.cornerSW;
        case 0b1101:
          return tiles.edgeE;
        case 0b1110:
          return tiles.edgeN;
        case 0b1111:
          return tiles.center;
        default:
          return tiles.single;
      }
    },
    []
  );

  // Check if a tile belongs to an auto-tile rule
  const isAutoTileTerrain = useCallback(
    (tileId: number, rule: AutoTileRule): boolean => {
      const { tiles } = rule;
      return Object.values(tiles).includes(tileId);
    },
    []
  );

  // Calculate neighbor bitmask for auto-tile
  const calculateBitmask = useCallback(
    (
      x: number,
      y: number,
      layerData: number[][],
      rule: AutoTileRule
    ): number => {
      let bitmask = 0;
      const height = layerData.length;
      const width = layerData[0]?.length || 0;

      // Check north (bit 0)
      if (y > 0 && isAutoTileTerrain(layerData[y - 1][x], rule))
        bitmask |= 0b0001;
      // Check east (bit 1)
      if (x < width - 1 && isAutoTileTerrain(layerData[y][x + 1], rule))
        bitmask |= 0b0010;
      // Check south (bit 2)
      if (y < height - 1 && isAutoTileTerrain(layerData[y + 1][x], rule))
        bitmask |= 0b0100;
      // Check west (bit 3)
      if (x > 0 && isAutoTileTerrain(layerData[y][x - 1], rule))
        bitmask |= 0b1000;

      return bitmask;
    },
    [isAutoTileTerrain]
  );

  // Paint with auto-tile and update neighbors
  const paintAutoTile = useCallback(
    (x: number, y: number) => {
      setState((prev) => {
        if (!prev.tilemap || !prev.activeLayer || !prev.activeAutoTileRule)
          return prev;

        const rule = prev.activeAutoTileRule;
        const layerIndex = prev.tilemap.layers.findIndex(
          (l) => l.id === prev.activeLayer
        );
        if (layerIndex === -1) return prev;

        const layer = prev.tilemap.layers[layerIndex];
        if (
          x < 0 ||
          x >= prev.tilemap.width ||
          y < 0 ||
          y >= prev.tilemap.height
        )
          return prev;

        // Create a copy of the layer data
        const newData = layer.data.map((row) => [...row]);

        // Place the terrain marker first
        newData[y][x] = rule.tiles.center; // Temporary, will be updated

        // Update the placed tile and all neighbors
        const tilesToUpdate = [
          { x, y },
          { x, y: y - 1 }, // north
          { x: x + 1, y }, // east
          { x, y: y + 1 }, // south
          { x: x - 1, y }, // west
        ];

        for (const pos of tilesToUpdate) {
          if (
            pos.x >= 0 &&
            pos.x < prev.tilemap.width &&
            pos.y >= 0 &&
            pos.y < prev.tilemap.height
          ) {
            // Only update if this tile is part of the auto-tile terrain
            if (
              isAutoTileTerrain(newData[pos.y][pos.x], rule) ||
              (pos.x === x && pos.y === y)
            ) {
              const bitmask = calculateBitmask(pos.x, pos.y, newData, rule);
              newData[pos.y][pos.x] = getTileFromBitmask(rule, bitmask);
            }
          }
        }

        const newLayers = [...prev.tilemap.layers];
        newLayers[layerIndex] = { ...layer, data: newData };

        return {
          ...prev,
          tilemap: { ...prev.tilemap, layers: newLayers },
        };
      });
    },
    [calculateBitmask, getTileFromBitmask, isAutoTileTerrain]
  );

  return {
    ...state,
    createTilemap,
    loadTileset,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    setActiveLayer,
    setActiveTileset,
    removeTileset,
    selectTiles,
    selectTilesArea,
    paintTile,
    paintBrush,
    eraseTile,
    bucketFill,
    pickTile,
    setTool,
    toggleGrid,
    renameLayer,
    clearLayer,
    moveLayer,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setPan,
    clearError,
    exportToJson,
    exportTilemap,
    importFromJson,
    resizeTilemap,
    // Tile Group functions
    createSimpleTileGroup,
    createFreeformTileGroup,
    createTileGroup,
    addTileGroupPart,
    deleteTileGroup,
    setActiveTileGroup,
    paintTileGroup,
    // Auto-tile functions
    autoTileRules: state.autoTileRules,
    activeAutoTileRule: state.activeAutoTileRule,
    createAutoTileRule,
    deleteAutoTileRule,
    setActiveAutoTileRule,
    paintAutoTile,
    // Undo/Redo functions
    saveToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
