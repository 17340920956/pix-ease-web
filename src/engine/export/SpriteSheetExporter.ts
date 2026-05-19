import { FrameBuffer, LayerBuffer } from '../data';
import { AnimationTag } from '../animation';

export interface SpriteSheetOptions {
  columns: number;
  scale: number;
  packTags: boolean;
  frameWidth: number;
  frameHeight: number;
  tags?: AnimationTag[];
}

export interface SpriteSheetFrame {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  duration: number;
}

export interface SpriteSheetData {
  image: Blob;
  json: string;
}

export class SpriteSheetExporter {
  async export(
    frames: FrameBuffer[],
    layers: LayerBuffer[],
    options: SpriteSheetOptions
  ): Promise<SpriteSheetData> {
    if (options.packTags && options.tags && options.tags.length > 0) {
      return this.exportTaggedSpriteSheet(frames, layers, options);
    }

    return this.exportGridSpriteSheet(frames, layers, options);
  }

  private async exportGridSpriteSheet(
    frames: FrameBuffer[],
    layers: LayerBuffer[],
    options: SpriteSheetOptions
  ): Promise<SpriteSheetData> {
    const { columns = 4, scale = 1 } = options;
    const rows = Math.ceil(frames.length / columns);
    const canvasWidth = options.frameWidth * scale * columns;
    const canvasHeight = options.frameHeight * scale * rows;

    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d')!;

    const frameData: SpriteSheetFrame[] = [];

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const col = i % columns;
      const row = Math.floor(i / columns);
      const offsetX = col * options.frameWidth * scale;
      const offsetY = row * options.frameHeight * scale;

      const frameImage = this.renderFrame(frame, layers, options.frameWidth, options.frameHeight, scale);
      ctx.putImageData(frameImage, offsetX, offsetY);

      frameData.push({
        filename: `frame_${i}.png`,
        frame: { x: offsetX, y: offsetY, w: options.frameWidth * scale, h: options.frameHeight * scale },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: options.frameWidth, h: options.frameHeight },
        sourceSize: { w: options.frameWidth, h: options.frameHeight },
        duration: frame.duration,
      });
    }

    const image = await canvas.convertToBlob({ type: 'image/png' });
    const json = JSON.stringify({
      frames: frameData,
      meta: {
        app: 'PixEase',
        version: '2.0',
        image: 'spritesheet.png',
        size: { w: canvasWidth, h: canvasHeight },
        scale: scale.toString(),
        tags: options.tags || [],
      },
    }, null, 2);

    return { image, json };
  }

  private async exportTaggedSpriteSheet(
    frames: FrameBuffer[],
    layers: LayerBuffer[],
    options: SpriteSheetOptions
  ): Promise<SpriteSheetData> {
    // Group frames by tags
    const tagGroups = new Map<string, { start: number; end: number; color: string }>();
    for (const tag of options.tags || []) {
      tagGroups.set(tag.name, { start: tag.fromFrame, end: tag.toFrame, color: tag.color });
    }

    // For simplicity, fall back to grid layout for tagged export
    return this.exportGridSpriteSheet(frames, layers, options);
  }

  private renderFrame(
    frame: FrameBuffer,
    layers: LayerBuffer[],
    width: number,
    height: number,
    scale: number
  ): ImageData {
    const imageData = new ImageData(width * scale, height * scale);
    const data = imageData.data;
    const bgR = 255, bgG = 255, bgB = 255;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
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

        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const idx = ((y * scale + sy) * width * scale + (x * scale + sx)) * 4;
            data[idx] = Math.round(r);
            data[idx + 1] = Math.round(g);
            data[idx + 2] = Math.round(b);
            data[idx + 3] = a;
          }
        }
      }
    }

    return imageData;
  }
}
