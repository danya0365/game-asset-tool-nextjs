"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MainLayout } from "../templates/MainLayout";

type FilterType =
  | "none"
  | "blur"
  | "sharpen"
  | "pixelate"
  | "grayscale"
  | "invert"
  | "sepia";

interface NineSlice {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface TextureSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

interface OutlineSettings {
  enabled: boolean;
  color: string;
  thickness: number;
}

interface ShadowSettings {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

export default function TextureEditorView() {
  // Image state
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const nineSliceCanvasRef = useRef<HTMLCanvasElement>(null);

  // Editor state
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<
    "filters" | "9slice" | "effects" | "seamless"
  >("filters");

  // Seamless preview state
  const [seamlessPreviewEnabled, setSeamlessPreviewEnabled] = useState(false);
  const [seamlessTileCount, setSeamlessTileCount] = useState(3); // 3x3 grid
  const seamlessCanvasRef = useRef<HTMLCanvasElement>(null);

  // Filter state
  const [filter, setFilter] = useState<FilterType>("none");
  const [filterIntensity, setFilterIntensity] = useState(5);

  // Texture settings
  const [textureSettings, setTextureSettings] = useState<TextureSettings>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
  });

  // 9-slice state
  const [nineSlice, setNineSlice] = useState<NineSlice>({
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
  });
  const [nineSlicePreviewSize, setNineSlicePreviewSize] = useState({
    width: 200,
    height: 150,
  });

  // Effects state
  const [outline, setOutline] = useState<OutlineSettings>({
    enabled: false,
    color: "#000000",
    thickness: 2,
  });

