"use client";

import { cn } from "@/src/presentation/lib/cn";
import type {
  FormatSettings,
  OutputFormat,
} from "@/src/domain/types/photoEditor";
import { SUPPORTS_ALPHA } from "@/src/domain/types/photoEditor";

const FORMATS: {
  value: OutputFormat | "auto";
  label: string;
  ext: string;
}[] = [
  { value: "auto", label: "ตามต้นฉบับ", ext: "PNG → PNG, JPG → JPG" },
  { value: "jpeg", label: "JPEG", ext: ".jpg" },
  { value: "png", label: "PNG", ext: ".png" },
  { value: "webp", label: "WebP", ext: ".webp" },
];

const FORMAT_LABEL: Record<OutputFormat, string> = {
  jpeg: "JPEG",
  png: "PNG",
  webp: "WebP",
};

export interface FormatPanelProps {
  settings: FormatSettings;
  onChange: (settings: FormatSettings) => void;
  /** format จริงของไฟล์ที่เปิดอยู่ — ใช้อธิบายว่า "auto" จะได้อะไร */
  sourceFormat: OutputFormat;
  /** format ที่จะได้จริงหลัง resolve auto */
  effectiveFormat: OutputFormat;
}

export function FormatPanel({
  settings,
  onChange,
  sourceFormat,
  effectiveFormat,
}: FormatPanelProps) {
  const isAuto = settings.format === "auto";
  const lossless = effectiveFormat === "png";

  return (
    <div className="ie-groupbox">
      <span className="ie-groupbox-title">🖼️ รูปแบบไฟล์</span>
      <div className="-mt-2 space-y-2">
        <div className="ie-toolbar flex gap-1 flex-wrap">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              className={cn(
                "ie-button ie-button-sm flex-1",
                settings.format === f.value && "ie-button-active",
              )}
              onClick={() => onChange({ ...settings, format: f.value })}
              title={`${f.label} — ${f.ext}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-muted">
          {isAuto ? (
            <>
              จะได้{" "}
              <span className="text-foreground font-medium">
                {FORMAT_LABEL[sourceFormat]}
              </span>{" "}
              (ตามไฟล์ต้นฉบับ)
            </>
          ) : (
            <>
              จะได้{" "}
              <span className="text-foreground font-medium">
                {FORMAT_LABEL[effectiveFormat]}
              </span>
            </>
          )}
        </p>

        {!lossless && (
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

        {!SUPPORTS_ALPHA[effectiveFormat] && (
          <p className="text-[10px] text-warning">
            ⚠️ {FORMAT_LABEL[effectiveFormat]} ไม่มีช่องโปร่งใส —
            ส่วนที่โปร่งจะกลายเป็นสีขาว
          </p>
        )}

        {lossless && (
          <p className="text-[10px] text-muted">
            PNG บันทึกแบบ lossless ไฟล์ใหญ่ — ถ้าต้องการย่อขนาดไฟล์ ใช้{" "}
            <a href="/reduce-photo-size" className="text-brand-400 underline">
              Reduce Photo Size
            </a>
          </p>
        )}

        {effectiveFormat === "webp" && !lossless && (
          <p className="text-[10px] text-muted">
            WebP มี alpha และไฟล์เล็กกว่า PNG — เหมาะกับเว็บเกมบน browser
          </p>
        )}
      </div>
    </div>
  );
}
