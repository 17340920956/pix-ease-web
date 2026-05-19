import { SparseGrid } from '../data';
import { TileSet, createTileSet } from './TileSet';
import { AutoTileRules, AutoTile16 } from './AutoTile';

export interface Tile {
  id: number;
  tileSetId: string;
  tileIndex: number;
  flipH: boolean;
  flipV: boolean;
  rotate90: number;
}

export interface TilemapLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  tiles: (Tile | null)[][];
}

export interface Tilemap {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  layers: TilemapLayer[];
}

export class TilemapEngine {
  private tileSets = new Map<string, TileSet>();
  private tilemaps: Tilemap[] = [];
  private autoTileRules = new Map<string, AutoTileRules>();

  registerTileSet(tileSet: TileSet): void {
    this.tileSets.set(tileSet.id, tileSet);
  }

  getTileSet(id: string): TileSet | undefined {
    return this.tileSets.get(id);
  }

  createTilemap(
    width: number,
    height: number,
    tileWidth: number,
    tileHeight: number
  ): Tilemap {
    const layer: TilemapLayer = {
      id: `layer-${Date.now()}`,
      name: '图层 1',
      visible: true,
      opacity: 1,
      tiles: Array(height).fill(null).map(() => Array(width).fill(null)),
    };

    const tilemap: Tilemap = {
      width,
      height,
      tileWidth,
      tileHeight,
      layers: [layer],
    };

    this.tilemaps.push(tilemap);
    return tilemap;
  }

  setTile(
    tilemap: Tilemap,
    layerId: string,
    x: number,
    y: number,
    tile: Tile | null
  ): void {
    const layer = tilemap.layers.find(l => l.id === layerId);
    if (!layer) return;
    if (x < 0 || x >= tilemap.width || y < 0 || y >= tilemap.height) return;

    layer.tiles[y][x] = tile;
  }

  getTile(
    tilemap: Tilemap,
    layerId: string,
    x: number,
    y: number
  ): Tile | null {
    const layer = tilemap.layers.find(l => l.id === layerId);
    if (!layer) return null;
    if (x < 0 || x >= tilemap.width || y < 0 || y >= tilemap.height) return null;

    return layer.tiles[y][x];
  }

