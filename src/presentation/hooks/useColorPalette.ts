"use client";

import {
  ColorEntry,
  ColorPalette,
  createColorEntry,
  DEFAULT_PALETTE,
  hexToRgb,
  HSVColor,
  hsvToRgb,
  PRESET_PALETTES,
  RGBColor,
  rgbToHex,
  rgbToHsv,
} from "@/src/domain/types/palette";
import { useCallback, useState } from "react";

interface ColorPaletteState {
  palette: ColorPalette;
  selectedColorId: string | null;
  currentColor: ColorEntry;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_COLOR = createColorEntry("#FF0000", "Red");

export function useColorPalette() {
  const [state, setState] = useState<ColorPaletteState>({
    palette: DEFAULT_PALETTE,
    selectedColorId: null,
    currentColor: DEFAULT_COLOR,
    isLoading: false,
    error: null,
  });

  // Set current color from hex
  const setColorFromHex = useCallback((hex: string) => {
    const rgb = hexToRgb(hex);
    const hsv = rgbToHsv(rgb);
    setState((prev) => ({
      ...prev,
      currentColor: {
        ...prev.currentColor,
        hex: hex.startsWith("#") ? hex : `#${hex}`,
        rgb,
        hsv,
      },
    }));
  }, []);

  // Set current color from RGB
  const setColorFromRgb = useCallback((rgb: RGBColor) => {
    const hex = rgbToHex(rgb);
    const hsv = rgbToHsv(rgb);
    setState((prev) => ({
      ...prev,
      currentColor: {
        ...prev.currentColor,
        hex,
        rgb,
        hsv,
      },
    }));
  }, []);

  // Set current color from HSV
  const setColorFromHsv = useCallback((hsv: HSVColor) => {
    const rgb = hsvToRgb(hsv);
    const hex = rgbToHex(rgb);
    setState((prev) => ({
      ...prev,
      currentColor: {
        ...prev.currentColor,
        hex,
        rgb,
        hsv,
      },
    }));
  }, []);

  // Add current color to palette
  const addColorToPalette = useCallback((name?: string) => {
    setState((prev) => {
      const newColor = createColorEntry(prev.currentColor.hex, name);
      return {
        ...prev,
        palette: {
          ...prev.palette,
          colors: [...prev.palette.colors, newColor],
          updatedAt: Date.now(),
        },
      };
    });
  }, []);

  // Remove color from palette
  const removeColorFromPalette = useCallback((colorId: string) => {
    setState((prev) => ({
      ...prev,
      palette: {
        ...prev.palette,
        colors: prev.palette.colors.filter((c) => c.id !== colorId),
        updatedAt: Date.now(),
      },
      selectedColorId:
        prev.selectedColorId === colorId ? null : prev.selectedColorId,
    }));
  }, []);

  // Select a color from palette
  const selectColor = useCallback((colorId: string) => {
    setState((prev) => {
      const color = prev.palette.colors.find((c) => c.id === colorId);
      if (!color) return prev;
      return {
        ...prev,
        selectedColorId: colorId,
        currentColor: { ...color },
      };
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedColorId: null,
    }));
  }, []);

  // Update palette name
  const setPaletteName = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      palette: {
        ...prev.palette,
        name,
        updatedAt: Date.now(),
      },
    }));
  }, []);

  // Clear palette
  const clearPalette = useCallback(() => {
    setState((prev) => ({
      ...prev,
      palette: {
        ...prev.palette,
        colors: [],
        updatedAt: Date.now(),
      },
      selectedColorId: null,
    }));
  }, []);

  // Load preset palette
  const loadPresetPalette = useCallback((presetId: string) => {
    const preset = PRESET_PALETTES.find((p) => p.id === presetId);
    if (!preset) return;

    const colors = preset.colors.map((hex) => createColorEntry(hex));
    setState((prev) => ({
      ...prev,
      palette: {
        id: `${preset.id}-${Date.now()}`,
        name: preset.name,
        description: preset.description,
        colors,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      selectedColorId: null,
    }));
  }, []);

  // Export palette as JSON
  const exportPaletteJson = useCallback(() => {
    const data = JSON.stringify(state.palette, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.palette.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.palette]);

  // Export palette as GPL (GIMP Palette)
  const exportPaletteGpl = useCallback(() => {
    let gpl = `GIMP Palette\nName: ${state.palette.name}\nColumns: 8\n#\n`;
    state.palette.colors.forEach((color) => {
      gpl += `${color.rgb.r} ${color.rgb.g} ${color.rgb.b}\t${
        color.name || color.hex
      }\n`;
    });
    const blob = new Blob([gpl], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.palette.name.replace(/\s+/g, "_")}.gpl`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.palette]);

  // Export palette as hex list
  const exportPaletteHex = useCallback(() => {
    const hexList = state.palette.colors.map((c) => c.hex).join("\n");
    const blob = new Blob([hexList], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.palette.name.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.palette]);

  // Import palette from JSON file
  const importPaletteJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ColorPalette;
        setState((prev) => ({
          ...prev,
          palette: {
            ...data,
            id: `imported-${Date.now()}`,
            updatedAt: Date.now(),
          },
          selectedColorId: null,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          error: "Failed to import palette",
        }));
      }
    };
    reader.readAsText(file);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Copy color to clipboard
  const copyToClipboard = useCallback(
    (format: "hex" | "rgb" | "hsv" = "hex") => {
      let text = "";
      switch (format) {
        case "hex":
          text = state.currentColor.hex;
          break;
        case "rgb":
          text = `rgb(${state.currentColor.rgb.r}, ${state.currentColor.rgb.g}, ${state.currentColor.rgb.b})`;
          break;
        case "hsv":
          text = `hsv(${state.currentColor.hsv.h}, ${state.currentColor.hsv.s}%, ${state.currentColor.hsv.v}%)`;
          break;
      }
      navigator.clipboard.writeText(text);
    },
    [state.currentColor]
  );

  return {
    ...state,
    presets: PRESET_PALETTES,
    setColorFromHex,
    setColorFromRgb,
    setColorFromHsv,
    addColorToPalette,
    removeColorFromPalette,
    selectColor,
    clearSelection,
    setPaletteName,
    clearPalette,
    loadPresetPalette,
    exportPaletteJson,
    exportPaletteGpl,
    exportPaletteHex,
    importPaletteJson,
    clearError,
    copyToClipboard,
  };
}
