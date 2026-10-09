"use client";

import type {
  CropRect,
  FormatSettings,
  OutputFormat,
  ResizeSettings,
  Rotation,
} from "@/src/domain/types/photoEditor";
import {
  DEFAULT_FORMAT,
  DEFAULT_RESIZE,
  ASPECT_PRESETS,
  calcOutputSize,
  formatFromMime,
  rotatedSize,
} from "@/src/domain/types/photoEditor";
import {
  downloadBlob,
  loadImageFromBlob,
  processPhoto,
} from "@/src/infrastructure/photo/photo-processor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface PhotoEditorSource {
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  /** object URL สำหรับ <img src> — revoke เมื่อเปลี่ยนภาพ/ปิด */
  previewUrl: string;
  /** HTMLImageElement ใน memory สำหรับวาด canvas (เก็บใน state เพราะเป็นข้อมูลขนาดใหญ่แต่อ้างอิงเดียว) */
  image: HTMLImageElement;
  sourceFormat: OutputFormat;
}

export interface PhotoEditorResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  format: OutputFormat;
  fileName: string;
  size: number;
  /** ค่าตั้งที่ผลลัพธ์นี้ถูกสร้างมา — เทียบกับ settings ปัจจุบันเพื่อดูว่าล้าสมัยไหม */
  key: string;
}

export type PhotoEditorStatus = "empty" | "ready" | "done" | "error";

const MAX_FILE_BYTES = 64 * 1024 * 1024;

