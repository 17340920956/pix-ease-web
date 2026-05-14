/**
 * Web Worker 工具函数
 * 提供 Worker 创建、任务分发、分块处理等功能
 */

/**
 * Worker 任务接口
 */
interface WorkerTask {
  id: string;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

/**
 * Worker 管理器类
 * 管理 Web Worker 实例和任务队列
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private tasks: Map<string, WorkerTask> = new Map();
  private taskId = 0;

  /**
   * 获取 Worker 实例（懒加载）
   */
  private getWorker(): Worker {
    if (!this.worker) {
      // 创建 Worker
      this.worker = new Worker(
        new URL('../workers/imageWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e) => {
        const { id, type, data, error } = e.data;
        const task = this.tasks.get(id);
        if (!task) return;

        if (type === 'success') {
          task.resolve(data);
        } else if (type === 'error') {
          task.reject(new Error(error));
        }

        this.tasks.delete(id);
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
      };
    }

    return this.worker;
  }

  /**
   * 发送任务到 Worker
   */
  private sendTask(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `task-${++this.taskId}`;
      this.tasks.set(id, { id, resolve, reject });
      this.getWorker().postMessage({ id, type, payload });
    });
  }

  /**
   * 压缩图片
   */
  async compressImage(imageData: ImageData, quality: number = 0.8): Promise<ImageData> {
    return this.sendTask('compress', { imageData, quality });
  }

  /**
   * 像素化图片
   */
  async pixelateImage(imageData: ImageData, pixelSize: number = 8): Promise<ImageData> {
    return this.sendTask('pixelate', { imageData, pixelSize });
  }

  /**
   * 处理图片分块
   */
  async processChunk(
    imageData: ImageData,
    chunk: { start: number; end: number; width: number; height: number }
  ): Promise<ImageData> {
    return this.sendTask('processChunk', { imageData, chunk });
  }

  /**
   * 分块处理大图
   */
  async processLargeImage(
    imageData: ImageData,
    processor: (chunk: ImageData) => Promise<ImageData>,
    chunkHeight: number = 100
  ): Promise<ImageData> {
    const { width, height } = imageData;
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = width;
    resultCanvas.height = height;
    const resultCtx = resultCanvas.getContext('2d')!;

    // 分块处理
    const chunks: Promise<void>[] = [];
    for (let start = 0; start < height; start += chunkHeight) {
      const end = Math.min(start + chunkHeight, height);
      
      const chunkPromise = this.processChunk(imageData, { start, end, width, height })
        .then(async (chunkData) => {
          const processedChunk = await processor(chunkData);
          resultCtx.putImageData(processedChunk, 0, start);
        });
      
      chunks.push(chunkPromise);
    }

    await Promise.all(chunks);
    return resultCtx.getImageData(0, 0, width, height);
  }

  /**
   * 终止 Worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.tasks.clear();
    }
  }
}

/**
 * 全局 Worker 管理器实例
 */
export const workerManager = new WorkerManager();

/**
 * 使用 Web Worker 压缩图片
 */
export async function compressImageWithWorker(
  file: File,
  quality: number = 0.8
): Promise<Blob> {
  const img = await readFileAsImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  
  // 如果图片较大，使用分块处理
  if (img.height > 1000) {
    const processedData = await workerManager.processLargeImage(
      imageData,
      (chunk) => workerManager.compressImage(chunk, quality),
      200
    );
    ctx.putImageData(processedData, 0, 0);
  } else {
    const processedData = await workerManager.compressImage(imageData, quality);
    ctx.putImageData(processedData, 0, 0);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/jpeg', quality);
  });
}

/**
 * 使用 Web Worker 像素化图片
 */
export async function pixelateImageWithWorker(
  file: File,
  pixelSize: number = 8
): Promise<Blob> {
  const img = await readFileAsImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  
  // 如果图片较大，使用分块处理
  if (img.height > 1000) {
    const processedData = await workerManager.processLargeImage(
      imageData,
      (chunk) => workerManager.pixelateImage(chunk, pixelSize),
      200
    );
    ctx.putImageData(processedData, 0, 0);
  } else {
    const processedData = await workerManager.pixelateImage(imageData, pixelSize);
    ctx.putImageData(processedData, 0, 0);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
  });
}

/**
 * 读取文件为 Image
 */
function readFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
