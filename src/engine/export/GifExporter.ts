import { FrameBuffer, LayerBuffer } from '../data';

export interface GifExportOptions {
  width: number;
  height: number;
  fps: number;
  loop: boolean;
  transparentColor?: number;
}

interface GifFrame {
  imageData: ImageData;
  delay: number;
}

export class GifExporter {
  private frames: GifFrame[] = [];

  addFrame(imageData: ImageData, delay: number): void {
    this.frames.push({ imageData, delay });
  }

  async export(options: GifExportOptions): Promise<Blob> {
    // Use gif.js for encoding in worker
    // This is a placeholder implementation - actual GIF encoding would use a library like gif.js
    const canvas = new OffscreenCanvas(options.width, options.height);
    const ctx = canvas.getContext('2d')!;

    // For now, export first frame as PNG
    if (this.frames.length > 0) {
      ctx.putImageData(this.frames[0].imageData, 0, 0);
    }

    return canvas.convertToBlob({ type: 'image/png' });
  }

  static async exportFromFrames(
    frames: FrameBuffer[],
    layers: LayerBuffer[],
    options: GifExportOptions
  ): Promise<Blob> {
    const exporter = new GifExporter();

    for (const frame of frames) {
      const canvas = new OffscreenCanvas(options.width, options.height);
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(options.width, options.height);
      const data = imageData.data;

      const bgR = 255, bgG = 255, bgB = 255;

      for (let y = 0; y < options.height; y++) {
        for (let x = 0; x < options.width; x++) {
          let r = bgR, g = bgG, b = bgB, a = 255;

          for (const layer of layers) {
            if (!layer.visible) continue;
            const grid = frame.layerGrids.get(layer.id);
            if (!grid) continue;

            const color = grid.getPixel(x, y);
            if (color === 0) continue;

            const lr = (color >>> 24) & 0xff;
            const lg = (color >>> 16) & 0xff;
            const lb = (color >>> 8) & 0xff;
            const la = color & 0xff;
            const opacity = layer.opacity;

            const alpha = (la / 255) * opacity;
            r = r * (1 - alpha) + lr * alpha;
            g = g * (1 - alpha) + lg * alpha;
            b = b * (1 - alpha) + lb * alpha;
          }

          const idx = (y * options.width + x) * 4;
          data[idx] = Math.round(r);
          data[idx + 1] = Math.round(g);
          data[idx + 2] = Math.round(b);
          data[idx + 3] = a;
        }
      }

      exporter.addFrame(imageData, frame.duration);
    }

    return exporter.export(options);
  }
}