export function usePhotoEditor() {
  const [source, setSource] = useState<PhotoEditorSource | null>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [rotation, setRotation] = useState<Rotation>(0);
  const [aspectId, setAspectId] = useState<string>("free");
  const [resize, setResize] = useState<ResizeSettings>(DEFAULT_RESIZE);
  const [format, setFormat] = useState<FormatSettings>(DEFAULT_FORMAT);
  const [result, setResult] = useState<PhotoEditorResult | null>(null);
  /** key ของผลลัพธ์ที่ผู้ใช้กดปิดไปแล้ว — ป้องกันไม่ให้ dialog โผล่ซ้ำ */
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // รอบประมวลผลที่ยังวิ่งอยู่ — รอบใหม่ต้อง invalidate รอบเก่า
  const runRef = useRef(0);

  /**
   * URL ที่ยังต้อง release — เก็บใน ref (ไม่ใช่ state) เพราะเป็น side-effect
   * ไม่ใช่ค่าที่ UI อ่าน ทุก URL ที่สร้างต้องผ่าน `track` และถูก release
   * ตอนถูกแทนที่/ปิดหน้า — ถ้าไม่ revoke = blob ค้างใน memory ทั้ง session
   */
  const previewUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const releaseResult = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  // ออกจากหน้า → ปล่อย URL ที่ค้างทั้งหมด
  // (ไม่ต้อง bump runRef — guard นั้นมีไว้กันรอบที่ถูกแทนที่ ไม่ใช่กัน unmount)
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const aspect = useMemo(
    () => ASPECT_PRESETS.find((p) => p.id === aspectId)?.value ?? null,
    [aspectId],
  );

  /** "auto" resolve เป็น format จริง — ใช้แสดงใน UI และส่งเข้า encoder */
  const effectiveFormat: OutputFormat =
    format.format === "auto" ? (source?.sourceFormat ?? "jpeg") : format.format;

  /** ลายนิ้วมือของการตั้งค่าทั้งชุด — ผลลัพธ์ที่สร้างคนละ key = ล้าสมัย */
  const settingsKey = useMemo(
    () =>
      JSON.stringify({
        x: crop.x,
        y: crop.y,
        w: crop.w,
        h: crop.h,
        rotation,
        resize,
        format,
      }),
    [crop, rotation, resize, format],
  );

  // ภาพใหม่ → ผลลัพธ์เก่าล้าสมัย
  useEffect(() => {
    releaseResult();
    setResult(null);
    setDismissedKey(null);
    setError(null);
  }, [source, releaseResult]);

  // status เป็น derived ไม่ใช่ state — ไม่มี effect ไหนต้องไปแก้มัน
  // (ถ้า derive ผ่าน effect + setState จะเกิดลูป: done → ready → ...)
  const isStale = result !== null && result.key !== settingsKey;
  const isDismissed = result !== null && result.key === dismissedKey;
  const status: PhotoEditorStatus = !source
    ? "empty"
    : error
      ? "error"
      : result && !isStale && !isDismissed
        ? "done"
        : "ready";

  const openFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("ไฟล์นี้ไม่ใช่รูปภาพ");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(
          `ไฟล์ใหญ่เกิน 64 MB (ไฟล์นี้ ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        );
        return;
      }

      setIsProcessing(true);
      try {
        const { image, width, height } = await loadImageFromBlob(file);
        // ภาพเก่าปล่อยก่อนแทนที่ — preview URL ค้างใน memory ไม่ได้
        releasePreview();
        const previewUrl = URL.createObjectURL(file);
        previewUrlRef.current = previewUrl;
        setSource({
          fileName: file.name,
          fileSize: file.size,
          width,
          height,
          previewUrl,
          image,
          sourceFormat: formatFromMime(file.type),
        });
        setRotation(0);
        setCrop({ x: 0, y: 0, w: width, h: height });
        // format default = ตามไฟล์ต้นฉบับ → เปิด PNG มาแล้วได้ PNG ออก
        // (คง alpha ไว้โดยไม่ต้องผู้ใช้เลือกเอง)
        setFormat({ ...DEFAULT_FORMAT, format: formatFromMime(file.type) });
      } catch (err) {
        setError(err instanceof Error ? err.message : "เปิดไฟล์ไม่สำเร็จ");
      } finally {
        setIsProcessing(false);
      }
    },
    [releasePreview],
  );

  const openFileList = useCallback(
    async (files: FileList | File[]) => {
      const images = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (images.length === 0) {
        setError("ไม่พบไฟล์รูปภาพในที่เลือก");
        return;
      }
      // tool นี้ทำทีละไฟล์ (crop ต้องโต้ตอบกับผู้ใช้) → ใช้ไฟล์แรก
      await openFile(images[0]);
      if (images.length > 1) {
        setError(
          `เปิดได้ทีละ 1 ครั้ง — เปิด "${images[0].name}" (ข้ามอีก ${images.length - 1} ไฟล์)`,
        );
      }
    },
    [openFile],
  );

  const close = useCallback(() => {
    runRef.current++;
    releasePreview();
    previewUrlRef.current = null;
    setSource(null);
    setCrop({ x: 0, y: 0, w: 0, h: 0 });
    setRotation(0);
    setError(null);
  }, [releasePreview]);

  /** ขนาดผลลัพธ์จากกรอบ crop ปัจจุบัน (หมุนแล้ว) — แสดง live ตอนเลื่อนค่า */
  const previewSize = useMemo(() => {
    if (!source || crop.w <= 0 || crop.h <= 0) return null;
    const rotated = rotatedSize(crop.w, crop.h, rotation);
    return calcOutputSize(rotated.outW, rotated.outH, resize);
  }, [source, crop.w, crop.h, rotation, resize]);

  const process = useCallback(async () => {
    if (!source) {
      setError("ยังไม่มีภาพให้ประมวลผล");
      return;
    }
    const gen = ++runRef.current;
    const key = settingsKey;
    setIsProcessing(true);
    setError(null);
    try {
      const out = await processPhoto(source.image, source.fileName, {
        crop,
        rotation,
        resize,
        format,
        sourceFormat: source.sourceFormat,
      });
      // รอบก่อนหน้ายังวิ่งอยู่ → ผลของมันล้าสมัย ทิ้ง (รอบชนะ revoke เอง)
      if (gen !== runRef.current) return;
      releaseResult();
      const url = URL.createObjectURL(out.blob);
      resultUrlRef.current = url;
      // ผลลัพธ์ใหม่ = ของใหม่ทั้งหมด → dialog ต้องโผล่แม้ผู้ใช้เคยกดปิดของเดิม
      setDismissedKey(null);
      setResult({
        blob: out.blob,
        url,
        width: out.width,
        height: out.height,
        format: out.format,
        fileName: out.fileName,
        size: out.blob.size,
        key,
      });
    } catch (err) {
      if (gen !== runRef.current) return;
      setError(err instanceof Error ? err.message : "ประมวลผลไม่สำเร็จ");
    } finally {
      if (gen === runRef.current) setIsProcessing(false);
    }
  }, [source, crop, rotation, resize, format, settingsKey, releaseResult]);

  const download = useCallback(() => {
    if (!result || result.key !== settingsKey) return;
    downloadBlob(result.blob, result.fileName);
  }, [result, settingsKey]);

  /**
   * ปิด dialog ผลลัพธ์ (ยังไม่ลบไฟล์ — ผู้ใช้อาจกดประมวลผลซ้ำ)
   * ทำเป็น key-based เพื่อให้ผลลัพธ์ใหม่โผล่ dialog ใหม่เสมอ
   */
  const dismissResult = useCallback(() => {
    if (!result) return;
    setDismissedKey(result.key);
  }, [result]);

  /** ค่าตั้งกลับค่าเริ่มต้น (ภาพที่เปิดไว้ยังอยู่)
   *  format คงเป็นของไฟล์ต้นฉบับ ไม่ใช่ "auto" — ถ้าใช้ auto ตอนนี้
   *  ผู้ใช้ที่เปิด PNG แล้วสลับไป JPEG จะกลับมาได้ PNG (ซึ่งถูกต้อง)
   *  แต่ผู้ใช้ที่ยังไม่เคยแตะปุ่ม format จะถูกรีเซ็ตโดยไม่จำเป็น
   */
  const resetAll = useCallback(() => {
    setResize(DEFAULT_RESIZE);
    setFormat({
      ...DEFAULT_FORMAT,
      format: source?.sourceFormat ?? DEFAULT_FORMAT.format,
    });
    setAspectId("free");
    setRotation(0);
  }, [source?.sourceFormat]);

  const rotateBy = useCallback((delta: 90 | -90) => {
    setRotation((prev) => ((prev + delta + 360) % 360) as Rotation);
  }, []);

  return {
    source,
    crop,
    rotation,
    aspectId,
    aspect,
    resize,
    format,
    effectiveFormat,
    status,
    isProcessing,
    isStale,
    result,
    previewSize,
    error,
    setCrop,
    setAspectId,
    setResize,
    setFormat,
    rotateBy,
    openFile,
    openFileList,
    close,
    process,
    download,
    dismissResult,
    resetAll,
    setError,
  };
}
