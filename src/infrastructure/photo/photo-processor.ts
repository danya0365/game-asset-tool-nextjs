/**
 * Photo Editor — ตัดกรอบ (crop) + หมุน (rotate) + ย่อขนาด (resize) + เข้ารหัสใหม่
 * ทั้งหมดทำบน Canvas ใน browser — ไฟล์ไม่ออกจากเครื่อง
 *
 * หนัก: decode → drawImage → toBlob (ครั้งเดียวต่อการ export)
 * ภาพใหญ่มาก (>8k px) อาจกินเวลาสักพัก — hook เป็นคนตัดสินใบว่าจะ defer หรือไม่
 */

import type {
  CropRect,
  FormatSettings,
  OutputFormat,
  ResizeSettings,
  Rotation,
} from "@/src/domain/types/photoEditor";
import {
  EXTENSION_BY_FORMAT,
  MIME_BY_FORMAT,
  SUPPORTS_ALPHA,
  baseName,
  calcOutputSize,
  rotatedSize,
} from "@/src/domain/types/photoEditor";

export interface LoadedImage {
  image: HTMLImageElement;
  width: number;
  height: number;
}

export interface ProcessOptions {
  crop: CropRect;
  rotation: Rotation;
  resize: ResizeSettings;
  format: FormatSettings;
  /** format ของไฟล์ต้นฉบับ — ใช้เมื่อ opts.format.format === "auto" */
  sourceFormat: OutputFormat;
}

/** โหลด File/Blob เป็น HTMLImageElement (object URL ต้อง revoke ที่ผู้เรียก) */
export function loadImageFromBlob(blob: Blob): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        image: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("ไม่สามารถถอดรหัสไฟล์รูปภาพนี้ได้"));
    };
    img.src = url;
  });
}

/** กรอบ crop ต้องอยู่ในขอบเขตภาพเสมอ — คลิปก่อนวาดเสมอ */
export function clampCrop(
  crop: CropRect,
  imgW: number,
  imgH: number,
): CropRect {
  const w = Math.min(Math.max(1, crop.w), imgW);
  const h = Math.min(Math.max(1, crop.h), imgH);
  return {
    w,
    h,
    x: Math.min(Math.max(0, crop.x), imgW - w),
    y: Math.min(Math.max(0, crop.y), imgH - h),
  };
}

/**
 * วาด crop → rotate → resize ลง canvas
 *
 * ⚠️ สองอย่างที่พลาดแล้วภาพเพี้ยนทันที:
 * 1) ขนาดผลลัพธ์ต้องคำนวณจาก **crop ที่หมุนแล้ว** (90/270 สลับด้าน) ไม่ใช่ก่อนหมุน
 * 2) ปลายทาง `drawImage` ต้องเป็นขนาด canvas — ถ้าใส่ขนาด crop ภาพจะถูกวาด
 *    1:1 ตรงมุมซ้ายบน ที่เหลือ canvas ว่างโล่ง
 *
 * `drawImage` ไม่หมุนเอง — เราใช้ `ctx.rotate` แล้วสลับแกนปลายทางตาม
 */
