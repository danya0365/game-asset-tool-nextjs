import type {
  AtlasSettings,
  PackedAtlas,
  SpriteFrame,
} from "@/src/domain/types/atlas";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class MaxRectsPacker {
  private binWidth: number;
  private binHeight: number;
  private padding: number;
  private freeRects: Rect[] = [];
  private usedRects: Rect[] = [];

  constructor(width: number, height: number, padding: number = 0) {
    this.binWidth = width;
    this.binHeight = height;
    this.padding = padding;
    this.freeRects = [{ x: 0, y: 0, width: width, height: height }];
  }

  insert(width: number, height: number): Rect | null {
    const paddedWidth = width + this.padding * 2;
    const paddedHeight = height + this.padding * 2;

    let bestRect: Rect | null = null;
    let bestShortSideFit = Number.MAX_VALUE;
    let bestLongSideFit = Number.MAX_VALUE;

    for (const freeRect of this.freeRects) {
      if (freeRect.width >= paddedWidth && freeRect.height >= paddedHeight) {
        const leftoverHoriz = Math.abs(freeRect.width - paddedWidth);
        const leftoverVert = Math.abs(freeRect.height - paddedHeight);
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert);
        const longSideFit = Math.max(leftoverHoriz, leftoverVert);

        if (
          shortSideFit < bestShortSideFit ||
          (shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)
        ) {
          bestRect = {
            x: freeRect.x + this.padding,
            y: freeRect.y + this.padding,
            width: width,
            height: height,
          };
          bestShortSideFit = shortSideFit;
          bestLongSideFit = longSideFit;
        }
      }
    }

    if (bestRect) {
      this.placeRect({
        x: bestRect.x - this.padding,
        y: bestRect.y - this.padding,
        width: paddedWidth,
        height: paddedHeight,
      });
      this.usedRects.push(bestRect);
    }

    return bestRect;
  }

  private placeRect(rect: Rect): void {
    const newFreeRects: Rect[] = [];

    for (const freeRect of this.freeRects) {
      if (this.splitFreeRect(freeRect, rect, newFreeRects)) {
        continue;
      }
      newFreeRects.push(freeRect);
    }

    this.freeRects = this.pruneFreeRects(newFreeRects);
  }

  private splitFreeRect(
    freeRect: Rect,
    usedRect: Rect,
    newRects: Rect[]
  ): boolean {
    if (
      usedRect.x >= freeRect.x + freeRect.width ||
      usedRect.x + usedRect.width <= freeRect.x ||
      usedRect.y >= freeRect.y + freeRect.height ||
      usedRect.y + usedRect.height <= freeRect.y
    ) {
      return false;
    }

    if (
      usedRect.x < freeRect.x + freeRect.width &&
      usedRect.x + usedRect.width > freeRect.x
    ) {
      if (
        usedRect.y > freeRect.y &&
        usedRect.y < freeRect.y + freeRect.height
      ) {
        newRects.push({
          x: freeRect.x,
          y: freeRect.y,
          width: freeRect.width,
          height: usedRect.y - freeRect.y,
        });
      }
      if (usedRect.y + usedRect.height < freeRect.y + freeRect.height) {
        newRects.push({
          x: freeRect.x,
          y: usedRect.y + usedRect.height,
          width: freeRect.width,
          height: freeRect.y + freeRect.height - (usedRect.y + usedRect.height),
        });
      }
    }

    if (
      usedRect.y < freeRect.y + freeRect.height &&
      usedRect.y + usedRect.height > freeRect.y
    ) {
      if (usedRect.x > freeRect.x && usedRect.x < freeRect.x + freeRect.width) {
        newRects.push({
          x: freeRect.x,
          y: freeRect.y,
          width: usedRect.x - freeRect.x,
          height: freeRect.height,
        });
      }
      if (usedRect.x + usedRect.width < freeRect.x + freeRect.width) {
        newRects.push({
          x: usedRect.x + usedRect.width,
          y: freeRect.y,
          width: freeRect.x + freeRect.width - (usedRect.x + usedRect.width),
          height: freeRect.height,
        });
      }
    }

    return true;
  }

  private pruneFreeRects(rects: Rect[]): Rect[] {
    const result: Rect[] = [];
    for (let i = 0; i < rects.length; i++) {
      let isContained = false;
      for (let j = 0; j < rects.length; j++) {
        if (i !== j && this.isContainedIn(rects[i], rects[j])) {
          isContained = true;
          break;
        }
      }
      if (!isContained) {
        result.push(rects[i]);
      }
    }
    return result;
  }

  private isContainedIn(a: Rect, b: Rect): boolean {
    return (
      a.x >= b.x &&
      a.y >= b.y &&
      a.x + a.width <= b.x + b.width &&
      a.y + a.height <= b.y + b.height
    );
  }
}

export function packSprites(
  frames: SpriteFrame[],
  settings: AtlasSettings
): PackedAtlas | null {
  const sortedFrames = [...frames].sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return areaB - areaA;
  });

  const packer = new MaxRectsPacker(
    settings.maxWidth,
    settings.maxHeight,
    settings.padding
  );

  const packedFrames: SpriteFrame[] = [];
  let maxX = 0;
  let maxY = 0;

  for (const frame of sortedFrames) {
    const rect = packer.insert(frame.width, frame.height);
    if (!rect) {
      console.error(`Could not pack sprite: ${frame.name}`);
      return null;
    }

    packedFrames.push({
      ...frame,
      x: rect.x,
      y: rect.y,
      rotated: false,
    });

    maxX = Math.max(maxX, rect.x + frame.width);
    maxY = Math.max(maxY, rect.y + frame.height);
  }

  let finalWidth = maxX + settings.padding;
  let finalHeight = maxY + settings.padding;

  if (settings.powerOfTwo) {
    finalWidth = nextPowerOfTwo(finalWidth);
    finalHeight = nextPowerOfTwo(finalHeight);
  }

  return {
    width: finalWidth,
    height: finalHeight,
    frames: packedFrames,
  };
}

function nextPowerOfTwo(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}
