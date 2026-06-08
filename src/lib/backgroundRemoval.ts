import { removeBackground, preload } from '@imgly/background-removal';

let modelReady = false;
let preloadPromise: Promise<void> | null = null;

/** AI 处理的最大分辨率（提高到 2048 以保留更多细节） */
const BG_REMOVE_MAX_DIM = 2048;

export async function initBackgroundRemoval(): Promise<void> {
  if (modelReady) return;
  if (preloadPromise) return preloadPromise;

  preloadPromise = preload({
    model: 'isnet',
  })
    .then(() => {
      modelReady = true;
    })
    .catch((err) => {
      console.warn('[bg-removal] preload failed:', err?.message || err);
      preloadPromise = null;
    });

  return preloadPromise;
}

/**
 * 缩放图片到指定最大尺寸，保持比例
 */
async function resizeImage(source: string | Blob, maxDim: number): Promise<{ blob: Blob; img: HTMLImageElement }> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('图片加载失败'));
      image.src = url;
    });

    const { width, height } = img;
    if (width <= maxDim && height <= maxDim) {
      return { blob: source instanceof Blob ? source : await fetchBlob(source), img };
    }

    const scale = maxDim / Math.max(width, height);
    const newW = Math.round(width * scale);
    const newH = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newW, newH);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    });

    return { blob, img };
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(url);
  }
}

async function fetchBlob(url: string): Promise<Blob> {
  const resp = await fetch(url);
  return await resp.blob();
}

/**
 * 可分离高斯模糊 alpha 通道（水平 + 垂直两遍）
 */
function gaussianBlurAlpha(alpha: Uint8Array, w: number, h: number, sigma: number): Float64Array {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const out = new Float64Array(alpha.length);
  
  const kernelSize = radius * 2 + 1;
  const kernel = new Float64Array(kernelSize);
  let kernelSum = 0;
  for (let i = 0; i < kernelSize; i++) {
    const x = i - radius;
    const v = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel[i] = v;
    kernelSum += v;
  }
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= kernelSum;
  }
  
  // 水平方向
  const temp = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(Math.max(x + k, 0), w - 1);
        sum += alpha[y * w + sx] * kernel[k + radius];
      }
      temp[y * w + x] = sum;
    }
  }
  
  // 垂直方向
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(Math.max(y + k, 0), h - 1);
        sum += temp[sy * w + x] * kernel[k + radius];
      }
      out[y * w + x] = sum;
    }
  }
  
  return out;
}

/**
 * 形态学腐蚀操作（缩小前景，消除小毛刺和孤立噪点）
 * 对每个像素，取其 3x3 邻域内的最小值
 */
function erodeAlpha(alpha: Float64Array | Uint8Array, w: number, h: number, iterations: number): Float64Array {
  let current = Float64Array.from(alpha);
  
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Float64Array(current.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let minVal = 255;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const val = current[ny * w + nx];
              if (val < minVal) minVal = val;
            }
          }
        }
        next[y * w + x] = minVal;
      }
    }
    current = next;
  }
  
  return current;
}

/**
 * 形态学膨胀操作（扩大前景，填充主体内部空洞）
 * 对每个像素，取其 3x3 邻域内的最大值
 */
function dilateAlpha(alpha: Float64Array | Uint8Array, w: number, h: number, iterations: number): Float64Array {
  let current = Float64Array.from(alpha);
  
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Float64Array(current.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let maxVal = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const val = current[ny * w + nx];
              if (val > maxVal) maxVal = val;
            }
          }
        }
        next[y * w + x] = maxVal;
      }
    }
    current = next;
  }
  
  return current;
}

/**
 * 从原图四角采样估算背景色
 * 原理：大多数照片的四角通常是背景
 * 量化到 8 的倍数以提高鲁棒性
 */
function sampleBgColorFromCorners(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cornerSize: number = 10,
): { r: number; g: number; b: number } {
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  
  // 四个角采样
  const corners = [
    { x: 0, y: 0 },
    { x: width - cornerSize, y: 0 },
    { x: 0, y: height - cornerSize },
    { x: width - cornerSize, y: height - cornerSize },
  ];
  
  for (const corner of corners) {
    for (let dy = 0; dy < cornerSize; dy++) {
      for (let dx = 0; dx < cornerSize; dx++) {
        const x = corner.x + dx;
        const y = corner.y + dy;
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          rSum += Math.round(data[idx] / 8) * 8;
          gSum += Math.round(data[idx + 1] / 8) * 8;
          bSum += Math.round(data[idx + 2] / 8) * 8;
          count++;
        }
      }
    }
  }
  
  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  };
}

/**
 * 优化后的 alpha 掩码处理流程：
 * 1. 提取原始 alpha
 * 2. 开运算（先腐蚀后膨胀）：消除边缘小毛刺和孤立噪点
 * 3. 闭运算（先膨胀后腐蚀）：填充主体内部小空洞，修复粘连
 * 4. 背景色清理：将接近背景色的像素 alpha 清零
 *    - 更激进的清理策略：放宽邻域判断，更彻底地清理残留背景
 * 5. 边缘清理：对图像边缘区域进行额外清理（边缘通常是背景）
 * 6. 高斯模糊：使边缘平滑自然
 * 7. Alpha 压缩：将接近 0 的值推向 0，增强背景干净度
 */
