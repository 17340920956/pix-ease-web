/**
 * 图片复杂度分析 - 自动检测图片类型（简单色彩图 vs 照片 vs 插画）
 *
 * 分析维度：
 * 1. 颜色数量统计 - 独特颜色越多越复杂
 * 2. 边缘强度检测 - 边缘越丰富越复杂
 * 3. 颜色分布均匀度 - 分布越均匀越复杂
 * 4. 色彩丰富度 - 判断是否有明显的色调倾向
 *
 * 输出：
 * - isComplex: 是否照片类图片
 * - isIllustration: 是否插画/动漫图
 * - colorCount: 独特颜色数量
 * - edgeStrength: 边缘强度 (0-1)
 * - dominantColors: 主要颜色数量 (占比 > 1%)
 */

export interface ImageAnalysis {
  isComplex: boolean;        // true=照片, false=简单图或插画
  isIllustration: boolean;   // true=插画/动漫图
  colorCount: number;        // 独特颜色数量
  edgeStrength: number;      // 边缘强度 (0-1)
  dominantColors: number;    // 主要颜色数量 (占比 > 1%)
}

/**
 * 分析图片复杂度
 * @param imageData - 原始图像数据
 * @param threshold - 复杂度阈值 (默认 0.5)，高于此值判定为照片
 */
export function analyzeImageComplexity(
  imageData: ImageData,
  threshold: number = 0.5
): ImageAnalysis {
  const { width, height, data } = imageData;

  // ========================================================
  // 1. 颜色数量统计（量化到每 32 一级，减少精度影响）
  // ========================================================
  const colorSet = new Set<string>();
  const colorFreq = new Map<string, number>();
  let validPixelCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 10) continue; // 跳过透明像素

    // 量化颜色 (每 32 为一级，降低精度要求)
    const qr = Math.round(data[i] / 32) * 32;
    const qg = Math.round(data[i + 1] / 32) * 32;
    const qb = Math.round(data[i + 2] / 32) * 32;

    const key = `${qr},${qg},${qb}`;
    colorSet.add(key);
    colorFreq.set(key, (colorFreq.get(key) || 0) + 1);
    validPixelCount++;
  }

  const colorCount = colorSet.size;

  // 计算主要颜色数量（占比 > 1%）
  const minCount = Math.max(10, validPixelCount * 0.01);
  let dominantColors = 0;
  colorFreq.forEach(count => {
    if (count >= minCount) dominantColors++;
  });

  // ========================================================
  // 2. 边缘强度检测 (Sobel 算子)
  // ========================================================
  const edgeStrength = calculateEdgeStrength(data, width, height);

  // ========================================================
  // 3. 检测插画特征：
  //    - 颜色数量适中 (20-100)
  //    - 边缘强度中等 (0.15-0.4)
  //    - 没有太多主色 (5-25)
  //    - 颜色分布有一定规律性
  // ========================================================
  const isIllustration =
    colorCount > 15 &&
    colorCount < 150 &&
    edgeStrength > 0.1 &&
    edgeStrength < 0.5 &&
    dominantColors > 3 &&
    dominantColors < 40;

  // ========================================================
  // 4. 综合判定
  // ========================================================
  // 照片特征：
  // - 颜色数量 > 50
  // - 边缘强度 > 0.3
  // - 主要颜色 > 15
  //
  // 简单图特征：
  // - 颜色数量 < 20
  // - 边缘强度 < 0.2
  // - 主要颜色 < 10
  //
  // 插画/动漫图特征：
  // - 颜色数量 20-80
  // - 边缘强度中等
  // - 有明显的主色调

  const colorScore = Math.min(1, colorCount / 100); // 归一化到 0-1
  const edgeScore = Math.min(1, edgeStrength);
  const dominantScore = Math.min(1, dominantColors / 30);

  // 加权平均：颜色权重 0.4，边缘权重 0.4，主色权重 0.2
  const complexityScore =
    colorScore * 0.4 +
    edgeScore * 0.4 +
    dominantScore * 0.2;

  const isComplex = complexityScore > threshold && !isIllustration;

  return {
    isComplex,
    isIllustration,
    colorCount,
    edgeStrength,
    dominantColors,
  };
}

/**
 * 计算图像边缘强度 (Sobel 算子)
 * @returns 归一化的边缘强度 (0-1)
 */
function calculateEdgeStrength(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number {
  let totalEdge = 0;
  let sampleCount = 0;

  // Sobel 核
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  // 采样步长（加速计算）
  const step = Math.max(1, Math.floor(Math.min(width, height) / 100));

  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      let gx = 0, gy = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx;
          const py = y + dy;
          const idx = (py * width + px) * 4;
          // 转换为灰度
          const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

          gx += gray * sobelX[dy + 1][dx + 1];
          gy += gray * sobelY[dy + 1][dx + 1];
        }
      }

      totalEdge += Math.sqrt(gx * gx + gy * gy);
      sampleCount++;
    }
  }

  const avgEdge = sampleCount > 0 ? totalEdge / sampleCount : 0;

  // 归一化到 0-1 (Sobel 输出范围约 0-765)
  return Math.min(1, avgEdge / 400);
}
