/**
 * 图像增强 — 自动色阶 + 饱和度调节
 *
 * 功能：
 * 1. 自动色阶 — 基于亮度直方图的统一缩放，不破坏色彩平衡
 * 2. 饱和度自适应调节 — 保持自然色彩
 */

export interface EnhanceOptions {
  contrastFactor?: number;
  saturationFactor?: number;
  brightnessOffset?: number;
}

/**
 * Auto Levels：亮度直方图统一缩放
 *
 * 与逐通道独立拉伸的区别：
 * - 统一缩放：R/G/B 使用同一个 scale 和 offset，保留原始色彩平衡
 * - 逐通道：每个通道独立拉伸 → 暗部/亮部偏色
 *
 * 触发条件（只对确实需要修正的图片生效）：
 * - 整体偏暗（median < 85）或灰雾严重（动态范围 < 120）
 * - 曝光正常的图片直接跳过
 */
export function autoEnhancePhoto(imageData: ImageData, alphaMask: Uint8Array | null): ImageData {
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data.length);

  // 收集亮度直方图
  const lumas: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const maskVal = alphaMask ? alphaMask[i / 4] : 255;
    if (maskVal < 10) continue;
    lumas.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  const sampleCount = lumas.length;
  if (sampleCount === 0) return new ImageData(new Uint8ClampedArray(data), width, height);

  lumas.sort((a, b) => a - b);
  const shadowIdx = Math.floor(sampleCount * 0.005);
  const highlightIdx = Math.floor(sampleCount * 0.995);
  const shadow = lumas[shadowIdx];
  const highlight = lumas[highlightIdx];
  const median = lumas[Math.floor(sampleCount * 0.5)];
  const dynRange = highlight - shadow;

  // 图片已正常曝光 → 跳过增强，避免破坏色彩
  if (dynRange > 180 && median > 100 && median < 155) {
    return new ImageData(new Uint8ClampedArray(data), width, height);
  }

  // 统一亮度缩放因子（所有通道共用，保留色彩平衡）
  const scale = dynRange > 20 ? 255 / dynRange : 1;

  // 仅真正暗光照片才 gamma 提亮
  const needGamma = median < 75;
  const gamma = needGamma ? 0.92 : 1.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const maskVal = alphaMask ? alphaMask[y * width + x] : 255;
      if (maskVal < 10) {
        out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; out[i + 3] = 0;
        continue;
      }

      // 三通道使用统一缩放，保留原始色彩关系
      let r = Math.round((data[i] - shadow) * scale);
      let g = Math.round((data[i + 1] - shadow) * scale);
      let b = Math.round((data[i + 2] - shadow) * scale);

      // 仅暗光照片轻度 gamma 提亮
      if (needGamma) {
        r = Math.round(255 * Math.pow(r / 255, gamma));
        g = Math.round(255 * Math.pow(g / 255, gamma));
        b = Math.round(255 * Math.pow(b / 255, gamma));
      }

      out[i] = Math.max(0, Math.min(255, r));
      out[i + 1] = Math.max(0, Math.min(255, g));
      out[i + 2] = Math.max(0, Math.min(255, b));
      out[i + 3] = data[i + 3];
    }
  }

  return new ImageData(out, width, height);
}

/**
 * 饱和度自适应增强
 * 在 HSV 空间中调节饱和度，保留自然色彩
 */
export function enhanceSaturation(imageData: ImageData, alphaMask: Uint8Array | null, factor: number = 1.1): ImageData {
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const maskVal = alphaMask ? alphaMask[y * width + x] : 255;
      if (maskVal < 10) {
        out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; out[i + 3] = 0;
        continue;
      }

      let r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;

      if (diff > 0 && max > 0) {
        const s = diff / max;
        const newS = Math.min(1, s * factor);
        const ratio = newS / s;
        const gray = max;
        r = Math.min(255, Math.max(0, gray - (gray - r) * ratio));
        g = Math.min(255, Math.max(0, gray - (gray - g) * ratio));
        b = Math.min(255, Math.max(0, gray - (gray - b) * ratio));
      }

      out[i] = Math.round(r);
      out[i + 1] = Math.round(g);
      out[i + 2] = Math.round(b);
      out[i + 3] = data[i + 3];
    }
  }

  return new ImageData(out, width, height);
}
