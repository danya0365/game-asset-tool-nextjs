"use client";

import {
  MainLayout,
  ToolbarAction,
} from "@/src/presentation/components/templates/MainLayout";
import { useCanvas } from "@/src/presentation/hooks/useCanvas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function PixelEditorView() {
  const {
    settings,
    viewport,
    layers,
    activeLayerId,
    cursorPosition,
    zoomLevels,
    containerRef,
    zoomIn,
    zoomOut,
    setZoom,
    resetZoom,
    pan,
    resetPan,
    toggleGrid,
    resizeCanvas,
    addLayer,
    removeLayer,
    setActiveLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    renameLayer,
    updateCursorPosition,
    clearCursorPosition,
  } = useCanvas();

  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#FFFFFF");
  const [activeTool, setActiveTool] = useState<
    "pencil" | "eraser" | "fill" | "picker"
  >("pencil");
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingButton, setDrawingButton] = useState<number | null>(null);
  const [lastDrawPoint, setLastDrawPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Pixel data for drawing
  const [pixelData, setPixelData] = useState<Map<string, Map<string, string>>>(
    new Map()
  );

  // Undo/Redo history
  const [history, setHistory] = useState<Map<string, Map<string, string>>[]>(
    []
  );
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 50;

  // Save state to history (call after drawing stroke ends)
  const saveToHistory = useCallback(() => {
    setHistory((prev) => {
      // Clone current pixel data
      const snapshot = new Map<string, Map<string, string>>();
      pixelData.forEach((layerPixels, layerId) => {
        snapshot.set(layerId, new Map(layerPixels));
      });

      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, maxHistorySize - 1));
  }, [pixelData, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex < 0) return;

    // If at index 0, restore to empty state (before any drawing)
    if (historyIndex === 0) {
      const empty = new Map<string, Map<string, string>>();
      layers.forEach((layer) => {
        empty.set(layer.id, new Map());
      });
      setPixelData(empty);
      setHistoryIndex(-1);
      return;
    }

    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    if (snapshot) {
      const restored = new Map<string, Map<string, string>>();
      snapshot.forEach((layerPixels, layerId) => {
        restored.set(layerId, new Map(layerPixels));
      });
      setPixelData(restored);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex, layers]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    if (snapshot) {
      const restored = new Map<string, Map<string, string>>();
      snapshot.forEach((layerPixels, layerId) => {
        restored.set(layerId, new Map(layerPixels));
      });
      setPixelData(restored);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Initialize pixel data for each layer
  useEffect(() => {
    setPixelData((prev) => {
      const newData = new Map(prev);
      layers.forEach((layer) => {
        if (!newData.has(layer.id)) {
          newData.set(layer.id, new Map());
        }
      });
      return newData;
    });
  }, [layers]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = containerRef.current?.clientHeight || 600;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate canvas position
    const canvasWidth = settings.width * viewport.zoom;
    const canvasHeight = settings.height * viewport.zoom;
    const offsetX = (containerWidth - canvasWidth) / 2 + viewport.panX;
    const offsetY = (containerHeight - canvasHeight) / 2 + viewport.panY;

    // Draw background (checkerboard for transparency)
    const checkSize = Math.max(4, viewport.zoom / 2);
    for (let y = 0; y < settings.height; y++) {
      for (let x = 0; x < settings.width; x++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? "#ffffff" : "#cccccc";
        ctx.fillRect(
          offsetX + x * viewport.zoom,
          offsetY + y * viewport.zoom,
          viewport.zoom,
          viewport.zoom
        );
      }
    }

    // Draw pixels from all visible layers (bottom to top)
    layers.forEach((layer) => {
      if (!layer.visible) return;
      const layerPixels = pixelData.get(layer.id);
      if (!layerPixels) return;

      ctx.globalAlpha = layer.opacity / 100;
      layerPixels.forEach((color, key) => {
        const [px, py] = key.split(",").map(Number);
        ctx.fillStyle = color;
        ctx.fillRect(
          offsetX + px * viewport.zoom,
          offsetY + py * viewport.zoom,
          viewport.zoom,
          viewport.zoom
        );
      });
      ctx.globalAlpha = 1;
    });

    // Draw grid
    if (settings.showGrid && viewport.zoom >= 4) {
      ctx.strokeStyle = settings.gridColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;

      // Vertical lines
      for (let x = 0; x <= settings.width; x++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + x * viewport.zoom, offsetY);
        ctx.lineTo(offsetX + x * viewport.zoom, offsetY + canvasHeight);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= settings.height; y++) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + y * viewport.zoom);
        ctx.lineTo(offsetX + canvasWidth, offsetY + y * viewport.zoom);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    // Draw canvas border
    ctx.strokeStyle = "#666666";
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, canvasWidth, canvasHeight);

    // Draw cursor highlight
    if (cursorPosition) {
      ctx.strokeStyle = activeTool === "eraser" ? "#ff0000" : primaryColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        offsetX + cursorPosition.x * viewport.zoom,
        offsetY + cursorPosition.y * viewport.zoom,
        viewport.zoom,
        viewport.zoom
      );
    }
  }, [
    settings,
    viewport,
    layers,
    pixelData,
    cursorPosition,
    activeTool,
    primaryColor,
    containerRef,
  ]);

  // Re-render on state changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Bresenham's line algorithm to get all points between two points
  const getLinePoints = useCallback(
    (
      x0: number,
      y0: number,
      x1: number,
      y1: number
    ): { x: number; y: number }[] => {
      const points: { x: number; y: number }[] = [];
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;

      let x = x0;
      let y = y0;

      while (true) {
        points.push({ x, y });
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
      return points;
    },
    []
  );

  // Draw pixel helper function
  const drawPixel = useCallback(
    (x: number, y: number, color: string, erase = false) => {
      if (!activeLayerId) return;
      const layer = layers.find((l) => l.id === activeLayerId);
      if (!layer || layer.locked) return;

      const key = `${x},${y}`;
      setPixelData((prev) => {
        const newData = new Map(prev);
        const layerPixels = new Map(newData.get(activeLayerId) || new Map());
        if (erase) {
          layerPixels.delete(key);
        } else {
          layerPixels.set(key, color);
        }
        newData.set(activeLayerId, layerPixels);
        return newData;
      });
    },
    [activeLayerId, layers]
  );

  // Draw line between two points
  const drawLine = useCallback(
    (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      color: string,
      erase = false
    ) => {
      if (!activeLayerId) return;
      const layer = layers.find((l) => l.id === activeLayerId);
      if (!layer || layer.locked) return;

      const points = getLinePoints(x0, y0, x1, y1);
      setPixelData((prev) => {
        const newData = new Map(prev);
        const layerPixels = new Map(newData.get(activeLayerId) || new Map());
        points.forEach((pt) => {
          const key = `${pt.x},${pt.y}`;
          if (erase) {
            layerPixels.delete(key);
          } else {
            layerPixels.set(key, color);
          }
        });
        newData.set(activeLayerId, layerPixels);
        return newData;
      });
    },
    [activeLayerId, layers, getLinePoints]
  );

  // Handle mouse events
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      updateCursorPosition(e.clientX, e.clientY);

      if (isPanning && lastPanPoint) {
        const deltaX = e.clientX - lastPanPoint.x;
        const deltaY = e.clientY - lastPanPoint.y;
        pan(deltaX, deltaY);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
        return;
      }

      // Draw while dragging
      if (isDrawing && cursorPosition && drawingButton !== null) {
        const color = drawingButton === 0 ? primaryColor : secondaryColor;

        if (lastDrawPoint) {
          // Draw line from last point to current point
          if (activeTool === "pencil") {
            drawLine(
              lastDrawPoint.x,
              lastDrawPoint.y,
              cursorPosition.x,
              cursorPosition.y,
              color
            );
          } else if (activeTool === "eraser") {
            drawLine(
              lastDrawPoint.x,
              lastDrawPoint.y,
              cursorPosition.x,
              cursorPosition.y,
              "",
              true
            );
          }
        } else {
          // First point
          if (activeTool === "pencil") {
            drawPixel(cursorPosition.x, cursorPosition.y, color);
          } else if (activeTool === "eraser") {
            drawPixel(cursorPosition.x, cursorPosition.y, "", true);
          }
        }
        setLastDrawPoint({ x: cursorPosition.x, y: cursorPosition.y });
      }
    },
    [
      updateCursorPosition,
      isPanning,
      lastPanPoint,
      pan,
      isDrawing,
      cursorPosition,
      drawingButton,
      activeTool,
      primaryColor,
      secondaryColor,
      drawPixel,
      drawLine,
      lastDrawPoint,
    ]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button for panning
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
        return;
      }

      // Left or right click for drawing
      if (
        (e.button === 0 || e.button === 2) &&
        cursorPosition &&
        activeLayerId
      ) {
        const layer = layers.find((l) => l.id === activeLayerId);
        if (!layer || layer.locked) return;

        // Start drawing mode
        setIsDrawing(true);
        setDrawingButton(e.button);
        setLastDrawPoint({ x: cursorPosition.x, y: cursorPosition.y });

        if (activeTool === "pencil") {
          const color = e.button === 0 ? primaryColor : secondaryColor;
          drawPixel(cursorPosition.x, cursorPosition.y, color);
        } else if (activeTool === "eraser") {
          drawPixel(cursorPosition.x, cursorPosition.y, "", true);
        } else if (activeTool === "picker") {
          // Get color from topmost visible layer
          const key = `${cursorPosition.x},${cursorPosition.y}`;
          for (let i = layers.length - 1; i >= 0; i--) {
            const l = layers[i];
            if (!l.visible) continue;
            const layerPixels = pixelData.get(l.id);
            if (layerPixels?.has(key)) {
              setPrimaryColor(layerPixels.get(key)!);
              break;
            }
          }
        }
      }
    },
    [
      cursorPosition,
      activeLayerId,
      layers,
      activeTool,
      primaryColor,
      secondaryColor,
      pixelData,
      drawPixel,
    ]
  );

  const handleMouseUp = useCallback(() => {
    // Save to history if we were drawing
    if (isDrawing) {
      saveToHistory();
    }
    setIsPanning(false);
    setLastPanPoint(null);
    setIsDrawing(false);
    setDrawingButton(null);
    setLastDrawPoint(null);
  }, [isDrawing, saveToHistory]);

  const handleMouseLeave = useCallback(() => {
    // Save to history if we were drawing
    if (isDrawing) {
      saveToHistory();
    }
    clearCursorPosition();
    setIsPanning(false);
    setLastPanPoint(null);
    setIsDrawing(false);
    setDrawingButton(null);
    setLastDrawPoint(null);
  }, [clearCursorPosition, isDrawing, saveToHistory]);

  const handleWheel = useCallback(
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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (!activeLayerId) return;
    setPixelData((prev) => {
      const newData = new Map(prev);
      newData.set(activeLayerId, new Map());
      return newData;
    });
  }, [activeLayerId]);

  // Export canvas as PNG
  const exportPNG = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = settings.width;
    canvas.height = settings.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all visible layers
    layers.forEach((layer) => {
      if (!layer.visible) return;
      const layerPixels = pixelData.get(layer.id);
      if (!layerPixels) return;

      ctx.globalAlpha = layer.opacity / 100;
      layerPixels.forEach((color, key) => {
        const [px, py] = key.split(",").map(Number);
        ctx.fillStyle = color;
        ctx.fillRect(px, py, 1, 1);
      });
      ctx.globalAlpha = 1;
    });

    // Download
    const link = document.createElement("a");
    link.download = "pixel-art.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [settings, layers, pixelData]);

  // Toolbar actions
  const toolbarActions: ToolbarAction[] = useMemo(
    () => [
      { action: "New Project", handler: clearCanvas },
      { action: "Save Project", handler: exportPNG },
      { action: "Undo", handler: undo },
      { action: "Redo", handler: redo },
      { action: "Zoom", handler: resetZoom },
    ],
    [clearCanvas, exportPNG, undo, redo, resetZoom]
  );

  // Menu action handler
  const handleMenuAction = useCallback(
    (action: string): boolean => {
      switch (action) {
        case "New Project":
          clearCanvas();
          return true;
        case "Save Project":
        case "Export...":
          exportPNG();
          return true;
        case "Undo":
          undo();
          return true;
        case "Redo":
          redo();
          return true;
        case "Zoom In":
          zoomIn();
          return true;
        case "Zoom Out":
          zoomOut();
          return true;
        case "Fit to Window":
        case "Actual Size":
          resetZoom();
          return true;
        case "Show Grid":
          toggleGrid();
          return true;
        default:
          return false;
      }
    },
    [clearCanvas, exportPNG, undo, redo, zoomIn, zoomOut, resetZoom, toggleGrid]
  );

  return (
    <MainLayout
      title="Pixel Editor - Game Asset Tool"
      toolbarActions={toolbarActions}
      onMenuAction={handleMenuAction}
    >
      <div className="h-full flex flex-col lg:flex-row overflow-hidden ie-scrollbar">
        {/* Left Panel - Tools */}
        <div className="w-full lg:w-48 shrink-0 flex flex-col ie-panel m-0.5 lg:m-1">
          <div className="ie-groupbox">
            <span className="ie-groupbox-title">Tools</span>
            <div className="grid grid-cols-4 lg:grid-cols-2 gap-1 -mt-2">
              <button
                className={`ie-button ie-button-sm ${
                  activeTool === "pencil" ? "ie-button-active" : ""
                }`}
                onClick={() => setActiveTool("pencil")}
                title="Pencil (P)"
              >
                ✏️
              </button>
              <button
                className={`ie-button ie-button-sm ${
                  activeTool === "eraser" ? "ie-button-active" : ""
                }`}
                onClick={() => setActiveTool("eraser")}
                title="Eraser (E)"
              >
                🧹
              </button>
              <button
                className={`ie-button ie-button-sm ${
                  activeTool === "fill" ? "ie-button-active" : ""
                }`}
                onClick={() => setActiveTool("fill")}
                title="Fill (G)"
              >
                🪣
              </button>
              <button
                className={`ie-button ie-button-sm ${
                  activeTool === "picker" ? "ie-button-active" : ""
                }`}
                onClick={() => setActiveTool("picker")}
                title="Color Picker (I)"
              >
                💉
              </button>
            </div>
          </div>

          {/* Colors */}
          <div className="ie-groupbox mt-1">
            <span className="ie-groupbox-title">Colors</span>
            <div className="flex gap-2 -mt-2">
              <div className="relative">
                <div
                  className="w-10 h-10 ie-panel-inset cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                  title="Primary Color (Left Click)"
                />
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <div className="relative">
                <div
                  className="w-10 h-10 ie-panel-inset cursor-pointer"
                  style={{ backgroundColor: secondaryColor }}
                  title="Secondary Color (Right Click)"
                />
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <button
                className="ie-button ie-button-sm"
                onClick={() => {
                  const temp = primaryColor;
                  setPrimaryColor(secondaryColor);
                  setSecondaryColor(temp);
                }}
                title="Swap Colors (X)"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Zoom */}
          <div className="ie-groupbox mt-1">
            <span className="ie-groupbox-title">View</span>
            <div className="space-y-1 -mt-2">
              <div className="flex gap-1">
                <button
                  className="ie-button ie-button-sm flex-1"
                  onClick={zoomOut}
                >
                  ➖
                </button>
                <span className="ie-panel-inset px-2 text-xs flex items-center">
                  {viewport.zoom}x
                </span>
                <button
                  className="ie-button ie-button-sm flex-1"
                  onClick={zoomIn}
                >
                  ➕
                </button>
              </div>
              <select
                className="ie-input w-full text-xs"
                value={viewport.zoom}
                onChange={(e) => setZoom(parseInt(e.target.value))}
              >
                {zoomLevels.map((z) => (
                  <option key={z} value={z}>
                    {z}x
                  </option>
                ))}
              </select>
              <div className="flex gap-1">
                <button
                  className="ie-button ie-button-sm flex-1"
                  onClick={resetZoom}
                >
                  Reset
                </button>
                <button
                  className="ie-button ie-button-sm flex-1"
                  onClick={resetPan}
                >
                  Center
                </button>
              </div>
              <label className="ie-checkbox text-xs">
                <input
                  type="checkbox"
                  checked={settings.showGrid}
                  onChange={toggleGrid}
                />
                Show Grid
              </label>
            </div>
          </div>

          {/* Canvas Size */}
          <div className="ie-groupbox mt-1">
            <span className="ie-groupbox-title">Canvas</span>
            <div className="space-y-1 -mt-2">
              <div className="flex gap-1">
                <div className="flex-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    W
                  </label>
                  <input
                    type="number"
                    className="ie-input w-full text-xs"
                    value={settings.width}
                    onChange={(e) =>
                      resizeCanvas(
                        parseInt(e.target.value) || 1,
                        settings.height
                      )
                    }
                    min={1}
                    max={256}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    H
                  </label>
                  <input
                    type="number"
                    className="ie-input w-full text-xs"
                    value={settings.height}
                    onChange={(e) =>
                      resizeCanvas(
                        settings.width,
                        parseInt(e.target.value) || 1
                      )
                    }
                    min={1}
                    max={256}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col ie-panel m-0.5 lg:m-1 min-w-0 min-h-[300px] lg:min-h-0">
          <div className="ie-groupbox flex-1 flex flex-col min-h-0">
            <span className="ie-groupbox-title">
              Canvas ({settings.width}×{settings.height})
              {cursorPosition && (
                <span className="text-gray-500 ml-2">
                  [{cursorPosition.x}, {cursorPosition.y}]
                </span>
              )}
            </span>
            <div
              ref={containerRef}
              className="ie-panel-inset flex-1 overflow-hidden cursor-crosshair -mt-2"
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              onContextMenu={handleContextMenu}
            >
              <canvas ref={displayCanvasRef} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Right Panel - Layers */}
        <div className="w-full lg:w-48 shrink-0 flex flex-col ie-panel m-0.5 lg:m-1">
          <div className="ie-groupbox flex-1 flex flex-col min-h-0">
            <span className="ie-groupbox-title">Layers</span>
            <div className="flex gap-1 -mt-2 mb-1">
              <button
                className="ie-button ie-button-sm flex-1"
                onClick={() => addLayer()}
              >
                ➕
              </button>
              <button
                className="ie-button ie-button-sm flex-1"
                onClick={() => activeLayerId && removeLayer(activeLayerId)}
                disabled={layers.length <= 1}
              >
                ➖
              </button>
            </div>
            <div className="ie-listview flex-1 overflow-auto ie-scrollbar">
              {[...layers].reverse().map((layer) => (
                <div
                  key={layer.id}
                  className={`ie-listview-item flex items-center gap-1 ${
                    activeLayerId === layer.id ? "selected" : ""
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
                    {layer.visible ? "👁️" : "👁️‍🗨️"}
                  </button>
                  {editingLayerId === layer.id ? (
                    <input
                      type="text"
                      className="ie-input flex-1 text-xs py-0"
                      value={layer.name}
                      onChange={(e) => renameLayer(layer.id, e.target.value)}
                      onBlur={() => setEditingLayerId(null)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && setEditingLayerId(null)
                      }
                      autoFocus
                    />
                  ) : (
                    <span
                      className="flex-1 text-xs truncate"
                      onDoubleClick={() => setEditingLayerId(layer.id)}
                    >
                      {layer.name}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Layer opacity */}
            {activeLayerId && (
              <div className="mt-1">
                <label className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                  <span>Opacity</span>
                  <span>
                    {layers.find((l) => l.id === activeLayerId)?.opacity}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={
                    layers.find((l) => l.id === activeLayerId)?.opacity || 100
                  }
                  onChange={(e) =>
                    setLayerOpacity(activeLayerId, parseInt(e.target.value))
                  }
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="ie-panel-inset p-2 mt-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Tips:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>Scroll to zoom</li>
                <li>Middle-click to pan</li>
                <li>Right-click: 2nd color</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
