"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MainLayout } from "../templates/MainLayout";

interface Frame {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
}

interface Animation {
  id: string;
  name: string;
  frames: Frame[];
  loop: boolean;
  state?: AnimationState; // Animation state category
}

// Animation state templates for common game animations
type AnimationState =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "attack"
  | "hurt"
  | "death"
  | "custom";

const ANIMATION_STATE_TEMPLATES: {
  state: AnimationState;
  label: string;
  icon: string;
  defaultFps: number;
}[] = [
  { state: "idle", label: "Idle", icon: "🧍", defaultFps: 8 },
  { state: "walk", label: "Walk", icon: "🚶", defaultFps: 10 },
  { state: "run", label: "Run", icon: "🏃", defaultFps: 12 },
  { state: "jump", label: "Jump", icon: "⬆️", defaultFps: 8 },
  { state: "attack", label: "Attack", icon: "⚔️", defaultFps: 15 },
  { state: "hurt", label: "Hurt", icon: "💥", defaultFps: 10 },
  { state: "death", label: "Death", icon: "💀", defaultFps: 6 },
  { state: "custom", label: "Custom", icon: "✨", defaultFps: 12 },
];

export default function SpritesheetEditorView() {
  // Spritesheet state
  const [spritesheetImage, setSpritesheetImage] =
    useState<HTMLImageElement | null>(null);
  const [spritesheetSrc, setSpritesheetSrc] = useState<string | null>(null);

  // Frame detection settings
  const [frameWidth, setFrameWidth] = useState(32);
  const [frameHeight, setFrameHeight] = useState(32);
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(4);

  // Frames and animations
  const [frames, setFrames] = useState<Frame[]>([]);
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<Animation | null>(
    null
  );
  const [selectedFrames, setSelectedFrames] = useState<string[]>([]);

  // Animation preview
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [fps, setFps] = useState(12);

  // Onion skinning
  const [onionSkinEnabled, setOnionSkinEnabled] = useState(false);
  const [onionSkinFrames, setOnionSkinFrames] = useState(2); // Number of ghost frames
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(0.3);

  // Canvas state
  const [zoom, setZoom] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Load spritesheet
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setSpritesheetImage(img);
        setSpritesheetSrc(ev.target?.result as string);

        // Auto-detect frame size based on image dimensions
        const detectedCols = Math.floor(img.width / frameWidth);
        const detectedRows = Math.floor(img.height / frameHeight);
        setColumns(detectedCols > 0 ? detectedCols : 1);
        setRows(detectedRows > 0 ? detectedRows : 1);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Generate frames from grid
  const generateFrames = useCallback(() => {
    if (!spritesheetImage) return;

    const newFrames: Frame[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        newFrames.push({
          id: generateId(),
          x: col * frameWidth,
          y: row * frameHeight,
          width: frameWidth,
          height: frameHeight,
          duration: 1000 / fps,
        });
      }
    }
    setFrames(newFrames);
  }, [spritesheetImage, rows, columns, frameWidth, frameHeight, fps]);

  // Draw spritesheet canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spritesheetImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = spritesheetImage.width * zoom;
    canvas.height = spritesheetImage.height * zoom;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(spritesheetImage, 0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "rgba(0, 150, 255, 0.5)";
    ctx.lineWidth = 1;

    for (let row = 0; row <= rows; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * frameHeight * zoom);
      ctx.lineTo(columns * frameWidth * zoom, row * frameHeight * zoom);
      ctx.stroke();
    }

    for (let col = 0; col <= columns; col++) {
      ctx.beginPath();
      ctx.moveTo(col * frameWidth * zoom, 0);
      ctx.lineTo(col * frameWidth * zoom, rows * frameHeight * zoom);
      ctx.stroke();
    }

    // Highlight selected frames
    ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
    frames.forEach((frame, index) => {
      if (selectedFrames.includes(frame.id)) {
        ctx.fillRect(
          frame.x * zoom,
          frame.y * zoom,
          frame.width * zoom,
          frame.height * zoom
        );
      }
    });
  }, [
    spritesheetImage,
    zoom,
    rows,
    columns,
    frameWidth,
    frameHeight,
    frames,
    selectedFrames,
  ]);

  // Animation preview
  useEffect(() => {
    if (!isPlaying || !currentAnimation || currentAnimation.frames.length === 0)
      return;

    const interval = setInterval(() => {
      setCurrentFrameIndex(
        (prev) => (prev + 1) % currentAnimation.frames.length
      );
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, currentAnimation, fps]);

  // Draw preview frame
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !spritesheetImage || !currentAnimation) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frame = currentAnimation.frames[currentFrameIndex];
    if (!frame) return;

    canvas.width = frame.width * 4;
    canvas.height = frame.height * 4;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw onion skin frames (previous frames in red/pink tint)
    if (onionSkinEnabled) {
      for (let i = 1; i <= onionSkinFrames; i++) {
        const prevIndex = currentFrameIndex - i;
        if (prevIndex >= 0 && prevIndex < currentAnimation.frames.length) {
          const prevFrame = currentAnimation.frames[prevIndex];
          ctx.globalAlpha = onionSkinOpacity / i;
          ctx.drawImage(
            spritesheetImage,
            prevFrame.x,
            prevFrame.y,
            prevFrame.width,
            prevFrame.height,
            0,
            0,
            canvas.width,
            canvas.height
          );
        }
      }

      // Draw onion skin frames (next frames in blue/cyan tint)
      for (let i = 1; i <= onionSkinFrames; i++) {
        const nextIndex = currentFrameIndex + i;
        if (nextIndex >= 0 && nextIndex < currentAnimation.frames.length) {
          const nextFrame = currentAnimation.frames[nextIndex];
          ctx.globalAlpha = onionSkinOpacity / i;
          ctx.drawImage(
            spritesheetImage,
            nextFrame.x,
            nextFrame.y,
            nextFrame.width,
            nextFrame.height,
            0,
            0,
            canvas.width,
            canvas.height
          );
        }
      }
      ctx.globalAlpha = 1;
    }

    // Draw current frame
    ctx.drawImage(
      spritesheetImage,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, [
    spritesheetImage,
    currentAnimation,
    currentFrameIndex,
    onionSkinEnabled,
    onionSkinFrames,
    onionSkinOpacity,
  ]);

  // Handle frame click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom / frameWidth);
    const y = Math.floor((e.clientY - rect.top) / zoom / frameHeight);

    const frameIndex = y * columns + x;
    const frame = frames[frameIndex];

    if (frame) {
      if (e.shiftKey) {
        // Multi-select with shift
        setSelectedFrames((prev) =>
          prev.includes(frame.id)
            ? prev.filter((id) => id !== frame.id)
            : [...prev, frame.id]
        );
      } else {
        setSelectedFrames([frame.id]);
      }
    }
  };

  // Create animation from selected frames with state
  const createAnimationWithState = (state: AnimationState) => {
    if (selectedFrames.length === 0) return;

    const template = ANIMATION_STATE_TEMPLATES.find((t) => t.state === state);
    const animName =
      state === "custom"
        ? `Animation ${animations.length + 1}`
        : `${template?.label || state}`;
    const animFrames = frames.filter((f) => selectedFrames.includes(f.id));

    const newAnimation: Animation = {
      id: generateId(),
      name: animName,
      frames: animFrames,
      loop: state !== "death", // Death usually doesn't loop
      state,
    };

    setAnimations((prev) => [...prev, newAnimation]);
    setCurrentAnimation(newAnimation);
    setSelectedFrames([]);
    setCurrentFrameIndex(0);

    // Set FPS based on state template
    if (template) {
      setFps(template.defaultFps);
    }
  };

  // Create animation from selected frames (legacy, defaults to custom)
  const createAnimation = () => {
    createAnimationWithState("custom");
  };

  // Delete animation
  const deleteAnimation = (id: string) => {
    setAnimations((prev) => prev.filter((a) => a.id !== id));
    if (currentAnimation?.id === id) {
      setCurrentAnimation(null);
      setIsPlaying(false);
    }
  };

  // Export animation data
  const exportAnimations = () => {
    const data = {
      spritesheet: {
        width: spritesheetImage?.width,
        height: spritesheetImage?.height,
        frameWidth,
        frameHeight,
      },
      animations: animations.map((anim) => ({
        name: anim.name,
        loop: anim.loop,
        frames: anim.frames.map((f) => ({
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          duration: f.duration,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spritesheet-animations.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Spritesheet Editor - Game Asset Tool">
      <div className="ie-window-content flex flex-col h-full">
        {/* Toolbar */}
        <div className="ie-toolbar mb-2 flex items-center gap-2 flex-wrap">
          <button
            className="ie-button"
            onClick={() => fileInputRef.current?.click()}
          >
            📂 Load Spritesheet
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="ie-separator" />

          <span className="text-xs">Frame:</span>
          <input
            type="number"
            className="ie-input w-12 text-xs"
            value={frameWidth}
            onChange={(e) => setFrameWidth(parseInt(e.target.value) || 32)}
            min={1}
          />
          <span className="text-xs">x</span>
          <input
            type="number"
            className="ie-input w-12 text-xs"
            value={frameHeight}
            onChange={(e) => setFrameHeight(parseInt(e.target.value) || 32)}
            min={1}
          />

          <div className="ie-separator" />

          <span className="text-xs">Grid:</span>
          <input
            type="number"
            className="ie-input w-10 text-xs"
            value={columns}
            onChange={(e) => setColumns(parseInt(e.target.value) || 1)}
            min={1}
          />
          <span className="text-xs">x</span>
          <input
            type="number"
            className="ie-input w-10 text-xs"
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value) || 1)}
            min={1}
          />

          <button
            className="ie-button"
            onClick={generateFrames}
            disabled={!spritesheetImage}
          >
            🔲 Generate Frames
          </button>

          <div className="ie-separator" />

          <span className="text-xs">Zoom:</span>
          <select
            className="ie-select text-xs"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={4}>4x</option>
          </select>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 gap-2 overflow-hidden">
          {/* Left Panel - Spritesheet */}
          <div className="flex-1 ie-panel-inset overflow-auto">
            {spritesheetImage ? (
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{ imageRendering: "pixelated", cursor: "crosshair" }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎬</div>
                  <p>Load a spritesheet to begin</p>
                  <p className="text-xs mt-1">Supports PNG, JPG, GIF</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Timeline & Preview */}
          <div className="w-72 flex flex-col gap-2">
            {/* Animation Preview */}
            <div className="ie-groupbox">
              <span className="ie-groupbox-title">🎥 Preview</span>
              <div className="flex flex-col items-center gap-2 p-2">
                <div className="ie-panel-inset w-32 h-32 flex items-center justify-center">
                  {currentAnimation ? (
                    <canvas
                      ref={previewCanvasRef}
                      style={{ imageRendering: "pixelated" }}
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">No animation</span>
                  )}
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                  <button
                    className="ie-button px-3"
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={!currentAnimation}
                  >
                    {isPlaying ? "⏸️" : "▶️"}
                  </button>
                  <button
                    className="ie-button px-2"
                    onClick={() => setCurrentFrameIndex(0)}
                    disabled={!currentAnimation}
                  >
                    ⏮️
                  </button>
                  <span className="text-xs">
                    FPS:
                    <input
                      type="number"
                      className="ie-input w-10 ml-1 text-xs"
                      value={fps}
                      onChange={(e) => setFps(parseInt(e.target.value) || 12)}
                      min={1}
                      max={60}
                    />
                  </span>
                </div>

                {currentAnimation && (
                  <div className="text-xs text-gray-500">
                    Frame: {currentFrameIndex + 1} /{" "}
                    {currentAnimation.frames.length}
                  </div>
                )}
              </div>

              {/* Onion Skinning Controls */}
              <div className="ie-groupbox mt-2">
                <span className="ie-groupbox-title">👻 Onion Skin</span>
                <div className="space-y-1 -mt-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={onionSkinEnabled}
                      onChange={(e) => setOnionSkinEnabled(e.target.checked)}
                    />
                    Enable Onion Skin
                  </label>
                  {onionSkinEnabled && (
                    <>
                      <div className="flex items-center gap-2">
                        <span>Frames:</span>
                        <input
                          type="number"
                          className="ie-input w-12 text-xs"
                          value={onionSkinFrames}
                          onChange={(e) =>
                            setOnionSkinFrames(parseInt(e.target.value) || 1)
                          }
                          min={1}
                          max={5}
                        />
                      </div>
                      <div>
                        <span>
                          Opacity: {Math.round(onionSkinOpacity * 100)}%
                        </span>
                        <input
                          type="range"
                          className="w-full"
                          value={onionSkinOpacity}
                          onChange={(e) =>
                            setOnionSkinOpacity(parseFloat(e.target.value))
                          }
                          min={0.1}
                          max={0.8}
                          step={0.1}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Frame Selection */}
            <div className="ie-groupbox flex-1 overflow-hidden flex flex-col">
              <span className="ie-groupbox-title">
                🖼️ Selected Frames ({selectedFrames.length})
              </span>
              <div className="ie-panel-inset flex-1 overflow-auto p-1">
                {selectedFrames.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {frames
                      .filter((f) => selectedFrames.includes(f.id))
                      .map((frame, idx) => (
                        <div
                          key={frame.id}
                          className="w-8 h-8 border border-blue-400 bg-gray-800 relative"
                          style={{
                            backgroundImage: spritesheetSrc
                              ? `url(${spritesheetSrc})`
                              : undefined,
                            backgroundPosition: `-${frame.x}px -${frame.y}px`,
                            imageRendering: "pixelated",
                          }}
                        >
                          <span className="absolute bottom-0 right-0 text-[8px] bg-black/50 text-white px-0.5">
                            {idx + 1}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 text-center py-2">
                    Click frames on spritesheet to select
                    <br />
                    (Shift+Click for multi-select)
                  </div>
                )}
              </div>
              {/* Animation State Buttons */}
              <div className="mt-2 space-y-1">
                <div className="text-[10px] text-gray-500 text-center">
                  Create as Animation State:
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {ANIMATION_STATE_TEMPLATES.map((template) => (
                    <button
                      key={template.state}
                      className="ie-button text-xs p-1 flex flex-col items-center"
                      onClick={() => createAnimationWithState(template.state)}
                      disabled={selectedFrames.length === 0}
                      title={`${template.label} (${template.defaultFps} FPS)`}
                    >
                      <span>{template.icon}</span>
                      <span className="text-[9px]">{template.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Animations List */}
            <div className="ie-groupbox">
              <span className="ie-groupbox-title">
                📋 Animations ({animations.length})
              </span>
              <div className="ie-panel-inset max-h-32 overflow-auto">
                {animations.length > 0 ? (
                  <div className="space-y-1">
                    {animations.map((anim) => (
                      <div
                        key={anim.id}
                        className={`flex items-center justify-between p-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                          currentAnimation?.id === anim.id
                            ? "bg-blue-100 dark:bg-blue-900"
                            : ""
                        }`}
                        onClick={() => {
                          setCurrentAnimation(anim);
                          setCurrentFrameIndex(0);
                        }}
                      >
                        <span className="text-xs flex items-center gap-1">
                          <span>
                            {ANIMATION_STATE_TEMPLATES.find(
                              (t) => t.state === anim.state
                            )?.icon || "✨"}
                          </span>
                          {anim.name} ({anim.frames.length}f)
                        </span>
                        <button
                          className="ie-button px-1 text-xs text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnimation(anim.id);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 text-center py-2">
                    No animations yet
                  </div>
                )}
              </div>
              <button
                className="ie-button mt-1 text-xs w-full"
                onClick={exportAnimations}
                disabled={animations.length === 0}
              >
                📤 Export Animations (JSON)
              </button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {currentAnimation && (
          <div className="ie-groupbox mt-2">
            <span className="ie-groupbox-title">
              ⏱️ Timeline: {currentAnimation.name}
            </span>
            <div className="ie-panel-inset p-2 overflow-x-auto">
              <div className="flex gap-1">
                {currentAnimation.frames.map((frame, idx) => (
                  <div
                    key={frame.id}
                    className={`flex-shrink-0 w-12 h-12 border-2 cursor-pointer ${
                      idx === currentFrameIndex
                        ? "border-yellow-400"
                        : "border-gray-400"
                    }`}
                    style={{
                      backgroundImage: spritesheetSrc
                        ? `url(${spritesheetSrc})`
                        : undefined,
                      backgroundPosition: `-${frame.x}px -${frame.y}px`,
                      backgroundSize: `${spritesheetImage?.width}px ${spritesheetImage?.height}px`,
                      imageRendering: "pixelated",
                    }}
                    onClick={() => setCurrentFrameIndex(idx)}
                  >
                    <div className="text-[8px] bg-black/50 text-white px-0.5">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="ie-statusbar mt-2">
          <span>
            {spritesheetImage
              ? `Spritesheet: ${spritesheetImage.width}x${spritesheetImage.height}px | Frames: ${frames.length} | Animations: ${animations.length}`
              : "No spritesheet loaded"}
          </span>
        </div>
      </div>
    </MainLayout>
  );
}
