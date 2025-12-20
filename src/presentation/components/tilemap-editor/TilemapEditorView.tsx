"use client";

import { TILE_SIZES } from "@/src/domain/types/tilemap";
import { Portal } from "@/src/presentation/components/atoms/Portal";
import { MainLayout } from "@/src/presentation/components/templates/MainLayout";
import { useTilemapEditor } from "@/src/presentation/hooks/useTilemapEditor";
import { useCallback, useEffect, useRef, useState } from "react";

export function TilemapEditorView() {
  const {
    tilemap,
    activeTileset,
    activeLayer,
    selectedTiles,
    tool,
    showGrid,
    zoom,
    pan,
    isLoading,
    error,
    brushPattern,
    tileGroups,
    activeTileGroup,
    createTilemap,
    loadTileset,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    setActiveLayer,
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
    zoomIn,
    zoomOut,
    resetZoom,
    setPan,
    clearError,
    exportToJson,
    exportTilemap,
    importFromJson,
    createSimpleTileGroup,
    createFreeformTileGroup,
    createTileGroup,
    addTileGroupPart,
    deleteTileGroup,
    setActiveTileGroup,
    paintTileGroup,
    // Auto-tile
    autoTileRules,
    activeAutoTileRule,
    createAutoTileRule,
    deleteAutoTileRule,
    setActiveAutoTileRule,
    paintAutoTile,
  } = useTilemapEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilesetCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Mini-map state
  const [showMinimap, setShowMinimap] = useState(true);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastDrawPos, setLastDrawPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // New tilemap dialog state
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newMapWidth, setNewMapWidth] = useState(20);
  const [newMapHeight, setNewMapHeight] = useState(15);
  const [newTileSize, setNewTileSize] = useState(16);

  // Tileset import dialog state
  const [showTilesetDialog, setShowTilesetDialog] = useState(false);
  const [tilesetFile, setTilesetFile] = useState<File | null>(null);
  const [tilesetTileWidth, setTilesetTileWidth] = useState(16);
  const [tilesetTileHeight, setTilesetTileHeight] = useState(16);
  const [tilesetPreviewUrl, setTilesetPreviewUrl] = useState<string | null>(
    null
  );

  // Hover position state
  const [hoverTilePos, setHoverTilePos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Layer rename state
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState("");

  // Space key pan state
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  // Tileset zoom state
  const [tilesetZoom, setTilesetZoom] = useState(1);

  // Tileset pan state
  const [tilesetPan, setTilesetPan] = useState({ x: 0, y: 0 });
  const [isTilesetPanning, setIsTilesetPanning] = useState(false);
  const [tilesetPanStart, setTilesetPanStart] = useState({ x: 0, y: 0 });
  const [tilesetPanMode, setTilesetPanMode] = useState(false);

  // Tileset drag selection state (for multi-tile brush)
  const [isTilesetDragging, setIsTilesetDragging] = useState(false);
  const [tilesetDragStart, setTilesetDragStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [tilesetDragEnd, setTilesetDragEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<
    "json" | "tiled" | "csv" | "phaser" | "godot" | "ldtk" | "cocos"
  >("cocos");

  // Tile Group dialog state
  const [showTileGroupDialog, setShowTileGroupDialog] = useState(false);
  const [tileGroupName, setTileGroupName] = useState("");
  const [tileGroupMode, setTileGroupMode] = useState<
    "simple" | "building" | "freeform"
  >("simple");
  // Freeform mode state
  const [freeformSize, setFreeformSize] = useState({ width: 5, height: 3 });
  const [freeformTiles, setFreeformTiles] = useState<(number | null)[][]>([]);
  const [freeformSelectedTile, setFreeformSelectedTile] = useState<
    number | null
  >(null);
  const [freeformAreaSelection, setFreeformAreaSelection] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isFreeformSelecting, setIsFreeformSelecting] = useState(false);
  const [freeformArrangeMode, setFreeformArrangeMode] = useState<
    "normal" | "transpose"
  >("normal");
  const [freeformRefImage, setFreeformRefImage] = useState<string | null>(null);
  const [freeformRefOpacity, setFreeformRefOpacity] = useState(0.5);
  const [freeformRefScale, setFreeformRefScale] = useState(1);
  const [freeformRefOffset, setFreeformRefOffset] = useState({ x: 0, y: 0 });
  const freeformRefInputRef = useRef<HTMLInputElement>(null);
  const tileGroupCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tileGroupSelection, setTileGroupSelection] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isTileGroupSelecting, setIsTileGroupSelecting] = useState(false);
  // Building mode parts
  const [buildingParts, setBuildingParts] = useState<{
    top: { startX: number; startY: number; endX: number; endY: number } | null;
    middle: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    } | null;
    bottom: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    } | null;
  }>({ top: null, middle: null, bottom: null });
  const [currentBuildingPart, setCurrentBuildingPart] = useState<
    "top" | "middle" | "bottom"
  >("top");
  const [buildingFloorCount, setBuildingFloorCount] = useState(1);

  // Auto-center canvas when tilemap is created
  useEffect(() => {
    if (tilemap && containerRef.current) {
      const container = containerRef.current;
      const canvasWidth = tilemap.width * tilemap.tileWidth;
      const canvasHeight = tilemap.height * tilemap.tileHeight;
      const centerX = (container.clientWidth - canvasWidth * zoom) / 2;
      const centerY = (container.clientHeight - canvasHeight * zoom) / 2;
      setPan({ x: Math.max(0, centerX), y: Math.max(0, centerY) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilemap?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key.toLowerCase()) {
        case "1":
        case "b":
          setTool("pencil");
          break;
        case "2":
        case "e":
          setTool("eraser");
          break;
        case "3":
        case "g":
          setTool("bucket");
          break;
        case "4":
        case "i":
          setTool("picker");
          break;
        case "h":
          toggleGrid();
          break;
        case " ":
          e.preventDefault();
          setIsSpaceDown(true);
          break;
        case "=":
        case "+":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "0":
          resetZoom();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setIsSpaceDown(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [setTool, toggleGrid, zoomIn, zoomOut, resetZoom]);

  // Render tilemap canvas
  useEffect(() => {
    if (!canvasRef.current || !tilemap) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Disable image smoothing for pixel art
    ctx.imageSmoothingEnabled = false;

    const canvasWidth = tilemap.width * tilemap.tileWidth;
    const canvasHeight = tilemap.height * tilemap.tileHeight;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear and fill background
    ctx.fillStyle = tilemap.backgroundColor || "#1a1a2e";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render layers
    tilemap.layers.forEach((layer) => {
      if (!layer.visible) return;

      ctx.globalAlpha = layer.opacity;

      for (let y = 0; y < tilemap.height; y++) {
        for (let x = 0; x < tilemap.width; x++) {
          const tileId = layer.data[y][x];
          if (tileId === -1) continue;

          // Find tile in active tileset
          const tileset = activeTileset || tilemap.tilesets[0];
          if (!tileset?.image) continue;

          const tile = tileset.tiles[tileId];
          if (!tile) continue;

          ctx.drawImage(
            tileset.image,
            tile.x,
            tile.y,
            tile.width,
            tile.height,
            x * tilemap.tileWidth,
            y * tilemap.tileHeight,
            tilemap.tileWidth,
            tilemap.tileHeight
          );
        }
      }

      ctx.globalAlpha = 1;
    });

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;

      for (let x = 0; x <= tilemap.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tilemap.tileWidth, 0);
        ctx.lineTo(x * tilemap.tileWidth, canvasHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= tilemap.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tilemap.tileHeight);
        ctx.lineTo(canvasWidth, y * tilemap.tileHeight);
        ctx.stroke();
      }
    }
  }, [tilemap, activeTileset, showGrid]);

  // Render tileset palette
  useEffect(() => {
    if (!tilesetCanvasRef.current || !activeTileset?.image) return;

    const canvas = tilesetCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = activeTileset.image.width;
    canvas.height = activeTileset.image.height;

    // Draw tileset image
    ctx.drawImage(activeTileset.image, 0, 0);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= activeTileset.columns; x++) {
      ctx.beginPath();
      ctx.moveTo(x * activeTileset.tileWidth, 0);
      ctx.lineTo(x * activeTileset.tileWidth, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= activeTileset.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * activeTileset.tileHeight);
      ctx.lineTo(canvas.width, y * activeTileset.tileHeight);
      ctx.stroke();
    }

    // Highlight selected tiles
    if (selectedTiles.length > 0) {
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;

      selectedTiles.forEach((tileId) => {
        const tile = activeTileset.tiles[tileId];
        if (tile) {
          ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
        }
      });
    }
  }, [activeTileset, selectedTiles]);

  // Render tileset in tile group dialog
  useEffect(() => {
    if (!showTileGroupDialog || !activeTileset?.image) return;

    const image = activeTileset.image;
    const { columns, rows, tileWidth, tileHeight } = activeTileset;

    // Small delay to ensure canvas is mounted
    const timer = setTimeout(() => {
      const canvas = tileGroupCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size
      canvas.width = columns * tileWidth;
      canvas.height = rows * tileHeight;

      // Draw tileset image
      ctx.drawImage(image, 0, 0);

      // Draw grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;

      for (let x = 0; x <= columns; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileWidth, 0);
        ctx.lineTo(x * tileWidth, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileHeight);
        ctx.lineTo(canvas.width, y * tileHeight);
        ctx.stroke();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [showTileGroupDialog, activeTileset, tileGroupMode]);

  // Draw mini-map
  useEffect(() => {
    if (!tilemap || !showMinimap || !minimapCanvasRef.current) return;

    const canvas = minimapCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate mini-map scale to fit in sidebar
    const maxWidth = 180;
    const scale = Math.min(maxWidth / (tilemap.width * tilemap.tileWidth), 1);

    canvas.width = tilemap.width * tilemap.tileWidth * scale;
    canvas.height = tilemap.height * tilemap.tileHeight * scale;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = tilemap.backgroundColor || "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each visible layer
    tilemap.layers
      .filter((layer) => layer.visible)
      .forEach((layer) => {
        layer.data.forEach((row, y) => {
          row.forEach((tileId, x) => {
            if (tileId >= 0 && activeTileset?.image) {
              const srcX =
                (tileId % activeTileset.columns) * activeTileset.tileWidth;
              const srcY =
                Math.floor(tileId / activeTileset.columns) *
                activeTileset.tileHeight;

              ctx.drawImage(
                activeTileset.image,
                srcX,
                srcY,
                activeTileset.tileWidth,
                activeTileset.tileHeight,
                x * tilemap.tileWidth * scale,
                y * tilemap.tileHeight * scale,
                tilemap.tileWidth * scale,
                tilemap.tileHeight * scale
              );
            }
          });
        });
      });

    // Draw viewport indicator
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const viewportX = (-pan.x / zoom) * scale;
      const viewportY = (-pan.y / zoom) * scale;
      const viewportW = (containerRect.width / zoom) * scale;
      const viewportH = (containerRect.height / zoom) * scale;

      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(viewportX, viewportY, viewportW, viewportH);
    }
  }, [tilemap, activeTileset, showMinimap, pan, zoom]);

  // Get tile position from mouse event
  const getTilePos = useCallback(
    (e: React.MouseEvent) => {
      if (!tilemap || !containerRef.current) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      const tileX = Math.floor(x / tilemap.tileWidth);
      const tileY = Math.floor(y / tilemap.tileHeight);

      return { x: tileX, y: tileY };
    },
    [tilemap, zoom, pan]
  );

  // Handle canvas mouse events
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button, Space+Left click, or Pan tool with left click for panning
      if (
        e.button === 1 ||
        (e.button === 0 && isSpaceDown) ||
        (e.button === 0 && tool === "pan")
      ) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }

      // Right click to erase
      if (e.button === 2) {
        e.preventDefault();
        const pos = getTilePos(e);
        if (pos) {
          setIsDrawing(true);
          setLastDrawPos(pos);
          eraseTile(pos.x, pos.y);
        }
        return;
      }

      if (e.button !== 0) return;

      const pos = getTilePos(e);
      if (!pos) return;

      setIsDrawing(true);
      setLastDrawPos(pos);

      if (tool === "pencil") {
        // Use tile group if active, otherwise brush pattern or single tile
        if (activeTileGroup) {
          // Check if building group (has repeatable middle part)
          const hasRepeatable = activeTileGroup.parts.some((p) => p.repeatable);
          paintTileGroup(pos.x, pos.y, hasRepeatable ? buildingFloorCount : 0);
        } else if (brushPattern && brushPattern.tiles.length > 1) {
          paintBrush(pos.x, pos.y);
        } else if (selectedTiles.length > 0) {
          paintTile(pos.x, pos.y, selectedTiles[0]);
        }
      } else if (tool === "eraser") {
        eraseTile(pos.x, pos.y);
      } else if (tool === "bucket" && selectedTiles.length > 0) {
        bucketFill(pos.x, pos.y, selectedTiles[0]);
      } else if (tool === "picker") {
        pickTile(pos.x, pos.y);
      } else if (tool === "autotile" && activeAutoTileRule) {
        paintAutoTile(pos.x, pos.y);
      }
    },
    [
      tool,
      selectedTiles,
      brushPattern,
      activeTileGroup,
      buildingFloorCount,
      activeAutoTileRule,
      pan,
      isSpaceDown,
      getTilePos,
      paintTile,
      paintBrush,
      paintTileGroup,
      eraseTile,
      bucketFill,
      pickTile,
      paintAutoTile,
    ]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Always update hover position
      const pos = getTilePos(e);
      if (pos && tilemap) {
        if (
          pos.x >= 0 &&
          pos.x < tilemap.width &&
          pos.y >= 0 &&
          pos.y < tilemap.height
        ) {
          setHoverTilePos(pos);
        } else {
          setHoverTilePos(null);
        }
      }

      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
      }

      if (!isDrawing) return;

      if (
        !pos ||
        (lastDrawPos && pos.x === lastDrawPos.x && pos.y === lastDrawPos.y)
      ) {
        return;
      }

      setLastDrawPos(pos);

      // Support right-click drag erase
      if (tool === "pencil" && selectedTiles.length > 0) {
        // Use brush pattern if available, otherwise single tile
        if (brushPattern && brushPattern.tiles.length > 1) {
          paintBrush(pos.x, pos.y);
        } else {
          paintTile(pos.x, pos.y, selectedTiles[0]);
        }
      } else if (tool === "eraser" || e.buttons === 2) {
        eraseTile(pos.x, pos.y);
      } else if (tool === "autotile" && activeAutoTileRule) {
        paintAutoTile(pos.x, pos.y);
      }
    },
    [
      isPanning,
      isDrawing,
      lastDrawPos,
      tool,
      selectedTiles,
      brushPattern,
      activeAutoTileRule,
      panStart,
      getTilePos,
      paintTile,
      paintBrush,
      paintAutoTile,
      eraseTile,
      setPan,
      tilemap,
    ]
  );

  // Prevent context menu on canvas
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleCanvasMouseLeave = useCallback(() => {
    setIsPanning(false);
    setIsDrawing(false);
    setLastDrawPos(null);
    setHoverTilePos(null);
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDrawing(false);
    setLastDrawPos(null);
  }, []);

  const handleCanvasWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    },
    [zoomIn, zoomOut]
  );

  // Get tileset tile position from mouse event
  const getTilesetTilePos = useCallback(
    (e: React.MouseEvent) => {
      if (!activeTileset || !tilesetCanvasRef.current) return null;
      // getBoundingClientRect already accounts for CSS transforms (scale + translate)
      // So we just need to get the position relative to the canvas and divide by zoom
      const rect = tilesetCanvasRef.current.getBoundingClientRect();
      // Position relative to the scaled canvas
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      // Convert to original (unscaled) coordinates
      const x = relX / tilesetZoom;
      const y = relY / tilesetZoom;
      const tileX = Math.floor(x / activeTileset.tileWidth);
      const tileY = Math.floor(y / activeTileset.tileHeight);
      return { x: tileX, y: tileY };
    },
    [activeTileset, tilesetZoom]
  );

  // Handle tileset mouse down for drag selection
  const handleTilesetSelectionStart = useCallback(
    (e: React.MouseEvent) => {
      if (tilesetPanMode || e.button !== 0) return;
      const pos = getTilesetTilePos(e);
      if (pos) {
        setIsTilesetDragging(true);
        setTilesetDragStart(pos);
        setTilesetDragEnd(pos);
      }
    },
    [tilesetPanMode, getTilesetTilePos]
  );

  // Handle tileset mouse move for drag selection
  const handleTilesetSelectionMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isTilesetDragging) return;
      const pos = getTilesetTilePos(e);
      if (pos) {
        setTilesetDragEnd(pos);
      }
    },
    [isTilesetDragging, getTilesetTilePos]
  );

  // Handle tileset mouse up to complete drag selection
  const handleTilesetSelectionEnd = useCallback(() => {
    if (!isTilesetDragging || !tilesetDragStart || !tilesetDragEnd) {
      setIsTilesetDragging(false);
      return;
    }
    // Select tiles in the area
    selectTilesArea(
      tilesetDragStart.x,
      tilesetDragStart.y,
      tilesetDragEnd.x,
      tilesetDragEnd.y
    );
    setIsTilesetDragging(false);
  }, [isTilesetDragging, tilesetDragStart, tilesetDragEnd, selectTilesArea]);

  // Handle tileset click to select single tile (fallback)
  const handleTilesetClick = useCallback(() => {
    if (tilesetPanMode) return;
    if (!activeTileset || !tilesetCanvasRef.current) return;
    // If drag distance is small, treat as single click
    if (tilesetDragStart && tilesetDragEnd) {
      if (
        tilesetDragStart.x === tilesetDragEnd.x &&
        tilesetDragStart.y === tilesetDragEnd.y
      ) {
        const tileId =
          tilesetDragStart.y * activeTileset.columns + tilesetDragStart.x;
        if (tileId >= 0 && tileId < activeTileset.tiles.length) {
          selectTiles([tileId]);
        }
      }
    }
  }, [
    activeTileset,
    selectTiles,
    tilesetPanMode,
    tilesetDragStart,
    tilesetDragEnd,
  ]);

  // Handle new tilemap creation
  const handleCreateTilemap = useCallback(() => {
    createTilemap(newMapWidth, newMapHeight, newTileSize, newTileSize);
    setShowNewDialog(false);
  }, [createTilemap, newMapWidth, newMapHeight, newTileSize]);

  // Handle tileset file selection
  const handleTilesetFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setTilesetFile(file);
        setTilesetPreviewUrl(URL.createObjectURL(file));
        setShowTilesetDialog(true);
      }
    },
    []
  );

  // Handle tileset import
  const handleImportTileset = useCallback(async () => {
    if (!tilesetFile) return;
    await loadTileset(tilesetFile, tilesetTileWidth, tilesetTileHeight);
    setShowTilesetDialog(false);
    setTilesetFile(null);
    setTilesetPreviewUrl(null);
  }, [tilesetFile, tilesetTileWidth, tilesetTileHeight, loadTileset]);

  // Handle export with format
  const handleExportWithFormat = useCallback(() => {
    const result = exportTilemap(exportFormat);
    if (!result.data) return;

    const blob = new Blob([result.data], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tilemap?.name || "tilemap"}${result.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  }, [exportTilemap, exportFormat, tilemap?.name]);

  // Handle tileset wheel zoom
  const handleTilesetWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setTilesetZoom((z) => Math.max(0.25, Math.min(4, z + delta)));
  }, []);

  // Handle tileset pan start (middle mouse, right click, or left click in pan mode)
  const handleTilesetMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.button === 1 ||
        e.button === 2 ||
        (e.button === 0 && tilesetPanMode)
      ) {
        e.preventDefault();
        setIsTilesetPanning(true);
        setTilesetPanStart({
          x: e.clientX - tilesetPan.x,
          y: e.clientY - tilesetPan.y,
        });
      }
    },
    [tilesetPan, tilesetPanMode]
  );

  // Handle tileset pan move
  const handleTilesetMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isTilesetPanning) {
        setTilesetPan({
          x: e.clientX - tilesetPanStart.x,
          y: e.clientY - tilesetPanStart.y,
        });
      }
    },
    [isTilesetPanning, tilesetPanStart]
  );

  // Handle tileset pan end
  const handleTilesetMouseUp = useCallback(() => {
    setIsTilesetPanning(false);
  }, []);

  // Handle tileset context menu (prevent default)
  const handleTilesetContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <MainLayout title="Tilemap Editor - Game Asset Tool">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 ie-panel p-3 bg-red-100 border-red-500 max-w-sm">
          <div className="flex items-start gap-2">
            <span className="text-red-500">⚠️</span>
            <div className="flex-1">
              <div className="font-bold text-red-700 text-sm">Error</div>
              <div className="text-red-600 text-xs">{error}</div>
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row h-full">
        {/* Left Panel - Tileset & Layers */}
        <div className="w-full lg:w-56 xl:w-64 shrink-0 flex flex-col ie-panel m-0.5 lg:m-1">
          {/* Tileset Palette */}
          <div className="ie-groupbox flex-1 flex flex-col min-h-0">
            <span className="ie-groupbox-title">Tileset</span>
            <div
              className="ie-panel-inset flex-1 overflow-hidden ie-scrollbar -mt-2 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2210%22%3E%3Crect%20width%3D%225%22%20height%3D%225%22%20fill%3D%22%23444%22%2F%3E%3Crect%20x%3D%225%22%20y%3D%225%22%20width%3D%225%22%20height%3D%225%22%20fill%3D%22%23444%22%2F%3E%3C%2Fsvg%3E')]"
              onWheel={handleTilesetWheel}
              onMouseDown={(e) => {
                handleTilesetMouseDown(e);
                handleTilesetSelectionStart(e);
              }}
              onMouseMove={(e) => {
                handleTilesetMouseMove(e);
                handleTilesetSelectionMove(e);
              }}
              onMouseUp={() => {
                handleTilesetMouseUp();
                handleTilesetSelectionEnd();
              }}
              onMouseLeave={() => {
                handleTilesetMouseUp();
                handleTilesetSelectionEnd();
              }}
              onContextMenu={handleTilesetContextMenu}
            >
              {activeTileset ? (
                <div
                  style={{
                    transform: `translate(${tilesetPan.x}px, ${tilesetPan.y}px) scale(${tilesetZoom})`,
                    transformOrigin: "0 0",
                    cursor: isTilesetPanning
                      ? "grabbing"
                      : tilesetPanMode
                      ? "grab"
                      : "pointer",
                  }}
                >
                  <canvas
                    ref={tilesetCanvasRef}
                    style={{ imageRendering: "pixelated" }}
                    onClick={handleTilesetClick}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-xs p-4 text-center">
                  No tileset loaded
                  <br />
                  Click &quot;Load Tileset&quot; to import
                </div>
              )}
            </div>
            {/* Tileset Controls */}
            <div className="flex gap-1 mt-2 flex-wrap">
              <button
                className="ie-button ie-button-sm flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Load
              </button>
              <button
                className={`ie-button ie-button-sm px-1.5 ${
                  tilesetPanMode ? "ie-button-active" : ""
                }`}
                onClick={() => setTilesetPanMode((m) => !m)}
                disabled={!activeTileset}
                title={
                  tilesetPanMode ? "Select Mode (Click)" : "Pan Mode (Hand)"
                }
              >
                {tilesetPanMode ? "✋" : "👆"}
              </button>
              <button
                className="ie-button ie-button-sm px-1"
                onClick={() => setTilesetZoom((z) => Math.max(0.5, z - 0.5))}
                disabled={!activeTileset}
                title="Zoom Out Tileset"
              >
                -
              </button>
              <span className="text-xs flex items-center w-8 justify-center">
                {Math.round(tilesetZoom * 100)}%
              </span>
              <button
                className="ie-button ie-button-sm px-1"
                onClick={() => setTilesetZoom((z) => Math.min(4, z + 0.5))}
                disabled={!activeTileset}
                title="Zoom In Tileset"
              >
                +
              </button>
              <button
                className="ie-button ie-button-sm px-1"
                onClick={() => {
                  setTilesetZoom(1);
                  setTilesetPan({ x: 0, y: 0 });
                }}
                disabled={!activeTileset}
                title="Reset View"
              >
                ↺
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleTilesetFileChange}
              onClick={(e) => {
                // Reset value to allow selecting the same file again
                (e.target as HTMLInputElement).value = "";
              }}
            />
          </div>

          {/* Layers Panel */}
          <div className="ie-groupbox mt-1">
            <span className="ie-groupbox-title">Layers</span>
            <div className="ie-panel-inset max-h-40 overflow-auto ie-scrollbar -mt-2">
              {tilemap?.layers.map((layer, index) => (
                <div
                  key={layer.id}
                  className={`flex items-center gap-1 p-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                    activeLayer === layer.id
                      ? "bg-blue-100 dark:bg-blue-900"
                      : ""
                  }`}
                  onClick={() => setActiveLayer(layer.id)}
                >
                  <button
                    className="text-xs opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                    title={layer.visible ? "Hide" : "Show"}
                  >
                    {layer.visible ? "👁️" : "🚫"}
                  </button>
                  {editingLayerId === layer.id ? (
                    <input
                      type="text"
                      className="ie-input flex-1 text-xs py-0"
                      value={editingLayerName}
                      onChange={(e) => setEditingLayerName(e.target.value)}
                      onBlur={() => {
                        if (editingLayerName.trim()) {
                          renameLayer(layer.id, editingLayerName.trim());
                        }
                        setEditingLayerId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (editingLayerName.trim()) {
                            renameLayer(layer.id, editingLayerName.trim());
                          }
                          setEditingLayerId(null);
                        } else if (e.key === "Escape") {
                          setEditingLayerId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="flex-1 text-xs truncate"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingLayerId(layer.id);
                        setEditingLayerName(layer.name);
                      }}
                      title="Double-click to rename"
                    >
                      {layer.name}
                    </span>
                  )}
                  <div className="flex gap-0.5">
                    <button
                      className="text-xs opacity-50 hover:opacity-100 disabled:opacity-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, "up");
                      }}
                      disabled={index === 0}
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      className="text-xs opacity-50 hover:opacity-100 disabled:opacity-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, "down");
                      }}
                      disabled={index === tilemap.layers.length - 1}
                      title="Move Down"
                    >
                      ▼
                    </button>
                    {tilemap.layers.length > 1 && (
                      <button
                        className="text-xs text-red-500 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLayer(layer.id);
                        }}
                        title="Delete Layer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              <button
                className="ie-button ie-button-sm flex-1"
                onClick={() =>
                  addLayer(`Layer ${(tilemap?.layers.length || 0) + 1}`)
                }
                disabled={!tilemap}
              >
                + Add
              </button>
              <button
                className="ie-button ie-button-sm"
                onClick={() => activeLayer && clearLayer(activeLayer)}
                disabled={!activeLayer}
                title="Clear Layer"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Tile Groups Panel */}
          <div className="ie-groupbox mt-1">
            <span className="ie-groupbox-title">Tile Groups</span>
            <div className="ie-panel-inset max-h-32 overflow-auto ie-scrollbar -mt-2">
              {tileGroups.length === 0 ? (
                <div className="text-xs text-gray-500 p-2 text-center">
                  No groups saved
                  <br />
                  Select tiles then click 🏠
                </div>
              ) : (
                tileGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`flex items-center justify-between p-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                      activeTileGroup?.id === group.id
                        ? "bg-blue-100 dark:bg-blue-900"
                        : ""
                    }`}
                    onClick={() => {
                      if (activeTileGroup?.id === group.id) {
                        setActiveTileGroup(null);
                      } else {
                        setActiveTileGroup(group);
                      }
                    }}
                  >
                    <span className="text-xs truncate flex-1">
                      📦 {group.name}
                      <span className="text-gray-500 ml-1">
                        ({group.parts[0]?.width}x{group.parts[0]?.height})
                      </span>
                    </span>
                    <button
                      className="text-xs text-red-500 opacity-50 hover:opacity-100 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTileGroup(group.id);
                      }}
                      title="Delete Group"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              className="ie-button ie-button-sm w-full mt-1"
              onClick={() => setShowTileGroupDialog(true)}
              disabled={!activeTileset}
              title="Create New Tile Group"
            >
              ➕ Create Group
            </button>
            {activeTileGroup && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1 p-1 bg-green-100 dark:bg-green-900/30 rounded">
                ✓ Using: <strong>{activeTileGroup.name}</strong>
                {activeTileGroup.parts.some((p) => p.repeatable) ? (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      Floors:
                    </span>
                    <button
                      className="ie-button ie-button-sm px-1"
                      onClick={() =>
                        setBuildingFloorCount(
                          Math.max(0, buildingFloorCount - 1)
                        )
                      }
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold">
                      {buildingFloorCount}
                    </span>
                    <button
                      className="ie-button ie-button-sm px-1"
                      onClick={() =>
                        setBuildingFloorCount(
                          Math.min(10, buildingFloorCount + 1)
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500">Click on tilemap to stamp</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center - Tilemap Canvas */}
        <div className="flex-1 flex flex-col ie-panel m-0.5 lg:m-1 min-w-0 min-h-[300px] lg:min-h-0">
          <div className="ie-groupbox flex-1 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center gap-1 mb-1 flex-wrap">
              <div className="flex gap-0.5 ie-panel-inset p-0.5">
                <button
                  className={`ie-button ie-button-sm px-1.5 ${
                    tool === "pencil" ? "ie-button-active" : ""
                  }`}
                  onClick={() => setTool("pencil")}
                  title="Pencil"
                >
                  ✏️
                </button>
                <button
                  className={`ie-button ie-button-sm px-1.5 ${
                    tool === "eraser" ? "ie-button-active" : ""
                  }`}
                  onClick={() => setTool("eraser")}
                  title="Eraser"
                >
                  🧹
                </button>
                <button
                  className={`ie-button ie-button-sm px-1.5 ${
                    tool === "bucket" ? "ie-button-active" : ""
                  }`}
                  onClick={() => setTool("bucket")}
                  title="Bucket Fill"
                >
                  🪣
                </button>
                <button
                  className={`ie-button ie-button-sm px-1.5 ${
                    tool === "picker" ? "ie-button-active" : ""
                  }`}
                  onClick={() => setTool("picker")}
                  title="Tile Picker"
                >
                  💉
                </button>
                <button
                  className={`ie-button ie-button-sm px-1.5 ${
                    tool === "pan" ? "ie-button-active" : ""
                  }`}
                  onClick={() => setTool("pan")}
                  title="Pan (Hand Tool)"
                >
                  ✋
                </button>
                <button
                  className={`ie-button ie-button-sm px-1.5 ${
                    tool === "autotile" ? "ie-button-active" : ""
                  }`}
                  onClick={() => setTool("autotile")}
                  title="Auto-tile (Terrain)"
                  disabled={!activeAutoTileRule}
                >
                  🌿
                </button>
              </div>
              <div className="w-px h-5 bg-gray-400 mx-1" />
              <button
                className={`ie-button ie-button-sm px-1.5 ${
                  showGrid ? "ie-button-active" : ""
                }`}
                onClick={toggleGrid}
                title="Toggle Grid"
              >
                #
              </button>
              <div className="flex gap-0.5 items-center ml-auto">
                <button
                  className="ie-button ie-button-sm px-1"
                  onClick={zoomOut}
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="text-xs w-10 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  className="ie-button ie-button-sm px-1"
                  onClick={zoomIn}
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  className="ie-button ie-button-sm px-1 ml-1"
                  onClick={resetZoom}
                  title="Reset View (1:1)"
                >
                  1:1
                </button>
              </div>
              {/* Cursor Position */}
              {hoverTilePos && (
                <span className="text-xs text-gray-500 ml-2">
                  X: {hoverTilePos.x}, Y: {hoverTilePos.y}
                </span>
              )}
            </div>

            {/* Canvas Container */}
            <div
              ref={containerRef}
              className="ie-panel-inset flex-1 overflow-hidden relative bg-[#1a1a2e]"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
              onWheel={handleCanvasWheel}
              onContextMenu={handleContextMenu}
              style={{
                cursor: isPanning
                  ? "grabbing"
                  : isSpaceDown || tool === "pan"
                  ? "grab"
                  : tool === "pencil" || tool === "eraser"
                  ? "crosshair"
                  : tool === "bucket"
                  ? "cell"
                  : tool === "picker"
                  ? "copy"
                  : "default",
              }}
            >
              {tilemap ? (
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "0 0",
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🗺️</div>
                    <div className="text-sm">No tilemap</div>
                    <button
                      className="ie-button ie-button-sm mt-2"
                      onClick={() => setShowNewDialog(true)}
                    >
                      📄 Create New
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-full lg:w-48 xl:w-56 shrink-0 flex flex-col ie-panel m-0.5 lg:m-1">
          {/* Quick Actions */}
          <div className="ie-groupbox">
            <span className="ie-groupbox-title">Actions</span>
            <div className="space-y-1 -mt-2">
              <button
                className="ie-button ie-button-sm w-full"
                onClick={() => setShowNewDialog(true)}
              >
                📄 New Tilemap
              </button>
              <button
                className="ie-button ie-button-sm w-full"
                onClick={() => importFileInputRef.current?.click()}
              >
                📂 Import JSON
              </button>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".json,.tmj,.ldtk"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  await importFromJson(text);
                  e.target.value = "";
                }}
              />
              <button
                className="ie-button ie-button-sm w-full"
                onClick={() => setShowExportDialog(true)}
                disabled={!tilemap}
              >
                💾 Export
              </button>
            </div>
          </div>

          {/* Auto-tile Panel */}
          <div className="ie-groupbox mt-1">
            <span className="ie-groupbox-title">🌿 Auto-tile</span>
            <div className="space-y-1 -mt-2">
              {autoTileRules.length > 0 ? (
                <div className="space-y-1">
                  {autoTileRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`flex items-center justify-between p-1 text-xs cursor-pointer rounded ${
                        activeAutoTileRule?.id === rule.id
                          ? "bg-blue-100 dark:bg-blue-900 border border-blue-500"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => {
                        setActiveAutoTileRule(
                          activeAutoTileRule?.id === rule.id ? null : rule
                        );
                        if (activeAutoTileRule?.id !== rule.id) {
                          setTool("autotile");
                        }
                      }}
                    >
                      <span>🌿 {rule.name}</span>
                      <button
                        className="text-red-500 hover:text-red-700 px-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAutoTileRule(rule.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-1">
                  No auto-tile rules
                </div>
              )}
              <button
                className="ie-button ie-button-sm w-full text-xs"
                onClick={() => {
                  // Create auto-tile from 4x4 selection (16 tiles)
                  if (selectedTiles.length >= 16) {
                    const name = `Terrain ${autoTileRules.length + 1}`;
                    createAutoTileRule(
                      name,
                      selectedTiles.slice(0, 16),
                      selectedTiles[0]
                    );
                  } else {
                    alert(
                      "เลือก 16 tiles (4x4) จาก tileset เพื่อสร้าง auto-tile rule"
                    );
                  }
                }}
                disabled={selectedTiles.length < 16}
              >
                ➕ Create from 4x4 Selection
              </button>
              <div className="text-[10px] text-gray-500 text-center">
                เลือก 16 tiles (4x4) แล้วกด Create
              </div>
            </div>
          </div>

          {/* Mini-map */}
          {tilemap && showMinimap && (
            <div className="ie-groupbox mt-1">
              <span className="ie-groupbox-title flex items-center justify-between">
                <span>🗺️ Mini-map</span>
                <button
                  className="text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => setShowMinimap(false)}
                >
                  ✕
                </button>
              </span>
              <div className="ie-panel-inset p-1 -mt-2">
                <canvas
                  ref={minimapCanvasRef}
                  className="w-full"
                  style={{
                    maxHeight: 100,
                    imageRendering: "pixelated",
                    backgroundColor: tilemap.backgroundColor || "#1a1a2e",
                  }}
                />
                <div className="text-[10px] text-gray-500 text-center mt-1">
                  {tilemap.width}x{tilemap.height} tiles
                </div>
              </div>
            </div>
          )}
          {tilemap && !showMinimap && (
            <button
              className="ie-button ie-button-sm w-full mt-1 text-xs"
              onClick={() => setShowMinimap(true)}
            >
              🗺️ Show Mini-map
            </button>
          )}

          {/* Selected Tile Preview */}
          {selectedTiles.length > 0 && activeTileset && (
            <div className="ie-groupbox mt-1">
              <span className="ie-groupbox-title">Selected Tile</span>
              <div className="-mt-2">
                {/* Tile Preview */}
                <div className="flex justify-center mb-2">
                  <div
                    className="border border-green-500 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%228%22%20height%3D%228%22%3E%3Crect%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23444%22%2F%3E%3Crect%20x%3D%224%22%20y%3D%224%22%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23444%22%2F%3E%3C%2Fsvg%3E')]"
                    style={{
                      width: activeTileset.tileWidth * 3,
                      height: activeTileset.tileHeight * 3,
                      backgroundImage: activeTileset.image
                        ? `url(${activeTileset.imageUrl})`
                        : undefined,
                      backgroundPosition: `-${
                        (selectedTiles[0] % activeTileset.columns) *
                        activeTileset.tileWidth *
                        3
                      }px -${
                        Math.floor(selectedTiles[0] / activeTileset.columns) *
                        activeTileset.tileHeight *
                        3
                      }px`,
                      backgroundSize: `${
                        activeTileset.image?.width
                          ? activeTileset.image.width * 3
                          : 0
                      }px ${
                        activeTileset.image?.height
                          ? activeTileset.image.height * 3
                          : 0
                      }px`,
                      imageRendering: "pixelated",
                    }}
                  />
                </div>
                {/* Tile Info */}
                <div className="text-xs text-center text-gray-600 dark:text-gray-400">
                  <div>ID: {selectedTiles[0]}</div>
                  <div>
                    Grid: ({selectedTiles[0] % activeTileset.columns},{" "}
                    {Math.floor(selectedTiles[0] / activeTileset.columns)})
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Map Info */}
          {tilemap && (
            <div className="ie-groupbox mt-1">
              <span className="ie-groupbox-title">Map Info</span>
              <div className="text-xs space-y-0.5 -mt-2">
                <div>
                  Size: {tilemap.width} x {tilemap.height} tiles
                </div>
                <div>
                  Tile: {tilemap.tileWidth} x {tilemap.tileHeight} px
                </div>
                <div>Layers: {tilemap.layers.length}</div>
                <div>Tilesets: {tilemap.tilesets.length}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Tilemap Dialog */}
      {showNewDialog && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="ie-window w-80 h-fit">
              <div className="ie-titlebar">
                <span className="ie-titlebar-text">New Tilemap</span>
                <button
                  className="ie-titlebar-btn ie-titlebar-close"
                  onClick={() => setShowNewDialog(false)}
                >
                  <span>×</span>
                </button>
              </div>
              <div className="ie-window-body p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs block mb-1">Width (tiles)</label>
                    <input
                      type="number"
                      className="ie-input w-full"
                      value={newMapWidth}
                      onChange={(e) =>
                        setNewMapWidth(parseInt(e.target.value) || 1)
                      }
                      min={1}
                      max={100}
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">Height (tiles)</label>
                    <input
                      type="number"
                      className="ie-input w-full"
                      value={newMapHeight}
                      onChange={(e) =>
                        setNewMapHeight(parseInt(e.target.value) || 1)
                      }
                      min={1}
                      max={100}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs block mb-1">Tile Size</label>
                  <select
                    className="ie-input w-full"
                    value={newTileSize}
                    onChange={(e) => setNewTileSize(parseInt(e.target.value))}
                  >
                    {TILE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}x{size} px
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="ie-button"
                    onClick={() => setShowNewDialog(false)}
                  >
                    Cancel
                  </button>
                  <button className="ie-button" onClick={handleCreateTilemap}>
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Tileset Import Dialog */}
      {showTilesetDialog && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="ie-window w-96 h-fit">
              <div className="ie-titlebar">
                <span className="ie-titlebar-text">Import Tileset</span>
                <button
                  className="ie-titlebar-btn ie-titlebar-close"
                  onClick={() => {
                    setShowTilesetDialog(false);
                    setTilesetFile(null);
                    setTilesetPreviewUrl(null);
                  }}
                >
                  <span>×</span>
                </button>
              </div>
              <div className="ie-window-body p-3 space-y-3">
                {/* Preview */}
                {tilesetPreviewUrl && (
                  <div className="ie-panel-inset p-2 max-h-48 overflow-auto bg-[#1a1a2e]">
                    <img
                      src={tilesetPreviewUrl}
                      alt="Tileset preview"
                      className="max-w-full"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs block mb-1">
                      Tile Width (px)
                    </label>
                    <select
                      className="ie-input w-full"
                      value={tilesetTileWidth}
                      onChange={(e) =>
                        setTilesetTileWidth(parseInt(e.target.value))
                      }
                    >
                      {TILE_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-1">
                      Tile Height (px)
                    </label>
                    <select
                      className="ie-input w-full"
                      value={tilesetTileHeight}
                      onChange={(e) =>
                        setTilesetTileHeight(parseInt(e.target.value))
                      }
                    >
                      {TILE_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="ie-button"
                    onClick={() => {
                      setShowTilesetDialog(false);
                      setTilesetFile(null);
                      setTilesetPreviewUrl(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="ie-button"
                    onClick={handleImportTileset}
                    disabled={isLoading}
                  >
                    {isLoading ? "Loading..." : "Import"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Tile Group Dialog */}
      {showTileGroupDialog && activeTileset && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="ie-window w-[600px] h-fit max-h-[90vh] overflow-auto">
              <div className="ie-titlebar">
                <span className="ie-titlebar-text">📦 Create Tile Group</span>
                <button
                  className="ie-titlebar-btn ie-titlebar-close"
                  onClick={() => {
                    setShowTileGroupDialog(false);
                    setTileGroupSelection(null);
                    setTileGroupName("");
                    setTileGroupMode("simple");
                    setBuildingParts({ top: null, middle: null, bottom: null });
                  }}
                >
                  <span>×</span>
                </button>
              </div>
              <div className="ie-window-body p-3 space-y-3">
                {/* Mode Selection */}
                <div className="flex gap-1">
                  <button
                    className={`ie-button flex-1 text-xs ${
                      tileGroupMode === "simple" ? "ie-button-active" : ""
                    }`}
                    onClick={() => setTileGroupMode("simple")}
                  >
                    📦 Simple
                  </button>
                  <button
                    className={`ie-button flex-1 text-xs ${
                      tileGroupMode === "building" ? "ie-button-active" : ""
                    }`}
                    onClick={() => setTileGroupMode("building")}
                  >
                    🏠 Building
                  </button>
                  <button
                    className={`ie-button flex-1 text-xs ${
                      tileGroupMode === "freeform" ? "ie-button-active" : ""
                    }`}
                    onClick={() => {
                      setTileGroupMode("freeform");
                      // Initialize freeform tiles grid
                      setFreeformTiles(
                        Array(freeformSize.height)
                          .fill(null)
                          .map(() => Array(freeformSize.width).fill(null))
                      );
                    }}
                  >
                    🎨 Freeform
                  </button>
                </div>

                {/* Instructions */}
                <div className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                  {tileGroupMode === "simple" && (
                    <>💡 ลากเมาส์บน Tileset เพื่อเลือก tiles ที่ต้องการ</>
                  )}
                  {tileGroupMode === "freeform" && (
                    <>
                      🎨 1. คลิกเลือก tile จาก Tileset → 2. วาดลง Canvas
                      ด้านล่าง
                    </>
                  )}
                  {tileGroupMode === "building" && (
                    <>
                      🏠 เลือก 3 ส่วน: <strong>หลังคา</strong> (Top),{" "}
                      <strong>ชั้นกลาง</strong> (Middle), <strong>ฐาน</strong>{" "}
                      (Bottom)
                      <br />
                      ชั้นกลางสามารถซ้ำได้หลายชั้น
                    </>
                  )}
                </div>

                {/* Building Mode: Part Selection */}
                {tileGroupMode === "building" && (
                  <div className="flex gap-1">
                    {(["top", "middle", "bottom"] as const).map((part) => (
                      <button
                        key={part}
                        className={`ie-button flex-1 text-xs ${
                          currentBuildingPart === part ? "ie-button-active" : ""
                        }`}
                        onClick={() => setCurrentBuildingPart(part)}
                      >
                        {part === "top" && "🔺 หลังคา"}
                        {part === "middle" && "🔲 ชั้นกลาง"}
                        {part === "bottom" && "🔻 ฐาน"}
                        {buildingParts[part] && " ✓"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Tileset Preview with Selection */}
                {(tileGroupMode === "simple" ||
                  tileGroupMode === "building") && (
                  <div className="ie-groupbox">
                    <span className="ie-groupbox-title">
                      {tileGroupMode === "building"
                        ? `Select ${
                            currentBuildingPart === "top"
                              ? "🔺 หลังคา"
                              : currentBuildingPart === "middle"
                              ? "🔲 ชั้นกลาง"
                              : "🔻 ฐาน"
                          }`
                        : `Select Tiles from: ${activeTileset.name}`}
                    </span>
                    <div
                      className="ie-panel-inset overflow-auto max-h-64 relative"
                      onMouseDown={(e) => {
                        const rect =
                          tileGroupCanvasRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const x = Math.floor(
                          (e.clientX - rect.left) / activeTileset.tileWidth
                        );
                        const y = Math.floor(
                          (e.clientY - rect.top) / activeTileset.tileHeight
                        );
                        setIsTileGroupSelecting(true);
                        const selection = {
                          startX: x,
                          startY: y,
                          endX: x,
                          endY: y,
                        };
                        if (tileGroupMode === "building") {
                          setBuildingParts((prev) => ({
                            ...prev,
                            [currentBuildingPart]: selection,
                          }));
                        } else {
                          setTileGroupSelection(selection);
                        }
                      }}
                      onMouseMove={(e) => {
                        if (!isTileGroupSelecting) return;
                        const rect =
                          tileGroupCanvasRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const x = Math.floor(
                          (e.clientX - rect.left) / activeTileset.tileWidth
                        );
                        const y = Math.floor(
                          (e.clientY - rect.top) / activeTileset.tileHeight
                        );
                        if (tileGroupMode === "building") {
                          setBuildingParts((prev) => {
                            const current = prev[currentBuildingPart];
                            if (!current) return prev;
                            return {
                              ...prev,
                              [currentBuildingPart]: {
                                ...current,
                                endX: x,
                                endY: y,
                              },
                            };
                          });
                        } else {
                          setTileGroupSelection((prev) =>
                            prev ? { ...prev, endX: x, endY: y } : null
                          );
                        }
                      }}
                      onMouseUp={() => setIsTileGroupSelecting(false)}
                      onMouseLeave={() => setIsTileGroupSelecting(false)}
                    >
                      <canvas
                        ref={tileGroupCanvasRef}
                        width={activeTileset.columns * activeTileset.tileWidth}
                        height={activeTileset.rows * activeTileset.tileHeight}
                        style={{
                          imageRendering: "pixelated",
                          cursor: "crosshair",
                        }}
                      />
                      {/* Simple mode selection overlay */}
                      {tileGroupMode === "simple" && tileGroupSelection && (
                        <div
                          className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                          style={{
                            left:
                              Math.min(
                                tileGroupSelection.startX,
                                tileGroupSelection.endX
                              ) * activeTileset.tileWidth,
                            top:
                              Math.min(
                                tileGroupSelection.startY,
                                tileGroupSelection.endY
                              ) * activeTileset.tileHeight,
                            width:
                              (Math.abs(
                                tileGroupSelection.endX -
                                  tileGroupSelection.startX
                              ) +
                                1) *
                              activeTileset.tileWidth,
                            height:
                              (Math.abs(
                                tileGroupSelection.endY -
                                  tileGroupSelection.startY
                              ) +
                                1) *
                              activeTileset.tileHeight,
                          }}
                        />
                      )}
                      {/* Building mode selection overlays */}
                      {tileGroupMode === "building" && (
                        <>
                          {buildingParts.top && (
                            <div
                              className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                              style={{
                                left:
                                  Math.min(
                                    buildingParts.top.startX,
                                    buildingParts.top.endX
                                  ) * activeTileset.tileWidth,
                                top:
                                  Math.min(
                                    buildingParts.top.startY,
                                    buildingParts.top.endY
                                  ) * activeTileset.tileHeight,
                                width:
                                  (Math.abs(
                                    buildingParts.top.endX -
                                      buildingParts.top.startX
                                  ) +
                                    1) *
                                  activeTileset.tileWidth,
                                height:
                                  (Math.abs(
                                    buildingParts.top.endY -
                                      buildingParts.top.startY
                                  ) +
                                    1) *
                                  activeTileset.tileHeight,
                              }}
                            >
                              <span className="absolute -top-5 left-0 text-xs bg-red-500 text-white px-1 rounded">
                                🔺 Top
                              </span>
                            </div>
                          )}
                          {buildingParts.middle && (
                            <div
                              className="absolute border-2 border-yellow-500 bg-yellow-500/20 pointer-events-none"
                              style={{
                                left:
                                  Math.min(
                                    buildingParts.middle.startX,
                                    buildingParts.middle.endX
                                  ) * activeTileset.tileWidth,
                                top:
                                  Math.min(
                                    buildingParts.middle.startY,
                                    buildingParts.middle.endY
                                  ) * activeTileset.tileHeight,
                                width:
                                  (Math.abs(
                                    buildingParts.middle.endX -
                                      buildingParts.middle.startX
                                  ) +
                                    1) *
                                  activeTileset.tileWidth,
                                height:
                                  (Math.abs(
                                    buildingParts.middle.endY -
                                      buildingParts.middle.startY
                                  ) +
                                    1) *
                                  activeTileset.tileHeight,
                              }}
                            >
                              <span className="absolute -top-5 left-0 text-xs bg-yellow-500 text-white px-1 rounded">
                                🔲 Middle
                              </span>
                            </div>
                          )}
                          {buildingParts.bottom && (
                            <div
                              className="absolute border-2 border-green-500 bg-green-500/20 pointer-events-none"
                              style={{
                                left:
                                  Math.min(
                                    buildingParts.bottom.startX,
                                    buildingParts.bottom.endX
                                  ) * activeTileset.tileWidth,
                                top:
                                  Math.min(
                                    buildingParts.bottom.startY,
                                    buildingParts.bottom.endY
                                  ) * activeTileset.tileHeight,
                                width:
                                  (Math.abs(
                                    buildingParts.bottom.endX -
                                      buildingParts.bottom.startX
                                  ) +
                                    1) *
                                  activeTileset.tileWidth,
                                height:
                                  (Math.abs(
                                    buildingParts.bottom.endY -
                                      buildingParts.bottom.startY
                                  ) +
                                    1) *
                                  activeTileset.tileHeight,
                              }}
                            >
                              <span className="absolute -top-5 left-0 text-xs bg-green-500 text-white px-1 rounded">
                                🔻 Bottom
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Freeform Mode UI */}
                {tileGroupMode === "freeform" && (
                  <>
                    {/* Size Controls */}
                    <div className="flex gap-2 items-center">
                      <label className="text-xs font-bold">Canvas Size:</label>
                      <div className="flex items-center gap-1">
                        <button
                          className="ie-button ie-button-sm px-1"
                          onClick={() =>
                            setFreeformSize((prev) => ({
                              ...prev,
                              width: Math.max(1, prev.width - 1),
                            }))
                          }
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs">
                          {freeformSize.width}
                        </span>
                        <button
                          className="ie-button ie-button-sm px-1"
                          onClick={() =>
                            setFreeformSize((prev) => ({
                              ...prev,
                              width: Math.min(20, prev.width + 1),
                            }))
                          }
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs">x</span>
                      <div className="flex items-center gap-1">
                        <button
                          className="ie-button ie-button-sm px-1"
                          onClick={() =>
                            setFreeformSize((prev) => ({
                              ...prev,
                              height: Math.max(1, prev.height - 1),
                            }))
                          }
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs">
                          {freeformSize.height}
                        </span>
                        <button
                          className="ie-button ie-button-sm px-1"
                          onClick={() =>
                            setFreeformSize((prev) => ({
                              ...prev,
                              height: Math.min(20, prev.height + 1),
                            }))
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="ie-button ie-button-sm text-xs ml-auto"
                        onClick={() => {
                          setFreeformTiles(
                            Array(freeformSize.height)
                              .fill(null)
                              .map(() => Array(freeformSize.width).fill(null))
                          );
                        }}
                      >
                        🗑️ Clear
                      </button>
                    </div>

                    {/* Building Templates */}
                    <div className="ie-groupbox">
                      <span className="ie-groupbox-title">
                        📐 Building Templates
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { name: "🏠 บ้านเล็ก", w: 3, h: 3 },
                          { name: "🏡 บ้านกลาง", w: 4, h: 4 },
                          { name: "🏢 บ้านใหญ่", w: 5, h: 5 },
                          { name: "🏬 ตึก 2 ชั้น", w: 4, h: 6 },
                          { name: "🏨 ตึก 3 ชั้น", w: 5, h: 8 },
                          { name: "🛖 กระท่อม", w: 2, h: 2 },
                          { name: "🏪 ร้านค้า", w: 3, h: 4 },
                          { name: "🗼 หอคอย", w: 2, h: 6 },
                        ].map((template) => (
                          <button
                            key={template.name}
                            className="ie-button text-xs p-1 truncate"
                            onClick={() => {
                              setFreeformSize({
                                width: template.w,
                                height: template.h,
                              });
                              setFreeformTiles(
                                Array(template.h)
                                  .fill(null)
                                  .map(() => Array(template.w).fill(null))
                              );
                            }}
                            title={`${template.w}x${template.h} tiles`}
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tile Selector - supports both click and drag */}
                    <div className="ie-groupbox">
                      <span className="ie-groupbox-title">
                        Select Tiles (คลิก = 1 tile, ลาก = หลาย tiles)
                        {freeformAreaSelection && (
                          <span className="ml-2 text-blue-600">
                            [
                            {Math.abs(
                              freeformAreaSelection.endX -
                                freeformAreaSelection.startX
                            ) + 1}
                            x
                            {Math.abs(
                              freeformAreaSelection.endY -
                                freeformAreaSelection.startY
                            ) + 1}
                            ]
                          </span>
                        )}
                      </span>
                      <div
                        className="ie-panel-inset overflow-auto max-h-40 relative"
                        onMouseDown={(e) => {
                          const rect =
                            tileGroupCanvasRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          const x = Math.floor(
                            (e.clientX - rect.left) / activeTileset.tileWidth
                          );
                          const y = Math.floor(
                            (e.clientY - rect.top) / activeTileset.tileHeight
                          );
                          setIsFreeformSelecting(true);
                          setFreeformAreaSelection({
                            startX: x,
                            startY: y,
                            endX: x,
                            endY: y,
                          });
                          setFreeformSelectedTile(
                            y * activeTileset.columns + x
                          );
                        }}
                        onMouseMove={(e) => {
                          if (!isFreeformSelecting) return;
                          const rect =
                            tileGroupCanvasRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          const x = Math.floor(
                            (e.clientX - rect.left) / activeTileset.tileWidth
                          );
                          const y = Math.floor(
                            (e.clientY - rect.top) / activeTileset.tileHeight
                          );
                          setFreeformAreaSelection((prev) =>
                            prev ? { ...prev, endX: x, endY: y } : null
                          );
                        }}
                        onMouseUp={() => setIsFreeformSelecting(false)}
                        onMouseLeave={() => setIsFreeformSelecting(false)}
                      >
                        <canvas
                          ref={tileGroupCanvasRef}
                          width={
                            activeTileset.columns * activeTileset.tileWidth
                          }
                          height={activeTileset.rows * activeTileset.tileHeight}
                          style={{
                            imageRendering: "pixelated",
                            cursor: "crosshair",
                          }}
                        />
                        {/* Area selection overlay */}
                        {freeformAreaSelection && (
                          <div
                            className="absolute border-2 border-blue-500 bg-blue-500/30 pointer-events-none"
                            style={{
                              left:
                                Math.min(
                                  freeformAreaSelection.startX,
                                  freeformAreaSelection.endX
                                ) * activeTileset.tileWidth,
                              top:
                                Math.min(
                                  freeformAreaSelection.startY,
                                  freeformAreaSelection.endY
                                ) * activeTileset.tileHeight,
                              width:
                                (Math.abs(
                                  freeformAreaSelection.endX -
                                    freeformAreaSelection.startX
                                ) +
                                  1) *
                                activeTileset.tileWidth,
                              height:
                                (Math.abs(
                                  freeformAreaSelection.endY -
                                    freeformAreaSelection.startY
                                ) +
                                  1) *
                                activeTileset.tileHeight,
                            }}
                          />
                        )}
                      </div>
                      {/* Arrange Mode Selection */}
                      {freeformAreaSelection && (
                        <div className="flex gap-1 mt-2">
                          <button
                            className={`ie-button flex-1 text-xs ${
                              freeformArrangeMode === "normal"
                                ? "ie-button-active"
                                : ""
                            }`}
                            onClick={() => setFreeformArrangeMode("normal")}
                            title="วางตามต้นฉบับ"
                          >
                            📋 ตามต้นฉบับ
                          </button>
                          <button
                            className={`ie-button flex-1 text-xs ${
                              freeformArrangeMode === "transpose"
                                ? "ie-button-active"
                                : ""
                            }`}
                            onClick={() => setFreeformArrangeMode("transpose")}
                            title="สลับแถว↔คอลัมน์ (เหมาะสำหรับบ้าน)"
                          >
                            🔄 Transpose (บ้าน)
                          </button>
                        </div>
                      )}
                      {/* Auto Draw Button */}
                      {freeformAreaSelection && (
                        <button
                          className="ie-button w-full mt-2 text-sm font-bold bg-purple-600 text-white hover:bg-purple-700"
                          onClick={() => {
                            if (!freeformAreaSelection) return;
                            const minX = Math.min(
                              freeformAreaSelection.startX,
                              freeformAreaSelection.endX
                            );
                            const maxX = Math.max(
                              freeformAreaSelection.startX,
                              freeformAreaSelection.endX
                            );
                            const minY = Math.min(
                              freeformAreaSelection.startY,
                              freeformAreaSelection.endY
                            );
                            const maxY = Math.max(
                              freeformAreaSelection.startY,
                              freeformAreaSelection.endY
                            );
                            const srcWidth = maxX - minX + 1;
                            const srcHeight = maxY - minY + 1;

                            // Collect source tiles
                            const sourceTiles: number[][] = [];
                            for (let y = 0; y < srcHeight; y++) {
                              const row: number[] = [];
                              for (let x = 0; x < srcWidth; x++) {
                                const tileId =
                                  (minY + y) * activeTileset.columns +
                                  (minX + x);
                                row.push(tileId);
                              }
                              sourceTiles.push(row);
                            }

                            let newTiles: (number | null)[][];
                            let finalWidth: number;
                            let finalHeight: number;

                            if (freeformArrangeMode === "transpose") {
                              // Transpose: swap rows and columns
                              // Original [row][col] becomes [col][row]
                              finalWidth = srcHeight;
                              finalHeight = srcWidth;
                              newTiles = [];
                              for (let newY = 0; newY < finalHeight; newY++) {
                                const row: (number | null)[] = [];
                                for (let newX = 0; newX < finalWidth; newX++) {
                                  // newX was old row, newY was old col
                                  row.push(sourceTiles[newX][newY]);
                                }
                                newTiles.push(row);
                              }
                            } else {
                              // Normal: copy as-is
                              finalWidth = srcWidth;
                              finalHeight = srcHeight;
                              newTiles = sourceTiles;
                            }

                            setFreeformSize({
                              width: finalWidth,
                              height: finalHeight,
                            });
                            setFreeformTiles(newTiles);
                          }}
                        >
                          ✨ Auto Draw{" "}
                          {freeformArrangeMode === "transpose"
                            ? "(Transpose) "
                            : ""}
                          (
                          {freeformArrangeMode === "transpose"
                            ? `${
                                Math.abs(
                                  freeformAreaSelection.endY -
                                    freeformAreaSelection.startY
                                ) + 1
                              }x${
                                Math.abs(
                                  freeformAreaSelection.endX -
                                    freeformAreaSelection.startX
                                ) + 1
                              }`
                            : `${
                                Math.abs(
                                  freeformAreaSelection.endX -
                                    freeformAreaSelection.startX
                                ) + 1
                              }x${
                                Math.abs(
                                  freeformAreaSelection.endY -
                                    freeformAreaSelection.startY
                                ) + 1
                              }`}{" "}
                          tiles)
                        </button>
                      )}
                    </div>

                    {/* Reference Image Upload */}
                    <div className="ie-groupbox">
                      <span className="ie-groupbox-title">
                        🖼️ Reference Image (ภาพตัวอย่าง)
                      </span>
                      <div className="flex gap-2 items-center">
                        <button
                          className="ie-button text-xs flex-1"
                          onClick={() => freeformRefInputRef.current?.click()}
                        >
                          📤 อัพโหลดรูปตัวอย่าง
                        </button>
                        {freeformRefImage && (
                          <button
                            className="ie-button text-xs text-red-500"
                            onClick={() => setFreeformRefImage(null)}
                          >
                            ✕ ลบ
                          </button>
                        )}
                        <input
                          ref={freeformRefInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setFreeformRefImage(
                                  ev.target?.result as string
                                );
                              };
                              reader.readAsDataURL(file);
                            }
                            e.target.value = "";
                          }}
                        />
                      </div>
                      {freeformRefImage && (
                        <div className="mt-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* Opacity */}
                            <div className="flex items-center gap-1">
                              <span>Opacity:</span>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={freeformRefOpacity}
                                onChange={(e) =>
                                  setFreeformRefOpacity(
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="flex-1 w-16"
                              />
                              <span className="w-8">
                                {Math.round(freeformRefOpacity * 100)}%
                              </span>
                            </div>
                            {/* Scale */}
                            <div className="flex items-center gap-1">
                              <span>Scale:</span>
                              <input
                                type="range"
                                min="0.25"
                                max="3"
                                step="0.25"
                                value={freeformRefScale}
                                onChange={(e) =>
                                  setFreeformRefScale(
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="flex-1 w-16"
                              />
                              <span className="w-8">{freeformRefScale}x</span>
                            </div>
                          </div>
                          {/* Offset Controls */}
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span>Offset:</span>
                            <button
                              className="ie-button px-2 py-0.5"
                              onClick={() =>
                                setFreeformRefOffset((p) => ({
                                  ...p,
                                  x: p.x - 4,
                                }))
                              }
                            >
                              ←
                            </button>
                            <button
                              className="ie-button px-2 py-0.5"
                              onClick={() =>
                                setFreeformRefOffset((p) => ({
                                  ...p,
                                  x: p.x + 4,
                                }))
                              }
                            >
                              →
                            </button>
                            <button
                              className="ie-button px-2 py-0.5"
                              onClick={() =>
                                setFreeformRefOffset((p) => ({
                                  ...p,
                                  y: p.y - 4,
                                }))
                              }
                            >
                              ↑
                            </button>
                            <button
                              className="ie-button px-2 py-0.5"
                              onClick={() =>
                                setFreeformRefOffset((p) => ({
                                  ...p,
                                  y: p.y + 4,
                                }))
                              }
                            >
                              ↓
                            </button>
                            <button
                              className="ie-button px-2 py-0.5 text-red-500"
                              onClick={() =>
                                setFreeformRefOffset({ x: 0, y: 0 })
                              }
                            >
                              Reset
                            </button>
                            <span className="text-gray-500">
                              ({freeformRefOffset.x}, {freeformRefOffset.y})
                            </span>
                          </div>
                          {/* Auto Draw from Reference Image */}
                          <button
                            className="ie-button w-full mt-2 text-sm font-bold bg-green-600 text-white hover:bg-green-700"
                            onClick={async () => {
                              if (!freeformRefImage || !activeTileset?.image)
                                return;

                              // Load reference image
                              const refImg = new Image();
                              refImg.src = freeformRefImage;
                              await new Promise((resolve) => {
                                refImg.onload = resolve;
                              });

                              // Create canvas for reference image
                              const refCanvas =
                                document.createElement("canvas");
                              const tileW = activeTileset.tileWidth;
                              const tileH = activeTileset.tileHeight;

                              // Calculate grid size from ref image
                              const gridW = Math.ceil(refImg.width / tileW);
                              const gridH = Math.ceil(refImg.height / tileH);

                              refCanvas.width = gridW * tileW;
                              refCanvas.height = gridH * tileH;
                              const refCtx = refCanvas.getContext("2d")!;
                              refCtx.drawImage(
                                refImg,
                                0,
                                0,
                                refCanvas.width,
                                refCanvas.height
                              );

                              // Create canvas for tileset
                              const tilesetCanvas =
                                document.createElement("canvas");
                              tilesetCanvas.width = activeTileset.image.width;
                              tilesetCanvas.height = activeTileset.image.height;
                              const tilesetCtx =
                                tilesetCanvas.getContext("2d")!;
                              tilesetCtx.drawImage(activeTileset.image, 0, 0);

                              // Function to get pixel data for a tile region
                              const getTilePixels = (
                                ctx: CanvasRenderingContext2D,
                                x: number,
                                y: number
                              ) => {
                                return ctx.getImageData(
                                  x * tileW,
                                  y * tileH,
                                  tileW,
                                  tileH
                                ).data;
                              };

                              // Advanced pixel comparison with position weighting
                              const comparePixels = (
                                p1: Uint8ClampedArray,
                                p2: Uint8ClampedArray
                              ) => {
                                let diff = 0;
                                let matchCount = 0;
                                const pixelCount = p1.length / 4;

                                for (let i = 0; i < p1.length; i += 4) {
                                  const a1 = p1[i + 3];
                                  const a2 = p2[i + 3];

                                  // Both transparent - perfect match for this pixel
                                  if (a1 < 10 && a2 < 10) {
                                    matchCount++;
                                    continue;
                                  }

                                  // One transparent, one not - big penalty
                                  if (a1 < 10 !== a2 < 10) {
                                    diff += 500;
                                    continue;
                                  }

                                  // Calculate exact RGB difference (squared for precision)
                                  const dr = p1[i] - p2[i];
                                  const dg = p1[i + 1] - p2[i + 1];
                                  const db = p1[i + 2] - p2[i + 2];
                                  const pixelDiff = dr * dr + dg * dg + db * db;

                                  // Exact match bonus
                                  if (pixelDiff === 0) {
                                    matchCount++;
                                  } else if (pixelDiff < 100) {
                                    // Very close match
                                    matchCount += 0.8;
                                    diff += pixelDiff * 0.5;
                                  } else {
                                    diff += pixelDiff;
                                  }
                                }

                                // Bonus for high exact match ratio
                                const matchRatio = matchCount / pixelCount;
                                if (matchRatio > 0.95) {
                                  diff *= 0.1; // 95%+ match = huge bonus
                                } else if (matchRatio > 0.9) {
                                  diff *= 0.3;
                                } else if (matchRatio > 0.8) {
                                  diff *= 0.5;
                                }

                                return diff;
                              };

                              // Match each tile in ref image to tileset
                              const newTiles: (number | null)[][] = [];
                              for (let gy = 0; gy < gridH; gy++) {
                                const row: (number | null)[] = [];
                                for (let gx = 0; gx < gridW; gx++) {
                                  const refPixels = getTilePixels(
                                    refCtx,
                                    gx,
                                    gy
                                  );

                                  // Check if tile is mostly transparent
                                  let totalAlpha = 0;
                                  for (
                                    let i = 3;
                                    i < refPixels.length;
                                    i += 4
                                  ) {
                                    totalAlpha += refPixels[i];
                                  }
                                  if (
                                    totalAlpha <
                                    (refPixels.length / 4) * 10
                                  ) {
                                    row.push(null);
                                    continue;
                                  }

                                  // Find best matching tile
                                  let bestTile = 0;
                                  let bestDiff = Infinity;
                                  for (
                                    let ty = 0;
                                    ty < activeTileset.rows;
                                    ty++
                                  ) {
                                    for (
                                      let tx = 0;
                                      tx < activeTileset.columns;
                                      tx++
                                    ) {
                                      const tilePixels = getTilePixels(
                                        tilesetCtx,
                                        tx,
                                        ty
                                      );
                                      const diff = comparePixels(
                                        refPixels,
                                        tilePixels
                                      );
                                      if (diff < bestDiff) {
                                        bestDiff = diff;
                                        bestTile =
                                          ty * activeTileset.columns + tx;
                                      }
                                    }
                                  }
                                  row.push(bestTile);
                                }
                                newTiles.push(row);
                              }

                              // Update canvas size and tiles
                              setFreeformSize({ width: gridW, height: gridH });
                              setFreeformTiles(newTiles);

                              // Hide reference image after auto draw to show actual tiles
                              setFreeformRefOpacity(0);
                            }}
                          >
                            🤖 Auto Draw จาก Reference Image
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Freeform Canvas */}
                    <div className="ie-groupbox">
                      <span className="ie-groupbox-title">
                        Paint Canvas (click to paint, right-click to erase)
                      </span>
                      <div className="ie-panel-inset p-2 overflow-auto max-h-64 relative">
                        {/* Reference image overlay */}
                        {freeformRefImage && freeformRefOpacity > 0 && (
                          <img
                            src={freeformRefImage}
                            alt="Reference"
                            className="absolute pointer-events-none z-10"
                            style={{
                              opacity: freeformRefOpacity,
                              transform: `translate(${freeformRefOffset.x}px, ${freeformRefOffset.y}px) scale(${freeformRefScale})`,
                              transformOrigin: "top left",
                              imageRendering: "pixelated",
                            }}
                          />
                        )}
                        <div
                          className="grid gap-0 border border-gray-400 relative"
                          style={{
                            gridTemplateColumns: `repeat(${freeformSize.width}, ${activeTileset.tileWidth}px)`,
                          }}
                        >
                          {freeformTiles.map((row, y) =>
                            row.map((tileId, x) => (
                              <div
                                key={`${x}-${y}`}
                                className="border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-blue-200/50 relative z-20"
                                style={{
                                  width: activeTileset.tileWidth,
                                  height: activeTileset.tileHeight,
                                  backgroundImage:
                                    tileId !== null && activeTileset.image
                                      ? `url(${activeTileset.image.src})`
                                      : undefined,
                                  backgroundPosition:
                                    tileId !== null
                                      ? `-${
                                          (tileId % activeTileset.columns) *
                                          activeTileset.tileWidth
                                        }px -${
                                          Math.floor(
                                            tileId / activeTileset.columns
                                          ) * activeTileset.tileHeight
                                        }px`
                                      : undefined,
                                  imageRendering: "pixelated",
                                }}
                                onClick={() => {
                                  if (freeformSelectedTile === null) return;
                                  setFreeformTiles((prev) => {
                                    const newTiles = prev.map((r) => [...r]);
                                    newTiles[y][x] = freeformSelectedTile;
                                    return newTiles;
                                  });
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setFreeformTiles((prev) => {
                                    const newTiles = prev.map((r) => [...r]);
                                    newTiles[y][x] = null;
                                    return newTiles;
                                  });
                                }}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Selection Info */}
                {tileGroupMode === "simple" && tileGroupSelection && (
                  <div className="text-xs text-green-600 dark:text-green-400 p-2 bg-green-50 dark:bg-green-900/30 rounded">
                    ✓ Selected:{" "}
                    {Math.abs(
                      tileGroupSelection.endX - tileGroupSelection.startX
                    ) + 1}
                    x
                    {Math.abs(
                      tileGroupSelection.endY - tileGroupSelection.startY
                    ) + 1}{" "}
                    tiles
                  </div>
                )}
                {tileGroupMode === "building" && (
                  <div className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded space-y-1">
                    <div
                      className={
                        buildingParts.top ? "text-green-600" : "text-gray-400"
                      }
                    >
                      🔺 หลังคา:{" "}
                      {buildingParts.top
                        ? `${
                            Math.abs(
                              buildingParts.top.endX - buildingParts.top.startX
                            ) + 1
                          }x${
                            Math.abs(
                              buildingParts.top.endY - buildingParts.top.startY
                            ) + 1
                          }`
                        : "ยังไม่เลือก"}
                    </div>
                    <div
                      className={
                        buildingParts.middle
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      🔲 ชั้นกลาง:{" "}
                      {buildingParts.middle
                        ? `${
                            Math.abs(
                              buildingParts.middle.endX -
                                buildingParts.middle.startX
                            ) + 1
                          }x${
                            Math.abs(
                              buildingParts.middle.endY -
                                buildingParts.middle.startY
                            ) + 1
                          } (ซ้ำได้)`
                        : "ยังไม่เลือก"}
                    </div>
                    <div
                      className={
                        buildingParts.bottom
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      🔻 ฐาน:{" "}
                      {buildingParts.bottom
                        ? `${
                            Math.abs(
                              buildingParts.bottom.endX -
                                buildingParts.bottom.startX
                            ) + 1
                          }x${
                            Math.abs(
                              buildingParts.bottom.endY -
                                buildingParts.bottom.startY
                            ) + 1
                          }`
                        : "ยังไม่เลือก"}
                    </div>
                  </div>
                )}

                {/* Group Name */}
                <div className="flex gap-2 items-center">
                  <label className="text-xs font-bold whitespace-nowrap">
                    Group Name:
                  </label>
                  <input
                    type="text"
                    className="ie-input flex-1"
                    value={tileGroupName}
                    onChange={(e) => setTileGroupName(e.target.value)}
                    placeholder={
                      tileGroupMode === "building"
                        ? "e.g. House, Tower, Shop..."
                        : "e.g. Carpet, Table..."
                    }
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <button
                    className="ie-button"
                    onClick={() => {
                      setShowTileGroupDialog(false);
                      setTileGroupSelection(null);
                      setTileGroupName("");
                      setTileGroupMode("simple");
                      setBuildingParts({
                        top: null,
                        middle: null,
                        bottom: null,
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="ie-button flex-1"
                    onClick={() => {
                      if (!tileGroupName.trim()) return;

                      if (tileGroupMode === "simple") {
                        if (!tileGroupSelection) return;
                        const minX = Math.min(
                          tileGroupSelection.startX,
                          tileGroupSelection.endX
                        );
                        const maxX = Math.max(
                          tileGroupSelection.startX,
                          tileGroupSelection.endX
                        );
                        const minY = Math.min(
                          tileGroupSelection.startY,
                          tileGroupSelection.endY
                        );
                        const maxY = Math.max(
                          tileGroupSelection.startY,
                          tileGroupSelection.endY
                        );
                        selectTilesArea(minX, minY, maxX, maxY);
                        setTimeout(() => {
                          createSimpleTileGroup(tileGroupName.trim());
                          setShowTileGroupDialog(false);
                          setTileGroupSelection(null);
                          setTileGroupName("");
                        }, 50);
                      } else if (tileGroupMode === "freeform") {
                        // Freeform mode: create group from painted tiles
                        const tiles: {
                          tileId: number;
                          offsetX: number;
                          offsetY: number;
                        }[] = [];
                        freeformTiles.forEach((row, y) => {
                          row.forEach((tileId, x) => {
                            if (tileId !== null) {
                              tiles.push({ tileId, offsetX: x, offsetY: y });
                            }
                          });
                        });
                        if (tiles.length === 0) return;

                        createFreeformTileGroup(
                          tileGroupName.trim(),
                          tiles,
                          freeformSize.width,
                          freeformSize.height
                        );
                        setShowTileGroupDialog(false);
                        setTileGroupName("");
                        setTileGroupMode("simple");
                        setFreeformTiles([]);
                        setFreeformSelectedTile(null);
                      } else {
                        // Building mode: create group with parts
                        if (!buildingParts.top) return;

                        // Create group with top part first
                        const topSel = buildingParts.top;
                        selectTilesArea(
                          Math.min(topSel.startX, topSel.endX),
                          Math.min(topSel.startY, topSel.endY),
                          Math.max(topSel.startX, topSel.endX),
                          Math.max(topSel.startY, topSel.endY)
                        );
                        setTimeout(() => {
                          createTileGroup(tileGroupName.trim(), "top", false);

                          // Add middle part if exists
                          if (buildingParts.middle) {
                            const midSel = buildingParts.middle;
                            selectTilesArea(
                              Math.min(midSel.startX, midSel.endX),
                              Math.min(midSel.startY, midSel.endY),
                              Math.max(midSel.startX, midSel.endX),
                              Math.max(midSel.startY, midSel.endY)
                            );
                            setTimeout(() => {
                              // Find the group we just created
                              addTileGroupPart(
                                tileGroups[tileGroups.length - 1]?.id || "",
                                "middle",
                                true
                              );

                              // Add bottom part if exists
                              if (buildingParts.bottom) {
                                const botSel = buildingParts.bottom;
                                selectTilesArea(
                                  Math.min(botSel.startX, botSel.endX),
                                  Math.min(botSel.startY, botSel.endY),
                                  Math.max(botSel.startX, botSel.endX),
                                  Math.max(botSel.startY, botSel.endY)
                                );
                                setTimeout(() => {
                                  addTileGroupPart(
                                    tileGroups[tileGroups.length - 1]?.id || "",
                                    "bottom",
                                    false
                                  );
                                  setShowTileGroupDialog(false);
                                  setTileGroupName("");
                                  setTileGroupMode("simple");
                                  setBuildingParts({
                                    top: null,
                                    middle: null,
                                    bottom: null,
                                  });
                                }, 50);
                              } else {
                                setShowTileGroupDialog(false);
                                setTileGroupName("");
                                setTileGroupMode("simple");
                                setBuildingParts({
                                  top: null,
                                  middle: null,
                                  bottom: null,
                                });
                              }
                            }, 50);
                          } else {
                            setShowTileGroupDialog(false);
                            setTileGroupName("");
                            setTileGroupMode("simple");
                            setBuildingParts({
                              top: null,
                              middle: null,
                              bottom: null,
                            });
                          }
                        }, 50);
                      }
                    }}
                    disabled={
                      !tileGroupName.trim() ||
                      (tileGroupMode === "simple" && !tileGroupSelection) ||
                      (tileGroupMode === "building" && !buildingParts.top) ||
                      (tileGroupMode === "freeform" &&
                        freeformTiles.flat().every((t) => t === null))
                    }
                  >
                    ✨ Create Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="ie-window w-96 h-fit">
              <div className="ie-titlebar">
                <span className="ie-titlebar-text">Export Tilemap</span>
                <button
                  className="ie-titlebar-btn ie-titlebar-close"
                  onClick={() => setShowExportDialog(false)}
                >
                  <span>×</span>
                </button>
              </div>
              <div className="ie-window-body p-3 space-y-3">
                <div>
                  <label className="text-xs block mb-2 font-bold">
                    Export Format
                  </label>
                  <div className="space-y-1">
                    {[
                      {
                        value: "cocos",
                        label: "⭐ Cocos Creator (.tmj)",
                        desc: "Optimized for Cocos Creator 3.x",
                      },
                      {
                        value: "tiled",
                        label: "Tiled JSON (.tmj)",
                        desc: "Compatible with Tiled, Phaser, Godot, Unity",
                      },
                      {
                        value: "json",
                        label: "Custom JSON (.json)",
                        desc: "App-specific format",
                      },
                      {
                        value: "csv",
                        label: "CSV (.csv)",
                        desc: "Simple comma-separated values",
                      },
                      {
                        value: "phaser",
                        label: "Phaser 3 (.json)",
                        desc: "Optimized for Phaser.js",
                      },
                      {
                        value: "godot",
                        label: "Godot TileMap (.tres)",
                        desc: "Godot 4 resource format",
                      },
                      {
                        value: "ldtk",
                        label: "LDtk (.ldtk)",
                        desc: "Level Designer Toolkit format",
                      },
                    ].map((format) => (
                      <label
                        key={format.value}
                        className={`flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          exportFormat === format.value
                            ? "bg-blue-100 dark:bg-blue-900"
                            : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="exportFormat"
                          value={format.value}
                          checked={exportFormat === format.value}
                          onChange={(e) =>
                            setExportFormat(
                              e.target.value as typeof exportFormat
                            )
                          }
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium">
                            {format.label}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    className="ie-button"
                    onClick={() => setShowExportDialog(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="ie-button"
                    onClick={handleExportWithFormat}
                  >
                    💾 Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </MainLayout>
  );
}