export function renderCropToCanvas(
  source: HTMLImageElement,
  opts: Pick<ProcessOptions, "crop" | "rotation" | "resize">,
  /** true = ล้างพื้นขาวก่อนวาด (สำหรับ format ที่ไม่มี alpha) */
  fillBackground = false,
): HTMLCanvasElement {
  const crop = clampCrop(opts.crop, source.naturalWidth, source.naturalHeight);

  // หลังหมุน 90/270 กรอบสลับด้าน → คำนวณผลลัพธ์จากขนาดนี้
  const rotated = rotatedSize(crop.w, crop.h, opts.rotation);
  const { outW, outH } = calcOutputSize(
    rotated.outW,
    rotated.outH,
    opts.resize,
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, outW);
  canvas.height = Math.max(1, outH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ไม่สามารถสร้าง canvas context ได้");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // พื้นขาวต้องล้างก่อนวาดภาพ (ไม่งั้นพื้นจะทับภาพที่วาดแล้ว)
  // ทำก่อน rotate เพื่อให้ครอบเต็ม canvas โดยไม่ต้องคิดแกน
  if (fillBackground) fillWhite(ctx, canvas.width, canvas.height);

  // หลัง rotate แกน local หมุนไปแล้ว → ปลายทางต้องสลับแกนให้เต็ม canvas
  const swapAxes = opts.rotation === 90 || opts.rotation === 270;
  const destW = swapAxes ? canvas.height : canvas.width;
  const destH = swapAxes ? canvas.width : canvas.height;

  if (opts.rotation === 90) {
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  } else if (opts.rotation === 180) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
  } else if (opts.rotation === 270) {
    ctx.translate(0, canvas.height);
    ctx.rotate(-Math.PI / 2);
  }

  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, destW, destH);
  return canvas;
}

/**
 * JPEG ไม่มี alpha — ถ้าไม่ล้างพื้นหลัง พิกเซลโปร่งจะกลายเป็นสีดำ
 * (canvas ใหม่เริ่มต้นโปร่งใส = rgba(0,0,0,0))
 */
/**
 * ล้างพื้นหลัง canvas เป็นสีขาว **ก่อน** วาดภาพ
 *
 * ⚠️ ต้องเรียกก่อน drawImage เสมอ — ถ้าเรียกหลัง พื้นขาวจะทับภาพที่วาดแล้ว
 *    ผลลัพธ์คือไฟล์ขาวเปล่า ไม่ใช่ภาพที่ครอป (เจอตอน dev)
 *
 * ใช้เฉพาะกับ format ที่ไม่มี alpha (JPEG) — ภาพโปร่งใสจะกลายเป็นสีขาว
 * ตามที่ผู้ใช้คาด (JPEG ไม่มีคอนเซปต์ "โปร่งใส" อยู่แล้ว)
 */
function fillWhite(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("การเข้ารหัสภาพล้มเหลว"))),
      mime,
      quality,
    );
  });
}

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
  format: OutputFormat;
  fileName: string;
}

/**
 * ครบวงจร: crop → rotate → resize → encode
 *
 * PNG ใช้ `canvas.toBlob` ตรงๆ (lossless) — ถ้าอยากได้ไฟล์เล็กแบบ palette
 * ให้ไปใช้ `/reduce-photo-size` ที่มี upng-js อยู่แล้ว ที่นี่โฟกัสความเร็ว/คุณภาพ
 */
export async function processPhoto(
  source: HTMLImageElement,
  originalName: string,
  opts: ProcessOptions,
): Promise<ProcessResult> {
  // "auto" = คง format เดิมของไฟล์ (PNG → PNG, WebP → WebP, อื่นๆ → JPEG)
  const format =
    opts.format.format === "auto" ? opts.sourceFormat : opts.format.format;
  const canvas = renderCropToCanvas(source, opts, !SUPPORTS_ALPHA[format]);

  const blob = await canvasToBlob(
    canvas,
    MIME_BY_FORMAT[format],
    Math.min(1, Math.max(0.01, opts.format.quality / 100)),
  );

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    format,
    fileName: `${baseName(originalName)}.${EXTENSION_BY_FORMAT[format]}`,
  };
}

/**
 * กดดาวน์โหลด Blob เป็นไฟล์
 *
 * ⚠️ ต้อง append `<a>` เข้า DOM ก่อนคลิก และ revoke ทีหลัง — ถ้า revoke
 * ทันทีหลัง `click()` browser ยังไม่ได้เริ่มอ่าน blob ก็จะได้ไฟล์ 0 byte
 * (ไม่งั้นบาง browser ไม่ยอมดาวน์โหลดจาก anchor ที่ไม่ได้อยู่ใน document)
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // ให้ browser มีเวลาเริ่มอ่าน blob ก่อนปล่อย URL
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
