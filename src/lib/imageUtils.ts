import imageCompression from 'browser-image-compression';
import { luminance } from '@/lib/colorUtils';
import { pixelateWithMask, type PixelateMode } from '@/lib/pixelation/pixelate';

/**
 * 图片工具函数
 * 提供图片格式转换、压缩、像素化、ASCII 转换等功能
 */

/**
 * 支持的图片格式
 */
export const SUPPORTED_FORMATS = {
  input: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'],
  output: ['png', 'webp', 'avif', 'jpg'],
};

/**
 * 格式转换映射
 */
export const FORMAT_CONVERSIONS: Record<string, string[]> = {
  jpg: ['png', 'webp'],
  jpeg: ['png', 'webp'],
  png: ['webp', 'jpg'],
  webp: ['avif', 'png', 'jpg'],
  heic: ['jpg', 'png'],
  gif: ['webp'],
};

/**
 * ASCII 字符集预设
 */
export const ASCII_PRESETS: Record<string, { name: string; chars: string; description: string }> = {
  default: {
    name: '默认',
    chars: '@%#*+=-:. ',
    description: '标准 ASCII 字符集',
  },
  blocks: {
    name: '方块',
    chars: '█▓▒░ ',
    description: '方块字符集',
  },
  symbols: {
    name: '符号',
    chars: '♠♥♦♣★☆◎●○■□▲▼◆◇',
    description: '特殊符号字符集',
  },
  custom: {
    name: '自定义',
    chars: '',
    description: '用户自定义字符集，支持中文、字母、符号等任意字符',
  },
};

/**
 * 获取文件扩展名
 * @param filename - 文件名
 * @returns 扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * 读取文件为 Image
 * @param file - 图片文件
 * @returns Image 对象
 */
export function readFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 转换图片格式
 * @param file - 源文件
 * @param targetFormat - 目标格式
 * @returns 转换后的 Blob
 */
