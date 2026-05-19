import { LayerBuffer, BlendMode } from '../data';

export class LayerCompositor {
  compose(
    layers: LayerBuffer[],
    width: number,
    height: number,
    backgroundColor: number
  ): ImageData {
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    const bgR = (backgroundColor >>> 24) & 0xff;
    const bgG = (backgroundColor >>> 16) & 0xff;
    const bgB = (backgroundColor >>> 8) & 0xff;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = bgR;
        let g = bgG;
        let b = bgB;
        let a = 255;

        for (const layer of layers) {
          if (!layer.visible) continue;

          const color = layer.grid.getPixel(x, y);
          if (color === 0) continue;

          const lr = (color >>> 24) & 0xff;
          const lg = (color >>> 16) & 0xff;
          const lb = (color >>> 8) & 0xff;
          const la = color & 0xff;
          const opacity = layer.opacity;

          if (layer.blendMode === 'normal') {
            const alpha = (la / 255) * opacity;
            r = r * (1 - alpha) + lr * alpha;
            g = g * (1 - alpha) + lg * alpha;
            b = b * (1 - alpha) + lb * alpha;
          } else {
            const [br, bg2, bb] = this.blendPixel(r, g, b, lr, lg, lb, layer.blendMode);
            r = r + (br - r) * opacity;
            g = g + (bg2 - g) * opacity;
            b = b + (bb - b) * opacity;
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.round(Math.max(0, Math.min(255, r)));
        data[idx + 1] = Math.round(Math.max(0, Math.min(255, g)));
        data[idx + 2] = Math.round(Math.max(0, Math.min(255, b)));
        data[idx + 3] = a;
      }
    }

    return imageData;
  }

  private blendPixel(
    baseR: number,
    baseG: number,
    baseB: number,
    blendR: number,
    blendG: number,
    blendB: number,
    mode: BlendMode
  ): [number, number, number] {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

    switch (mode) {
      case 'multiply':
        return [clamp((baseR * blendR) / 255), clamp((baseG * blendG) / 255), clamp((baseB * blendB) / 255)];
      case 'screen':
        return [clamp(255 - ((255 - baseR) * (255 - blendR)) / 255), clamp(255 - ((255 - baseG) * (255 - blendG)) / 255), clamp(255 - ((255 - baseB) * (255 - blendB)) / 255)];
      case 'overlay':
        return [
          clamp(baseR < 128 ? (2 * baseR * blendR) / 255 : 255 - (2 * (255 - baseR) * (255 - blendR)) / 255),
          clamp(baseG < 128 ? (2 * baseG * blendG) / 255 : 255 - (2 * (255 - baseG) * (255 - blendG)) / 255),
          clamp(baseB < 128 ? (2 * baseB * blendB) / 255 : 255 - (2 * (255 - baseB) * (255 - blendB)) / 255),
        ];
      case 'darken':
        return [clamp(Math.min(baseR, blendR)), clamp(Math.min(baseG, blendG)), clamp(Math.min(baseB, blendB))];
      case 'lighten':
        return [clamp(Math.max(baseR, blendR)), clamp(Math.max(baseG, blendG)), clamp(Math.max(baseB, blendB))];
      case 'difference':
        return [clamp(Math.abs(baseR - blendR)), clamp(Math.abs(baseG - blendG)), clamp(Math.abs(baseB - blendB))];
      case 'exclusion':
        return [clamp(baseR + blendR - (2 * baseR * blendR) / 255), clamp(baseG + blendG - (2 * baseG * blendG) / 255), clamp(baseB + blendB - (2 * baseB * blendB) / 255)];
      case 'hard-light':
        return [
          clamp(blendR < 128 ? (2 * baseR * blendR) / 255 : 255 - (2 * (255 - baseR) * (255 - blendR)) / 255),
          clamp(blendG < 128 ? (2 * baseG * blendG) / 255 : 255 - (2 * (255 - baseG) * (255 - blendG)) / 255),
          clamp(blendB < 128 ? (2 * baseB * blendB) / 255 : 255 - (2 * (255 - baseB) * (255 - blendB)) / 255),
        ];
      default:
        return [blendR, blendG, blendB];
    }
  }
}
