"use client";

import { EXPORT_FORMATS } from "@/src/domain/types/atlas";
import { MainLayout } from "@/src/presentation/components/templates/MainLayout";
import { useAtlasPacker } from "@/src/presentation/hooks/useAtlasPacker";
import { useCallback, useEffect, useRef, useState } from "react";

export function AtlasPackerView() {
  const {
    frames,
    settings,
    packedAtlas,
    isLoading,
    error,
    atlasName,
    setAtlasName,
    updateSettings,
    addFiles,
    addSpriteStrip,
    removeFrame,
    clearFrames,
    packAtlas,
    exportAtlas,
    exportPNG,
    getPreviewCanvas,
    clearError,
  } = useAtlasPacker();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("json-hash");
  const [previewSprite, setPreviewSprite] = useState<{
    id: string;
    name: string;
    width: number;
    height: number;
    src: string;
  } | null>(null);

  // Animation Preview State
  const [isAnimPlaying, setIsAnimPlaying] = useState(false);
  const [animFps, setAnimFps] = useState(12);
  const [currentAnimFrame, setCurrentAnimFrame] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Animation Preview Popup State
  const [showAnimPopup, setShowAnimPopup] = useState(false);

  // Sprite Strip Import State
  const [spriteStripDialog, setSpriteStripDialog] = useState<{
    isOpen: boolean;
    file: File | null;
    imageUrl: string | null;
    imageWidth: number;
    imageHeight: number;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    direction: "horizontal" | "vertical";
  }>({
    isOpen: false,
    file: null,
    imageUrl: null,
    imageWidth: 0,
    imageHeight: 0,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    direction: "horizontal",
  });
  const stripInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        // Check if it's a sprite strip (filename contains _strip followed by number)
        const stripMatch = file.name.match(/_strip(\d+)/i);

        if (stripMatch && e.dataTransfer.files.length === 1) {
          // Open sprite strip dialog
          const img = new Image();
          img.onload = () => {
            const detectedCount = parseInt(stripMatch[1]);
            const frameWidth =
              detectedCount > 1
                ? Math.floor(img.width / detectedCount)
                : img.width;
            const frameHeight = img.height;

            setSpriteStripDialog({
              isOpen: true,
              file,
              imageUrl: img.src,
              imageWidth: img.width,
              imageHeight: img.height,
              frameWidth,
              frameHeight,
              frameCount: detectedCount,
              direction: "horizontal",
            });
          };
          img.src = URL.createObjectURL(file);
        } else {
          // Add as regular files
          addFiles(e.dataTransfer.files);
        }
      }
    },
    [addFiles]
  );

  useEffect(() => {
    if (packedAtlas && previewCanvasRef.current) {
      getPreviewCanvas().then((canvas) => {
        if (canvas && previewCanvasRef.current) {
          const ctx = previewCanvasRef.current.getContext("2d");
          if (ctx) {
            previewCanvasRef.current.width = canvas.width;
            previewCanvasRef.current.height = canvas.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvas, 0, 0);
          }
        }
      });
    }
  }, [packedAtlas, getPreviewCanvas]);

  // Animation loop
  useEffect(() => {
    if (!isAnimPlaying || frames.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const frameInterval = 1000 / animFps;

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= frameInterval) {
        setCurrentAnimFrame((prev) => (prev + 1) % frames.length);
        lastFrameTimeRef.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimPlaying, animFps, frames.length]);

  // Reset animation frame when frames change
  useEffect(() => {
    setCurrentAnimFrame(0);
  }, [frames.length]);

  const toggleAnimation = useCallback(() => {
    setIsAnimPlaying((prev) => !prev);
  }, []);

  const stepFrame = useCallback(
    (direction: 1 | -1) => {
      setCurrentAnimFrame((prev) => {
        const next = prev + direction;
        if (next < 0) return frames.length - 1;
        if (next >= frames.length) return 0;
        return next;
      });
    },
    [frames.length]
  );

  // Sprite Strip Import Handlers
  const handleStripFileSelect = useCallback(() => {
    stripInputRef.current?.click();
  }, []);

  const handleStripFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const img = new Image();
      img.onload = () => {
        // Auto-detect frame count from filename (e.g., "sprite_strip9.png")
        const stripMatch = file.name.match(/_strip(\d+)/i);
        const detectedCount = stripMatch ? parseInt(stripMatch[1]) : 1;

        // Calculate frame dimensions
        const frameWidth =
          detectedCount > 1 ? Math.floor(img.width / detectedCount) : img.width;
        const frameHeight = img.height;

        setSpriteStripDialog({
          isOpen: true,
          file,
          imageUrl: img.src,
          imageWidth: img.width,
          imageHeight: img.height,
          frameWidth,
          frameHeight,
          frameCount: detectedCount,
          direction: "horizontal",
        });
      };
      img.src = URL.createObjectURL(file);
    },
    []
  );

  const handleStripImport = useCallback(() => {
    if (!spriteStripDialog.file) return;

    addSpriteStrip(
      spriteStripDialog.file,
      spriteStripDialog.frameWidth,
      spriteStripDialog.frameHeight,
      spriteStripDialog.frameCount,
      spriteStripDialog.direction
    );

    setSpriteStripDialog((prev) => ({
      ...prev,
      isOpen: false,
      file: null,
      imageUrl: null,
    }));
  }, [spriteStripDialog, addSpriteStrip]);

  const closeStripDialog = useCallback(() => {
    if (spriteStripDialog.imageUrl) {
      URL.revokeObjectURL(spriteStripDialog.imageUrl);
    }
    setSpriteStripDialog((prev) => ({
      ...prev,
      isOpen: false,
      file: null,
      imageUrl: null,
    }));
  }, [spriteStripDialog.imageUrl]);

  // Auto-pack export handlers - use returned atlas directly to avoid race condition
  const handleExportPNG = useCallback(async () => {
    if (frames.length === 0) return;

    // Auto-pack if not packed yet, use returned atlas directly
    const atlas = packedAtlas ?? packAtlas();
    if (atlas) {
      exportPNG(atlas);
    }
  }, [frames.length, packedAtlas, packAtlas, exportPNG]);

  const handleExportData = useCallback(async () => {
    if (frames.length === 0) return;

    // Auto-pack if not packed yet, use returned atlas directly
    const atlas = packedAtlas ?? packAtlas();
    if (atlas) {
      exportAtlas(selectedFormat, atlas);
    }
  }, [frames.length, packedAtlas, packAtlas, exportAtlas, selectedFormat]);

  const handleExportAll = useCallback(async () => {
    if (frames.length === 0) return;

    // Auto-pack if not packed yet, use returned atlas directly
    const atlas = packedAtlas ?? packAtlas();
    if (atlas) {
      exportPNG(atlas);
      exportAtlas(selectedFormat, atlas);
    }
  }, [
    frames.length,
    packedAtlas,
    packAtlas,
    exportPNG,
    exportAtlas,
    selectedFormat,
  ]);

  return (
    <MainLayout title="Atlas Packer - Game Asset Tool">
      <div className="h-full flex flex-col lg:flex-row overflow-auto ie-scrollbar">
        {/* Left Panel - Sprites List */}
        <div className="w-full lg:w-56 xl:w-64 shrink-0 flex flex-col ie-panel m-0.5 lg:m-1">
          <div className="ie-groupbox flex-1 flex flex-col min-h-0">
            <span className="ie-groupbox-title">Sprites ({frames.length})</span>

            {/* Drop Zone */}
            <div
              ref={dropZoneRef}
              className={`ie-panel-inset p-2 mb-2 text-center cursor-pointer transition-colors ${
                isDragging ? "bg-blue-100 dark:bg-blue-900" : ""
              }`}
              onClick={handleFileSelect}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="text-2xl mb-1">📂</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Drop images here
                <br />
                or click to browse
              </div>
            </div>

            {/* Sprites List */}
            <div className="ie-listview flex-1 overflow-auto ie-scrollbar -mt-2">
              {frames.length === 0 ? (
                <div className="p-2 text-xs text-center text-gray-500">
                  No sprites added yet
                </div>
              ) : (
                frames.map((frame) => (
                  <div
                    key={frame.id}
                    className="ie-listview-item flex items-center justify-between group cursor-pointer"
                    onClick={() => {
                      if (frame.image) {
                        setPreviewSprite({
                          id: frame.id,
                          name: frame.name,
                          width: frame.width,
                          height: frame.height,
                          src: frame.image.src,
                        });
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Thumbnail Preview */}
                      <div
                        className="w-8 h-8 shrink-0 ie-panel-inset flex items-center justify-center overflow-hidden"
                        style={{
                          backgroundImage:
                            "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%228%22 height=%228%22%3E%3Crect width=%224%22 height=%224%22 fill=%22%23ccc%22/%3E%3Crect x=%224%22 y=%224%22 width=%224%22 height=%224%22 fill=%22%23ccc%22/%3E%3C/svg%3E')",
                        }}
                      >
                        {frame.image && (
                          <img
                            src={frame.image.src}
                            alt={frame.name}
                            className="max-w-full max-h-full object-contain"
                            style={{ imageRendering: "pixelated" }}
                          />
                        )}
                      </div>
                      <span className="truncate text-xs">{frame.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">
                        {frame.width}x{frame.height}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFrame(frame.id);
                        }}
                        className="ie-titlebar-btn ie-titlebar-close opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <span>×</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex gap-1">
                <button
                  className="ie-button ie-button-sm flex-1"
                  onClick={handleFileSelect}
                >
                  ➕ Add
                </button>
                <button
                  className="ie-button ie-button-sm flex-1"
                  onClick={clearFrames}
                  disabled={frames.length === 0}
                >
                  🗑️ Clear
                </button>
              </div>
              <button
                className="ie-button ie-button-sm w-full"
                onClick={handleStripFileSelect}
              >
                🎞️ Import Strip
              </button>
              <input
                ref={stripInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleStripFileChange}
              />
            </div>
          </div>

          {/* Animation Preview */}
          <div className="ie-groupbox mt-1">
            <span className="ie-groupbox-title">Animation Preview</span>
            <div className="space-y-2 -mt-2">
              {/* Animation Canvas - Click to enlarge */}
              <div
                className={`ie-panel-inset h-32 flex items-center justify-center overflow-hidden ${
                  frames.length > 0
                    ? "cursor-pointer hover:ring-2 hover:ring-blue-400"
                    : ""
                }`}
                style={{
                  backgroundImage:
                    "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22%3E%3Crect width=%225%22 height=%225%22 fill=%22%23ccc%22/%3E%3Crect x=%225%22 y=%225%22 width=%225%22 height=%225%22 fill=%22%23ccc%22/%3E%3C/svg%3E')",
                }}
                onClick={() => frames.length > 0 && setShowAnimPopup(true)}
                title={frames.length > 0 ? "Click to enlarge" : ""}
              >
                {frames.length > 0 && frames[currentAnimFrame]?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={frames[currentAnimFrame].image!.src}
                    alt={frames[currentAnimFrame].name}
                    className="max-w-full max-h-full object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <div className="text-xs text-gray-500 text-center">
                    <div className="text-2xl mb-1">🎬</div>
                    Add sprites to preview
                  </div>
                )}
              </div>

              {/* Frame Counter */}
              <div className="text-center text-xs text-gray-600 dark:text-gray-400">
                Frame: {frames.length > 0 ? currentAnimFrame + 1 : 0} /{" "}
                {frames.length}
              </div>

              {/* Playback Controls */}
              <div className="flex gap-1 justify-center">
                <button
                  className="ie-button ie-button-sm"
                  onClick={() => stepFrame(-1)}
                  disabled={frames.length === 0}
                  title="Previous Frame"
                >
                  ⏮️
                </button>
                <button
                  className="ie-button ie-button-sm px-3"
                  onClick={toggleAnimation}
                  disabled={frames.length === 0}
                  title={isAnimPlaying ? "Pause" : "Play"}
                >
                  {isAnimPlaying ? "⏸️" : "▶️"}
                </button>
                <button
                  className="ie-button ie-button-sm"
                  onClick={() => stepFrame(1)}
                  disabled={frames.length === 0}
                  title="Next Frame"
                >
                  ⏭️
                </button>
              </div>

              {/* FPS Control */}
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                  Speed: {animFps} FPS
                </label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={animFps}
                  onChange={(e) => setAnimFps(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span>
                  <span>30</span>
                  <span>60</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col ie-panel m-0.5 lg:m-1 min-w-0 min-h-[300px] lg:min-h-0">
          <div className="ie-groupbox flex-1 flex flex-col min-h-0">
            <span className="ie-groupbox-title">
              Preview
              {packedAtlas && (
                <span className="text-gray-500 ml-2">
                  ({packedAtlas.width}x{packedAtlas.height})
                </span>
              )}
            </span>

            {/* Canvas Preview */}
            <div className="ie-panel-inset flex-1 overflow-auto ie-scrollbar flex items-center justify-center -mt-2 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ccc%22%2F%3E%3C%2Fsvg%3E')]">
              {packedAtlas ? (
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full max-h-full"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-2">📦</div>
                  <div className="text-xs">
                    Add sprites and click &quot;Pack Atlas&quot;
                    <br />
                    to see the preview
                  </div>
                </div>
              )}
            </div>

            {/* Pack Button */}
            <div className="mt-2 flex gap-2">
              <button
                className="ie-button flex-1"
                onClick={packAtlas}
                disabled={frames.length === 0 || isLoading}
              >
                {isLoading ? "⏳ Packing..." : "📦 Pack Atlas"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Settings & Export */}
        <div className="w-full lg:w-60 xl:w-72 shrink-0 flex flex-col ie-panel m-0.5 lg:m-1">
          {/* Settings */}
          <div className="ie-groupbox">
            <span className="ie-groupbox-title">Settings</span>
            <div className="space-y-2 -mt-2">
              {/* Atlas Name */}
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                  Atlas Name
                </label>
                <input
                  type="text"
                  className="ie-input"
                  value={atlasName}
                  onChange={(e) => setAtlasName(e.target.value)}
                />
              </div>

              {/* Max Size */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                    Max Width
                  </label>
                  <select
                    className="ie-input"
                    value={settings.maxWidth}
                    onChange={(e) =>
                      updateSettings({ maxWidth: parseInt(e.target.value) })
                    }
                  >
                    <option value="256">256</option>
                    <option value="512">512</option>
                    <option value="1024">1024</option>
                    <option value="2048">2048</option>
                    <option value="4096">4096</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                    Max Height
                  </label>
                  <select
                    className="ie-input"
                    value={settings.maxHeight}
                    onChange={(e) =>
                      updateSettings({ maxHeight: parseInt(e.target.value) })
                    }
                  >
                    <option value="256">256</option>
                    <option value="512">512</option>
                    <option value="1024">1024</option>
                    <option value="2048">2048</option>
                    <option value="4096">4096</option>
                  </select>
                </div>
              </div>

              {/* Padding */}
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                  Padding: {settings.padding}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={settings.padding}
                  onChange={(e) =>
                    updateSettings({ padding: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              {/* Options */}
              <div className="space-y-1">
                <label className="ie-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.powerOfTwo}
                    onChange={(e) =>
                      updateSettings({ powerOfTwo: e.target.checked })
                    }
                  />
                  Power of 2 dimensions
                </label>
              </div>
            </div>
          </div>

          {/* Export */}
          <div className="ie-groupbox mt-2 flex-1 flex flex-col">
            <span className="ie-groupbox-title">Export</span>
            <div className="space-y-2 -mt-2 flex-1">
              {/* Format Selection */}
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                  Data Format
                </label>
                <select
                  className="ie-input"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                >
                  {EXPORT_FORMATS.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.icon} {format.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Export Buttons */}
              <div className="space-y-1">
                <button
                  className="ie-button w-full"
                  onClick={handleExportPNG}
                  disabled={frames.length === 0}
                >
                  🖼️ Export PNG
                </button>
                <button
                  className="ie-button w-full"
                  onClick={handleExportData}
                  disabled={frames.length === 0}
                >
                  📄 Export Data
                </button>
                <button
                  className="ie-button w-full"
                  onClick={handleExportAll}
                  disabled={frames.length === 0}
                >
                  📦 Export All
                </button>
              </div>
              {/* Auto-pack hint */}
              {frames.length > 0 && !packedAtlas && (
                <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
                  💡 Will auto-pack before export
                </div>
              )}
            </div>

            {/* Format Info */}
            <div className="ie-panel-inset p-2 mt-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Supported Formats:</strong>
                <ul className="mt-1 space-y-0.5">
                  {EXPORT_FORMATS.map((format) => (
                    <li key={format.id}>
                      {format.icon} {format.name} (.{format.extension})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Sprite Preview Modal */}
        {previewSprite && (
          <div className="ie-dialog" onClick={() => setPreviewSprite(null)}>
            <div
              className="ie-dialog-content max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ie-dialog-header">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🖼️</span>
                  <span className="ie-dialog-title truncate max-w-[300px]">
                    {previewSprite.name}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewSprite(null)}
                  className="ie-titlebar-btn ie-titlebar-close"
                >
                  <span>×</span>
                </button>
              </div>
              <div className="ie-dialog-body">
                <div
                  className="ie-panel-inset p-4 flex items-center justify-center overflow-auto"
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22%3E%3Crect width=%2210%22 height=%2210%22 fill=%22%23ccc%22/%3E%3Crect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23ccc%22/%3E%3C/svg%3E')",
                    minHeight: "200px",
                    maxHeight: "60vh",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSprite.src}
                    alt={previewSprite.name}
                    className="max-w-full max-h-full object-contain"
                    style={{
                      imageRendering: "pixelated",
                      minWidth: Math.min(previewSprite.width * 2, 400),
                      minHeight: Math.min(previewSprite.height * 2, 400),
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
                  <span className="ie-panel-inset px-2 py-1">
                    {previewSprite.width} × {previewSprite.height} px
                  </span>
                </div>
              </div>
              <div className="ie-dialog-footer">
                <button
                  className="ie-button"
                  onClick={() => {
                    removeFrame(previewSprite.id);
                    setPreviewSprite(null);
                  }}
                >
                  🗑️ Remove
                </button>
                <button
                  className="ie-button"
                  onClick={() => setPreviewSprite(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Animation Preview Popup */}
        {showAnimPopup && frames.length > 0 && (
          <div className="ie-dialog" onClick={() => setShowAnimPopup(false)}>
            <div
              className="ie-dialog-content min-w-[400px] max-w-[80vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ie-dialog-header">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎬</span>
                  <span className="ie-dialog-title">Animation Preview</span>
                </div>
                <button
                  onClick={() => setShowAnimPopup(false)}
                  className="ie-titlebar-btn ie-titlebar-close"
                >
                  <span>×</span>
                </button>
              </div>
              <div className="ie-dialog-body">
                {/* Large Animation Canvas */}
                <div
                  className="ie-panel-inset p-4 flex items-center justify-center overflow-auto"
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22%3E%3Crect width=%2210%22 height=%2210%22 fill=%22%23ccc%22/%3E%3Crect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23ccc%22/%3E%3C/svg%3E')",
                    minHeight: "300px",
                    maxHeight: "60vh",
                  }}
                >
                  {frames[currentAnimFrame]?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={frames[currentAnimFrame].image!.src}
                      alt={frames[currentAnimFrame].name}
                      className="object-contain"
                      style={{
                        imageRendering: "pixelated",
                        minWidth: Math.min(
                          frames[currentAnimFrame].width * 4,
                          400
                        ),
                        minHeight: Math.min(
                          frames[currentAnimFrame].height * 4,
                          400
                        ),
                      }}
                    />
                  )}
                </div>

                {/* Frame Info */}
                <div className="mt-3 text-center">
                  <span className="ie-panel-inset px-3 py-1 text-sm">
                    {frames[currentAnimFrame]?.name} — Frame{" "}
                    {currentAnimFrame + 1} / {frames.length}
                  </span>
                </div>

                {/* Playback Controls */}
                <div className="flex gap-2 justify-center mt-3">
                  <button
                    className="ie-button"
                    onClick={() => stepFrame(-1)}
                    title="Previous Frame"
                  >
                    ⏮️ Prev
                  </button>
                  <button
                    className="ie-button px-4"
                    onClick={toggleAnimation}
                    title={isAnimPlaying ? "Pause" : "Play"}
                  >
                    {isAnimPlaying ? "⏸️ Pause" : "▶️ Play"}
                  </button>
                  <button
                    className="ie-button"
                    onClick={() => stepFrame(1)}
                    title="Next Frame"
                  >
                    Next ⏭️
                  </button>
                </div>

                {/* FPS Control */}
                <div className="mt-3">
                  <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1 text-center">
                    Speed: {animFps} FPS
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={animFps}
                    onChange={(e) => setAnimFps(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="ie-dialog-footer">
                <button
                  className="ie-button"
                  onClick={() => setShowAnimPopup(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sprite Strip Import Dialog */}
        {spriteStripDialog.isOpen && (
          <div className="ie-dialog" onClick={closeStripDialog}>
            <div
              className="ie-dialog-content min-w-[400px] max-w-[600px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ie-dialog-header">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎞️</span>
                  <span className="ie-dialog-title">Import Sprite Strip</span>
                </div>
                <button
                  onClick={closeStripDialog}
                  className="ie-titlebar-btn ie-titlebar-close"
                >
                  <span>×</span>
                </button>
              </div>
              <div className="ie-dialog-body space-y-3">
                {/* Preview */}
                <div
                  className="ie-panel-inset p-2 overflow-auto max-h-40"
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22%3E%3Crect width=%225%22 height=%225%22 fill=%22%23ccc%22/%3E%3Crect x=%225%22 y=%225%22 width=%225%22 height=%225%22 fill=%22%23ccc%22/%3E%3C/svg%3E')",
                  }}
                >
                  {spriteStripDialog.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={spriteStripDialog.imageUrl}
                      alt="Sprite Strip Preview"
                      className="max-w-full"
                      style={{ imageRendering: "pixelated" }}
                    />
                  )}
                </div>

                {/* Image Info */}
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Image Size: {spriteStripDialog.imageWidth} ×{" "}
                  {spriteStripDialog.imageHeight} px
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                      Frame Width
                    </label>
                    <input
                      type="number"
                      className="ie-input"
                      value={spriteStripDialog.frameWidth}
                      onChange={(e) =>
                        setSpriteStripDialog((prev) => ({
                          ...prev,
                          frameWidth: parseInt(e.target.value) || 1,
                        }))
                      }
                      min={1}
                      max={spriteStripDialog.imageWidth}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                      Frame Height
                    </label>
                    <input
                      type="number"
                      className="ie-input"
                      value={spriteStripDialog.frameHeight}
                      onChange={(e) =>
                        setSpriteStripDialog((prev) => ({
                          ...prev,
                          frameHeight: parseInt(e.target.value) || 1,
                        }))
                      }
                      min={1}
                      max={spriteStripDialog.imageHeight}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                      Frame Count
                    </label>
                    <input
                      type="number"
                      className="ie-input"
                      value={spriteStripDialog.frameCount}
                      onChange={(e) =>
                        setSpriteStripDialog((prev) => ({
                          ...prev,
                          frameCount: parseInt(e.target.value) || 1,
                        }))
                      }
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                      Direction
                    </label>
                    <select
                      className="ie-input"
                      value={spriteStripDialog.direction}
                      onChange={(e) =>
                        setSpriteStripDialog((prev) => ({
                          ...prev,
                          direction: e.target.value as
                            | "horizontal"
                            | "vertical",
                        }))
                      }
                    >
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                    </select>
                  </div>
                </div>

                {/* Calculated Info */}
                <div className="ie-panel-inset p-2 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    Will extract {spriteStripDialog.frameCount} frames of{" "}
                    {spriteStripDialog.frameWidth}×
                    {spriteStripDialog.frameHeight} px each
                  </div>
                </div>
              </div>
              <div className="ie-dialog-footer">
                <button className="ie-button" onClick={handleStripImport}>
                  ✅ Import Frames
                </button>
                <button className="ie-button" onClick={closeStripDialog}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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
                  <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
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
