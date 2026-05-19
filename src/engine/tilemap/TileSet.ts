import { SparseGrid } from '../data';

export interface TileProperty {
  [key: string]: string | number | boolean;
}

export interface TileSet {
  id: string;
  name: string;
  tileWidth: number;
  tileHeight: number;
  tiles: SparseGrid[];
  properties: Map<number, TileProperty>;
}

export function createTileSet(
  id: string,
  name: string,
  tileWidth: number,
  tileHeight: number
): TileSet {
  return {
    id,
    name,
    tileWidth,
    tileHeight,
    tiles: [],
    properties: new Map(),
  };
}

export function generateTileSetFromCanvas(
  source: SparseGrid,
  tileWidth: number,
  tileHeight: number,
  name: string = 'Generated TileSet'
): TileSet {
  const tiles: SparseGrid[] = [];
  const bounds = source.getBounds();

  if (bounds.maxX === 0 && bounds.maxY === 0 && bounds.minX === 0 && bounds.minY === 0) {
    return createTileSet(`tileset-${Date.now()}`, name, tileWidth, tileHeight);
  }

  const cols = Math.ceil((bounds.maxX - bounds.minX + 1) / tileWidth);
  const rows = Math.ceil((bounds.maxY - bounds.minY + 1) / tileHeight);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tile = new SparseGrid();
      const offsetX = bounds.minX + col * tileWidth;
      const offsetY = bounds.minY + row * tileHeight;

      for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < tileWidth; x++) {
          const color = source.getPixel(offsetX + x, offsetY + y);
          if (color !== 0) {
            tile.setPixel(x, y, color);
          }
        }
      }

      tiles.push(tile);
    }
  }

  return {
    id: `tileset-${Date.now()}`,
    name,
    tileWidth,
    tileHeight,
    tiles,
    properties: new Map(),
  };
}
