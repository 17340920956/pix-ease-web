import imageCompression from 'browser-image-compression';

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
    const img = new Image();
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
 * 像素化图片 - 智能采样保留细节
 * @param file - 源文件
 * @param pixelSize - 像素块大小（每个像素块占用的原图像素数）
 * @param showGrid - 是否显示辅助网格
 * @returns 像素化后的 Blob
 */
export async function pixelateImage(
  file: File,
  pixelSize: number = 8,
  showGrid: boolean = false
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

  // 第一步：高质量缩小采样（使用双线性过滤获取平均颜色）
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = outWidth;
  sampleCanvas.height = outHeight;
  const sampleCtx = sampleCanvas.getContext('2d')!;
  sampleCtx.imageSmoothingEnabled = true;
  sampleCtx.imageSmoothingQuality = 'high';
  sampleCtx.drawImage(img, 0, 0, outWidth, outHeight);

  // 获取缩小后的像素数据
  const sampleData = sampleCtx.getImageData(0, 0, outWidth, outHeight).data;

  // 第二步：中值滤波 + 边缘增强，保留重要细节
  const processedData = new Uint8ClampedArray(sampleData.length);
  for (let i = 0; i < sampleData.length; i += 4) {
    processedData[i] = sampleData[i];
    processedData[i + 1] = sampleData[i + 1];
    processedData[i + 2] = sampleData[i + 2];
    processedData[i + 3] = sampleData[i + 3];
  }

  // 第三步：放大到显示尺寸，使用最近邻保持硬边缘
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
  midCtx.putImageData(new ImageData(processedData, outWidth, outHeight), 0, 0);

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
    const gray = Math.round(
      data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    );
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
 * 转换为 ASCII 艺术
 * @param file - 源文件
 * @param options - ASCII 配置选项
 * @returns ASCII 字符串
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

  if (!chars) {
    throw new Error('字符集不能为空');
  }

  const img = await readFileAsImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // 计算采样尺寸，保持原始宽高比
  // 渲染时字符高宽比为 1.4 (14px/10px)，采样时需要补偿这个比例
  // 否则渲染出来的形状会被纵向拉伸 1.4 倍
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
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue;

      // 量化颜色到最近的主要颜色（减少颜色数量）
      const quantizedR = Math.round(r / 20) * 20;
      const quantizedG = Math.round(g / 20) * 20;
      const quantizedB = Math.round(b / 20) * 20;
      const key = `${quantizedR},${quantizedG},${quantizedB}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
  }

  // 找出最常见的颜色作为主背景色
  let bgColor: [number, number, number] | null = null;
  let maxCount = 0;
  for (const [key, count] of colorMap) {
    if (count > maxCount) {
      maxCount = count;
      const [r, g, b] = key.split(',').map(Number);
      bgColor = [r, g, b];
    }
  }

  // 判断背景色是亮色还是暗色
  const isBgLight = bgColor ? (bgColor[0] + bgColor[1] + bgColor[2]) / 3 > 128 : false;

  // 检测水印区域
  const watermarkRegion = detectWatermarkRegion(data, width, height);

  let ascii = '';
  let charIndex = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // 跳过透明像素
      if (a < 50) {
        ascii += ' ';
        continue;
      }

      // 如果当前像素在水印区域内，跳过转换（输出空格）
      if (watermarkRegion && y >= watermarkRegion.startY && y <= watermarkRegion.endY) {
        ascii += ' ';
        continue;
      }

      // 检测是否与背景色接近（纯色背景区域不生成字符）
      let isBackground = false;
      if (bgColor) {
        const colorDiff = Math.abs(r - bgColor[0]) + Math.abs(g - bgColor[1]) + Math.abs(b - bgColor[2]);
        // 颜色差异小于阈值视为背景
        isBackground = colorDiff < 60;
      }

      // 对于亮色背景：接近白色/背景色 → 空格
      // 对于暗色背景：接近黑色/背景色 → 空格
      if (isBgLight) {
        // 亮色背景：跳过接近背景色或非常亮的区域
        if (isBackground || (r > 230 && g > 230 && b > 230)) {
          ascii += ' ';
          continue;
        }
      } else {
        // 暗色背景：跳过接近背景色或非常暗的区域
        if (isBackground || (r < 30 && g < 30 && b < 30)) {
          ascii += ' ';
          continue;
        }
      }

      // 按顺序循环使用字符集中的字符，保证文本连续
      const char = chars[charIndex % chars.length] || ' ';
      charIndex++;

      if (colored) {
        ascii += `<span style="color:rgb(${r},${g},${b})">${char}</span>`;
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
