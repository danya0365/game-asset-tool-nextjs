"use client";

import { MainLayout } from "@/src/presentation/components/templates/MainLayout";
import { useColorPalette } from "@/src/presentation/hooks/useColorPalette";
import { useCallback, useRef, useState } from "react";

export function ColorPaletteView() {
  const {
    palette,
    selectedColorId,
    currentColor,
    presets,
    error,
    setColorFromHex,
    setColorFromRgb,
    setColorFromHsv,
    addColorToPalette,
    removeColorFromPalette,
    selectColor,
    clearPalette,
    loadPresetPalette,
    exportPaletteJson,
    exportPaletteGpl,
    exportPaletteHex,
    importPaletteJson,
    clearError,
    copyToClipboard,
  } = useColorPalette();

  const [hexInput, setHexInput] = useState(currentColor.hex);
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update hex input when current color changes
  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setHexInput(value);
      if (/^#?[0-9A-Fa-f]{6}$/.test(value)) {
        setColorFromHex(value);
      }
    },
    [setColorFromHex]
  );

  const handleHexBlur = useCallback(() => {
    setHexInput(currentColor.hex);
  }, [currentColor.hex]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        importPaletteJson(file);
      }
    },
    [importPaletteJson]
  );

  return (
    <MainLayout title="Color Palette - Game Asset Tool">
      <div className="h-full flex flex-col lg:flex-row overflow-auto ie-scrollbar">
        {/* Left Panel - Color Picker */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col ie-panel m-0.5 lg:m-1">
          <div className="ie-groupbox flex-1 flex flex-col">
            <span className="ie-groupbox-title">Color Picker</span>

            {/* Color Preview */}
            <div className="flex gap-2 mb-2 -mt-2">
              <div
                className="w-16 h-16 ie-panel-inset"
                style={{ backgroundColor: currentColor.hex }}
              />
              <div className="flex-1 space-y-1">
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {currentColor.hex.toUpperCase()}
                </div>
                <div className="text-xs text-gray-500">
                  RGB: {currentColor.rgb.r}, {currentColor.rgb.g},{" "}
                  {currentColor.rgb.b}
                </div>
                <div className="text-xs text-gray-500">
                  HSV: {currentColor.hsv.h}°, {currentColor.hsv.s}%,{" "}
                  {currentColor.hsv.v}%
                </div>
              </div>
            </div>

            {/* HEX Input */}
            <div className="mb-2">
              <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                HEX
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  className="ie-input flex-1"
                  value={hexInput}
                  onChange={handleHexChange}
                  onBlur={handleHexBlur}
                  placeholder="#FF0000"
                />
                <button
                  className="ie-button ie-button-sm"
                  onClick={() => copyToClipboard("hex")}
                  title="Copy HEX"
                >
                  📋
                </button>
              </div>
            </div>

            {/* RGB Sliders */}
            <div className="space-y-2 mb-2">
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 flex justify-between">
                  <span>R</span>
                  <span>{currentColor.rgb.r}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={currentColor.rgb.r}
                  onChange={(e) =>
                    setColorFromRgb({
                      ...currentColor.rgb,
                      r: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                  style={{
                    accentColor: `rgb(${currentColor.rgb.r}, 0, 0)`,
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 flex justify-between">
                  <span>G</span>
                  <span>{currentColor.rgb.g}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={currentColor.rgb.g}
                  onChange={(e) =>
                    setColorFromRgb({
                      ...currentColor.rgb,
                      g: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                  style={{
                    accentColor: `rgb(0, ${currentColor.rgb.g}, 0)`,
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 flex justify-between">
                  <span>B</span>
                  <span>{currentColor.rgb.b}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={currentColor.rgb.b}
                  onChange={(e) =>
                    setColorFromRgb({
                      ...currentColor.rgb,
                      b: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                  style={{
                    accentColor: `rgb(0, 0, ${currentColor.rgb.b})`,
                  }}
                />
              </div>
            </div>

            {/* HSV Sliders */}
            <div className="space-y-2 mb-2">
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 flex justify-between">
                  <span>Hue</span>
                  <span>{currentColor.hsv.h}°</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={currentColor.hsv.h}
                  onChange={(e) =>
                    setColorFromHsv({
                      ...currentColor.hsv,
                      h: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                  style={{
                    background:
                      "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 flex justify-between">
                  <span>Saturation</span>
                  <span>{currentColor.hsv.s}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentColor.hsv.s}
                  onChange={(e) =>
                    setColorFromHsv({
                      ...currentColor.hsv,
                      s: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 flex justify-between">
                  <span>Value</span>
                  <span>{currentColor.hsv.v}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentColor.hsv.v}
                  onChange={(e) =>
                    setColorFromHsv({
                      ...currentColor.hsv,
                      v: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>

            {/* Add to Palette Button */}
            <button
              className="ie-button w-full"
              onClick={() => addColorToPalette()}
            >
              ➕ Add to Palette
            </button>
          </div>
        </div>

        {/* Center - Palette Grid */}
        <div className="flex-1 flex flex-col ie-panel m-0.5 lg:m-1 min-w-0 min-h-[300px] lg:min-h-0">
          <div className="ie-groupbox flex-1 flex flex-col min-h-0">
            <span className="ie-groupbox-title">
              {palette.name} ({palette.colors.length} colors)
            </span>

            {/* Palette Grid */}
            <div className="ie-panel-inset flex-1 overflow-auto ie-scrollbar p-2 -mt-2">
              {palette.colors.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎨</div>
                    <div className="text-xs">
                      Add colors or load a preset palette
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-8 xl:grid-cols-10 gap-1">
                  {palette.colors.map((color) => (
                    <div
                      key={color.id}
                      className={`aspect-square ie-panel cursor-pointer transition-transform hover:scale-110 ${
                        selectedColorId === color.id
                          ? "ring-2 ring-blue-500 ring-offset-1"
                          : ""
                      }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => selectColor(color.id)}
                      title={`${color.hex}${
                        color.name ? ` - ${color.name}` : ""
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Palette Actions */}
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                className="ie-button ie-button-sm"
                onClick={() => setShowPresets(!showPresets)}
              >
                📚 Presets
              </button>
              <button
                className="ie-button ie-button-sm"
                onClick={handleImportClick}
              >
                📂 Import
              </button>
              <button
                className="ie-button ie-button-sm"
                onClick={clearPalette}
                disabled={palette.colors.length === 0}
              >
                🗑️ Clear
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Presets & Export */}
        <div className="w-full lg:w-56 xl:w-64 shrink-0 flex flex-col ie-panel m-0.5 lg:m-1">
          {/* Presets */}
          {showPresets && (
            <div className="ie-groupbox">
              <span className="ie-groupbox-title">Preset Palettes</span>
              <div className="space-y-1 -mt-2 max-h-48 overflow-auto ie-scrollbar">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    className="ie-button ie-button-sm w-full text-left"
                    onClick={() => {
                      loadPresetPalette(preset.id);
                      setShowPresets(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {preset.colors.slice(0, 4).map((hex, i) => (
                          <div
                            key={i}
                            className="w-3 h-3"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      <span className="truncate text-xs">{preset.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Color Info */}
          {selectedColorId && (
            <div className="ie-groupbox mt-1">
              <span className="ie-groupbox-title">Selected Color</span>
              <div className="space-y-2 -mt-2">
                <div
                  className="w-full h-12 ie-panel-inset"
                  style={{ backgroundColor: currentColor.hex }}
                />
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">HEX:</span>
                    <span className="font-mono">{currentColor.hex}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">RGB:</span>
                    <span className="font-mono">
                      {currentColor.rgb.r}, {currentColor.rgb.g},{" "}
                      {currentColor.rgb.b}
                    </span>
                  </div>
                </div>
                <button
                  className="ie-button ie-button-sm w-full"
                  onClick={() => removeColorFromPalette(selectedColorId)}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          )}

          {/* Export */}
          <div className="ie-groupbox mt-1 flex-1">
            <span className="ie-groupbox-title">Export</span>
            <div className="space-y-1 -mt-2">
              <button
                className="ie-button ie-button-sm w-full"
                onClick={exportPaletteJson}
                disabled={palette.colors.length === 0}
              >
                📄 Export JSON
              </button>
              <button
                className="ie-button ie-button-sm w-full"
                onClick={exportPaletteGpl}
                disabled={palette.colors.length === 0}
              >
                🎨 Export GPL (GIMP)
              </button>
              <button
                className="ie-button ie-button-sm w-full"
                onClick={exportPaletteHex}
                disabled={palette.colors.length === 0}
              >
                📝 Export HEX List
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="ie-panel-inset p-2 mt-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Tips:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>Click color to select</li>
                <li>Use sliders to adjust</li>
                <li>Load preset palettes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Modal */}
        {error && (
          <div className="ie-dialog" onClick={clearError}>
            <div
              className="ie-dialog-content min-w-[300px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ie-dialog-header">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <span className="ie-dialog-title">Error</span>
                </div>
                <button
                  onClick={clearError}
                  className="ie-titlebar-btn ie-titlebar-close"
                >
                  <span>×</span>
                </button>
              </div>
              <div className="ie-dialog-body">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">❌</div>
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    {error}
                  </div>
                </div>
              </div>
              <div className="ie-dialog-footer">
                <button className="ie-button" onClick={clearError}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
