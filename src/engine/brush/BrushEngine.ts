import { SparseGrid, PixelChange, BlendMode } from '../data';
import { BrushStamp, renderCircleStamp, renderSquareStamp, renderPixelStamp } from './BrushStamp';

export interface BrushSettings {
  type: 'pixel' | 'circle' | 'square' | 'line' | 'texture' | 'pattern';
  size: number;
  spacing: number;
  scatterAngle: number;
  scatterPosition: number;
  opacityJitter: number;
  flow: number;
  blendMode: BlendMode;
  hardness: number;
  textureId?: string;
  dynamics: {
    size: boolean;
    opacity: boolean;
    flow: boolean;
  };
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export class BrushEngine {
  private stampCache = new Map<string, BrushStamp>();

  generateStamp(settings: BrushSettings, pressure: number = 1): BrushStamp {
    const cacheKey = this.getStampCacheKey(settings, pressure);
    if (this.stampCache.has(cacheKey)) {
      return this.stampCache.get(cacheKey)!;
    }

    const stamp = this.createStamp(settings, pressure);
    this.stampCache.set(cacheKey, stamp);
    return stamp;
  }

  private getStampCacheKey(settings: BrushSettings, pressure: number): string {
    return `${settings.type}_${settings.size}_${settings.hardness}_${pressure}_${settings.dynamics.size}`;
  }

  private createStamp(settings: BrushSettings, pressure: number): BrushStamp {
    const size = settings.dynamics.size
      ? Math.max(1, settings.size * pressure)
      : settings.size;

    const width = Math.ceil(size);
    const height = Math.ceil(size);
    const data = new Uint8ClampedArray(width * height * 4);

    switch (settings.type) {
      case 'circle':
        renderCircleStamp(data, width, height, size, settings.hardness);
        break;
      case 'square':
        renderSquareStamp(data, width, height, size, settings.hardness);
        break;
      case 'pixel':
        renderPixelStamp(data, width, height);
        break;
      default:
        renderCircleStamp(data, width, height, size, settings.hardness);
    }

    return {
      data,
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
    };
  }

  stroke(
    path: StrokePoint[],
    settings: BrushSettings,
    target: SparseGrid,
    color: number
  ): PixelChange[] {
    if (path.length === 0) return [];

    const changes: PixelChange[] = [];
    let lastPoint = path[0];
    let distanceAccumulator = 0;
    const stepSize = Math.max(1, settings.size * settings.spacing);

    for (let i = 1; i < path.length; i++) {
      const point = path[i];
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      if (segmentLength === 0) continue;

      const nx = dx / segmentLength;
      const ny = dy / segmentLength;

      while (distanceAccumulator + stepSize <= segmentLength) {
        distanceAccumulator += stepSize;
        const t = distanceAccumulator / segmentLength;
        const px = lastPoint.x + nx * distanceAccumulator;
        const py = lastPoint.y + ny * distanceAccumulator;
        const pressure = point.pressure || 1;

        const stamp = this.generateStamp(settings, pressure);
        const stampChanges = this.applyStamp(stamp, px, py, color, target, settings);
        changes.push(...stampChanges);
      }

      distanceAccumulator -= segmentLength;
      lastPoint = point;
    }

    // Always apply at the last point
    const lastStamp = this.generateStamp(settings, path[path.length - 1].pressure || 1);
    const lastChanges = this.applyStamp(
      lastStamp,
      path[path.length - 1].x,
      path[path.length - 1].y,
      color,
      target,
      settings
    );
    changes.push(...lastChanges);

    return changes;
  }

  private applyStamp(
    stamp: BrushStamp,
    x: number,
    y: number,
    color: number,
    target: SparseGrid,
    settings: BrushSettings
  ): PixelChange[] {
    const changes: PixelChange[] = [];
    const startX = Math.floor(x - stamp.centerX);
    const startY = Math.floor(y - stamp.centerY);

    const cr = (color >>> 24) & 0xff;
    const cg = (color >>> 16) & 0xff;
    const cb = (color >>> 8) & 0xff;
    const ca = color & 0xff;

    for (let sy = 0; sy < stamp.height; sy++) {
      for (let sx = 0; sx < stamp.width; sx++) {
        const idx = (sy * stamp.width + sx) * 4;
        const stampAlpha = stamp.data[idx + 3] / 255;
        if (stampAlpha === 0) continue;

        const px = startX + sx;
        const py = startY + sy;

        const finalAlpha = stampAlpha * (ca / 255) * settings.flow;
        const before = target.getPixel(px, py);
        const finalColor = this.blendColor(cr, cg, cb, finalAlpha, before);

        if (target.setPixel(px, py, finalColor)) {
          changes.push({ x: px, y: py, before, after: finalColor });
        }
      }
    }

    return changes;
  }

  private blendColor(
    srcR: number,
    srcG: number,
    srcB: number,
    srcAlpha: number,
    dstColor: number
  ): number {
    if (dstColor === 0) {
      const a = Math.round(srcAlpha * 255);
      return (srcR << 24) | (srcG << 16) | (srcB << 8) | a;
    }

    const dstR = (dstColor >>> 24) & 0xff;
    const dstG = (dstColor >>> 16) & 0xff;
    const dstB = (dstColor >>> 8) & 0xff;
    const dstA = dstColor & 0xff;

    const outA = srcAlpha + dstA * (1 - srcAlpha);
    if (outA === 0) return 0;

    const outR = (srcR * srcAlpha + dstR * dstA * (1 - srcAlpha)) / outA;
    const outG = (srcG * srcAlpha + dstG * dstA * (1 - srcAlpha)) / outA;
    const outB = (srcB * srcAlpha + dstB * dstA * (1 - srcAlpha)) / outA;

    return (
      (Math.round(outR) << 24) |
      (Math.round(outG) << 16) |
      (Math.round(outB) << 8) |
      Math.round(outA * 255)
    );
  }

  clearCache(): void {
    this.stampCache.clear();
  }
}