export async function convertImageFormat(
  file: File,
  targetFormat: string
): Promise<Blob> {
  const img = await readFileAsImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // 构建 MIME type，处理特殊格式
  const getMimeType = (format: string): string => {
    switch (format) {
      case 'jpg': return 'image/jpeg';
      case 'heic': return 'image/heic';
      case 'svg': return 'image/svg+xml';
      default: return `image/${format}`;
    }
  };

  const mimeType = getMimeType(targetFormat);

  // SVG 格式需要特殊处理：将 canvas 内容转换为 SVG 数据 URL
  if (targetFormat === 'svg') {
    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">
        <image href="${canvas.toDataURL('image/png')}" width="${img.width}" height="${img.height}"/>
      </svg>
    `;
    const blob = new Blob([svgData.trim()], { type: 'image/svg+xml' });
    return blob;
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        canvas.toBlob((fallbackBlob) => {
          resolve(fallbackBlob || new Blob());
        }, 'image/png');
      }
    }, mimeType, 0.92);
  });
}

/**
 * 压缩图片 - 使用原生 Canvas API，性能更好
 * @param file - 源文件
 * @param quality - 压缩质量 (0-1)
 * @returns 压缩后的 Blob
 */
export async function compressImage(
  file: File,
  quality: number = 0.8
): Promise<Blob> {
  const img = await readFileAsImage(file);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // 根据质量设置最大尺寸限制
  const maxDimension = quality >= 0.9 ? 4096 : quality >= 0.7 ? 2048 : 1280;

  let { width, height } = img;

  // 等比缩放
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;

  // 使用高质量缩放
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // 确定输出格式：PNG使用有损的webp格式进行压缩，其他使用jpeg
  const isPng = file.type === 'image/png';
  const outputType = isPng ? 'image/webp' : 'image/jpeg';
  const outputQuality = quality;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      },
      outputType,
      outputQuality
    );
  });

  // 如果压缩后反而更大（且原图不是已经很小），返回原图
  if (blob.size >= file.size && file.size >= 100 * 1024) {
    return file;
  }

  return blob;
}

/**
 * 像素化图片 - 使用拼豆吧算法（区域平均采样 + 三模式支持）
 * @param file - 源文件
 * @param pixelSize - 像素块大小（每个像素块占用的原图像素数）
 * @param showGrid - 是否显示辅助网格
 * @param mode - 像素化模式：photo(照片加权平均) | simple(简单平均) | illustration(插画平滑)
 * @returns 像素化后的 Blob
 */
export async function pixelateImage(
  file: File,
  pixelSize: number = 8,
  showGrid: boolean = false,
  mode: PixelateMode = 'simple'
): Promise<Blob> {
  const img = await readFileAsImage(file);

  // 限制像素块数量，确保输出质量
  const maxPixels = 128;
  const targetPixelSize = Math.max(pixelSize, 4);

  // 计算输出尺寸：保持宽高比，限制最大像素数
  const aspectRatio = img.width / img.height;
  let outWidth: number;
  let outHeight: number;

  if (aspectRatio >= 1) {
    outWidth = Math.min(maxPixels, Math.floor(img.width / targetPixelSize));
    outHeight = Math.max(1, Math.round(outWidth / aspectRatio));
  } else {
    outHeight = Math.min(maxPixels, Math.floor(img.height / targetPixelSize));
    outWidth = Math.max(1, Math.round(outHeight * aspectRatio));
  }

  // 获取原始图像数据
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = img.width;
  srcCanvas.height = img.height;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(img, 0, 0);
  const srcImageData = srcCtx.getImageData(0, 0, img.width, img.height);

  // 使用拼豆算法像素化（无 mask，全区域处理）
  const pixelated = pixelateWithMask(srcImageData, outWidth, outHeight, null, { mode });

  // 放大到显示尺寸，使用最近邻保持硬边缘
  const displayScale = Math.max(1, Math.floor(Math.min(800 / outWidth, 800 / outHeight)));
  const finalWidth = outWidth * displayScale;
  const finalHeight = outHeight * displayScale;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = finalWidth;
  finalCanvas.height = finalHeight;
  const finalCtx = finalCanvas.getContext('2d')!;

  // 先创建中间画布放大数据
  const midCanvas = document.createElement('canvas');
  midCanvas.width = outWidth;
  midCanvas.height = outHeight;
  const midCtx = midCanvas.getContext('2d')!;
  midCtx.putImageData(pixelated, 0, 0);

  // 使用最近邻放大
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(midCanvas, 0, 0, finalWidth, finalHeight);

  // 绘制辅助网格
  if (showGrid) {
    finalCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    finalCtx.lineWidth = 1;

    for (let x = 0; x <= outWidth; x++) {
      const px = x * displayScale;
      finalCtx.beginPath();
      finalCtx.moveTo(px, 0);
      finalCtx.lineTo(px, finalHeight);
      finalCtx.stroke();
    }

    for (let y = 0; y <= outHeight; y++) {
      const py = y * displayScale;
      finalCtx.beginPath();
      finalCtx.moveTo(0, py);
      finalCtx.lineTo(finalWidth, py);
      finalCtx.stroke();
    }
  }

  return new Promise((resolve) => {
    finalCanvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
  });
}

/**
 * GameBoy 风格像素化
 * @param file - 源文件
 * @param pixelSize - 像素大小
 * @returns 处理后的 Blob
 */
export async function gameboyPixelate(
  file: File,
  pixelSize: number = 8
): Promise<Blob> {
  const img = await readFileAsImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const width = Math.floor(img.width / pixelSize);
  const height = Math.floor(img.height / pixelSize);

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const palette = [
    [155, 188, 15],
    [139, 172, 15],
    [48, 98, 48],
    [15, 56, 15],
  ];

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(luminance(data[i], data[i + 1], data[i + 2]));
    const colorIndex = Math.min(3, Math.floor((gray / 255) * 4));
    const color = palette[colorIndex];
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
  }

  ctx.putImageData(imageData, 0, 0);

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = img.width;
  finalCanvas.height = img.height;
  const finalCtx = finalCanvas.getContext('2d')!;
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(canvas, 0, 0, img.width, img.height);

  return new Promise((resolve) => {
    finalCanvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
  });
}

/**
 * ASCII 转换配置选项
 */
export interface AsciiOptions {
  /** 字符集预设名称 */
  preset?: string;
  /** 自定义字符集 */
  customChars?: string;
  /** 输出宽度（字符数） */
  width?: number;
  /** 是否彩色输出 */
  colored?: boolean;
}

/**
 * 获取字符集
 * @param options - ASCII 配置选项
 * @returns 字符集字符串
 */
function getAsciiChars(options: AsciiOptions): string {
  const { preset = 'default', customChars = '' } = options;

  if (preset === 'custom' && customChars) {
    return customChars;
  }

  const presetData = ASCII_PRESETS[preset];
  if (presetData && presetData.chars) {
    return presetData.chars;
  }

  return ASCII_PRESETS.default.chars;
}

/**
 * 检测并返回水印区域（图片底部边缘的横向条带）
 * @param data - 图像像素数据
 * @param width - 图像宽度
 * @param height - 图像高度
 * @returns 水印区域的起始Y坐标，如果没有检测到则返回null
 */
function detectWatermarkRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { startY: number; endY: number } | null {
  // 水印通常在底部 5%-20% 区域，扩大扫描范围
  const bottomStart = Math.floor(height * 0.75);

  // 计算主体内容区域（上方 75%）的平均颜色和颜色丰富度，作为对比基准
  let mainAvgR = 0, mainAvgG = 0, mainAvgB = 0;
  let mainPixelCount = 0;
  const mainColorSet = new Set<string>();

  for (let y = 0; y < bottomStart; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue;

      mainAvgR += r;
      mainAvgG += g;
      mainAvgB += b;
      mainPixelCount++;

      const key = `${Math.round(r / 20) * 20},${Math.round(g / 20) * 20},${Math.round(b / 20) * 20}`;
      mainColorSet.add(key);
    }
  }

  if (mainPixelCount === 0) return null;

  mainAvgR /= mainPixelCount;
  mainAvgG /= mainPixelCount;
  mainAvgB /= mainPixelCount;

  // 主体内容的颜色丰富度（颜色种类数）
  const mainColorVariety = mainColorSet.size;

  // 逐行分析底部区域
  const rowInfos: {
    y: number;
    uniqueColors: number;
    dominantRatio: number;
    avgR: number;
    avgG: number;
    avgB: number;
    textLikePixels: number; // 疑似文字像素数（与背景色差异适中的像素）
  }[] = [];

  for (let y = bottomStart; y < height; y++) {
    const colorCounts = new Map<string, number>();
    let rowPixelCount = 0;
    let rowAvgR = 0, rowAvgG = 0, rowAvgB = 0;
    let textLikePixels = 0;

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue;

      rowPixelCount++;
      rowAvgR += r;
      rowAvgG += g;
      rowAvgB += b;

      const quantizedR = Math.round(r / 25) * 25;
      const quantizedG = Math.round(g / 25) * 25;
      const quantizedB = Math.round(b / 25) * 25;
      const key = `${quantizedR},${quantizedG},${quantizedB}`;
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);

      // 检测疑似文字像素：与主体平均色有明显差异，但不是极端颜色
      const diffFromMain = Math.abs(r - mainAvgR) + Math.abs(g - mainAvgG) + Math.abs(b - mainAvgB);
      if (diffFromMain > 30 && diffFromMain < 400) {
        textLikePixels++;
      }
    }

    if (rowPixelCount === 0) continue;

    rowAvgR /= rowPixelCount;
    rowAvgG /= rowPixelCount;
    rowAvgB /= rowPixelCount;

    const uniqueColors = colorCounts.size;
    const maxColorCount = Math.max(...colorCounts.values(), 0);
    const dominantRatio = maxColorCount / rowPixelCount;

    rowInfos.push({
      y,
      uniqueColors,
      dominantRatio,
      avgR: rowAvgR,
      avgG: rowAvgG,
      avgB: rowAvgB,
      textLikePixels,
    });
  }

  // 寻找水印区域：
  // 1. 颜色种类明显少于主体内容（水印通常是文字+背景，颜色少）
  // 2. 有适量的"文字像素"（证明有文字内容而不是纯色背景）
  // 3. 连续多行符合特征
  let bestStart: number | null = null;
  let bestEnd: number | null = null;
  let bestScore = 0;

  for (let i = 0; i < rowInfos.length; i++) {
    let consecutiveRows = 0;
    let totalTextPixels = 0;
    let startY = rowInfos[i].y;

    for (let j = i; j < rowInfos.length; j++) {
      const info = rowInfos[j];

      // 水印行特征：
      // - 颜色种类比主体少很多（< 主体颜色种类的 15%）
      // - 或者颜色种类很少（<= 5）
      // - 有文字像素（证明不是纯色背景）
      const isLowVariety = info.uniqueColors <= 5 || info.uniqueColors < mainColorVariety * 0.15;
      const hasTextContent = info.textLikePixels > width * 0.02; // 至少2%的像素是文字

      if (isLowVariety && hasTextContent) {
        consecutiveRows++;
        totalTextPixels += info.textLikePixels;
      } else {
        break;
      }
    }

    // 评分：连续行数 * 文字像素密度
    const score = consecutiveRows * (totalTextPixels / Math.max(width * consecutiveRows, 1));

    if (consecutiveRows >= 2 && score > bestScore) {
      bestScore = score;
      bestStart = startY;
      bestEnd = rowInfos[i + consecutiveRows - 1]?.y ?? startY;
    }
  }

  if (bestStart !== null && bestEnd !== null) {
    return { startY: bestStart, endY: bestEnd };
  }

  return null;
}

/**
 * 转换为 ASCII 艺术 - 高质量算法
 * 核心思路：
 * 1. BFS flood-fill 从边缘标记背景区域（渐变背景也能被清理）
 * 2. 主体内部相似颜色因不连通到边缘而保留（保护高光细节）
 * 3. Floyd-Steinberg 抖动算法消除色带
 * 4. Sobel 边缘检测作为 flood-fill 屏障
 * 5. 大字符集映射保留丰富层次
 */
export async function convertToAscii(
  file: File,
  options: AsciiOptions = {}
): Promise<string> {
  const {
    width: asciiWidth = 120,
    colored = false,
  } = options;

  const chars = getAsciiChars(options);
  if (!chars) throw new Error('字符集不能为空');

  const img = await readFileAsImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const scale = asciiWidth / img.width;
  const width = asciiWidth;
  const height = Math.floor(img.height * scale / 1.4);

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // 第一步：分析图片，检测主背景色
  const colorMap = new Map<string, number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a < 128) continue;
      const key = `${Math.round(data[i] / 20) * 20},${Math.round(data[i + 1] / 20) * 20},${Math.round(data[i + 2] / 20) * 20}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
  }

  let bgColor: [number, number, number] | null = null;
  let maxCount = 0;
  for (const [key, count] of colorMap) {
    if (count > maxCount) {
      maxCount = count;
      const [r, g, b] = key.split(',').map(Number);
      bgColor = [r, g, b];
    }
  }

  const isBgLight = bgColor ? (bgColor[0] + bgColor[1] + bgColor[2]) / 3 > 128 : false;

  // 第二步：Sobel 边缘检测 + BFS flood-fill 标记背景区域
  // 2a. Sobel 边缘检测
  const edgeMap = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const getGray = (px: number, py: number) => {
        const idx = (py * width + px) * 4;
        return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      };
      const gx = -getGray(x-1,y-1) + getGray(x+1,y-1)
                -2*getGray(x-1,y)   + 2*getGray(x+1,y)
                -getGray(x-1,y+1) + getGray(x+1,y+1);
      const gy = -getGray(x-1,y-1) - 2*getGray(x,y-1) - getGray(x+1,y-1)
                +getGray(x-1,y+1) + 2*getGray(x,y+1) + getGray(x+1,y+1);
      edgeMap[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // 自适应边缘阈值
  let edgeSum = 0, edgeCount = 0;
  for (let i = 0; i < width * height; i++) {
    if (edgeMap[i] > 0) { edgeSum += edgeMap[i]; edgeCount++; }
  }
  const avgEdge = edgeCount > 0 ? edgeSum / edgeCount : 0;
  const edgeThreshold = Math.max(25, avgEdge * 1.2);

  // 辅助函数：判断像素颜色是否接近背景色
  function isNearBg(d: Uint8ClampedArray, idx: number, bg: [number, number, number], threshold: number): boolean {
    const diff = Math.abs(d[idx * 4] - bg[0]) + Math.abs(d[idx * 4 + 1] - bg[1]) + Math.abs(d[idx * 4 + 2] - bg[2]);
    return diff < threshold;
  }

  // 2b. BFS flood-fill：从边缘开始扩散
  const isBgArea = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // 边缘入队
  if (bgColor) {
    for (let x = 0; x < width; x++) {
      const topIdx = x, bottomIdx = (height - 1) * width + x;
      if (isNearBg(data, topIdx, bgColor, 25)) { queue.push(topIdx); visited[topIdx] = 1; }
      if (isNearBg(data, bottomIdx, bgColor, 25)) { queue.push(bottomIdx); visited[bottomIdx] = 1; }
    }
    for (let y = 1; y < height - 1; y++) {
      const leftIdx = y * width, rightIdx = y * width + width - 1;
      if (isNearBg(data, leftIdx, bgColor, 25)) { queue.push(leftIdx); visited[leftIdx] = 1; }
      if (isNearBg(data, rightIdx, bgColor, 25)) { queue.push(rightIdx); visited[rightIdx] = 1; }
    }

    while (queue.length > 0) {
      const idx = queue.shift()!;
      const cx = idx % width;
      const cy = (idx / width) | 0;
      isBgArea[idx] = 1;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = ny * width + nx;
            if (!visited[nidx]) {
              // 强边缘作为屏障（主体轮廓）
              if (edgeMap[nidx] > edgeThreshold * 2.0) continue;
              // 颜色接近背景色直接通过
              if (isNearBg(data, nidx, bgColor, 70)) {
                visited[nidx] = 1;
                queue.push(nidx);
              }
            }
          }
        }
      }
    }
  }

  // 第三步：Floyd-Steinberg 抖动
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const oldGray = gray[i];
      const newGray = Math.round(oldGray / 255 * (chars.length - 1)) / (chars.length - 1) * 255;
      const error = oldGray - newGray;
      gray[i] = newGray;

      if (x + 1 < width) gray[y * width + x + 1] += error * (7 / 16);
      if (y + 1 < height) {
        if (x - 1 >= 0) gray[(y + 1) * width + x - 1] += error * (3 / 16);
        gray[(y + 1) * width + x] += error * (5 / 16);
        if (x + 1 < width) gray[(y + 1) * width + x + 1] += error * (1 / 16);
      }
    }
  }

  // 第四步：生成 ASCII
  const sortedChars = chars.split('').reverse().join('');
  const charLen = sortedChars.length;
  const watermarkRegion = detectWatermarkRegion(data, width, height);

  let ascii = '';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];

      if (a < 50) { ascii += ' '; continue; }
      if (watermarkRegion && y >= watermarkRegion.startY && y <= watermarkRegion.endY) { ascii += ' '; continue; }
      if (isBgArea[y * width + x]) { ascii += ' '; continue; }

      // 根据抖动后的灰度值选择字符
      const ditheredGray = gray[y * width + x];
      const charIndex = isBgLight
        ? Math.floor((ditheredGray / 255) * (charLen - 1))
        : Math.floor((1 - ditheredGray / 255) * (charLen - 1));
      const char = sortedChars[Math.max(0, Math.min(charIndex, charLen - 1))];

      if (colored) {
        ascii += `<span style="color:rgb(${data[i]},${data[i + 1]},${data[i + 2]})">${char}</span>`;
      } else {
        ascii += char;
      }
    }
    ascii += '\n';
  }

  return ascii;
}

/**
 * 下载文件
 * @param blob - 文件 Blob
 * @param filename - 文件名
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
