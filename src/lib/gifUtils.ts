import { parseGIF, decompressFrames } from 'gifuct-js';
import type { GifFrame } from '@/store/useGifStore';

/**
 * GIF 工具函数
 * 提供 GIF 解析、帧提取、生成等功能
 */

/**
 * 解析 GIF 文件并提取帧数据
 * 使用浏览器原生 ImageDecoder API 或 canvas 绘制方式解析
 * @param file - GIF 文件
 * @returns 帧数据数组
 */
export async function parseGifFile(file: File): Promise<GifFrame[]> {
  // 创建图片对象加载 GIF
  const img = new Image();
  const url = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  // 创建 canvas 来提取每一帧
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  // 绘制第一帧
  ctx.drawImage(img, 0, 0);

  // 获取图像数据
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(url);

  // 返回单帧（浏览器会将 GIF 第一帧作为静态图显示）
  // 对于动画 GIF，我们需要使用其他方式提取多帧
  return [{
    id: `frame-0-${Date.now()}`,
    imageData,
    delay: 100,
    canvas,
  }];
}

/**
 * 使用浏览器原生方式解析 GIF，最可靠
 * @param file - GIF 文件
 * @returns 帧数据数组
 */
async function parseGifWithBrowser(file: File): Promise<GifFrame[]> {
  const url = URL.createObjectURL(file);
  
  // 首先获取 GIF 的基本信息和帧数
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const width = img.width;
  const height = img.height;

  // 用最稳妥的方法：先创建一个能显示 GIF 的 canvas，然后快速捕捉每一帧
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const imgElement = document.createElement('img');
  imgElement.src = url;
  
  await new Promise<void>((resolve) => {
    imgElement.onload = () => resolve();
  });

  // 先画出第一帧
  ctx.drawImage(imgElement, 0, 0);
  
  const gifFrames: GifFrame[] = [{
    id: `frame-0-${Date.now()}`,
    imageData: ctx.getImageData(0, 0, width, height),
    delay: 100,
    canvas: document.createElement('canvas'),
  }];
  
  // 复制当前帧到 canvas
  gifFrames[0].canvas.width = width;
  gifFrames[0].canvas.height = height;
  gifFrames[0].canvas.getContext('2d')!.drawImage(canvas, 0, 0);

  // 如果有 gifuct-js，尝试用它获取帧数
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const gif = parseGIF(uint8Array);
    const frames = decompressFrames(gif, true);

    if (frames.length > 1) {
      console.log('Found multiple frames, using gifuct-js for full parsing');
      
      const gifuctFrames = await parseGifWithGifuct(file);
      if (gifuctFrames.length > 1) {
        URL.revokeObjectURL(url);
        return gifuctFrames;
      }
    }
  } catch (e) {
    console.log('Single frame GIF or error in advanced parse');
  }

  URL.revokeObjectURL(url);
  return gifFrames;
}

/**
 * 使用 gifuct-js 解析
 */