function processAlphaMask(
  imageData: ImageData,
  bgColor?: { r: number; g: number; b: number },
): Uint8Array {
  const { data, width, height } = imageData;
  const len = width * height;
  const alpha = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    alpha[i] = data[i * 4 + 3];
  }
  
  const bgThreshold = 50; // 与背景色的差异阈值
  
  // 步骤 1：开运算 - 消除毛刺和孤立噪点（腐蚀 1 次 + 膨胀 1 次）
  let processed = erodeAlpha(alpha, width, height, 1);
  processed = dilateAlpha(processed, width, height, 1);
  
  // 步骤 2：闭运算 - 填充主体内部空洞（膨胀 1 次 + 腐蚀 1 次）
  processed = dilateAlpha(processed, width, height, 1);
  processed = erodeAlpha(processed, width, height, 1);
  
  // 步骤 3：背景色清理 - 更激进的策略
  // 判断依据：像素颜色接近背景色 且 周围有低 alpha 区域
  if (bgColor) {
    const neighborRadius = 2; // 减小半径（5x5），更彻底地清理边缘附近背景
    const bgNeighborThreshold = 100; // 降低阈值，更激进地清理
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const colorDiff = Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b);
        
        if (colorDiff < bgThreshold) {
          // 计算 5x5 邻域内的最小 alpha 值
          let minNeighborAlpha = 255;
          for (let dy = -neighborRadius; dy <= neighborRadius; dy++) {
            for (let dx = -neighborRadius; dx <= neighborRadius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const val = processed[ny * width + nx];
                if (val < minNeighborAlpha) minNeighborAlpha = val;
              }
            }
          }
          
          // 如果邻域内有接近透明的像素，说明当前像素也应该是背景
          if (minNeighborAlpha < 50) {
            processed[i] = 0;
          }
        }
      }
    }
  }
  
  // 步骤 4：边缘清理 - 图像边缘 5% 区域通常是背景
  const edgeMargin = Math.max(3, Math.floor(Math.min(width, height) * 0.05));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 判断是否在边缘区域
      const isEdge = x < edgeMargin || x >= width - edgeMargin || 
                     y < edgeMargin || y >= height - edgeMargin;
      if (isEdge && processed[y * width + x] < 80) {
        processed[y * width + x] = 0;
      }
    }
  }
  
  // 步骤 5：高斯模糊 - 使边缘平滑
  processed = gaussianBlurAlpha(processed, width, height, 0.8);
  
  // 步骤 6：Alpha 压缩 - 更激进地将低 alpha 推向 0
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    let val = processed[i];
    if (val < 0) val = 0;
    if (val > 255) val = 255;
    
    // 更激进的 S 型曲线：增强背景干净度
    const normalized = val / 255;
    // 使用更陡峭的 sigmoid 曲线，让接近 0 的值更接近 0
    const compressed = (Math.tanh((normalized - 0.4) * 8) + 1) / 2;
    out[i] = Math.round(compressed * 255);
  }
  
  return out;
}

export async function removeImageBackground(
  source: string | Blob,
  onProgress?: (stage: string) => void,
): Promise<Blob | null> {
  try {
    if (!modelReady) {
      onProgress?.('正在加载 AI 模型...');
      await initBackgroundRemoval();
    }
    if (!modelReady) {
      console.warn('[bg-removal] model not ready, falling back');
      return null;
    }

    onProgress?.('正在预处理图片...');
    const { blob: resized } = await resizeImage(source, BG_REMOVE_MAX_DIM);

    // 从原图四角采样背景色（在AI处理前）
    const origImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('原图加载失败'));
      img.src = URL.createObjectURL(resized);
    });

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = origImg.width;
    sampleCanvas.height = origImg.height;
    const sampleCtx = sampleCanvas.getContext('2d')!;
    sampleCtx.drawImage(origImg, 0, 0);
    const origImageData = sampleCtx.getImageData(0, 0, origImg.width, origImg.height);
    const bgColor = sampleBgColorFromCorners(origImageData.data, origImg.width, origImg.height);

    onProgress?.('AI 分析中...');
    const result = await removeBackground(resized, {
      model: 'isnet',
      output: { format: 'image/png' },
    });

    onProgress?.('后处理中...');
    
    const resultImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('AI结果加载失败'));
      img.src = URL.createObjectURL(result);
    });

    const canvas = document.createElement('canvas');
    canvas.width = resultImg.width;
    canvas.height = resultImg.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(resultImg, 0, 0);
    const aiImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const processedAlpha = processAlphaMask(aiImageData, bgColor);
    
    for (let i = 0; i < processedAlpha.length; i++) {
      aiImageData.data[i * 4 + 3] = processedAlpha[i];
    }
    
    ctx.putImageData(aiImageData, 0, 0);
    
    const finalBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    });

    onProgress?.('抠图完成');
    return finalBlob;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[bg-removal] removeBackground failed:', msg);
    return null;
  }
}

/**
 * 根据手动掩码（与原图同尺寸）生成 alpha 掩码
 * @param manualMask 手动掩码 Uint8Array，255=保留，0=透明
 * @param imgWidth 原图宽度
 * @param imgHeight 原图高度
 * @returns alpha 掩码 Uint8Array
 */
export function createManualAlphaMask(
  manualMask: Uint8Array,
  imgWidth: number,
  imgHeight: number,
): Uint8Array {
  // 轻微高斯模糊使边缘柔和
  const smoothed = gaussianBlurAlpha(manualMask, imgWidth, imgHeight, 1.5);
  
  // 二值化：>128 保留，<=128 透明
  const alpha = new Uint8Array(imgWidth * imgHeight);
  for (let i = 0; i < alpha.length; i++) {
    alpha[i] = smoothed[i] > 128 ? 255 : 0;
  }
  
  return alpha;
}
