"use client";

import {
  CanvasLayer,
  CanvasSettings,
  createLayer,
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_VIEWPORT,
  getNextZoomLevel,
  Point,
  screenToCanvas,
  ViewportState,
  ZOOM_LEVELS,
} from "@/src/domain/types/canvas";
import { useCallback, useRef, useState } from "react";

interface CanvasState {
  settings: CanvasSettings;
  viewport: ViewportState;
  layers: CanvasLayer[];
  activeLayerId: string | null;
  isDrawing: boolean;
  lastPoint: Point | null;
  cursorPosition: Point | null;
}

export function useCanvas(initialSettings?: Partial<CanvasSettings>) {
  const [state, setState] = useState<CanvasState>(() => {
    const settings = { ...DEFAULT_CANVAS_SETTINGS, ...initialSettings };
    const initialLayer = createLayer("Layer 1");
    return {
      settings,
      viewport: DEFAULT_VIEWPORT,
      layers: [initialLayer],
      activeLayerId: initialLayer.id,
      isDrawing: false,
      lastPoint: null,
      cursorPosition: null,
    };
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        zoom: getNextZoomLevel(prev.viewport.zoom, "in"),
      },
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        zoom: getNextZoomLevel(prev.viewport.zoom, "out"),
      },
    }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        zoom: Math.max(
          prev.viewport.minZoom,
          Math.min(prev.viewport.maxZoom, zoom)
        ),
      },
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        zoom: 8,
        panX: 0,
        panY: 0,
      },
    }));
  }, []);

  // Pan controls
  const pan = useCallback((deltaX: number, deltaY: number) => {
    setState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        panX: prev.viewport.panX + deltaX,
        panY: prev.viewport.panY + deltaY,
      },
    }));
  }, []);

  const resetPan = useCallback(() => {
    setState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        panX: 0,
        panY: 0,
      },
    }));
  }, []);

  // Grid toggle
  const toggleGrid = useCallback(() => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        showGrid: !prev.settings.showGrid,
      },
    }));
  }, []);

  const setGridSize = useCallback((size: number) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        gridSize: Math.max(1, size),
      },
    }));
  }, []);

  // Canvas settings
  const updateSettings = useCallback((newSettings: Partial<CanvasSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
  }, []);

  const resizeCanvas = useCallback((width: number, height: number) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        width: Math.max(1, Math.min(2048, width)),
        height: Math.max(1, Math.min(2048, height)),
      },
    }));
  }, []);

  // Layer management
  const addLayer = useCallback((name?: string) => {
    setState((prev) => {
      const newLayer = createLayer(name || `Layer ${prev.layers.length + 1}`);
      return {
        ...prev,
        layers: [...prev.layers, newLayer],
        activeLayerId: newLayer.id,
      };
    });
  }, []);

  const removeLayer = useCallback((layerId: string) => {
    setState((prev) => {
      if (prev.layers.length <= 1) return prev;
      const newLayers = prev.layers.filter((l) => l.id !== layerId);
      return {
        ...prev,
        layers: newLayers,
        activeLayerId:
          prev.activeLayerId === layerId
            ? newLayers[newLayers.length - 1]?.id ?? null
            : prev.activeLayerId,
      };
    });
  }, []);

  const setActiveLayer = useCallback((layerId: string) => {
    setState((prev) => ({
      ...prev,
      activeLayerId: layerId,
    }));
  }, []);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    }));
  }, []);

  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === layerId
          ? { ...l, opacity: Math.max(0, Math.min(100, opacity)) }
          : l
      ),
    }));
  }, []);

  const renameLayer = useCallback((layerId: string, name: string) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, name } : l)),
    }));
  }, []);

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newLayers = [...prev.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return { ...prev, layers: newLayers };
    });
  }, []);

  // Cursor position tracking
  const updateCursorPosition = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const localX = screenX - rect.left;
      const localY = screenY - rect.top;

      setState((prev) => {
        const canvasSize = {
          width: prev.settings.width,
          height: prev.settings.height,
        };
        const canvasPos = screenToCanvas(
          localX,
          localY,
          prev.viewport,
          rect,
          canvasSize
        );
        // Clamp to canvas bounds
        if (
          canvasPos.x < 0 ||
          canvasPos.x >= prev.settings.width ||
          canvasPos.y < 0 ||
          canvasPos.y >= prev.settings.height
        ) {
          return { ...prev, cursorPosition: null };
        }
        return { ...prev, cursorPosition: canvasPos };
      });
    },
    []
  );

  const clearCursorPosition = useCallback(() => {
    setState((prev) => ({ ...prev, cursorPosition: null }));
  }, []);

  // Drawing state
  const startDrawing = useCallback((point: Point) => {
    setState((prev) => ({
      ...prev,
      isDrawing: true,
      lastPoint: point,
    }));
  }, []);

  const stopDrawing = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDrawing: false,
      lastPoint: null,
    }));
  }, []);

  // Get active layer
  const getActiveLayer = useCallback((): CanvasLayer | null => {
    return state.layers.find((l) => l.id === state.activeLayerId) ?? null;
  }, [state.layers, state.activeLayerId]);

  return {
    // State
    ...state,
    canvasRef,
    containerRef,
    zoomLevels: ZOOM_LEVELS,

    // Zoom
    zoomIn,
    zoomOut,
    setZoom,
    resetZoom,

    // Pan
    pan,
    resetPan,

    // Grid
    toggleGrid,
    setGridSize,

    // Settings
    updateSettings,
    resizeCanvas,

    // Layers
    addLayer,
    removeLayer,
    setActiveLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    renameLayer,
    reorderLayers,
    getActiveLayer,

    // Cursor
    updateCursorPosition,
    clearCursorPosition,

    // Drawing
    startDrawing,
    stopDrawing,
  };
}
