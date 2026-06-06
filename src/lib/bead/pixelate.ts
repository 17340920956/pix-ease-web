/**
 * 图像像素化 — 支持照片/简单图/插画 三模式
 *
 * 照片模式 (photo): 区域加权平均采样，适合色彩丰富的照片
 * 简单图模式 (simple): 区域平均采样，保留颜色精度（类似 perler-beads-ai 的 average）
 * 插画模式 (illustration): 轻度平滑 + 区域平均采样，减少碎色但保留细节
 */

export type PixelateMode = 'photo' | 'simple' | 'illustration';

export interface PixelateOptions {
  mode?: PixelateMode;
}

// ========================================================
// 公共：Mask 积分图
// ========================================================

function buildMaskIntegral(srcW: number, srcH: number, mask: Uint8Array | null): Uint32Array | null {
  if (!mask) return null;
  const intMap = new Uint32Array((srcW + 1) * (srcH + 1));
  for (let y = 0; y < srcH; y++) {
    let rowSum = 0;
    const rowOff = y * srcW;
    const intRowOff = (y + 1) * (srcW + 1);
    const intPrevRowOff = y * (srcW + 1);
    for (let x = 0; x < srcW; x++) {
      rowSum += mask[rowOff + x];
      intMap[intRowOff + x + 1] = rowSum + intMap[intPrevRowOff + x + 1];
    }
  }
  return intMap;
}

function getMaskSum(intMap: Uint32Array | null, srcW: number, sx0: number, sy0: number, sx1: number, sy1: number): number {
  if (!intMap) return (sx1 - sx0) * (sy1 - sy0) * 255;
  const w = srcW + 1;
  return intMap[sy1 * w + sx1] - intMap[sy0 * w + sx1] - intMap[sy1 * w + sx0] + intMap[sy0 * w + sx0];
}

// ========================================================
// 公共：区域采样
// ========================================================

interface RegionAccum {
  sumR: number; sumG: number; sumB: number; sumWeight: number; count: number;
}

function sampleRegionSimple(
  srcData: Uint8ClampedArray, srcW: number,
  sx0: number, sy0: number, sx1: number, sy1: number,
  mask: Uint8Array | null,
): RegionAccum {
  const acc: RegionAccum = { sumR: 0, sumG: 0, sumB: 0, sumWeight: 0, count: 0 };
  for (let sy = sy0; sy < sy1; sy++) {
    const rowOff = sy * srcW;
    for (let sx = sx0; sx < sx1; sx++) {
      const m = mask ? mask[rowOff + sx] : 255;
      if (m > 0) {
        const i = (rowOff + sx) * 4;
        // 简单平均：每个像素权重为 1（类似 perler-beads-ai）
        acc.sumR += srcData[i];
        acc.sumG += srcData[i + 1];
        acc.sumB += srcData[i + 2];
        acc.sumWeight += 1;
        acc.count++;
      }
    }
  }
  return acc;
}

function sampleRegionWeighted(
  srcData: Uint8ClampedArray, srcW: number,
  sx0: number, sy0: number, sx1: number, sy1: number,
  mask: Uint8Array | null,
): RegionAccum {
  const acc: RegionAccum = { sumR: 0, sumG: 0, sumB: 0, sumWeight: 0, count: 0 };
  for (let sy = sy0; sy < sy1; sy++) {
    const rowOff = sy * srcW;
    for (let sx = sx0; sx < sx1; sx++) {
      const m = mask ? mask[rowOff + sx] : 255;
      if (m > 0) {
        const i = (rowOff + sx) * 4;
        // 加权平均：alpha 越高权重越大
        acc.sumR += srcData[i] * m;
        acc.sumG += srcData[i + 1] * m;
        acc.sumB += srcData[i + 2] * m;
        acc.sumWeight += m;
        acc.count++;
      }
    }
  }
  return acc;
}

