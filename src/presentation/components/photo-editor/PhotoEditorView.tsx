"use client";

import { cn } from "@/src/presentation/lib/cn";
import { ASPECT_PRESETS, formatBytes } from "@/src/domain/types/photoEditor";
import { usePhotoEditor } from "@/src/presentation/hooks/usePhotoEditor";
import { useRef, useState } from "react";
import { MainLayout } from "../templates/MainLayout";
import { CropStage, type CropStageHandle } from "./CropStage";
import { FormatPanel } from "./FormatPanel";
import { ResizePanel } from "./ResizePanel";

export function PhotoEditorView() {
  const editor = usePhotoEditor();
  const stageRef = useRef<CropStageHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    source,
    crop,
    status,
    isProcessing,
    result,
    previewSize,
    error,
    setError,
    openFileList,
  } = editor;

  const busy = isProcessing;

  const handleFiles = (files: FileList | File[]) => {
    void openFileList(files);
  };

  return (
    <MainLayout title="Photo Editor - Game Asset Tool">
      <div className="flex flex-col h-full p-2 gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {!source ? (
          /* ===== ยังไม่มีภาพ = drop zone ===== */
          <div
            className={cn(
              "ie-panel-inset flex-1 flex items-center justify-center cursor-pointer transition-colors border-2 border-dashed",
              isDragging ? "bg-brand-100 border-brand-400" : "border-border",
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.length)
                handleFiles(e.dataTransfer.files);
            }}
          >
            <div className="text-center px-4">
              <div className="text-5xl mb-3">✂️</div>
              <div className="text-sm text-foreground">
                ลากรูปมาวางที่นี่ หรือ
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
              <div className="text-xs text-muted mt-2">
                ครอป · หมุน · ย่อขนาด — ประมวลผลในเครื่อง ไฟล์ไม่ออกจากเครื่อง
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ===== Toolbar ===== */}
            <div className="ie-toolbar flex items-center gap-1 flex-wrap shrink-0">
              <button
                className="ie-button ie-button-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                📁 เปิดรูปอื่น
              </button>
              <button
                className="ie-button ie-button-sm"
                onClick={() => stageRef.current?.reset()}
                disabled={busy}
              >
                ↺ รีเซ็ตมุมมอง
              </button>
              <div className="ie-toolbar-divider" />
              <button
                className="ie-button ie-button-sm"
                onClick={() => editor.rotateBy(-90)}
                disabled={busy}
                title="หมุนซ้าย 90°"
              >
                ↺ ซ้าย
              </button>
              <button
                className="ie-button ie-button-sm"
                onClick={() => editor.rotateBy(90)}
                disabled={busy}
                title="หมุนขวา 90°"
              >
                ↻ ขวา
              </button>
              {editor.rotation !== 0 && (
                <span className="text-xs text-muted">
                  หมุนแล้ว {editor.rotation}°
                </span>
              )}
              <div className="ie-toolbar-divider" />
              <button
                className="ie-button ie-button-sm"
                onClick={editor.resetAll}
                disabled={busy}
              >
                ⚙️ ค่าเริ่มต้น
              </button>

              <div className="flex-1" />

              <button
                className="ie-button bg-success text-on-brand font-bold px-4"
                onClick={() => void editor.process()}
                disabled={busy}
              >
                {busy ? "⏳ กำลังประมวลผล…" : "⚙️ ประมวลผล"}
              </button>
            </div>

            {/* ===== พื้นที่ทำงาน: crop stage | panels ===== */}
            <div className="flex-1 min-h-0 flex gap-2">
              <div className="ie-groupbox flex-1 min-w-0 flex flex-col min-h-0">
                <span className="ie-groupbox-title">✂️ ครอปภาพ</span>
                <div className="flex-1 min-h-0 flex p-1">
                  <CropStage
                    ref={stageRef}
                    src={source.previewUrl}
                    aspect={editor.aspect}
                    onCropChange={editor.setCrop}
                  />
                </div>

                {/* สถานะไฟล์ต้นฉบับ */}
                <div className="text-[10px] text-muted px-1 pt-1 border-t border-border shrink-0">
                  {source.fileName} · {source.width}×{source.height}px ·{" "}
                  {formatBytes(source.fileSize)}
                  {crop.w > 0 &&
                    ` | ครอป ${crop.w}×${crop.h}px @ (${crop.x}, ${crop.y})`}
                </div>
              </div>

              {/* ===== แผงควบคุม ===== */}
              <div className="w-72 shrink-0 overflow-auto ie-scrollbar">
                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">🔲 สัดส่วนกรอบ</span>
                  <div className="ie-toolbar -mt-2 flex gap-1 flex-wrap">
                    {ASPECT_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        className={cn(
                          "ie-button ie-button-sm",
                          editor.aspectId === p.id && "ie-button-active",
                        )}
                        onClick={() => editor.setAspectId(p.id)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <ResizePanel
                  settings={editor.resize}
                  onChange={editor.setResize}
                  cropSize={{ w: crop.w, h: crop.h }}
                  outputSize={previewSize}
                />

                <FormatPanel
                  settings={editor.format}
                  onChange={editor.setFormat}
                  sourceFormat={source.sourceFormat}
                  effectiveFormat={editor.effectiveFormat}
                />
              </div>
            </div>
          </>
        )}

        {/* ===== ผลลัพธ์ =====
            ต้องเป็น modal ที่ลอยทับ ไม่ใช่แถวใน layout
            ถ้าใส่ใน flex column เดียวกับ stage มันจะดัน stage ตอนโผล่ →
            กรอบกระพริบและลากรูปไม่ติด (จุดที่เจอตอน dev) */}
        {status === "done" && result && source && (
          <div className="ie-dialog" onClick={() => editor.dismissResult()}>
            <div
              className="ie-dialog-content min-w-[420px] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ie-dialog-header">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✅</span>
                  <span className="ie-dialog-title">ประมวลผลสำเร็จ</span>
                </div>
                <button
                  onClick={() => editor.dismissResult()}
                  className="ie-titlebar-btn ie-titlebar-close"
                >
                  <span>×</span>
                </button>
              </div>

              <div className="ie-dialog-body">
                <div className="flex items-start gap-3">
                  <div
                    className="w-20 h-20 shrink-0 bg-muted-surface border border-border"
                    // eslint-disable-next-line react/forbid-dom-props -- ค่า runtime (URL ของ blob ที่เพิ่งสร้าง) ไม่ใช่ token
                    style={{
                      backgroundImage: `url(${result.url})`,
                      backgroundSize: "contain",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                  <div className="flex-1 min-w-0 text-xs text-foreground">
                    <div className="truncate font-medium mb-1">
                      {result.fileName}
                    </div>
                    <div className="text-muted mb-2">
                      {result.width}×{result.height}px ·{" "}
                      {formatBytes(result.size)}
                      {result.size < source.fileSize ? (
                        <span className="text-success">
                          {" "}
                          (
                          {Math.round(
                            ((source.fileSize - result.size) /
                              source.fileSize) *
                              100,
                          )}
                          % เล็กลง)
                        </span>
                      ) : (
                        <span className="text-muted"> (ใหญ่กว่าต้นฉบับ)</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted">
                      เนื้อหาในกรอบถูก export ตามที่เห็น — ไม่มีอะไรหาย
                    </div>
                  </div>
                </div>
              </div>

              <div className="ie-dialog-footer">
                <button
                  className="ie-button"
                  onClick={() => editor.dismissResult()}
                >
                  ปิด
                </button>
                <button
                  className="ie-button bg-brand-500 text-on-brand font-bold px-4"
                  onClick={editor.download}
                >
                  💾 ดาวน์โหลด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Status bar ===== */}
        <div className="ie-statusbar shrink-0">
          <span className="text-xs">
            {source
              ? `พร้อมประมวลผล${previewSize ? ` — ผลลัพธ์ ${previewSize.outW}×${previewSize.outH}px` : ""}`
              : "ยังไม่มีรูปภาพ — ลากไฟล์ภาพมาวาง"}
          </span>
        </div>

        {/* ===== Error dialog ===== */}
        {error && (
          <div className="ie-dialog" onClick={() => setError(null)}>
            <div
              className="ie-dialog-content min-w-[300px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ie-dialog-header">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <span className="ie-dialog-title">แจ้งเตือน</span>
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
                  <div className="text-3xl">⚠️</div>
                  <div className="text-xs text-foreground">{error}</div>
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
      </div>
    </MainLayout>
  );
}
