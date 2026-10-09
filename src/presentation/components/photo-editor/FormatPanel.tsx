"use client";

import { cn } from "@/src/presentation/lib/cn";
import type {
  FormatSettings,
  OutputFormat,
} from "@/src/domain/types/photoEditor";
import { SUPPORTS_ALPHA } from "@/src/domain/types/photoEditor";

const FORMATS: { value: OutputFormat; label: string; ext: string }[] = [
  { value: "jpeg", label: "JPEG", ext: ".jpg" },
  { value: "png", label: "PNG", ext: ".png" },
  { value: "webp", label: "WebP", ext: ".webp" },
];

export interface FormatPanelProps {
  settings: FormatSettings;
  onChange: (settings: FormatSettings) => void;
}

export function FormatPanel({ settings, onChange }: FormatPanelProps) {
  return (
    <div className="ie-groupbox">
      <span className="ie-groupbox-title">🖼️ รูปแบบไฟล์</span>
      <div className="-mt-2 space-y-2">
        <div className="ie-toolbar flex gap-1">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              className={cn(
                "ie-button ie-button-sm flex-1",
                settings.format === f.value && "ie-button-active",
              )}
              onClick={() => onChange({ ...settings, format: f.value })}
              title={`${f.label} (${f.ext})`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {settings.format !== "png" && (
          <label className="block text-xs text-foreground">
            คุณภาพ: <span className="font-medium">{settings.quality}</span>
            <input
              type="range"
              min={1}
              max={100}
              value={settings.quality}
              onChange={(e) =>
                onChange({ ...settings, quality: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </label>
        )}

        {!SUPPORTS_ALPHA[settings.format] && (
          <p className="text-[10px] text-warning">
            ⚠️ {settings.format.toUpperCase()} ไม่รองรับพื้นหลังโปร่งใส —
            ส่วนที่โปร่งจะกลายเป็นสีขาว
          </p>
        )}
        {settings.format === "png" && (
          <p className="text-[10px] text-muted">
            PNG บันทึกแบบ lossless ไฟล์ใหญ่ — ถ้าต้องการย่อขนาดไฟล์ ใช้{" "}
            <a href="/reduce-photo-size" className="text-brand-400 underline">
              Reduce Photo Size
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