function writePixel(out: Uint8ClampedArray, dstIdx: number, acc: RegionAccum, srcData: Uint8ClampedArray, srcW: number, sx0: number, sy0: number, sx1: number, sy1: number, avgMask: number): void {
  if (acc.sumWeight > 0) {
    out[dstIdx] = Math.round(acc.sumR / acc.sumWeight);
    out[dstIdx + 1] = Math.round(acc.sumG / acc.sumWeight);
    out[dstIdx + 2] = Math.round(acc.sumB / acc.sumWeight);
  } else {
    //  fallback: 取中心像素
    const cx = Math.floor((sx0 + sx1) / 2);
    const cy = Math.floor((sy0 + sy1) / 2);
    const ci = (cy * srcW + cx) * 4;
    out[dstIdx] = srcData[ci];
    out[dstIdx + 1] = srcData[ci + 1];
    out[dstIdx + 2] = srcData[ci + 2];
  }
  out[dstIdx + 3] = Math.round(avgMask);
}

// ========================================================
// 主入口
// ========================================================

export function pixelateWithMask(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number,
  fullAlphaMask: Uint8Array | null,
  options: PixelateOptions = {},
): ImageData {
  const mode = options.mode || 'simple'; // 默认改为 simple，更接近 perler-beads-ai 的效果
  return pixelateMode(imageData, targetWidth, targetHeight, fullAlphaMask, mode);
}

function pixelateMode(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number,
  fullAlphaMask: Uint8Array | null,
  mode: PixelateMode,
): ImageData {
  const { width: srcW, height: srcH } = imageData;
  const out = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const cellW = srcW / targetWidth;
  const cellH = srcH / targetHeight;

  // 插画模式：轻度平滑预处理
  const src = mode === 'illustration' ? applyLightSmoothing(imageData, fullAlphaMask) : imageData;
  const { width: sW, height: sH, data: sData } = src;

  const maskInt = buildMaskIntegral(sW, sH, fullAlphaMask);

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const sx0 = Math.floor(x * cellW);
      const sy0 = Math.floor(y * cellH);
      const sx1 = Math.min(sW, Math.ceil((x + 1) * cellW));
      const sy1 = Math.min(sH, Math.ceil((y + 1) * cellH));

      const maskArea = (sx1 - sx0) * (sy1 - sy0);
      const avgMask = getMaskSum(maskInt, sW, sx0, sy0, sx1, sy1) / maskArea;
      const dstIdx = (y * targetWidth + x) * 4;

      if (avgMask < 10) {
        out[dstIdx] = 255;
        out[dstIdx + 1] = 255;
        out[dstIdx + 2] = 255;
        out[dstIdx + 3] = 0;
        continue;
      }

      // 照片模式使用加权平均，其他模式使用简单平均
      const acc = mode === 'photo'
        ? sampleRegionWeighted(sData, sW, sx0, sy0, sx1, sy1, fullAlphaMask)
        : sampleRegionSimple(sData, sW, sx0, sy0, sx1, sy1, fullAlphaMask);

      writePixel(out, dstIdx, acc, sData, sW, sx0, sy0, sx1, sy1, avgMask);
    }
  }

  return new ImageData(out, targetWidth, targetHeight);
}

// ========================================================
// 轻度平滑滤波（适合插画）- 保留细节，不过度模糊
// ========================================================

function applyLightSmoothing(
  imageData: ImageData,
  fullAlphaMask: Uint8Array | null,
): ImageData {
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data);

  // 使用较小的核，保留更多细节
  const radius = 1;
  const sigma = 1.0;

  // 预计算高斯核
  const kernelSize = radius * 2 + 1;
  const kernel = new Float64Array(kernelSize * kernelSize);
  for (let y = 0; y < kernelSize; y++) {
    for (let x = 0; x < kernelSize; x++) {
      const dx = x - radius;
      const dy = y - radius;
      kernel[y * kernelSize + x] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (fullAlphaMask && fullAlphaMask[y * width + x] < 10) continue;

      let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.min(Math.max(y + dy, 0), height - 1);
          const nx = Math.min(Math.max(x + dx, 0), width - 1);
          if (fullAlphaMask && fullAlphaMask[ny * width + nx] < 10) continue;

          const nIdx = (ny * width + nx) * 4;
          const weight = kernel[(dy + radius) * kernelSize + dx + radius];
          sumR += data[nIdx] * weight;
          sumG += data[nIdx + 1] * weight;
          sumB += data[nIdx + 2] * weight;
          sumWeight += weight;
        }
      }

      if (sumWeight > 0) {
        out[idx] = Math.round(sumR / sumWeight);
        out[idx + 1] = Math.round(sumG / sumWeight);
        out[idx + 2] = Math.round(sumB / sumWeight);
      }
    }
  }

  return new ImageData(out, width, height);
}
