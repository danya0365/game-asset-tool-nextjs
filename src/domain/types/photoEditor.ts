/**
 * Types + pure helpers ของ Photo Editor (crop → resize → encode)
 * บริสุทธิ์: ไม่มี React ไม่มี browser API (Canvas/Blob อยู่ที่ infrastructure)
 */

export type OutputFormat = "jpeg" | "png" | "webp";

/** วิธีคำนวณขนาดผลลัพธ์จากขนาด crop window (หน่วย px ของภาพต้นฉบับ) */
export type ResizeMode = "percent" | "exact" | "maxdim";

export type Rotation = 0 | 90 | 180 | 270;

export interface AspectPreset {
  id: string;
  label: string;
  /** null = อิสระ (กรอบตามสัดส่วนภาพต้นฉบับ) */
  value: number | null;
}

/** กรอบ crop ที่ครอบไว้ — หน่วยเป็น px ของภาพต้นฉบับ (ก่อนหมุน) */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ResizeSettings {
  mode: ResizeMode;
  percent: number;
  width: number;
  height: number;
  /** true = บังคับ width/height ให้ตามสัดส่วนกรอบ crop */
  lockRatio: boolean;
  maxDim: number;
}

export interface FormatSettings {
  /**
   * "auto" = ใช้ format ของไฟล์ต้นฉบับ (PNG → PNG, WebP → WebP, อื่นๆ → JPEG)
   * ค่า default เป็น "auto" เพราะการ export คนละ format โดยไม่ได้ขอ
   * มักทำให้ alpha หาย (PNG → JPEG) โดยไม่รู้ตัว
   */
  format: OutputFormat | "auto";
  /** 1-100 (PNG lossless ไม่ใช้ค่านี้) */
  quality: number;
}

export interface OutputSize {
  outW: number;
  outH: number;
}

export const ASPECT_PRESETS: readonly AspectPreset[] = [
  { id: "free", label: "อิสระ", value: null },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "3:4", label: "3:4", value: 3 / 4 },
  { id: "3:2", label: "3:2", value: 3 / 2 },
  { id: "2:3", label: "2:3", value: 2 / 3 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
];

/** preset ขนาดที่ game dev ใช้บ่อย (ขนาด px เต็ม = ขนาดจริงหลัง scale) */
export const SIZE_PRESETS: readonly { label: string; w: number; h: number }[] =
  [
    { label: "512×512", w: 512, h: 512 },
    { label: "1024×1024", w: 1024, h: 1024 },
    { label: "256×256", w: 256, h: 256 },
    { label: "128×128", w: 128, h: 128 },
    { label: "1920×1080", w: 1920, h: 1080 },
    { label: "800×600", w: 800, h: 600 },
  ];

export const MIME_BY_FORMAT: Record<OutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const EXTENSION_BY_FORMAT: Record<OutputFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

/** format ที่รองรับ alpha จริง — JPEG ทับ alpha ทิ้งเป็นขาว */
export const SUPPORTS_ALPHA: Record<OutputFormat, boolean> = {
  jpeg: false,
  png: true,
  webp: true,
};

export const DEFAULT_RESIZE: ResizeSettings = {
  mode: "percent",
  percent: 100,
  width: 1024,
  height: 1024,
  lockRatio: true,
  maxDim: 1024,
};

export const DEFAULT_FORMAT: FormatSettings = {
  format: "auto",
  quality: 90,
};

/** format ที่ไฟล์ต้นฉบับอาจเป็น — ใช้ตัดสินค่า default ตอนเปิดไฟล์ */
export function formatFromMime(mime: string): OutputFormat {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpeg"; // jpeg, gif, bmp, avif, ...
}

/** มิติของภาพหลังหมุน 90/270 สลับด้าน */
export function rotatedSize(
  w: number,
  h: number,
  rotation: Rotation,
): OutputSize {
  const swap = rotation === 90 || rotation === 270;
  return swap ? { outW: h, outH: w } : { outW: w, outH: h };
}

/**
 * ขนาดผลลัพธ์จากขนาด crop (หน่วย px ของภาพต้นฉบับ)
 * - percent : ย่อ/ขยายเทียบขนาดเดิม (100 = ไม่เปลี่ยน)
 * - exact   : ได้ขนาดเท่าที่กรอกเป๊ะ — ภาพถูกยืด/บีดจนพอดีกล่อง
 *              (ถ้า lockRatio เปิด ผู้ใช้เป็นคนคุมสัดส่วนเอง — เราเตือนเรื่องบิดให้)
 * - maxdim  : ย่อให้ด้านยาวสุดไม่เกิน maxDim (ไม่ขยายภาพเล็กขึ้น)
 *
 * ⚠️ exact = distort เสมอถ้าไม่ล็อกสัดส่วนให้ตรงกับกรอบ crop
 * ตั้งใจมีตัวเลือกนี้ เพราะเกมหลายเกมต้องการขนาดพิกเซลตายตัว (เช่น 32×32, 256×256)
 */
export function calcOutputSize(
  cropW: number,
  cropH: number,
  settings: ResizeSettings,
): OutputSize {
  if (cropW <= 0 || cropH <= 0) return { outW: 0, outH: 0 };

  if (settings.mode === "exact") {
    return {
      outW: Math.max(1, Math.round(settings.width)),
      outH: Math.max(1, Math.round(settings.height)),
    };
  }

  let scale: number;
  if (settings.mode === "percent") {
    scale = settings.percent / 100;
  } else {
    scale = Math.min(1, settings.maxDim / Math.max(cropW, cropH));
  }

  if (!(scale > 0)) return { outW: 1, outH: 1 };
  return {
    outW: Math.max(1, Math.round(cropW * scale)),
    outH: Math.max(1, Math.round(cropH * scale)),
  };
}

/** ปรับ width ให้ตาม height ตามสัดส่วน crop (ใช้ตอน lockRatio เปิด) */
export function fitWidthToRatio(
  height: number,
  cropW: number,
  cropH: number,
): number {
  if (cropW <= 0 || cropH <= 0 || height <= 0) return 1;
  return Math.max(1, Math.round((height * cropW) / cropH));
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function baseName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, "").trim();
  return base.length > 0 ? base : "image";
}
