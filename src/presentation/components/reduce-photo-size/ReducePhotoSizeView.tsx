"use client";

import UPNG from "upng-js";
import JSZip from "jszip";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  resultKey: string | null; // settingsKey this row's result was encoded with
  sourceFormat: OutputFormat; // from file.type — used by "auto" format
  originalBlob: Blob; // original file — used when shrink impossible
  usedOriginal: boolean; // true → shipped the original file
  note?: string; // e.g. target mode: "เข้าเป้าไม่ได้ ใกล้สุด = N KB"
}

interface Settings {
  format: OutputFormat | "auto";
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

// Map source mime type to output format ("auto" keeps the original format)
const formatFromMime = (mime: string): OutputFormat => {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpeg"; // jpeg, gif, bmp, svg, ... → jpeg
};

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
    format: "auto",
    quality: 85,
    resizeMode: "percent",
    percent: 50,
    maxDim: 1024,
    pngMode: "palette",
    targetKB: 500,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // live re-render engine refs
  const runGenRef = useRef(0);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const settingsKey = useMemo(
    () =>
      JSON.stringify({
        format: settings.format,
        quality: settings.quality,
        resizeMode: settings.resizeMode,
        percent: settings.percent,
        maxDim: settings.maxDim,
        pngMode: settings.pngMode,
        targetKB: settings.targetKB,
      }),
    [settings]
  );

