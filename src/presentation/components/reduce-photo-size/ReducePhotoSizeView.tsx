"use client";

import UPNG from "upng-js";
import JSZip from "jszip";
import React, { useCallback, useRef, useState } from "react";
import { MainLayout } from "../templates/MainLayout";

type OutputFormat = "jpeg" | "png" | "webp";
type ResizeMode = "percent" | "maxdim";
type PngMode = "lossless" | "palette" | "target";

interface PhotoFile {
  id: string;
  name: string; // original name with extension
  preview: string; // dataURL
  width: number;
  height: number;
  originalSize: number; // file.size
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  resultUrl: string | null;
  resultBlob: Blob | null;
  resultSize: number | null;
  resultWidth?: number;
  resultHeight?: number;
  resultFormat: OutputFormat | null;
  originalBlob: Blob; // original file — used when shrink impossible
  usedOriginal: boolean; // true → shipped the original file
  note?: string; // e.g. target mode: "เข้าเป้าไม่ได้ ใกล้สุด = N KB"
}

interface Settings {
  format: OutputFormat;
  quality: number;
  resizeMode: ResizeMode;
  percent: number;
  maxDim: number;
  pngMode: PngMode;
  targetKB: number;
}

const MIME: Record<OutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const FORMAT_LABEL: Record<OutputFormat, string> = {
  jpeg: "JPEG",
  png: "PNG",
  webp: "WebP",
};

const PALETTE_STEPS = [256, 128, 64, 32, 16, 8, 4] as const;

// Map quality slider (1-100) to palette size (4-256)
const paletteFor = (q: number) =>
  Math.min(256, Math.max(4, Math.round((256 * q) / 100)));

const PNG_MODES: { value: PngMode; label: string; hint: string }[] = [
  {
    value: "lossless",
    label: "คงคุณภาพ (Lossless)",
    hint: "เข้ารหัสใหม่ ไม่ลดสี",
  },
  {
    value: "palette",
    label: "ลดจำนวนสี (Palette)",
    hint: "ใช้สไลด์ระดับสีด้านล่าง",
  },
  {
    value: "target",
    label: "เป้าไฟล์ (Target KB)",
    hint: "ลอง palette จนได้ตามเป้า",
  },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

// Load image from data URL (fresh Image per file — canvas is shared)
const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("ไม่สามารถโหลดรูปภาพได้"));
    img.src = src;
  });

// Scale preserving aspect ratio. percent mode: relative to original.
// maxdim mode: never upscale.
const calcTargetSize = (
  w: number,
  h: number,
  settings: Settings
): { outW: number; outH: number } => {
  let scale = 1;
  if (settings.resizeMode === "percent") {
    scale = settings.percent / 100;
  } else {
    scale = Math.min(1, settings.maxDim / Math.max(w, h));
  }
  if (scale <= 0) return { outW: 1, outH: 1 };
  return {
    outW: Math.max(1, Math.round(w * scale)),
    outH: Math.max(1, Math.round(h * scale)),
  };
};

