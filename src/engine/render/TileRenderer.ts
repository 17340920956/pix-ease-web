import { LayerBuffer, BlendMode } from '../data';

const TILE_SIZE = 256;

interface ViewportState {
  cameraX: number;
  cameraY: number;
  scale: number;
}

interface RenderTile {
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  pixelX: number;
  pixelY: number;
  scale: number;
  dirty: boolean;
}

interface RenderOptions {
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  backgroundColor: number;
}

export class TileRenderer {
  private tileCache = new Map<string, RenderTile>();

  render(
    targetCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    layers: LayerBuffer[],
    viewport: ViewportState,
    options: RenderOptions
  ): void {
    const visibleTiles = this.getVisibleTiles(viewport, targetCtx.canvas.width, targetCtx.canvas.height);

    this.markDirtyTiles(layers, visibleTiles);

    for (const tile of visibleTiles) {
      if (tile.dirty) {
        this.renderTile(tile, layers, viewport, options);
        tile.dirty = false;
      }
    }

    for (const tile of visibleTiles) {
      targetCtx.drawImage(
        tile.canvas,
        tile.pixelX,
        tile.pixelY
      );
    }
  }

  private getVisibleTiles(
    viewport: ViewportState,
    canvasWidth: number,
    canvasHeight: number
  ): RenderTile[] {
    const tiles: RenderTile[] = [];
    const startTileX = Math.floor(-viewport.cameraX / TILE_SIZE);
    const startTileY = Math.floor(-viewport.cameraY / TILE_SIZE);
    const endTileX = Math.ceil((canvasWidth - viewport.cameraX) / TILE_SIZE);
    const endTileY = Math.ceil((canvasHeight - viewport.cameraY) / TILE_SIZE);

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const key = `${tx},${ty},${viewport.scale}`;
        let tile = this.tileCache.get(key);

        if (!tile) {
          const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
          const ctx = canvas.getContext('2d')!;
          tile = {
            canvas,
            ctx,
            pixelX: tx * TILE_SIZE,
            pixelY: ty * TILE_SIZE,
            scale: viewport.scale,
            dirty: true,
          };
          this.tileCache.set(key, tile);
        }

        tiles.push(tile);
      }
    }

    return tiles;
  }

  private markDirtyTiles(layers: LayerBuffer[], tiles: RenderTile[]): void {
    for (const layer of layers) {
      if (!layer.visible) continue;

      const dirtyCells = layer.grid.getDirtyCells();
      if (dirtyCells.length === 0) continue;

      for (const { cellX, cellY } of dirtyCells) {
        const cellPixelX = cellX * 64;
        const cellPixelY = cellY * 64;

        for (const tile of tiles) {
          if (
            cellPixelX < tile.pixelX + TILE_SIZE &&
            cellPixelX + 64 > tile.pixelX &&
            cellPixelY < tile.pixelY + TILE_SIZE &&
            cellPixelY + 64 > tile.pixelY
          ) {
            tile.dirty = true;
          }
        }
      }
    }
  }

  private renderTile(
    tile: RenderTile,
    layers: LayerBuffer[],
    viewport: ViewportState,
    options: RenderOptions
  ): void {
    const ctx = tile.ctx;
    ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);

    const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    const data = imageData.data;

    const tileWorldX = (tile.pixelX - viewport.cameraX) / viewport.scale;
    const tileWorldY = (tile.pixelY - viewport.cameraY) / viewport.scale;

    const startPixelX = Math.floor(tileWorldX);
    const startPixelY = Math.floor(tileWorldY);
    const endPixelX = startPixelX + Math.ceil(TILE_SIZE / viewport.scale) + 1;
    const endPixelY = startPixelY + Math.ceil(TILE_SIZE / viewport.scale) + 1;

    const bgR = (options.backgroundColor >>> 24) & 0xff;
    const bgG = (options.backgroundColor >>> 16) & 0xff;
    const bgB = (options.backgroundColor >>> 8) & 0xff;

    for (let py = startPixelY; py < endPixelY; py++) {
      for (let px = startPixelX; px < endPixelX; px++) {
        const [r, g, b, a] = this.sampleMergedPixel(px, py, layers, bgR, bgG, bgB);

        const screenX = Math.floor((px - startPixelX) * viewport.scale);
        const screenY = Math.floor((py - startPixelY) * viewport.scale);
        const pixelScale = Math.ceil(viewport.scale);

        for (let sy = 0; sy < pixelScale; sy++) {
          for (let sx = 0; sx < pixelScale; sx++) {
            const idx = ((screenY + sy) * TILE_SIZE + (screenX + sx)) * 4;
            if (idx < data.length && screenX + sx < TILE_SIZE && screenY + sy < TILE_SIZE) {
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = a;
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    if (options.showGrid && viewport.scale >= 4) {
      ctx.strokeStyle = options.gridColor || 'rgba(128,128,128,0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();

      const gridOffsetX = Math.floor(tileWorldX % options.gridSize) * viewport.scale;
      const gridOffsetY = Math.floor(tileWorldY % options.gridSize) * viewport.scale;

      for (let x = gridOffsetX; x < TILE_SIZE; x += options.gridSize * viewport.scale) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, TILE_SIZE);
      }
      for (let y = gridOffsetY; y < TILE_SIZE; y += options.gridSize * viewport.scale) {
        ctx.moveTo(0, y);
        ctx.lineTo(TILE_SIZE, y);
      }

      ctx.stroke();
    }
  }

  private sampleMergedPixel(
    x: number,
    y: number,
    layers: LayerBuffer[],
    bgR: number,
    bgG: number,
    bgB: number
  ): [number, number, number, number] {
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

    return [
      Math.round(Math.max(0, Math.min(255, r))),
      Math.round(Math.max(0, Math.min(255, g))),
      Math.round(Math.max(0, Math.min(255, b))),
      a,
    ];
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

  invalidateAllTiles(): void {
    for (const tile of this.tileCache.values()) {
      tile.dirty = true;
    }
  }

  clearCache(): void {
    this.tileCache.clear();
  }
}
