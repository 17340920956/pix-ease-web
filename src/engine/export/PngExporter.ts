import { LayerBuffer } from '../data';

export interface PngExportOptions {
  scale: number;
  borderSize: number;
  borderColor: string;
  projectWidth: number;
  projectHeight: number;
  backgroundColor: number;
}

export class PngExporter {
  async export(
    layers: LayerBuffer[],
    options: PngExportOptions
  ): Promise<Blob> {
    const { scale = 1, borderSize = 0, borderColor = '#000000' } = options;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const layer of layers) {
      if (!layer.visible) continue;
      const bounds = layer.grid.getBounds();
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    }

    if (minX === Infinity) {
      minX = 0; minY = 0;
      maxX = options.projectWidth - 1;
      maxY = options.projectHeight - 1;
    }

    const pixelWidth = maxX - minX + 1;
    const pixelHeight = maxY - minY + 1;
    const canvasWidth = pixelWidth * scale + borderSize * 2;
    const canvasHeight = pixelHeight * scale + borderSize * 2;

    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d')!;

    if (borderSize > 0) {
      ctx.fillStyle = borderColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    const imageData = ctx.createImageData(pixelWidth * scale, pixelHeight * scale);
    const data = imageData.data;

    const bgR = (options.backgroundColor >>> 24) & 0xff;
    const bgG = (options.backgroundColor >>> 16) & 0xff;
    const bgB = (options.backgroundColor >>> 8) & 0xff;

    for (let py = 0; py < pixelHeight; py++) {
      for (let px = 0; px < pixelWidth; px++) {
        const worldX = px + minX;
        const worldY = py + minY;

        let r = bgR, g = bgG, b = bgB, a = 255;

        for (const layer of layers) {
          if (!layer.visible) continue;
          const color = layer.grid.getPixel(worldX, worldY);
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

        const baseIdx = ((py * scale) * pixelWidth * scale + (px * scale)) * 4;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const idx = baseIdx + (sy * pixelWidth * scale + sx) * 4;
            if (idx < data.length) {
              data[idx] = Math.round(r);
              data[idx + 1] = Math.round(g);
              data[idx + 2] = Math.round(b);
              data[idx + 3] = a;
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, borderSize, borderSize);
    return canvas.convertToBlob({ type: 'image/png' });
  }
}
