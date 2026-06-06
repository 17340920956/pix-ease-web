/**
 * 双边滤波器 (Bilateral Filter) - 边缘保留平滑
 *
 * 原理：
 * - 空间权重：距离中心越近的像素权重越大（高斯分布）
 * - 颜色权重：颜色越接近中心像素的权重越大（高斯分布）
 * - 最终权重 = 空间权重 × 颜色权重
 *
 * 效果：
 * - 平坦区域：颜色接近 → 颜色权重大 → 平滑降噪
 * - 边缘区域：颜色差异大 → 颜色权重小 → 边缘不被模糊
 * - 特别适合保护黑色轮廓线
 *
 * 参数建议：
 * - 照片预处理: radius=3, sigmaSpace=3, sigmaColor=40
 * - 轻度平滑: radius=2, sigmaSpace=2, sigmaColor=30
 * - 重度平滑: radius=5, sigmaSpace=5, sigmaColor=50
 */

export interface BilateralFilterOptions {
  radius?: number;         // 核半径 (默认 3)
  sigmaSpace?: number;     // 空间 sigma (默认 3)
  sigmaColor?: number;     // 颜色 sigma (默认 40)
}

/**
 * 应用双边滤波
 * @param imageData - 原始图像数据
 * @param fullAlphaMask - Alpha 掩码 (可选)
 * @param options - 滤波参数
 * @returns 滤波后的图像数据
 */
export function bilateralFilter(
  imageData: ImageData,
  fullAlphaMask: Uint8Array | null,
  options: BilateralFilterOptions = {}
): ImageData {
  const {
    radius = 3,
    sigmaSpace = 3,
    sigmaColor = 40,
  } = options;

  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data);

  // 预计算空间高斯核
  const spaceKernel = precomputeGaussianKernel(radius, sigmaSpace);

  // 颜色高斯的逆方差 (用于快速计算)
  const colorInvVar = 1 / (2 * sigmaColor * sigmaColor);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // 跳过透明像素
      if (fullAlphaMask && fullAlphaMask[y * width + x] < 10) continue;

      const centerR = data[idx];
      const centerG = data[idx + 1];
      const centerB = data[idx + 2];

      let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;

          // 边界处理
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
          if (fullAlphaMask && fullAlphaMask[ny * width + nx] < 10) continue;

          const nIdx = (ny * width + nx) * 4;
          const nR = data[nIdx];
          const nG = data[nIdx + 1];
          const nB = data[nIdx + 2];

          // 空间权重（预计算）
          const spaceWeight = spaceKernel[dy + radius][dx + radius];

          // 颜色权重
          const colorDist = 0.299 * (centerR - nR) ** 2 + 0.587 * (centerG - nG) ** 2 + 0.114 * (centerB - nB) ** 2;
          const colorWeight = Math.exp(-colorDist * colorInvVar);

          const weight = spaceWeight * colorWeight;
          sumR += nR * weight;
          sumG += nG * weight;
          sumB += nB * weight;
          sumWeight += weight;
        }
      }

      if (sumWeight > 0) {
        out[idx] = Math.round(sumR / sumWeight);
        out[idx + 1] = Math.round(sumG / sumWeight);
        out[idx + 2] = Math.round(sumB / sumWeight);
        // Alpha 保持不变
        out[idx + 3] = data[idx + 3];
      }
    }
  }

  return new ImageData(out, width, height);
}

/**
 * 预计算高斯核
 */
function precomputeGaussianKernel(radius: number, sigma: number): number[][] {
  const size = radius * 2 + 1;
  const kernel: number[][] = [];
  const invVar = 1 / (2 * sigma * sigma);

  for (let y = 0; y < size; y++) {
    kernel[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - radius;
      const dy = y - radius;
      kernel[y][x] = Math.exp(-(dx * dx + dy * dy) * invVar);
    }
  }

  return kernel;
}