  const processFile = useCallback(
    async (photo: PhotoFile): Promise<PhotoFile> => {
      const img = await loadImage(photo.preview);
      // "auto" keeps each file's own format (TinyPNG-style)
      const format =
        settings.format === "auto" ? photo.sourceFormat : settings.format;
      const { outW, outH } = calcTargetSize(photo.width, photo.height, settings);

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas ไม่พร้อมใช้งาน");
      canvas.width = outW;
      canvas.height = outH;

      // willReadFrequently: PNG path does repeated getImageData readbacks
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("ไม่สามารถสร้าง canvas context ได้");

      // JPEG has no alpha — composite onto white instead of black
      if (format === "jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outW, outH);
      }

      ctx.drawImage(img, 0, 0, outW, outH);

      if (format === "png") {
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
          // target mode: try palette sizes until ≤ targetKB.
          // 64-col max: bigger palettes rarely shrink below target and are slow on
          // large images. Skip rendering a note unless we truly cannot hit target —
          // the first palette ≤ target is the largest that fits = best quality.
          const targetBytes = settings.targetKB * 1024;
          for (const colors of PALETTE_STEPS) {
            const buf = UPNG.encode([rgba.buffer], outW, outH, colors);
            buffer = buf;
            if (buf.byteLength <= targetBytes) {
              break; // hit target
            }
            // yield between sync encodes so UI stays responsive
            await new Promise((r) => setTimeout(r, 0));
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
            resultKey: settingsKey,
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
          resultKey: settingsKey,
          usedOriginal: false,
          note,
        };
      }

      const mime = MIME[format];
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
        resultFormat: format,
        resultKey: settingsKey,
        usedOriginal: false,
      };
    },
    [settings, settingsKey]
  );

  // Live re-render engine: any settings/photo change re-encodes stale rows
  // automatically (debounced) — no "process" button needed.
  useEffect(() => {
    const stale = photos.filter(
      (p) => p.resultKey !== settingsKey && p.status !== "error"
    );
    // Revoke object URLs of rows that are about to be re-encoded — the old
    // blob becomes unreachable once the new result overwrites it.
    stale.forEach((p) => {
      if (p.resultUrl) URL.revokeObjectURL(p.resultUrl);
    });
    if (stale.length === 0) {
      setIsProcessing(false);
      return;
    }
    const genRef = runGenRef;
    const gen = ++genRef.current;
    // PNG target mode runs a multi-pass palette loop per row — give it room
    const delay =
      settings.format === "png" && settings.pngMode === "target" ? 700 : 200;
    const t = setTimeout(async () => {
      // re-read at fire time — a run that committed mid-debounce may have
      // already refreshed some rows (photosRef avoids re-encoding them)
      const current = photosRef.current.filter(
        (p) => p.resultKey !== settingsKey && p.status !== "error"
      );
      if (current.length === 0) {
        setIsProcessing(false);
        return;
      }
      setIsProcessing(true);
      const results: Record<string, PhotoFile> = {};
      const createdUrls: string[] = [];
      for (const item of current) {
        if (runGenRef.current !== gen) {
          // Superseded mid-run — URLs we already created are owned by a
          // discarded run; revoke them now instead of leaking until unload.
          createdUrls.forEach((u) => URL.revokeObjectURL(u));
          return; // superseded — drop
        }
        try {
          results[item.id] = await processFile({
            ...item,
            status: "processing",
          });
          if (results[item.id].resultUrl)
            createdUrls.push(results[item.id].resultUrl as string);
        } catch (err) {
          results[item.id] = {
            ...item,
            status: "error",
            error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
          };
        }
      }
      if (runGenRef.current !== gen) {
        // Superseded: the run that replaced us revoked already-invalidated URLs
        // (stale rows). The URLs we just created are owned by a discarded run —
        // revoke them now so they do not leak until page unload.
        createdUrls.forEach((u) => URL.revokeObjectURL(u));
        return; // superseded — drop commit
      }
      setPhotos((prev) => prev.map((p) => results[p.id] ?? p));
      setIsProcessing(false);
    }, delay);
    return () => {
      clearTimeout(t);
      genRef.current++; // supersede pending timer + stale runs
    };
  }, [settingsKey, photos, processFile, settings.format, settings.pngMode]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    // Snapshot the file list up front. e.target.value = "" (in handleFileChange)
    // runs while this async loop is mid-await; it resets input.files to an
    // empty FileList, so a live `files.length` read after the first await would
    // see 0 and drop every file after the first.
    const items = Array.from(files);
    const newPhotos: PhotoFile[] = [];
    for (let i = 0; i < items.length; i++) {
      const file = items[i];
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
          resultKey: null,
          sourceFormat: formatFromMime(file.type),
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
          resultKey: null,
          sourceFormat: "jpeg",
          originalBlob: file,
          usedOriginal: false,
        });
      }
    }

    if (newPhotos.length > 0) {
      // the live re-render effect picks these up automatically
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      void addFiles(files);
      e.target.value = "";
    },
    [addFiles]
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
  // Only count rows that already have a result — comparing pending photos
  // against an empty result sum would show a fake savings of 100%.
  const totalResult = donePhotos.reduce((s, p) => s + (p.resultSize ?? 0), 0);
  const totalOriginal = donePhotos.reduce((s, p) => s + p.originalSize, 0);
  const savingsPct =
    totalOriginal > 0
      ? Math.round(((totalOriginal - totalResult) / totalOriginal) * 100)
      : 0;
  const hasStale = photos.some(
    (p) => p.resultKey !== settingsKey && p.status !== "error"
  );
  const busy = isProcessing || hasStale;
  const pngPaletteActive =
    settings.format === "png" && settings.pngMode === "palette";

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

  return (
    <MainLayout title="Reduce Photo Size - Game Asset Tool">
      <div className="ie-window-content flex flex-col h-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {photos.length === 0 ? (
          /* ===== Idle: drop zone, zero settings ===== */
          <>
            <div
              className={`ie-panel-inset flex-1 flex items-center justify-center cursor-pointer transition-colors border-2 border-dashed ${
                isDragging
                  ? "bg-blue-100 dark:bg-blue-900 border-blue-400"
                  : "border-gray-400 dark:border-gray-600"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                // Only clear when the drag truly left the zone — dragging over a
                // child re-fires dragleave and would flicker the highlight.
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.length) {
                  void addFiles(e.dataTransfer.files);
                }
              }}
            >
              <div className="text-center px-4">
                <div className="text-5xl mb-3">📉</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  ลากไฟล์ภาพมาวางที่นี่ หรือ
                </div>
                <button
                  className="ie-button mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  📁 เลือกไฟล์
                </button>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  รองรับ PNG / JPEG / WebP หลายไฟล์พร้อมกัน
                </div>
              </div>
            </div>
            <div className="ie-statusbar mt-2">
              <span className="text-xs">
                ยังไม่มีรูปภาพ — ลากไฟล์ภาพมาวาง
              </span>
            </div>
          </>
        ) : (
          /* ===== Files present: toolbar + results ===== */
          <>
            {/* Settings bar — changes re-render live, no button needed */}
            <div className="ie-toolbar mb-2 flex items-center gap-2 flex-wrap">
              <button
                className="ie-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                📁 เพิ่มรูปภาพ
              </button>
              <button
                className="ie-button"
                onClick={clearAll}
                disabled={busy}
              >
                🗑️ ล้างทั้งหมด
              </button>

              <div className="ie-separator" />

              <label className="text-xs text-gray-700 dark:text-gray-300">
                รูปแบบ:
              </label>
              <select
                className="ie-input"
                value={settings.format}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    format: e.target.value as Settings["format"],
                  }))
                }
              >
                <option value="auto">Auto (ตามไฟล์เดิม)</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>

              <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {pngPaletteActive
                  ? `จำนวนสี: ${paletteFor(settings.quality)}`
                  : `คุณภาพ: ${settings.quality}`}
              </span>
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
                className="w-32"
                disabled={
                  settings.format === "png" && settings.pngMode !== "palette"
                }
              />

              <button
                className="ie-button ie-button-sm"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                ⚙️ ขั้นสูง{advancedOpen ? " ▲" : " ▼"}
              </button>

              <div className="flex-1" />

              <button
                className="ie-button bg-green-600 text-white font-bold px-4"
                onClick={downloadAll}
                disabled={busy || donePhotos.length === 0}
              >
                📦 Download All (ZIP)
              </button>
            </div>

            {/* Advanced settings (progressive disclosure) */}
            {advancedOpen && (
              <div className="ie-groupbox mb-2">
                <span className="ie-groupbox-title">🔧 การตั้งค่าขั้นสูง</span>
                <div className="p-2 -mt-2 flex flex-wrap gap-x-8 gap-y-3">
                  <div className="min-w-[200px]">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      📐 ขนาดภาพ
                    </div>
                    <div className="space-y-1">
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
                        <div className="flex items-center gap-2">
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
                            className="ie-input w-28"
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            px
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {settings.format === "png" && (
                    <div className="min-w-[220px]">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        🖼️ โหมด PNG
                      </div>
                      <div className="space-y-1">
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
                                setSettings((s) => ({
                                  ...s,
                                  pngMode: m.value,
                                }))
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
                              className="ie-input w-28"
                              value={settings.targetKB}
                              onChange={(e) =>
                                setSettings((s) => ({
                                  ...s,
                                  targetKB: Math.max(
                                    10,
                                    Number(e.target.value) || 10
                                  ),
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
                </div>
              </div>
            )}

            {/* Results list */}
            <div className="ie-groupbox flex-1 overflow-hidden flex flex-col min-h-0">
              <span className="ie-groupbox-title">
                📁 รูปภาพ ({photos.length})
              </span>
              {donePhotos.length > 0 && (
                <div className="px-2 py-1 text-xs border-b border-gray-200 dark:border-gray-700">
                  ประหยัดแล้ว:{" "}
                  <span className="text-green-600 dark:text-green-500 font-medium">
                    {savingsPct}%
                  </span>{" "}
                  ({formatSize(totalOriginal)} → {formatSize(totalResult)})
                </div>
              )}
              <div className="ie-panel-inset flex-1 overflow-auto p-2 ie-scrollbar">
                {photos.map((photo) => {
                  const staleRow =
                    photo.status === "done" &&
                    photo.resultKey !== settingsKey;
                  return (
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
                          {staleRow ? (
                            <span className="text-xs text-gray-500">
                              {" "}
                              ⏳ กำลังคำนวณ…
                            </span>
                          ) : (
                            sizeLabel(photo)
                          )}
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
                        {photo.status === "done" && !staleRow && (
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
                  );
                })}
              </div>
            </div>

            {/* Status Bar */}
            <div className="ie-statusbar mt-2">
              <span className="text-xs">
                รูปภาพ: {photos.length} | ประมวลผลแล้ว: {donePhotos.length} |
                ประหยัด: {savingsPct}%
                {usedOriginalCount > 0 && ` | ใช้ต้นฉบับ: ${usedOriginalCount}`}
              </span>
            </div>
          </>
        )}

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