async function parseGifWithGifuct(file: File): Promise<GifFrame[]> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const gif = parseGIF(uint8Array);
  const frames = decompressFrames(gif, true);
  
  const gifWidth = gif.lsd.width;
  const gifHeight = gif.lsd.height;

  console.log('GIF info:', {
    width: gifWidth,
    height: gifHeight,
    frameCount: frames.length,
    hasGCT: !!gif.gct,
    gctSize: gif.gct?.length
  });

  // 调试：打印第一帧的详细信息
  if (frames.length > 0) {
    const firstFrame = frames[0];
    console.log('First frame detailed info:', {
      dims: firstFrame.dims,
      hasPatch: !!firstFrame.patch,
      patchType: typeof firstFrame.patch,
      patchLength: firstFrame.patch?.length,
      hasColorTable: !!firstFrame.colorTable,
      hasGCT: !!gif.gct,
      transparentIndex: firstFrame.transparentIndex,
      disposalType: firstFrame.disposalType,
      delay: firstFrame.delay,
      // 打印 patch 前 20 个值和 palette 前几个颜色
      patchSample: firstFrame.patch?.slice(0, 20),
      paletteSample: (firstFrame.colorTable || gif.gct)?.slice(0, 30)
    });
  }

  const gifFrames: GifFrame[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = gifWidth;
  canvas.height = gifHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, gifWidth, gifHeight);

  let lastDisposalImage: ImageData | null = null;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    if (i > 0) {
      const prevFrame = frames[i - 1];
      if (prevFrame.disposalType === 2) {
        ctx.clearRect(0, 0, gifWidth, gifHeight);
      } else if (prevFrame.disposalType === 3 && lastDisposalImage) {
        ctx.putImageData(lastDisposalImage, 0, 0);
      }
    }

    if (frame.disposalType === 3) {
      lastDisposalImage = ctx.getImageData(0, 0, gifWidth, gifHeight);
    }

    const palette = frame.colorTable || gif.gct;
    const transparentIndex = frame.transparentIndex;

    if (palette) {
      const dims = frame.dims;
      
      // 关键修复：检查 frame.patch 或者 frame.pixels
      const pixelData = frame.patch || frame.pixels;
      
      if (pixelData) {
        // 方法 1: 如果有现成的 patch（Uint8ClampedArray），直接用
        if (frame.patch && frame.patch.length === dims.width * dims.height * 4) {
          console.log(`Frame ${i}: Using pre-built patch!`);
          const imageData = new ImageData(
            new Uint8ClampedArray(frame.patch),
            dims.width,
            dims.height
          );
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = dims.width;
          tempCanvas.height = dims.height;
          tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);
          ctx.drawImage(tempCanvas, dims.left, dims.top);
        } 
        // 方法 2: 需要自己从调色板构建
        else {
          const imageData = ctx.createImageData(dims.width, dims.height);
          const data = imageData.data;

          for (let y = 0; y < dims.height; y++) {
            for (let x = 0; x < dims.width; x++) {
              const idx = (y * dims.width + x);
              const pixel = pixelData[idx];
              const offset = idx * 4;

              if (transparentIndex !== undefined && pixel === transparentIndex) {
                data[offset] = 0;
                data[offset + 1] = 0;
                data[offset + 2] = 0;
                data[offset + 3] = 0;
              } else {
                const colorOffset = pixel * 3;
                if (colorOffset + 2 < palette.length) {
                  data[offset] = palette[colorOffset];
                  data[offset + 1] = palette[colorOffset + 1];
                  data[offset + 2] = palette[colorOffset + 2];
                  data[offset + 3] = 255;
                }
              }
            }
          }

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = dims.width;
          tempCanvas.height = dims.height;
          tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);
          ctx.drawImage(tempCanvas, dims.left, dims.top);
        }
      }
    }

    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = gifWidth;
    frameCanvas.height = gifHeight;
    const frameCtx = frameCanvas.getContext('2d')!;
    frameCtx.drawImage(canvas, 0, 0);

    gifFrames.push({
      id: `frame-${i}-${Date.now()}`,
      imageData: frameCtx.getImageData(0, 0, gifWidth, gifHeight),
      delay: frame.delay || 100,
      canvas: frameCanvas,
    });
  }

  return gifFrames;
}

/**
 * 使用 gifuct-js 解析 GIF 文件并提取帧数据
 * 使用浏览器原生 Canvas API 解码每一帧，避免解析错误
 * @param file - GIF 文件
 * @returns 帧数据数组
 */
export async function parseGifFileAdvanced(file: File): Promise<GifFrame[]> {
  try {
    // 优先使用浏览器解析，这是最可靠的
    return await parseGifWithBrowser(file);
  } catch (error) {
    console.error('Browser GIF parse failed, trying fallback:', error);
    try {
      return await parseGifWithGifuct(file);
    } catch (e) {
      console.error('All parses failed, using simple parse:', e);
      return parseGifFile(file);
    }
  }
}

/**
 * 生成 GIF Blob
 * @param frames - 帧数据数组
 * @param onProgress - 进度回调
 * @returns GIF Blob
 */
export async function generateGifBlob(
  frames: GifFrame[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // 动态导入 gif.js 以避免 SSR 问题
  const GIF = (await import('gif.js')).default;

  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: frames[0]?.canvas?.width || 300,
      height: frames[0]?.canvas?.height || 300,
      workerScript: '/gif.worker.js',
    });

    gif.on('finished', (blob: Blob) => {
      if (onProgress) onProgress(100);
      resolve(blob);
    });

    gif.on('progress', (p: number) => {
      if (onProgress) onProgress(Math.round(p * 100));
    });

    gif.on('error', (error: Error) => {
      reject(error);
    });

    frames.forEach((frame) => {
      if (frame.canvas) {
        gif.addFrame(frame.canvas, { delay: frame.delay });
      }
    });

    gif.render();
  });
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
 * 反转 GIF 帧顺序
 * @param frames - 帧数据数组
 * @returns 反转后的帧数据数组
 */
export function reverseFrames(frames: GifFrame[]): GifFrame[] {
  return [...frames].reverse();
}

/**
 * 调整 GIF 速度
 * @param frames - 帧数据数组
 * @param speed - 速度倍数
 * @returns 调整后的帧数据数组
 */
export function adjustSpeed(frames: GifFrame[], speed: number): GifFrame[] {
  return frames.map((frame) => ({
    ...frame,
    delay: Math.max(20, frame.delay / speed),
  }));
}