  autoTile(
    tilemap: Tilemap,
    layerId: string,
    x: number,
    y: number,
    tileSetId: string,
    rules?: AutoTileRules
  ): void {
    const layer = tilemap.layers.find(l => l.id === layerId);
    if (!layer) return;

    const autoRules = rules || this.autoTileRules.get(tileSetId) || new AutoTile16(tileSetId);
    this.autoTileRules.set(tileSetId, autoRules);

    const neighbors = this.getNeighbors(tilemap, layerId, x, y, tileSetId);
    const variant = autoRules.getVariant(neighbors);

    layer.tiles[y][x] = {
      id: variant,
      tileSetId,
      tileIndex: variant,
      flipH: false,
      flipV: false,
      rotate90: 0,
    };

    // Update neighbors
    const directions = [
      { dx: 0, dy: -1, edge: 'bottom' },
      { dx: 1, dy: 0, edge: 'left' },
      { dx: 0, dy: 1, edge: 'top' },
      { dx: -1, dy: 0, edge: 'right' },
    ];

    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < tilemap.width && ny >= 0 && ny < tilemap.height) {
        const neighborTile = layer.tiles[ny][nx];
        if (neighborTile && neighborTile.tileSetId === tileSetId) {
          const neighborNeighbors = this.getNeighbors(tilemap, layerId, nx, ny, tileSetId);
          const neighborVariant = autoRules.getVariant(neighborNeighbors);
          neighborTile.tileIndex = neighborVariant;
          neighborTile.id = neighborVariant;
        }
      }
    }
  }

  private getNeighbors(
    tilemap: Tilemap,
    layerId: string,
    x: number,
    y: number,
    tileSetId: string
  ): { top: boolean; right: boolean; bottom: boolean; left: boolean } {
    const layer = tilemap.layers.find(l => l.id === layerId);
    if (!layer) {
      return { top: false, right: false, bottom: false, left: false };
    }

    const getTileAt = (tx: number, ty: number): boolean => {
      if (tx < 0 || tx >= tilemap.width || ty < 0 || ty >= tilemap.height) return false;
      const tile = layer.tiles[ty][tx];
      return tile !== null && tile.tileSetId === tileSetId;
    };

    return {
      top: getTileAt(x, y - 1),
      right: getTileAt(x + 1, y),
      bottom: getTileAt(x, y + 1),
      left: getTileAt(x - 1, y),
    };
  }

  renderTilemap(
    tilemap: Tilemap,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    viewport: { x: number; y: number; scale: number }
  ): void {
    const visibleStartX = Math.floor(-viewport.x / (tilemap.tileWidth * viewport.scale));
    const visibleStartY = Math.floor(-viewport.y / (tilemap.tileHeight * viewport.scale));
    const visibleEndX = Math.ceil((ctx.canvas.width - viewport.x) / (tilemap.tileWidth * viewport.scale));
    const visibleEndY = Math.ceil((ctx.canvas.height - viewport.y) / (tilemap.tileHeight * viewport.scale));

    for (const layer of tilemap.layers) {
      if (!layer.visible) continue;

      for (let y = Math.max(0, visibleStartY); y < Math.min(tilemap.height, visibleEndY); y++) {
        for (let x = Math.max(0, visibleStartX); x < Math.min(tilemap.width, visibleEndX); x++) {
          const tile = layer.tiles[y][x];
          if (!tile) continue;

          const tileSet = this.tileSets.get(tile.tileSetId);
          if (!tileSet) continue;

          const tileData = tileSet.tiles[tile.tileIndex];
          if (!tileData) continue;

          const screenX = viewport.x + x * tilemap.tileWidth * viewport.scale;
          const screenY = viewport.y + y * tilemap.tileHeight * viewport.scale;

          ctx.save();
          ctx.globalAlpha = layer.opacity;

          // Apply transformations
          ctx.translate(screenX + tilemap.tileWidth * viewport.scale / 2, screenY + tilemap.tileHeight * viewport.scale / 2);
          if (tile.flipH) ctx.scale(-1, 1);
          if (tile.flipV) ctx.scale(1, -1);
          ctx.rotate((tile.rotate90 * Math.PI) / 2);
          ctx.translate(-tilemap.tileWidth * viewport.scale / 2, -tilemap.tileHeight * viewport.scale / 2);

          // Render tile pixels
          for (const { x: px, y: py, color } of tileData.pixels()) {
            const r = (color >>> 24) & 0xff;
            const g = (color >>> 16) & 0xff;
            const b = (color >>> 8) & 0xff;
            const a = color & 0xff;

            ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
            ctx.fillRect(
              px * viewport.scale,
              py * viewport.scale,
              viewport.scale,
              viewport.scale
            );
          }

          ctx.restore();
        }
      }
    }
  }

  exportTilemapToCanvas(tilemap: Tilemap): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = tilemap.width * tilemap.tileWidth;
    canvas.height = tilemap.height * tilemap.tileHeight;
    const ctx = canvas.getContext('2d')!;

    for (const layer of tilemap.layers) {
      if (!layer.visible) continue;

      for (let y = 0; y < tilemap.height; y++) {
        for (let x = 0; x < tilemap.width; x++) {
          const tile = layer.tiles[y][x];
          if (!tile) continue;

          const tileSet = this.tileSets.get(tile.tileSetId);
          if (!tileSet) continue;

          const tileData = tileSet.tiles[tile.tileIndex];
          if (!tileData) continue;

          ctx.save();
          ctx.globalAlpha = layer.opacity;

          const offsetX = x * tilemap.tileWidth;
          const offsetY = y * tilemap.tileHeight;

          ctx.translate(offsetX + tilemap.tileWidth / 2, offsetY + tilemap.tileHeight / 2);
          if (tile.flipH) ctx.scale(-1, 1);
          if (tile.flipV) ctx.scale(1, -1);
          ctx.rotate((tile.rotate90 * Math.PI) / 2);
          ctx.translate(-tilemap.tileWidth / 2, -tilemap.tileHeight / 2);

          for (const { x: px, y: py, color } of tileData.pixels()) {
            const r = (color >>> 24) & 0xff;
            const g = (color >>> 16) & 0xff;
            const b = (color >>> 8) & 0xff;
            const a = color & 0xff;

            ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
            ctx.fillRect(px, py, 1, 1);
          }

          ctx.restore();
        }
      }
    }

    return canvas;
  }
}
