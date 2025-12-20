"use client";

import type {
  Tilemap,
  TilemapEditorState,
  TilemapLayer,
  TilemapTool,
  Tileset,
} from "@/src/domain/types/tilemap";
import { DEFAULT_LAYER, DEFAULT_TILEMAP } from "@/src/domain/types/tilemap";
import { useCallback, useState } from "react";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createEmptyLayerData(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array(width).fill(-1));
}

export function useTilemapEditor() {
  const [state, setState] = useState<TilemapEditorState>({
    tilemap: null,
    activeTileset: null,
    activeLayer: null,
    selectedTiles: [],
    tool: "pencil",
    showGrid: true,
    zoom: 1,
    pan: { x: 0, y: 0 },
    isLoading: false,
    error: null,
  });

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

  // Set active tileset
  const setActiveTileset = useCallback((tileset: Tileset | null) => {
    setState((prev) => ({ ...prev, activeTileset: tileset }));
  }, []);

  // Select tiles for brush
  const selectTiles = useCallback((tileIds: number[]) => {
    setState((prev) => ({ ...prev, selectedTiles: tileIds }));
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

  return {
    ...state,
    createTilemap,
    loadTileset,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    setActiveLayer,
    setActiveTileset,
    selectTiles,
    paintTile,
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
    resizeTilemap,
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
