"use client";

import { cn } from "@/src/presentation/lib/cn";
import type {
  ResizeMode,
  ResizeSettings,
  OutputSize,
} from "@/src/domain/types/photoEditor";
import { SIZE_PRESETS, fitWidthToRatio } from "@/src/domain/types/photoEditor";

const MODES: { value: ResizeMode; label: string; hint: string }[] = [
  { value: "percent", label: "เปอร์เซ็นต์", hint: "ย่อ/ขยายเทียบขนาด crop" },
  { value: "exact", label: "กำหนดขนาด", hint: "ยึด width × height ที่กรอก" },
  {
    value: "maxdim",
    label: "ด้านยาวสูงสุด",
    hint: "ย่อให้ด้านยาวไม่เกินค่า ไม่ขยายภาพเล็ก",
  },
];

export interface ResizePanelProps {
  settings: ResizeSettings;
  onChange: (settings: ResizeSettings) => void;
  /** ขนาดกรอบ crop (ก่อนหมุน) — ใช้คำนวณเมื่อ lockRatio เปิด */
  cropSize: { w: number; h: number };
  outputSize: OutputSize | null;
}

export function ResizePanel({
  settings,
  onChange,
  cropSize,
  outputSize,
}: ResizePanelProps) {
  const set = (patch: Partial<ResizeSettings>) =>
    onChange({ ...settings, ...patch });

  const setWidth = (raw: number) => {
    const w = Math.max(1, Math.round(raw) || 1);
    set(
      settings.lockRatio
        ? { width: w, height: fitWidthToRatio(w, cropSize.h, cropSize.w) }
        : { width: w },
    );
  };

  const setHeight = (raw: number) => {
    const h = Math.max(1, Math.round(raw) || 1);
    set(
      settings.lockRatio
        ? { height: h, width: fitWidthToRatio(h, cropSize.w, cropSize.h) }
        : { height: h },
    );
  };

  // ภาพจะถูกยืด/บีดเมื่อปลดล็อกและอัตราส่วนผลลัพธ์ไม่ตรงกรอบ crop
  const cropRatio = cropSize.w > 0 ? cropSize.w / cropSize.h : 0;
  const outputRatio =
    settings.width > 0 && settings.height > 0
      ? settings.width / settings.height
      : 0;
  const distorted =
    !settings.lockRatio &&
    cropRatio > 0 &&
    outputRatio > 0 &&
    Math.abs(cropRatio - outputRatio) / cropRatio > 0.01;

  return (
    <div className="ie-groupbox">
      <span className="ie-groupbox-title">📐 ขนาดภาพผลลัพธ์</span>
      <div className="-mt-2 space-y-2">
        {MODES.map((m) => (
          <label
            key={m.value}
            className="flex items-start gap-2 text-xs text-foreground cursor-pointer"
          >
            <input
              type="radio"
              name="resizeMode"
              className="mt-0.5"
              checked={settings.mode === m.value}
              onChange={() => set({ mode: m.value })}
            />
            <span>
              {m.label}
              <span className="block text-[10px] text-muted">{m.hint}</span>
            </span>
          </label>
        ))}

        {settings.mode === "percent" && (
          <div>
            <div className="text-xs text-foreground">
              เปอร์เซ็นต์:{" "}
              <span className="font-medium">{settings.percent}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={200}
              value={settings.percent}
              onChange={(e) => set({ percent: Number(e.target.value) })}
              className="w-full"
            />
            <div className="ie-toolbar flex gap-1 mt-1">
              {[25, 50, 100, 200].map((p) => (
                <button
                  key={p}
                  className={cn(
                    "ie-button ie-button-sm",
                    settings.percent === p && "ie-button-active",
                  )}
                  onClick={() => set({ percent: p })}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        )}

        {settings.mode === "maxdim" && (
          <label className="flex items-center gap-2 text-xs text-foreground">
            ด้านยาวสูงสุด
            <input
              type="number"
              min={16}
              value={settings.maxDim}
              onChange={(e) =>
                set({
                  maxDim: Math.max(
                    16,
                    Math.round(Number(e.target.value) || 16),
                  ),
                })
              }
              className="ie-input w-24"
            />
            px
          </label>
        )}

        {settings.mode === "exact" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-foreground">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  className="ie-checkbox"
                  checked={settings.lockRatio}
                  onChange={(e) => set({ lockRatio: e.target.checked })}
                />
                ล็อกสัดส่วน
              </label>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground">
              กว้าง
              <input
                type="number"
                min={1}
                value={settings.width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="ie-input w-24"
              />
              × สูง
              <input
                type="number"
                min={1}
                value={settings.height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="ie-input w-24"
              />
              px
            </div>
            <div className="ie-toolbar flex gap-1 flex-wrap">
              {SIZE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className={cn(
                    "ie-button ie-button-sm",
                    settings.width === p.w &&
                      settings.height === p.h &&
                      "ie-button-active",
                  )}
                  onClick={() =>
                    set({ width: p.w, height: p.h, lockRatio: false })
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted">
              {settings.lockRatio
                ? "ล็อกสัดส่วนไว้ — กรอกอีกด้านแล้วอีกด้านจะตามกรอบ crop อัตโนมัติ"
                : "ปลดล็อก — ภาพจะถูกยืด/บีดให้พอดีกล่อง ไม่ตรงสัดส่วนเดิม"}
            </p>
            {distorted && (
              <p className="text-[10px] text-warning mt-1">
                ⚠️ อัตราส่วนผลลัพธ์ไม่ตรงกรอบ crop — ภาพจะบิด (ถ้าตั้งใจทำ pixel
                art ให้เปิดล็อก)
              </p>
            )}
          </div>
        )}

        {outputSize && (
          <div className="text-xs text-muted border-t border-border pt-2">
            ผลลัพธ์:{" "}
            <span className="text-foreground font-medium">
              {outputSize.outW}×{outputSize.outH}
            </span>{" "}
            px
          </div>
        )}
      </div>
    </div>
  );
}
