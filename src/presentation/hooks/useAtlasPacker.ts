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

const VALID_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/bmp",
];

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

  const validateImageFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      if (!file.type) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (
          !ext ||
          !VALID_IMAGE_TYPES.map((t) => t.split("/")[1]).includes(ext)
        ) {
          return { valid: false, error: `Invalid file type: ${file.name}` };
        }
      } else if (!VALID_IMAGE_TYPES.includes(file.type)) {
        return { valid: false, error: `Invalid image type: ${file.type}` };
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File too large: ${file.name} (max 10MB)`,
        };
      }

      return { valid: true };
    },
    []
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const newFrames: SpriteFrame[] = [];
        const errors: string[] = [];

        for (const file of Array.from(files)) {
          const validation = validateImageFile(file);
          if (!validation.valid) {
            errors.push(validation.error || `Invalid file: ${file.name}`);
            continue;
          }

          try {
            const image = await loadImage(file);
            const frame: SpriteFrame = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
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
          } catch {
            errors.push(`Failed to load: ${file.name}`);
          }
        }

        if (newFrames.length === 0 && errors.length > 0) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errors.join("\n"),
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          frames: [...prev.frames, ...newFrames],
          isLoading: false,
          packedAtlas: null,
          error:
            errors.length > 0
              ? `Some files skipped:\n${errors.join("\n")}`
              : null,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load images",
        }));
      }
    },
    [validateImageFile]
  );

  // Add frames from sprite strip
  const addSpriteStrip = useCallback(
    async (
      file: File,
      frameWidth: number,
      frameHeight: number,
      frameCount: number,
      direction: "horizontal" | "vertical" = "horizontal"
    ) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const image = await loadImage(file);
        const baseName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/_strip\d+$/, "");
        const newFrames: SpriteFrame[] = [];

        // Create a canvas for each frame
        for (let i = 0; i < frameCount; i++) {
          const canvas = document.createElement("canvas");
          canvas.width = frameWidth;
          canvas.height = frameHeight;
          const ctx = canvas.getContext("2d");

          if (!ctx) throw new Error("Failed to create canvas context");

          const sx = direction === "horizontal" ? i * frameWidth : 0;
          const sy = direction === "vertical" ? i * frameHeight : 0;

          ctx.drawImage(
            image,
            sx,
            sy,
            frameWidth,
            frameHeight,
            0,
            0,
            frameWidth,
            frameHeight
          );

          // Convert canvas to blob and create frame
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) =>
                b ? resolve(b) : reject(new Error("Failed to create blob")),
              "image/png"
            );
          });

          const frameFile = new File(
            [blob],
            `${baseName}_${String(i).padStart(2, "0")}.png`,
            {
              type: "image/png",
            }
          );

          const frameImage = await loadImage(frameFile);

          newFrames.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
            name: `${baseName}_${String(i).padStart(2, "0")}`,
            file: frameFile,
            image: frameImage,
            width: frameWidth,
            height: frameHeight,
            x: 0,
            y: 0,
            rotated: false,
            trimmed: false,
            sourceSize: { w: frameWidth, h: frameHeight },
            spriteSourceSize: { x: 0, y: 0, w: frameWidth, h: frameHeight },
          });
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
          error:
            err instanceof Error ? err.message : "Failed to split sprite strip",
        }));
      }
    },
    [validateImageFile]
  );

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

  const packAtlas = useCallback((): PackedAtlas | null => {
    let result: PackedAtlas | null = null;

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

      result = packed;
      return {
        ...prev,
        packedAtlas: packed,
        error: null,
      };
    });

    return result;
  }, []);

  const exportAtlas = useCallback(
    async (format: string, atlasOverride?: PackedAtlas | null) => {
      const atlas = atlasOverride ?? state.packedAtlas;
      if (!atlas) {
        setState((prev) => ({ ...prev, error: "Pack the atlas first" }));
        return;
      }

      try {
        let content: string;
        let extension: string;
        let mimeType: string;

        switch (format) {
          case "json-array":
            content = exportToJsonArray(atlas, state.atlasName);
            extension = "json";
            mimeType = "application/json";
            break;
          case "json-hash":
            content = exportToJsonHash(atlas, state.atlasName);
            extension = "json";
            mimeType = "application/json";
            break;
          case "cocos":
            content = exportToCocos(atlas, state.atlasName);
            extension = "plist";
            mimeType = "application/xml";
            break;
          case "phaser":
            content = exportToPhaser(atlas, state.atlasName);
            extension = "json";
            mimeType = "application/json";
            break;
          case "unity":
            content = exportToUnity(atlas, state.atlasName);
            extension = "json";
            mimeType = "application/json";
            break;
          case "css":
            content = exportToCSS(atlas, state.atlasName);
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

  const exportPNG = useCallback(
    async (atlasOverride?: PackedAtlas | null) => {
      const atlas = atlasOverride ?? state.packedAtlas;
      if (!atlas) {
        setState((prev) => ({ ...prev, error: "Pack the atlas first" }));
        return;
      }

      try {
        const canvas = await renderAtlasToCanvas(atlas);
        downloadCanvas(canvas, `${state.atlasName}.png`);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to export PNG",
        }));
      }
    },
    [state.packedAtlas, state.atlasName]
  );

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
    addSpriteStrip,
    validateImageFile,
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