  const [shadow, setShadow] = useState<ShadowSettings>({
    enabled: false,
    color: "#000000",
    offsetX: 4,
    offsetY: 4,
    blur: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setImageSrc(ev.target?.result as string);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Apply filters to canvas
  const applyFilters = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    // Draw original image
    ctx.drawImage(originalImage, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply filter based on type
    switch (filter) {
      case "blur":
        applyBlur(ctx, canvas.width, canvas.height, filterIntensity);
        break;
      case "sharpen":
        applySharpen(imageData, filterIntensity / 10);
        ctx.putImageData(imageData, 0, 0);
        break;
      case "pixelate":
        applyPixelate(ctx, canvas.width, canvas.height, filterIntensity * 2);
        break;
      case "grayscale":
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
        break;
      case "invert":
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        ctx.putImageData(imageData, 0, 0);
        break;
      case "sepia":
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2];
          data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        }
        ctx.putImageData(imageData, 0, 0);
        break;
    }

    // Apply brightness/contrast/saturation
    if (
      textureSettings.brightness !== 100 ||
      textureSettings.contrast !== 100 ||
      textureSettings.saturation !== 100 ||
      textureSettings.hue !== 0
    ) {
      const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyColorAdjustments(newImageData, textureSettings);
      ctx.putImageData(newImageData, 0, 0);
    }

    // Apply outline
    if (outline.enabled) {
      applyOutline(ctx, canvas.width, canvas.height, outline);
    }

    // Apply shadow
    if (shadow.enabled) {
      applyShadow(ctx, canvas.width, canvas.height, shadow);
    }
  }, [
    originalImage,
    filter,
    filterIntensity,
    textureSettings,
    outline,
    shadow,
  ]);

  // Blur filter
  const applyBlur = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.filter = `blur(${radius}px)`;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.drawImage(ctx.canvas, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = "none";
  };

  // Sharpen filter using convolution
  const applySharpen = (imageData: ImageData, amount: number) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const copy = new Uint8ClampedArray(data);

    const kernel = [
      0,
      -amount,
      0,
      -amount,
      1 + 4 * amount,
      -amount,
      0,
      -amount,
      0,
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let val = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              val += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          data[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, val));
        }
      }
    }
  };

  // Pixelate filter
  const applyPixelate = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    pixelSize: number
  ) => {
    const size = Math.max(1, pixelSize);
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d")!;

    tempCanvas.width = Math.ceil(width / size);
    tempCanvas.height = Math.ceil(height / size);

    tempCtx.drawImage(ctx.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(tempCanvas, 0, 0, width, height);
  };

  // Color adjustments
  const applyColorAdjustments = (
    imageData: ImageData,
    settings: TextureSettings
  ) => {
    const data = imageData.data;
    const brightness = settings.brightness / 100;
    const contrast = settings.contrast / 100;
    const saturation = settings.saturation / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i],
        g = data[i + 1],
        b = data[i + 2];

      // Brightness
      r *= brightness;
      g *= brightness;
      b *= brightness;

      // Contrast
      r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
      g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
      b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

      // Saturation
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      r = gray + saturation * (r - gray);
      g = gray + saturation * (g - gray);
      b = gray + saturation * (b - gray);

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
  };

  // Outline effect
  const applyOutline = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: OutlineSettings
  ) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const outline = new Uint8ClampedArray(data.length);

    // Parse outline color
    const hex = settings.color.replace("#", "");
    const outlineR = parseInt(hex.substring(0, 2), 16);
    const outlineG = parseInt(hex.substring(2, 4), 16);
    const outlineB = parseInt(hex.substring(4, 6), 16);

    const thickness = settings.thickness;

    // Find edges and create outline
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];

        if (alpha < 128) {
          // Check if near an opaque pixel
          let nearOpaque = false;
          for (let dy = -thickness; dy <= thickness && !nearOpaque; dy++) {
            for (let dx = -thickness; dx <= thickness && !nearOpaque; dx++) {
              const nx = x + dx,
                ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = (ny * width + nx) * 4;
                if (data[nIdx + 3] >= 128) {
                  nearOpaque = true;
                }
              }
            }
          }
          if (nearOpaque) {
            outline[idx] = outlineR;
            outline[idx + 1] = outlineG;
            outline[idx + 2] = outlineB;
            outline[idx + 3] = 255;
          }
        }
      }
    }

    // Merge outline with original
    for (let i = 0; i < data.length; i += 4) {
      if (outline[i + 3] > 0 && data[i + 3] < 128) {
        data[i] = outline[i];
        data[i + 1] = outline[i + 1];
        data[i + 2] = outline[i + 2];
        data[i + 3] = outline[i + 3];
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Shadow effect
  const applyShadow = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: ShadowSettings
  ) => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width + Math.abs(settings.offsetX) + settings.blur * 2;
    tempCanvas.height = height + Math.abs(settings.offsetY) + settings.blur * 2;
    const tempCtx = tempCanvas.getContext("2d")!;

    // Draw shadow
    tempCtx.shadowColor = settings.color;
    tempCtx.shadowBlur = settings.blur;
    tempCtx.shadowOffsetX = settings.offsetX;
    tempCtx.shadowOffsetY = settings.offsetY;
    tempCtx.drawImage(ctx.canvas, settings.blur, settings.blur);

    // Clear and redraw with shadow
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(tempCanvas, -settings.blur, -settings.blur);
  };

  // Draw 9-slice preview
  const draw9SlicePreview = useCallback(() => {
    const canvas = nineSliceCanvasRef.current;
    if (!canvas || !originalImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = nineSlicePreviewSize;
    canvas.width = width;
    canvas.height = height;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    const img = originalImage;
    const imgW = img.width;
    const imgH = img.height;
    const { left, right, top, bottom } = nineSlice;

    // Calculate slice dimensions
    const centerW = imgW - left - right;
    const centerH = imgH - top - bottom;
    const destCenterW = width - left - right;
    const destCenterH = height - top - bottom;

    // Draw 9 slices
    // Top-left
    ctx.drawImage(img, 0, 0, left, top, 0, 0, left, top);
    // Top-center
    ctx.drawImage(img, left, 0, centerW, top, left, 0, destCenterW, top);
    // Top-right
    ctx.drawImage(
      img,
      imgW - right,
      0,
      right,
      top,
      width - right,
      0,
      right,
      top
    );
    // Middle-left
    ctx.drawImage(img, 0, top, left, centerH, 0, top, left, destCenterH);
    // Middle-center
    ctx.drawImage(
      img,
      left,
      top,
      centerW,
      centerH,
      left,
      top,
      destCenterW,
      destCenterH
    );
    // Middle-right
    ctx.drawImage(
      img,
      imgW - right,
      top,
      right,
      centerH,
      width - right,
      top,
      right,
      destCenterH
    );
    // Bottom-left
    ctx.drawImage(
      img,
      0,
      imgH - bottom,
      left,
      bottom,
      0,
      height - bottom,
      left,
      bottom
    );
    // Bottom-center
    ctx.drawImage(
      img,
      left,
      imgH - bottom,
      centerW,
      bottom,
      left,
      height - bottom,
      destCenterW,
      bottom
    );
    // Bottom-right
    ctx.drawImage(
      img,
      imgW - right,
      imgH - bottom,
      right,
      bottom,
      width - right,
      height - bottom,
      right,
      bottom
    );

    // Draw slice guides
    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(left, 0);
    ctx.lineTo(left, height);
    ctx.moveTo(width - right, 0);
    ctx.lineTo(width - right, height);
    ctx.moveTo(0, top);
    ctx.lineTo(width, top);
    ctx.moveTo(0, height - bottom);
    ctx.lineTo(width, height - bottom);
    ctx.stroke();
  }, [originalImage, nineSlice, nineSlicePreviewSize]);

  // Effect to apply filters when settings change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Effect to draw 9-slice preview
  useEffect(() => {
    draw9SlicePreview();
  }, [draw9SlicePreview]);

  // Effect to draw seamless preview tiles
  useEffect(() => {
    if (!originalImage || !seamlessPreviewEnabled || activeTab !== "seamless")
      return;

    // Get all canvas elements in the seamless grid
    const container = seamlessCanvasRef.current?.parentElement;
    if (!container) return;

    const canvases = container.querySelectorAll("canvas");
    canvases.forEach((canvas) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0);
    });
  }, [originalImage, seamlessPreviewEnabled, seamlessTileCount, activeTab]);

  // Export image
  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "texture-export.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Reset all settings
  const resetSettings = () => {
    setFilter("none");
    setFilterIntensity(5);
    setTextureSettings({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
    });
    setOutline({ enabled: false, color: "#000000", thickness: 2 });
    setShadow({
      enabled: false,
      color: "#000000",
      offsetX: 4,
      offsetY: 4,
      blur: 0,
    });
  };

  return (
    <MainLayout title="Texture Editor - Game Asset Tool">
      <div className="ie-window-content flex flex-col h-full">
        {/* Toolbar */}
        <div className="ie-toolbar mb-2 flex items-center gap-2 flex-wrap">
          <button
            className="ie-button"
            onClick={() => fileInputRef.current?.click()}
          >
            📂 Load Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="ie-separator" />

          <button
            className="ie-button"
            onClick={resetSettings}
            disabled={!originalImage}
          >
            🔄 Reset
          </button>

          <button
            className="ie-button bg-green-600 text-white font-bold"
            onClick={exportImage}
            disabled={!originalImage}
          >
            📥 Export PNG
          </button>

          <div className="ie-separator" />

          <span className="text-xs">Zoom:</span>
          <select
            className="ie-select text-xs"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          >
            <option value={0.5}>50%</option>
            <option value={1}>100%</option>
            <option value={2}>200%</option>
            <option value={4}>400%</option>
          </select>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 gap-2 overflow-hidden">
          {/* Left Panel - Canvas */}
          <div
            className="flex-1 ie-panel-inset overflow-auto flex items-center justify-center"
            style={{
              background:
                "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 16px 16px",
            }}
          >
            {originalImage ? (
              <canvas
                ref={canvasRef}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center",
                  imageRendering: "pixelated",
                }}
              />
            ) : (
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-2">🖼️</div>
                <p>Load an image to begin</p>
              </div>
            )}
          </div>

          {/* Right Panel - Controls */}
          <div className="w-72 flex flex-col gap-2 overflow-auto">
            {/* Tab Buttons */}
            <div className="flex gap-1 flex-wrap">
              {(["filters", "9slice", "effects", "seamless"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    className={`ie-button flex-1 text-xs ${
                      activeTab === tab ? "ie-button-active" : ""
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "filters" && "🎨 Filters"}
                    {tab === "9slice" && "📐 9-Slice"}
                    {tab === "effects" && "✨ Effects"}
                    {tab === "seamless" && "🔄 Seamless"}
                  </button>
                )
              )}
            </div>

            {/* Filters Tab */}
            {activeTab === "filters" && (
              <>
                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">🎨 Filter Type</span>
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {(
                      [
                        "none",
                        "blur",
                        "sharpen",
                        "pixelate",
                        "grayscale",
                        "invert",
                        "sepia",
                      ] as FilterType[]
                    ).map((f) => (
                      <button
                        key={f}
                        className={`ie-button text-xs ${
                          filter === f ? "ie-button-active bg-blue-100" : ""
                        }`}
                        onClick={() => setFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  {filter !== "none" &&
                    filter !== "grayscale" &&
                    filter !== "invert" &&
                    filter !== "sepia" && (
                      <div className="px-2 pb-2">
                        <label className="text-xs">
                          Intensity: {filterIntensity}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={filterIntensity}
                          onChange={(e) =>
                            setFilterIntensity(parseInt(e.target.value))
                          }
                          className="w-full"
                        />
                      </div>
                    )}
                </div>

                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">🔧 Adjustments</span>
                  <div className="p-2 space-y-2 text-xs">
                    <div>
                      <label>Brightness: {textureSettings.brightness}%</label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={textureSettings.brightness}
                        onChange={(e) =>
                          setTextureSettings((s) => ({
                            ...s,
                            brightness: parseInt(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label>Contrast: {textureSettings.contrast}%</label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={textureSettings.contrast}
                        onChange={(e) =>
                          setTextureSettings((s) => ({
                            ...s,
                            contrast: parseInt(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label>Saturation: {textureSettings.saturation}%</label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={textureSettings.saturation}
                        onChange={(e) =>
                          setTextureSettings((s) => ({
                            ...s,
                            saturation: parseInt(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 9-Slice Tab */}
            {activeTab === "9slice" && (
              <>
                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">📐 Slice Borders</span>
                  <div className="p-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label>Left: {nineSlice.left}px</label>
                      <input
                        type="range"
                        min="0"
                        max={
                          originalImage
                            ? Math.floor(originalImage.width / 2)
                            : 50
                        }
                        value={nineSlice.left}
                        onChange={(e) =>
                          setNineSlice((s) => ({
                            ...s,
                            left: parseInt(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label>Right: {nineSlice.right}px</label>
                      <input
                        type="range"
                        min="0"
                        max={
                          originalImage
                            ? Math.floor(originalImage.width / 2)
                            : 50
                        }
                        value={nineSlice.right}
                        onChange={(e) =>
                          setNineSlice((s) => ({
                            ...s,
                            right: parseInt(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label>Top: {nineSlice.top}px</label>
                      <input
                        type="range"
                        min="0"
                        max={
                          originalImage
                            ? Math.floor(originalImage.height / 2)
                            : 50
                        }
                        value={nineSlice.top}
                        onChange={(e) =>
                          setNineSlice((s) => ({
                            ...s,
                            top: parseInt(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label>Bottom: {nineSlice.bottom}px</label>
                      <input
                        type="range"
                        min="0"
                        max={
                          originalImage
                            ? Math.floor(originalImage.height / 2)
                            : 50
                        }
                        value={nineSlice.bottom}
                        onChange={(e) =>
                          setNineSlice((s) => ({
                            ...s,
                            bottom: parseInt(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">📏 Preview Size</span>
                  <div className="p-2 flex gap-2 text-xs">
                    <div className="flex-1">
                      <label>Width:</label>
                      <input
                        type="number"
                        className="ie-input w-full"
                        value={nineSlicePreviewSize.width}
                        onChange={(e) =>
                          setNineSlicePreviewSize((s) => ({
                            ...s,
                            width: parseInt(e.target.value) || 100,
                          }))
                        }
                        min={50}
                        max={500}
                      />
                    </div>
                    <div className="flex-1">
                      <label>Height:</label>
                      <input
                        type="number"
                        className="ie-input w-full"
                        value={nineSlicePreviewSize.height}
                        onChange={(e) =>
                          setNineSlicePreviewSize((s) => ({
                            ...s,
                            height: parseInt(e.target.value) || 100,
                          }))
                        }
                        min={50}
                        max={500}
                      />
                    </div>
                  </div>
                </div>

                <div className="ie-groupbox flex-1">
                  <span className="ie-groupbox-title">👁️ 9-Slice Preview</span>
                  <div
                    className="ie-panel-inset p-2 flex items-center justify-center"
                    style={{
                      background:
                        "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px",
                    }}
                  >
                    {originalImage ? (
                      <canvas
                        ref={nineSliceCanvasRef}
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">
                        Load image first
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Effects Tab */}
            {activeTab === "effects" && (
              <>
                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">🖊️ Outline</span>
                  <div className="p-2 space-y-2 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={outline.enabled}
                        onChange={(e) =>
                          setOutline((s) => ({
                            ...s,
                            enabled: e.target.checked,
                          }))
                        }
                      />
                      Enable Outline
                    </label>
                    {outline.enabled && (
                      <>
                        <div className="flex items-center gap-2">
                          <span>Color:</span>
                          <input
                            type="color"
                            value={outline.color}
                            onChange={(e) =>
                              setOutline((s) => ({
                                ...s,
                                color: e.target.value,
                              }))
                            }
                            className="w-8 h-6"
                          />
                        </div>
                        <div>
                          <label>Thickness: {outline.thickness}px</label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={outline.thickness}
                            onChange={(e) =>
                              setOutline((s) => ({
                                ...s,
                                thickness: parseInt(e.target.value),
                              }))
                            }
                            className="w-full"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">🌑 Drop Shadow</span>
                  <div className="p-2 space-y-2 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={shadow.enabled}
                        onChange={(e) =>
                          setShadow((s) => ({
                            ...s,
                            enabled: e.target.checked,
                          }))
                        }
                      />
                      Enable Shadow
                    </label>
                    {shadow.enabled && (
                      <>
                        <div className="flex items-center gap-2">
                          <span>Color:</span>
                          <input
                            type="color"
                            value={shadow.color}
                            onChange={(e) =>
                              setShadow((s) => ({
                                ...s,
                                color: e.target.value,
                              }))
                            }
                            className="w-8 h-6"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label>Offset X: {shadow.offsetX}</label>
                            <input
                              type="range"
                              min="-20"
                              max="20"
                              value={shadow.offsetX}
                              onChange={(e) =>
                                setShadow((s) => ({
                                  ...s,
                                  offsetX: parseInt(e.target.value),
                                }))
                              }
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label>Offset Y: {shadow.offsetY}</label>
                            <input
                              type="range"
                              min="-20"
                              max="20"
                              value={shadow.offsetY}
                              onChange={(e) =>
                                setShadow((s) => ({
                                  ...s,
                                  offsetY: parseInt(e.target.value),
                                }))
                              }
                              className="w-full"
                            />
                          </div>
                        </div>
                        <div>
                          <label>Blur: {shadow.blur}px</label>
                          <input
                            type="range"
                            min="0"
                            max="20"
                            value={shadow.blur}
                            onChange={(e) =>
                              setShadow((s) => ({
                                ...s,
                                blur: parseInt(e.target.value),
                              }))
                            }
                            className="w-full"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Seamless Tab */}
            {activeTab === "seamless" && (
              <>
                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">🔄 Seamless Preview</span>
                  <div className="p-2 space-y-2 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={seamlessPreviewEnabled}
                        onChange={(e) =>
                          setSeamlessPreviewEnabled(e.target.checked)
                        }
                      />
                      Enable Tiled Preview
                    </label>
                    <div>
                      <label>
                        Tile Count: {seamlessTileCount}x{seamlessTileCount}
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="5"
                        value={seamlessTileCount}
                        onChange={(e) =>
                          setSeamlessTileCount(parseInt(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Seamless Preview Canvas */}
                {originalImage && seamlessPreviewEnabled && (
                  <div className="ie-groupbox flex-1">
                    <span className="ie-groupbox-title">Preview</span>
                    <div
                      className="ie-panel-inset p-2 overflow-auto"
                      style={{ maxHeight: 300 }}
                    >
                      <div
                        className="bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%228%22%20height%3D%228%22%3E%3Crect%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23444%22%2F%3E%3Crect%20x%3D%224%22%20y%3D%224%22%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23444%22%2F%3E%3C%2Fsvg%3E')]"
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${seamlessTileCount}, 1fr)`,
                          gap: 0,
                          width: "fit-content",
                        }}
                      >
                        {Array.from({
                          length: seamlessTileCount * seamlessTileCount,
                        }).map((_, i) => (
                          <canvas
                            key={i}
                            ref={i === 0 ? seamlessCanvasRef : undefined}
                            width={originalImage.width}
                            height={originalImage.height}
                            style={{
                              width: Math.min(60, originalImage.width),
                              height: Math.min(60, originalImage.height),
                              imageRendering: "pixelated",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 p-1 text-center">
                      Drag edges to check seams
                    </div>
                  </div>
                )}

                {!seamlessPreviewEnabled && originalImage && (
                  <div className="ie-panel-inset p-4 text-center text-xs text-gray-500">
                    <div className="text-2xl mb-2">🔄</div>
                    <p>Enable tiled preview to check texture seamlessness</p>
                  </div>
                )}

                {!originalImage && (
                  <div className="ie-panel-inset p-4 text-center text-xs text-gray-500">
                    <div className="text-2xl mb-2">🖼️</div>
                    <p>Load an image first</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="ie-statusbar mt-2">
          <span>
            {originalImage
              ? `Image: ${originalImage.width}x${originalImage.height}px | Filter: ${filter} | Tab: ${activeTab}`
              : "No image loaded"}
          </span>
        </div>
      </div>
    </MainLayout>
  );
}