export default function ReducePhotoSizeView() {
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [settings, setSettings] = useState<Settings>({
    format: "jpeg",
    quality: 85,
    resizeMode: "percent",
    percent: 50,
    maxDim: 1024,
    pngMode: "lossless",
    targetKB: 500,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processFile = useCallback(
    async (photo: PhotoFile): Promise<PhotoFile> => {
      const img = await loadImage(photo.preview);
      const { outW, outH } = calcTargetSize(photo.width, photo.height, settings);

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas ไม่พร้อมใช้งาน");
      canvas.width = outW;
      canvas.height = outH;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("ไม่สามารถสร้าง canvas context ได้");

      // JPEG has no alpha — composite onto white instead of black
      if (settings.format === "jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outW, outH);
      }

      ctx.drawImage(img, 0, 0, outW, outH);

      if (settings.format === "png") {
        // Lossy/lossless PNG via upng-js palette quantization (canvas.toBlob
        // re-encodes lossless RGBA32 which can be BIGGER than the original)
        const rgba = ctx.getImageData(0, 0, outW, outH).data;
        let buffer: ArrayBuffer = UPNG.encode([rgba.buffer], outW, outH, 0);
        let note: string | undefined;

        if (settings.pngMode === "lossless") {
          buffer = UPNG.encode([rgba.buffer], outW, outH, 0);
        } else if (settings.pngMode === "palette") {
          buffer = UPNG.encode(
            [rgba.buffer],
            outW,
            outH,
            paletteFor(settings.quality)
          );
        } else {
          // target mode: try palette sizes until ≤ targetKB
          const targetBytes = settings.targetKB * 1024;
          let bestBuf: ArrayBuffer | null = null;
          let bestSize = Infinity;
          for (const colors of PALETTE_STEPS) {
            const buf = UPNG.encode([rgba.buffer], outW, outH, colors);
            if (buf.byteLength <= targetBytes) {
              buffer = buf;
              break; // hit target
            }
            if (buf.byteLength < bestSize) {
              bestBuf = buf;
              bestSize = buf.byteLength;
            }
            // yield between sync encodes so UI stays responsive
            await new Promise((r) => setTimeout(r, 0));
          }
          if (bestBuf !== null) {
            buffer = bestBuf;
            note = `เข้าเป้าไม่ได้ ใกล้สุด = ${formatSize(bestSize)}`;
          }
        }

        const blob = new Blob([buffer], { type: "image/png" });

        // Never ship a bigger file: fall back to the original bytes
        if (blob.size >= photo.originalSize) {
          return {
            ...photo,
            status: "done",
            resultUrl: URL.createObjectURL(photo.originalBlob),
            resultBlob: photo.originalBlob,
            resultSize: photo.originalSize,
            resultWidth: photo.width,
            resultHeight: photo.height,
            resultFormat: "png",
            usedOriginal: true,
            note: undefined,
          };
        }

        return {
          ...photo,
          status: "done",
          resultUrl: URL.createObjectURL(blob),
          resultBlob: blob,
          resultSize: blob.size,
          resultWidth: outW,
          resultHeight: outH,
          resultFormat: "png",
          usedOriginal: false,
          note,
        };
      }

      const mime = MIME[settings.format];
      const quality = settings.quality / 100;
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("การเข้ารหัสภาพล้มเหลว"))),
          mime,
          quality
        )
      );

      return {
        ...photo,
        status: "done",
        resultUrl: URL.createObjectURL(blob),
        resultBlob: blob,
        resultSize: blob.size,
        resultWidth: outW,
        resultHeight: outH,
        resultFormat: settings.format,
        usedOriginal: false,
      };
    },
    [settings]
  );

  const runBatch = useCallback(
    async (items: PhotoFile[]) => {
      setIsProcessing(true);
      setProgress(0);

      const results: Record<string, PhotoFile> = {};
      for (let i = 0; i < items.length; i++) {
        try {
          results[items[i].id] = await processFile({
            ...items[i],
            status: "processing",
          });
        } catch (err) {
          results[items[i].id] = {
            ...items[i],
            status: "error",
            error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
          };
        }
        setProgress(Math.round(((i + 1) / items.length) * 100));
      }

      setPhotos((prev) => prev.map((p) => results[p.id] ?? p));
      setIsProcessing(false);
    },
    [processFile]
  );

  const processAll = useCallback(() => {
    if (isProcessing || photos.length === 0) return;
    runBatch(photos);
  }, [isProcessing, photos, runBatch]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newPhotos: PhotoFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;

        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });

        try {
          const img = await loadImage(preview);
          newPhotos.push({
            id: generateId(),
            name: file.name,
            preview,
            width: img.width,
            height: img.height,
            originalSize: file.size,
            status: "pending",
            resultUrl: null,
            resultBlob: null,
            resultSize: null,
            resultFormat: null,
            originalBlob: file,
            usedOriginal: false,
          });
        } catch {
          newPhotos.push({
            id: generateId(),
            name: file.name,
            preview,
            width: 0,
            height: 0,
            originalSize: file.size,
            status: "error",
            error: "ไม่ใช่ไฟล์รูปภาพที่อ่านได้",
            resultUrl: null,
            resultBlob: null,
            resultSize: null,
            resultFormat: null,
            originalBlob: file,
            usedOriginal: false,
          });
        }
      }

      if (newPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...newPhotos]);
        // Auto-process new batch with current settings
        await runBatch(newPhotos);
      }
      e.target.value = "";
    },
    [runBatch]
  );

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.resultUrl) URL.revokeObjectURL(target.resultUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearAll = () => {
    photos.forEach((p) => {
      if (p.resultUrl) URL.revokeObjectURL(p.resultUrl);
    });
    setPhotos([]);
    setProgress(0);
  };

  const downloadPhoto = (photo: PhotoFile) => {
    if (!photo.resultUrl || !photo.resultFormat) return;
    const base = photo.name.replace(/\.[^/.]+$/, "");
    const link = document.createElement("a");
    // usedOriginal ships original bytes — keep the original filename/extension
    link.download = photo.usedOriginal ? photo.name : `${base}.${photo.resultFormat}`;
    link.href = photo.resultUrl;
    link.click();
  };

  const downloadAll = async () => {
    const done = photos.filter((p) => p.status === "done");
    if (done.length === 0) {
      setError("ยังไม่มีไฟล์ที่ประมวลผลสำเร็จ");
      return;
    }
    try {
      setIsProcessing(true);
      const zip = new JSZip();
      done.forEach((p) => {
        const base = p.name.replace(/\.[^/.]+$/, "");
        zip.file(
          p.usedOriginal ? p.name : `${base}.${p.resultFormat}`,
          p.resultBlob as Blob
        );
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reduce-photo-size.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("ไม่สามารถสร้างไฟล์ ZIP ได้");
    } finally {
      setIsProcessing(false);
    }
  };

  const donePhotos = photos.filter((p) => p.status === "done");
  const usedOriginalCount = donePhotos.filter((p) => p.usedOriginal).length;
  const totalOriginal = photos.reduce((s, p) => s + p.originalSize, 0);
  const totalResult = donePhotos.reduce((s, p) => s + (p.resultSize ?? 0), 0);
  const savingsPct =
    totalOriginal > 0
      ? Math.round(((totalOriginal - totalResult) / totalOriginal) * 100)
      : 0;

  const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;

  const sizeLabel = (p: PhotoFile) => {
    if (p.status !== "done" || p.resultSize == null) return null;
    if (p.usedOriginal) {
      return (
        <span className="text-gray-500 dark:text-gray-400">
          ใช้ต้นฉบับ (ไม่สามารถย่อได้)
        </span>
      );
    }
    const diff = p.originalSize - p.resultSize;
    const pct = p.originalSize > 0 ? Math.round((diff / p.originalSize) * 100) : 0;
    const cls =
      pct > 0
        ? "text-green-600 dark:text-green-500"
        : pct < 0
          ? "text-red-500"
          : "text-gray-400";
    const sign = pct > 0 ? `-${pct}%` : pct < 0 ? `+${-pct}%` : "0%";
    return (
      <span className={cls}>
        {formatSize(p.resultSize)} ({sign})
        {p.note && (
          <span className="text-amber-600 dark:text-amber-400">
            {" "}
            ({p.note})
          </span>
        )}
      </span>
    );
  };

  const formatBtn = (fmt: OutputFormat, icon: string) => (
    <button
      className={`ie-button w-full text-left mb-1 ${
        settings.format === fmt ? "ie-button-active bg-blue-100 dark:bg-blue-900" : ""
      }`}
      onClick={() => setSettings((s) => ({ ...s, format: fmt }))}
    >
      {icon} {FORMAT_LABEL[fmt]}
    </button>
  );

  return (
    <MainLayout title="Reduce Photo Size - Game Asset Tool">
      <div className="ie-window-content flex flex-col h-full">
        {/* Toolbar */}
        <div className="ie-toolbar mb-2 flex items-center gap-2 flex-wrap">
          <button
            className="ie-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            📁 เลือกรูปภาพ
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="ie-separator" />

          <button
            className="ie-button"
            onClick={clearAll}
            disabled={photos.length === 0 || isProcessing}
          >
            🗑️ ล้างทั้งหมด
          </button>

          <div className="flex-1" />

          <button
            className="ie-button bg-green-600 text-white font-bold px-4"
            onClick={processAll}
            disabled={photos.length === 0 || isProcessing}
          >
            {isProcessing ? "⏳ กำลังประมวลผล..." : "⚙️ ประมวลผล"}
          </button>

          <button
            className="ie-button bg-blue-600 text-white font-bold px-4"
            onClick={downloadAll}
            disabled={isProcessing || donePhotos.length === 0}
          >
            📦 Download All (ZIP)
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 gap-2 overflow-hidden">
          {/* Left Panel - Photo List */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="ie-groupbox flex-1 overflow-hidden flex flex-col">
              <span className="ie-groupbox-title">
                📁 รูปภาพ ({photos.length})
              </span>
              <div className="ie-panel-inset flex-1 overflow-auto p-2 ie-scrollbar">
                {photos.length > 0 ? (
                  photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
                    >
                      <div
                        className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded flex-shrink-0"
                        style={{
                          backgroundImage: `url(${photo.preview})`,
                          backgroundSize: "contain",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                          {photo.name}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          {photo.width > 0
                            ? `${photo.width}×${photo.height}px`
                            : "-"}
                          {photo.status === "done" && photo.resultWidth
                            ? ` → ${photo.resultWidth}×${photo.resultHeight}px`
                            : ""}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          {formatSize(photo.originalSize)}
                          {sizeLabel(photo)}
                        </div>
                        {photo.status === "error" && (
                          <div className="text-[10px] text-red-500">
                            {photo.error}
                          </div>
                        )}
                      </div>
                      <div className="w-24 text-right flex-shrink-0">
                        {photo.status === "processing" && (
                          <span className="text-xs">⏳</span>
                        )}
                        {photo.status === "done" && (
                          <button
                            className="ie-button ie-button-sm"
                            onClick={() => downloadPhoto(photo)}
                          >
                            💾
                          </button>
                        )}
                        {photo.status === "error" && (
                          <span className="text-red-500 text-xs">❌</span>
                        )}
                      </div>
                      <button
                        className="w-5 h-5 rounded text-xs text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
                        onClick={() => removePhoto(photo.id)}
                        title="ลบออก"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl">📉</div>
                    <div className="text-xs">เลือกภาพเพื่อเริ่มต้น</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Settings */}
          <div className="w-72 flex flex-col gap-2 overflow-y-auto ie-scrollbar">
            <div className="ie-groupbox">
              <span className="ie-groupbox-title">🎯 รูปแบบผลลัพธ์</span>
              <div className="p-2 -mt-2">
                {formatBtn("jpeg", "🖼️")}
                {formatBtn("png", "✨")}
                {formatBtn("webp", "🌐")}
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  PNG บีบอัด lossy ได้ด้วย palette สี (เลือกโหมดด้านล่าง)
                </div>
              </div>
            </div>

            {settings.format === "png" && (
              <div className="ie-groupbox">
                <span className="ie-groupbox-title">🖼️ โหมด PNG</span>
                <div className="p-2 -mt-2 space-y-2">
                  {PNG_MODES.map((m) => (
                    <label
                      key={m.value}
                      className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="pngMode"
                        checked={settings.pngMode === m.value}
                        onChange={() =>
                          setSettings((s) => ({ ...s, pngMode: m.value }))
                        }
                      />
                      <span>
                        {m.label}
                        <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                          {m.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                  {settings.pngMode === "target" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={10}
                        className="ie-input"
                        value={settings.targetKB}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            targetKB: Math.max(10, Number(e.target.value) || 10),
                          }))
                        }
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        KB
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="ie-groupbox">
              <span className="ie-groupbox-title">⚙️ คุณภาพ</span>
              <div className="p-2 -mt-2">
                <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                  {settings.format === "png" && settings.pngMode === "palette"
                    ? `ระดับสี (Palette): ${paletteFor(settings.quality)} สี`
                    : `คุณภาพ: ${settings.quality}`}
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={settings.quality}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      quality: Number(e.target.value),
                    }))
                  }
                  className="w-full"
                  disabled={
                    settings.format === "png" && settings.pngMode !== "palette"
                  }
                />
              </div>
            </div>

            <div className="ie-groupbox">
              <span className="ie-groupbox-title">📐 ขนาดภาพ</span>
              <div className="p-2 -mt-2 space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="resizeMode"
                    checked={settings.resizeMode === "percent"}
                    onChange={() =>
                      setSettings((s) => ({ ...s, resizeMode: "percent" }))
                    }
                  />
                  โหมด % (เทียบขนาดเดิม)
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="resizeMode"
                    checked={settings.resizeMode === "maxdim"}
                    onChange={() =>
                      setSettings((s) => ({ ...s, resizeMode: "maxdim" }))
                    }
                  />
                  โหมด Max Dimension
                </label>

                {settings.resizeMode === "percent" ? (
                  <>
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      เปอร์เซ็นต์: {settings.percent}%
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={settings.percent}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          percent: Number(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                    <div className="flex gap-1">
                      {[25, 50, 75, 100].map((p) => (
                        <button
                          key={p}
                          className="ie-button ie-button-sm"
                          onClick={() =>
                            setSettings((s) => ({ ...s, percent: p }))
                          }
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      ความกว้าง/สูงสูงสุด (px)
                    </div>
                    <input
                      type="number"
                      min={16}
                      value={settings.maxDim}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          maxDim: Math.max(16, Number(e.target.value) || 16),
                        }))
                      }
                      className="ie-input w-full"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="ie-groupbox">
              <span className="ie-groupbox-title">ℹ️ สรุป</span>
              <div className="p-2 -mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>ประมวลผลแล้ว: {donePhotos.length} / {photos.length}</div>
                {usedOriginalCount > 0 && (
                  <div>ใช้ต้นฉบับ: {usedOriginalCount} ไฟล์</div>
                )}
                {donePhotos.length > 0 && (
                  <>
                    <div>ขนาดรวมเดิม: {formatSize(totalOriginal)}</div>
                    <div>ขนาดรวมใหม่: {formatSize(totalResult)}</div>
                    <div className="text-green-600 dark:text-green-500 font-medium">
                      ลดลงเฉลี่ย: {savingsPct}%
                    </div>
                  </>
                )}
                <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1">
                  JPEG: พื้นหลังโปร่งใสจะกลายเป็นสีขาว
                </div>
              </div>
            </div>

            {isProcessing && (
              <div className="ie-groupbox">
                <span className="ie-groupbox-title">⏳ ความคืบหน้า</span>
                <div className="p-2 -mt-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-4 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-center mt-1 text-gray-700 dark:text-gray-300">
                    {progress}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="ie-statusbar mt-2">
          <span className="text-xs">
            {photos.length > 0
              ? `รูปภาพ: ${photos.length} | ประมวลผลแล้ว: ${donePhotos.length} | ประหยัด: ${savingsPct}%`
              : "ยังไม่มีรูปภาพ"}
          </span>
        </div>

        {/* Error Modal */}
        {error && (
          <div className="ie-dialog" onClick={() => setError(null)}>
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
                  onClick={() => setError(null)}
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
                <button className="ie-button" onClick={() => setError(null)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shared hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </MainLayout>
  );
}
