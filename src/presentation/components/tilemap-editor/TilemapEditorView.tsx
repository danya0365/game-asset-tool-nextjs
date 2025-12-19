"use client";

import { TILE_SIZES } from "@/src/domain/types/tilemap";
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
    createTilemap,
    loadTileset,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    setActiveLayer,
    selectTiles,
    paintTile,
    eraseTile,
    bucketFill,
    pickTile,
    setTool,
    toggleGrid,
    zoomIn,
    zoomOut,
    setPan,
    clearError,
    exportToJson,
  } = useTilemapEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilesetCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Render tilemap canvas
  useEffect(() => {
    if (!canvasRef.current || !tilemap) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
      if (e.button === 1) {
        // Middle mouse button for panning
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }

      if (e.button !== 0) return;

      const pos = getTilePos(e);
      if (!pos) return;

      setIsDrawing(true);
      setLastDrawPos(pos);

      if (tool === "pencil" && selectedTiles.length > 0) {
        paintTile(pos.x, pos.y, selectedTiles[0]);
      } else if (tool === "eraser") {
        eraseTile(pos.x, pos.y);
      } else if (tool === "bucket" && selectedTiles.length > 0) {
        bucketFill(pos.x, pos.y, selectedTiles[0]);
      } else if (tool === "picker") {
        pickTile(pos.x, pos.y);
      }
    },
    [
      tool,
      selectedTiles,
      pan,
      getTilePos,
      paintTile,
      eraseTile,
      bucketFill,
      pickTile,
    ]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
      }

      if (!isDrawing) return;

      const pos = getTilePos(e);
      if (
        !pos ||
        (lastDrawPos && pos.x === lastDrawPos.x && pos.y === lastDrawPos.y)
      ) {
        return;
      }

      setLastDrawPos(pos);

      if (tool === "pencil" && selectedTiles.length > 0) {
        paintTile(pos.x, pos.y, selectedTiles[0]);
      } else if (tool === "eraser") {
        eraseTile(pos.x, pos.y);
      }
    },
    [
      isPanning,
      isDrawing,
      lastDrawPos,
      tool,
      selectedTiles,
      panStart,
      getTilePos,
      paintTile,
      eraseTile,
      setPan,
    ]
  );

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

  // Handle tileset click to select tile
  const handleTilesetClick = useCallback(
    (e: React.MouseEvent) => {
      if (!activeTileset || !tilesetCanvasRef.current) return;

      const rect = tilesetCanvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const tileX = Math.floor(x / activeTileset.tileWidth);
      const tileY = Math.floor(y / activeTileset.tileHeight);
      const tileId = tileY * activeTileset.columns + tileX;

      if (tileId >= 0 && tileId < activeTileset.tiles.length) {
        selectTiles([tileId]);
      }
    },
    [activeTileset, selectTiles]
  );

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

  // Handle export
  const handleExport = useCallback(() => {
    const json = exportToJson();
    if (!json) return;

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tilemap?.name || "tilemap"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportToJson, tilemap?.name]);

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
            <div className="ie-panel-inset flex-1 overflow-auto ie-scrollbar -mt-2 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2210%22%3E%3Crect%20width%3D%225%22%20height%3D%225%22%20fill%3D%22%23444%22%2F%3E%3Crect%20x%3D%225%22%20y%3D%225%22%20width%3D%225%22%20height%3D%225%22%20fill%3D%22%23444%22%2F%3E%3C%2Fsvg%3E')]">
              {activeTileset ? (
                <canvas
                  ref={tilesetCanvasRef}
                  className="cursor-pointer"
                  style={{ imageRendering: "pixelated" }}
                  onClick={handleTilesetClick}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-xs p-4 text-center">
                  No tileset loaded
                  <br />
                  Click &quot;Load Tileset&quot; to import
                </div>
              )}
            </div>
            <button
              className="ie-button ie-button-sm mt-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={!tilemap}
            >
              📁 Load Tileset
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleTilesetFileChange}
            />
          </div>

          {/* Layers Panel */}
          <div className="ie-groupbox mt-1">
            <span className="ie-groupbox-title">Layers</span>
            <div className="ie-panel-inset max-h-32 overflow-auto ie-scrollbar -mt-2">
              {tilemap?.layers.map((layer) => (
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
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                  >
                    {layer.visible ? "👁️" : "🚫"}
                  </button>
                  <span className="flex-1 text-xs truncate">{layer.name}</span>
                  {tilemap.layers.length > 1 && (
                    <button
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.id);
                      }}
                    >
                      ×
                    </button>
                  )}
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
            </div>
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
              </div>
            </div>

            {/* Canvas Container */}
            <div
              ref={containerRef}
              className="ie-panel-inset flex-1 overflow-hidden relative bg-[#1a1a2e]"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onWheel={handleCanvasWheel}
              style={{
                cursor: isPanning
                  ? "grabbing"
                  : tool === "pencil"
                  ? "crosshair"
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
                onClick={handleExport}
                disabled={!tilemap}
              >
                💾 Export JSON
              </button>
            </div>
          </div>

          {/* Selected Tile Info */}
          {selectedTiles.length > 0 && activeTileset && (
            <div className="ie-groupbox mt-1">
              <span className="ie-groupbox-title">Selected Tile</span>
              <div className="text-xs -mt-2">
                <div>ID: {selectedTiles[0]}</div>
                <div>
                  Position: {selectedTiles[0] % activeTileset.columns},{" "}
                  {Math.floor(selectedTiles[0] / activeTileset.columns)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="ie-window w-80">
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
      )}

      {/* Tileset Import Dialog */}
      {showTilesetDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="ie-window w-96">
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
                  <label className="text-xs block mb-1">Tile Width (px)</label>
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
                  <label className="text-xs block mb-1">Tile Height (px)</label>
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
      )}
    </MainLayout>
  );
}
