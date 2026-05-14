/**
 * 图片处理 Web Worker
 * 用于在后台线程处理图片，避免阻塞主线程
 */

/**
 * Worker 消息类型
 */
interface WorkerMessage {
  id: string;
  type: 'compress' | 'pixelate' | 'convert' | 'processChunk';
  payload: {
    imageData?: ImageData;
    file?: ArrayBuffer;
    fileType?: string;
    quality?: number;
    pixelSize?: number;
    targetFormat?: string;
    chunk?: {
      start: number;
      end: number;
      width: number;
      height: number;
    };
  };
}

/**
 * Worker 响应类型
 */
interface WorkerResponse {
  id: string;
  type: 'success' | 'error' | 'progress';
  data?: ArrayBuffer | ImageData | string;
  progress?: number;
  error?: string;
}

/**
 * 处理图片压缩
 */
async function compressImage(
  imageData: ImageData,
  quality: number = 0.8
): Promise<ImageData> {
  // 创建 OffscreenCanvas 进行处理
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);

  // 转换为 blob 并压缩
  const blob = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality,
  });

  // 读取压缩后的数据
  const bitmap = await createImageBitmap(blob);
  const resultCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const resultCtx = resultCanvas.getContext('2d')!;
  resultCtx.drawImage(bitmap, 0, 0);

  return resultCtx.getImageData(0, 0, imageData.width, imageData.height);
}

/**
 * 处理像素化
 */
function pixelateImage(imageData: ImageData, pixelSize: number = 8): ImageData {
  const { width, height, data } = imageData;
  const newWidth = Math.floor(width / pixelSize);
  const newHeight = Math.floor(height / pixelSize);

  // 创建缩小版本
  const smallCanvas = new OffscreenCanvas(newWidth, newHeight);
  const smallCtx = smallCanvas.getContext('2d')!;
  const smallImageData = smallCtx.createImageData(newWidth, newHeight);
  const smallData = smallImageData.data;

  // 采样
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * pixelSize;
      const srcY = y * pixelSize;
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;

      smallData[dstIdx] = data[srcIdx];
      smallData[dstIdx + 1] = data[srcIdx + 1];
      smallData[dstIdx + 2] = data[srcIdx + 2];
      smallData[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  smallCtx.putImageData(smallImageData, 0, 0);

  // 放大到原始尺寸
  const resultCanvas = new OffscreenCanvas(width, height);
  const resultCtx = resultCanvas.getContext('2d')!;
  resultCtx.imageSmoothingEnabled = false;
  resultCtx.drawImage(smallCanvas, 0, 0, width, height);

  return resultCtx.getImageData(0, 0, width, height);
}

/**
 * 处理分块数据
 */
function processChunk(
  imageData: ImageData,
  chunk: { start: number; end: number; width: number; height: number }
): ImageData {
  const { data, width } = imageData;
  const { start, end } = chunk;

  // 创建新的 ImageData 用于存储处理结果
  const chunkHeight = end - start;
  const result = new ImageData(width, chunkHeight);

  // 复制数据到结果
  for (let y = start; y < end; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = ((y - start) * width + x) * 4;

      result.data[dstIdx] = data[srcIdx];
      result.data[dstIdx + 1] = data[srcIdx + 1];
      result.data[dstIdx + 2] = data[srcIdx + 2];
      result.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return result;
}

/**
 * 处理消息
 */
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = e.data;

  try {
    switch (type) {
      case 'compress': {
        if (!payload.imageData) throw new Error('No image data provided');
        const result = await compressImage(
          payload.imageData,
          payload.quality
        );
        self.postMessage({
          id,
          type: 'success',
          data: result,
        } as WorkerResponse);
        break;
      }

      case 'pixelate': {
        if (!payload.imageData) throw new Error('No image data provided');
        const result = pixelateImage(
          payload.imageData,
          payload.pixelSize
        );
        self.postMessage({
          id,
          type: 'success',
          data: result,
        } as WorkerResponse);
        break;
      }

      case 'processChunk': {
        if (!payload.imageData || !payload.chunk)
          throw new Error('Missing required data');
        const result = processChunk(payload.imageData, payload.chunk);
        self.postMessage({
          id,
          type: 'success',
          data: result,
        } as WorkerResponse);
        break;
      }

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerResponse);
  }
};

export {};
