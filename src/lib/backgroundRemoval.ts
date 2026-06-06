import { removeBackground, preload } from '@imgly/background-removal';

let modelReady = false;
let preloadPromise: Promise<void> | null = null;

/** AI 处理的最大分辨率（提高以提升抠图质量） */
const BG_REMOVE_MAX_DIM = 1024;

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
 * 高斯模糊 alpha 通道
 */
function gaussianBlurAlpha(alpha: Uint8Array, w: number, h: number, sigma: number): Uint8Array {
  const radius = Math.ceil(sigma * 3);
  const out = new Uint8Array(alpha.length);
  
  const kernel: number[] = [];
  let kernelSum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(v);
    kernelSum += v;
  }
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= kernelSum;
  }
  
  // 水平方向
  const temp = new Float32Array(w * h);
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
      out[y * w + x] = Math.round(Math.max(0, Math.min(255, sum)));
    }
  }
  
  return out;
}

/**
 * 处理 AI 抠图的 alpha 掩码：
 * 1. 提取原始 alpha
 * 2. 极轻微高斯模糊（σ=0.5）去除毛刺
 * 3. 不做对比度增强，保留原始颜色
 */
function processAlphaMask(imageData: ImageData): Uint8Array {
  const { data, width, height } = imageData;
  const len = width * height;
  const alpha = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    alpha[i] = data[i * 4 + 3];
  }
  
  const smoothed = gaussianBlurAlpha(alpha, width, height, 0.5);
  
  return smoothed;
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
    
    const processedAlpha = processAlphaMask(aiImageData);
    
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
