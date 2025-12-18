"use client";

import type {
  AtlasSettings,
  PackedAtlas,
  SpriteFrame,
} from "@/src/domain/types/atlas";
import { DEFAULT_ATLAS_SETTINGS } from "@/src/domain/types/atlas";
import {
  downloadCanvas,
  downloadFile,
  exportToCocos,
  exportToCSS,
  exportToJsonArray,
  exportToJsonHash,
  exportToPhaser,
  exportToUnity,
  renderAtlasToCanvas,
} from "@/src/infrastructure/atlas/atlas-exporter";
import { packSprites } from "@/src/infrastructure/atlas/maxrects-packer";
import { useCallback, useRef, useState } from "react";

interface UseAtlasPackerState {
  frames: SpriteFrame[];
  settings: AtlasSettings;
  packedAtlas: PackedAtlas | null;
  isLoading: boolean;
  error: string | null;
  atlasName: string;
}

export function useAtlasPacker() {
  const [state, setState] = useState<UseAtlasPackerState>({
    frames: [],
    settings: DEFAULT_ATLAS_SETTINGS,
    packedAtlas: null,
    isLoading: false,
    error: null,
    atlasName: "atlas",
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const setAtlasName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, atlasName: name }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AtlasSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
      packedAtlas: null,
    }));
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const newFrames: SpriteFrame[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          continue;
        }

        const image = await loadImage(file);
        const frame: SpriteFrame = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          file,
          image,
          width: image.width,
          height: image.height,
          x: 0,
          y: 0,
          rotated: false,
          trimmed: false,
          sourceSize: { w: image.width, h: image.height },
          spriteSourceSize: { x: 0, y: 0, w: image.width, h: image.height },
        };

        newFrames.push(frame);
      }

      setState((prev) => ({
        ...prev,
        frames: [...prev.frames, ...newFrames],
        isLoading: false,
        packedAtlas: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load images",
      }));
    }
  }, []);

  const removeFrame = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      frames: prev.frames.filter((f) => f.id !== id),
      packedAtlas: null,
    }));
  }, []);

  const clearFrames = useCallback(() => {
    setState((prev) => ({
      ...prev,
      frames: [],
      packedAtlas: null,
    }));
  }, []);

  const packAtlas = useCallback(() => {
    setState((prev) => {
      if (prev.frames.length === 0) {
        return { ...prev, error: "No images to pack" };
      }

      const packed = packSprites(prev.frames, prev.settings);

      if (!packed) {
        return {
          ...prev,
          error: "Failed to pack sprites. Try increasing max dimensions.",
        };
      }

      return {
        ...prev,
        packedAtlas: packed,
        error: null,
      };
    });
  }, []);

  const exportAtlas = useCallback(
    async (format: string) => {
      if (!state.packedAtlas) {
        setState((prev) => ({ ...prev, error: "Pack the atlas first" }));
        return;
      }

      try {
        let content: string;
        let extension: string;
        let mimeType: string;

        switch (format) {
          case "json-array":
            content = exportToJsonArray(state.packedAtlas, state.atlasName);
            extension = "json";
            mimeType = "application/json";
            break;
          case "json-hash":
            content = exportToJsonHash(state.packedAtlas, state.atlasName);
            extension = "json";
            mimeType = "application/json";
            break;
          case "cocos":
            content = exportToCocos(state.packedAtlas, state.atlasName);
            extension = "plist";
            mimeType = "application/xml";
            break;
          case "phaser":
            content = exportToPhaser(state.packedAtlas, state.atlasName);
            extension = "json";
            mimeType = "application/json";
            break;
          case "unity":
            content = exportToUnity(state.packedAtlas, state.atlasName);
            extension = "json";
            mimeType = "application/json";
            break;
          case "css":
            content = exportToCSS(state.packedAtlas, state.atlasName);
            extension = "css";
            mimeType = "text/css";
            break;
          default:
            throw new Error(`Unknown format: ${format}`);
        }

        downloadFile(content, `${state.atlasName}.${extension}`, mimeType);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to export",
        }));
      }
    },
    [state.packedAtlas, state.atlasName]
  );

  const exportPNG = useCallback(async () => {
    if (!state.packedAtlas) {
      setState((prev) => ({ ...prev, error: "Pack the atlas first" }));
      return;
    }

    try {
      const canvas = await renderAtlasToCanvas(state.packedAtlas);
      downloadCanvas(canvas, `${state.atlasName}.png`);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to export PNG",
      }));
    }
  }, [state.packedAtlas, state.atlasName]);

  const getPreviewCanvas =
    useCallback(async (): Promise<HTMLCanvasElement | null> => {
      if (!state.packedAtlas) return null;

      try {
        const canvas = await renderAtlasToCanvas(state.packedAtlas);
        canvasRef.current = canvas;
        return canvas;
      } catch {
        return null;
      }
    }, [state.packedAtlas]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    setAtlasName,
    updateSettings,
    addFiles,
    removeFrame,
    clearFrames,
    packAtlas,
    exportAtlas,
    exportPNG,
    getPreviewCanvas,
    clearError,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}
