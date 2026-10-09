"use client";

import { cn } from "@/src/presentation/lib/cn";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * Cropper แบบไม่พึ่ง library: ลากเพื่อเลื่อน · slider/ปุ่มเพื่อซูม · กรอบ crop คือสิ่งที่เห็น
 * (WYSIWYG — กรอบที่มองเห็นคือผลลัพธ์จริง)
 *
 * ⚠️ เรื่องสำคัญเรื่องขนาด:
 * - กรอบถูก **contain-fit ในพื้นที่ที่ว่าง** ไม่ใช่ `w-full + aspect-ratio`
 *   (แบบเต็มความกว้าง ภาพแนวตั้งจะดันความสูงจนหน้าเลื่อน จับ crop ไม่ทัน)
 * - zoom 1 = **contain** = เห็นภาพครบทั้งใบ (ไม่ใช่ cover ที่ต้องซูมออกมาหาส่วนที่ต้องการ)
 *   ภาพแนวตั้งจึงเริ่มที่ "เห็นทั้งรูป เล็กแต่ครบ" แล้วค่อยซูมเข้า
 * - ResizeObserver มี guard: setState เฉพาะที่ขนาดเปลี่ยนจริง กัน observer↔render loop
 */

export interface CropStageHandle {
  /** กรอบ crop ปัจจุบันในหน่วย px ของภาพต้นฉบับ */
  getCrop(): { x: number; y: number; w: number; h: number };
  /** กลับสู่ zoom 1 = เห็นภาพครบ + จัดกึ่งกลาง */
  reset(): void;
  zoomBy(factor: number): void;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** เผื่อที่ต้องเหลือจากขอบ panel ไม่ให้กรอบชนขอบเป๊ะ */
const PADDING = 16;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 12;

export interface CropStageProps {
  src: string;
  /** สัดส่วนกรอบ crop — null = ตามสัดส่วนภาพต้นฉบับ */
  aspect: number | null;
  className?: string;
  onCropChange?: (crop: { x: number; y: number; w: number; h: number }) => void;
}

/** กรอบที่พอดีในพื้นที่ (w×h) ตามสัดส่วนที่ต้องการ — ไม่เกินทั้งสองด้าน */
function fitFrame(
  area: { w: number; h: number },
  aspect: number,
): { w: number; h: number } {
  const availW = Math.max(1, area.w - PADDING * 2);
  const availH = Math.max(1, area.h - PADDING * 2);
  let w = availW;
  let h = w / aspect;
  if (h > availH) {
    h = availH;
    w = h * aspect;
  }
  return { w: Math.max(1, Math.floor(w)), h: Math.max(1, Math.floor(h)) };
}

export const CropStage = forwardRef<CropStageHandle, CropStageProps>(
  function CropStage({ src, aspect, className, onCropChange }, ref) {
    const areaRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const drag = useRef<{ x: number; y: number } | null>(null);

    const [nat, setNat] = useState({ w: 0, h: 0 });
    const [area, setArea] = useState({ w: 0, h: 0 });
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    // อิสระ → กรอบใช้สัดส่วนภาพต้นฉบับ
    const windowAspect =
      aspect !== null ? aspect : nat.w && nat.h ? nat.w / nat.h : 1;

    const frame = useCallback(
      () => (area.w > 0 ? fitFrame(area, windowAspect) : { w: 0, h: 0 }),
      [area, windowAspect],
    );

    /**
     * base = **cover** → ภาพเต็มกรอบเสมอ ไม่มี letterbox
     *
     * ⚠️ ตั้งใจไม่ใช้ contain ที่นี่: ถ้าสัดส่วนกรอบ ≠ สัดส่วนภาพ
     * (เช่น 9:16 บนภาพ 4:3) ภาพจะเล็กกว่ากรอบในแกนหนึ่ง → กรอบ crop กลายเป็น
     * "เฉดภาพ + ช่องว่าง" ซึ่งไม่ใช่สิ่งที่ผู้ใช้เลือก preset มา
     * cover ทำให้กรอบ = พอดีสัดส่วนที่ขอเสมอ แล้วซูมเข้าเพื่อเลือกส่วนที่ต้องการ
     * ส่วน "ไม่ล้นจอ" แก้ที่ fitFrame (กรอบเล็กลงตามพื้นที่ว่าง) ไม่ใช่ที่ cover
     */
    const baseScale =
      nat.w && area.w ? Math.max(frame().w / nat.w, frame().h / nat.h) || 1 : 1;
    const displayedScale = baseScale * scale;
    const dW = nat.w * displayedScale;
    const dH = nat.h * displayedScale;

    // cover แล้วภาพใหญ่กว่ากรอบเสมอ → ลากได้ถึงขอบภาพ
    const clampPos = useCallback(
      (p: { x: number; y: number }, dw: number, dh: number) => {
        const f = frame();
        return {
          x: clamp(p.x, f.w - dw, 0),
          y: clamp(p.y, f.h - dh, 0),
        };
      },
      [frame],
    );

    // วัดพื้นที่ว่าง — observer ยิงซ้ำได้ จึง setState เฉพาะที่ขนาดเปลี่ยนจริง
    useLayoutEffect(() => {
      const el = areaRef.current;
      if (!el) return;
      const read = () => {
        const r = el.getBoundingClientRect();
        setArea((prev) =>
          Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1
            ? prev
            : { w: r.width, h: r.height },
        );
      };
      read();
      const ro = new ResizeObserver(read);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // ภาพใหม่ → zoom กลับ 1
    const handleLoad = () => {
      const img = imgRef.current;
      if (!img) return;
      setScale(1);
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
    };

    // จัดกึ่งกลางใหม่เมื่อภาพ/กรอบเปลี่ยน (ไม่ทำตอน pan — ไม่งั้นลากแล้วถูกดึงกลับ)
    useLayoutEffect(() => {
      if (!nat.w || !area.w) return;
      const f = frame();
      const bs = Math.max(f.w / nat.w, f.h / nat.h) || 1;
      const dw = nat.w * bs * scale;
      const dh = nat.h * bs * scale;
      setPos(clampPos({ x: (f.w - dw) / 2, y: (f.h - dh) / 2 }, dw, dh));
      // eslint-disable-next-line react-hooks/exhaustive-deps -- ตั้งใจไม่ re-center ตอน pan/zoom
    }, [nat.w, nat.h, area.w, area.h, windowAspect]);

    // แปลงตำแหน่งบนจอ → กรอบ crop ในพิกเซลภาพต้นฉบับ
    // กรอบต้องอยู่ในขอบภาพเสมอ: คำนวณ x/y ก่อน แล้วค่อยจำกัด w/h ตามพื้นที่ที่เหลือ
    const emitCrop = useCallback(
      (p: { x: number; y: number }, ds: number) => {
        const f = frame();
        if (!nat.w || f.w === 0 || ds <= 0) return;
        const x = clamp(Math.round(-p.x / ds), 0, nat.w);
        const y = clamp(Math.round(-p.y / ds), 0, nat.h);
        onCropChange?.({
          x,
          y,
          w: clamp(Math.round(f.w / ds), 1, nat.w - x),
          h: clamp(Math.round(f.h / ds), 1, nat.h - y),
        });
      },
      [nat.w, nat.h, frame, onCropChange],
    );

    const handleZoom = useCallback(
      (next: number) => {
        const f = frame();
        if (!nat.w || f.w === 0) return;
        const target = clamp(next, MIN_ZOOM, MAX_ZOOM);
        // ซูมรอบจุดกึ่งกลางกรอบ ไม่งั้นภาพจะ drift ตอนเลื่อน slider
        const cx = f.w / 2;
        const cy = f.h / 2;
        const ratio = target / scale;
        const nx = cx - (cx - pos.x) * ratio;
        const ny = cy - (cy - pos.y) * ratio;
        const bs = Math.max(f.w / nat.w, f.h / nat.h) || 1;
        setScale(target);
        setPos(
          clampPos({ x: nx, y: ny }, nat.w * bs * target, nat.h * bs * target),
        );
      },
      [nat.w, nat.h, scale, pos.x, pos.y, frame, clampPos],
    );

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      drag.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current = { x: e.clientX, y: e.clientY };
      // กรอบถูก emit ใน effect ที่ derive จาก pos — ไม่ต้อง emit ซ้ำที่นี่
      setPos((p) => clampPos({ x: p.x + dx, y: p.y + dy }, dW, dH));
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      drag.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // pointer ถูก release ไปแล้ว
      }
    };

    /**
     * กรอบ crop เป็น **derived** จาก (nat, frame, scale, pos) ไม่ใช่ค่าที่เก็บแยก
     * ถ้า emit เฉพาะตอน pointer move การซูมอย่างเดียวจะไม่อัปเดตกรอบเลย
     * → ซูมแล้วกดประมวลผลจะได้ภาพเต็มขนาดแบบไม่ตั้งใจ
     */
    useLayoutEffect(() => {
      emitCrop(pos, displayedScale);
    }, [displayedScale, pos, emitCrop]);

    useImperativeHandle(
      ref,
      () => ({
        getCrop() {
          const ds = baseScale * scale;
          const f = frame();
          if (!nat.w || f.w === 0 || ds <= 0) {
            return { x: 0, y: 0, w: nat.w, h: nat.h };
          }
          const x = clamp(Math.round(-pos.x / ds), 0, nat.w);
          const y = clamp(Math.round(-pos.y / ds), 0, nat.h);
          return {
            x,
            y,
            w: clamp(Math.round(f.w / ds), 1, nat.w - x),
            h: clamp(Math.round(f.h / ds), 1, nat.h - y),
          };
        },
        reset() {
          setScale(1);
        },
        zoomBy(factor) {
          handleZoom(scale * factor);
        },
      }),
      [nat.w, nat.h, baseScale, scale, pos.x, pos.y, frame, handleZoom],
    );

    const f = frame();
    // frame ต้องการแค่พื้นที่ว่าง — ไม่เกี่ยวกับ nat
    // ⚠️ ห้าม gate ด้วย nat.w: `nat` มาจาก onLoad ของ <img> ตัวนี้เอง
    //    ถ้าซ่อนไว้จน nat.w > 0 วงจรจะตายตอนแรก (dead on arrival) และไม่มีปุ่มซูมให้กด
    const hasFrame = f.w > 0 && f.h > 0;
    const ready = nat.w > 0 && hasFrame;

    return (
      <div
        className={cn(
          // ⚠️ w-full/min-w-0 จำเป็น: ไม่งั้น flex item จะ shrink ตามเนื้อหา
          //    แล้วพื้นที่ว่างแคบเท่ากรอบ → กรอบดูเหมือนชิดซ้ายเสมอ
          "flex h-full w-full min-w-0 flex-col gap-2",
          className,
        )}
      >
        {/* พื้นที่ว่าง — วัดขนาดจริงเพื่อคำนวณกรอบที่พอดี */}
        <div ref={areaRef} className="relative flex-1 min-h-0 w-full">
          {hasFrame ? (
            <div
              className="ie-panel-inset canvas-checker absolute inset-0 m-auto touch-none select-none overflow-hidden"
              // eslint-disable-next-line react/forbid-dom-props -- ค่า runtime (กรอบคำนวณจากพื้นที่ว่าง + สัดส่วน preset) ไม่ใช่ token
              style={{
                width: f.w,
                height: f.h,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL ของภาพที่ผู้ใช้เลือกเอง next/image optimize ไม่ได้ */}
              <img
                ref={imgRef}
                src={src}
                alt="ภาพที่กำลังครอป"
                draggable={false}
                onLoad={handleLoad}
                className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
                // eslint-disable-next-line react/forbid-dom-props -- ค่า runtime (ตำแหน่ง/ขนาดจาก zoom + pan) ไม่ใช่ token
                style={{
                  width: dW,
                  height: dH,
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
              กำลังโหลดภาพ…
            </div>
          )}
        </div>

        {/* ควบคุมซูม — slider + ปุ่มลัด เพราะการซูมเป็น action ที่ใช้บ่อยที่สุด */}
        <div className="ie-toolbar flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="ie-button ie-button-sm"
            onClick={() => handleZoom(scale / 1.5)}
            disabled={!ready}
            title="ซูมออก"
          >
            −
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={scale}
            onChange={(e) => handleZoom(Number(e.target.value))}
            className="flex-1"
            disabled={!ready}
            title="ซูม (1 = ภาพเต็มกรอบ)"
          />
          <button
            type="button"
            className="ie-button ie-button-sm"
            onClick={() => handleZoom(scale * 1.5)}
            disabled={!ready}
            title="ซูมเข้า"
          >
            +
          </button>
          <button
            type="button"
            className="ie-button ie-button-sm"
            onClick={() => handleZoom(1)}
            disabled={!ready}
            title="รีเซ็ตซูม (ภาพเต็มกรอบ)"
          >
            พอดี
          </button>
          <span className="text-xs text-muted w-12 text-right">
            {scale.toFixed(1)}×
          </span>
        </div>
      </div>
    );
  },
);
