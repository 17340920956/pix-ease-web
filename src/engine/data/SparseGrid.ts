const CELL_SIZE = 64;
const CELL_PIXELS = CELL_SIZE * CELL_SIZE;

interface Cell {
  data: Uint32Array;
  filledCount: number;
  dirty: boolean;
}

export interface PixelChange {
  x: number;
  y: number;
  before: number;
  after: number;
}

export class SparseGrid {
  private cells = new Map<string, Cell>();
  private bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  private boundsDirty = true;

  getPixel(x: number, y: number): number {
    const cellX = Math.floor(x / CELL_SIZE);
    const cellY = Math.floor(y / CELL_SIZE);
    const cell = this.cells.get(`${cellX},${cellY}`);
    if (!cell) return 0;
    const localX = ((x % CELL_SIZE) + CELL_SIZE) % CELL_SIZE;
    const localY = ((y % CELL_SIZE) + CELL_SIZE) % CELL_SIZE;
    return cell.data[localY * CELL_SIZE + localX];
  }

  setPixel(x: number, y: number, color: number): boolean {
    const cellX = Math.floor(x / CELL_SIZE);
    const cellY = Math.floor(y / CELL_SIZE);
    const key = `${cellX},${cellY}`;
    let cell = this.cells.get(key);

    if (!cell && color === 0) return false;

    if (!cell) {
      cell = {
        data: new Uint32Array(CELL_PIXELS),
        filledCount: 0,
        dirty: true,
      };
      this.cells.set(key, cell);
    }

    const localX = ((x % CELL_SIZE) + CELL_SIZE) % CELL_SIZE;
    const localY = ((y % CELL_SIZE) + CELL_SIZE) % CELL_SIZE;
    const idx = localY * CELL_SIZE + localX;
    const oldColor = cell.data[idx];

    if (oldColor === color) return false;

    if (oldColor === 0) cell.filledCount++;
    if (color === 0) cell.filledCount--;

    cell.data[idx] = color;
    cell.dirty = true;
    this.boundsDirty = true;

    if (cell.filledCount === 0) {
      this.cells.delete(key);
    }

    return true;
  }

  setPixels(updates: { x: number; y: number; color: number }[]): PixelChange[] {
    const changes: PixelChange[] = [];
    for (const { x, y, color } of updates) {
      const before = this.getPixel(x, y);
      if (this.setPixel(x, y, color)) {
        changes.push({ x, y, before, after: color });
      }
    }
    return changes;
  }

  getDirtyCells(): { cellX: number; cellY: number; cell: Cell }[] {
    const result: { cellX: number; cellY: number; cell: Cell }[] = [];
    for (const [key, cell] of this.cells) {
      if (cell.dirty) {
        const [cellX, cellY] = key.split(',').map(Number);
        result.push({ cellX, cellY, cell });
      }
    }
    return result;
  }

  clearDirtyFlags(): void {
    for (const cell of this.cells.values()) {
      cell.dirty = false;
    }
  }

  getBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    if (!this.boundsDirty && this.bounds) return this.bounds;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasPixels = false;

    for (const [key, cell] of this.cells) {
      if (cell.filledCount === 0) continue;
      const [cellX, cellY] = key.split(',').map(Number);
      const baseX = cellX * CELL_SIZE;
      const baseY = cellY * CELL_SIZE;

      for (let i = 0; i < CELL_PIXELS; i++) {
        if (cell.data[i] !== 0) {
          const x = baseX + (i % CELL_SIZE);
          const y = baseY + Math.floor(i / CELL_SIZE);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          hasPixels = true;
        }
      }
    }

    if (!hasPixels) {
      minX = 0; minY = 0; maxX = 0; maxY = 0;
    }

    this.bounds = { minX, minY, maxX, maxY };
    this.boundsDirty = false;
    return this.bounds;
  }

  *pixels(): Generator<{ x: number; y: number; color: number }> {
    for (const [key, cell] of this.cells) {
      if (cell.filledCount === 0) continue;
      const [cellX, cellY] = key.split(',').map(Number);
      const baseX = cellX * CELL_SIZE;
      const baseY = cellY * CELL_SIZE;
      for (let i = 0; i < CELL_PIXELS; i++) {
        const color = cell.data[i];
        if (color !== 0) {
          yield {
            x: baseX + (i % CELL_SIZE),
            y: baseY + Math.floor(i / CELL_SIZE),
            color,
          };
        }
      }
    }
  }

  clone(): SparseGrid {
    const cloned = new SparseGrid();
    for (const [key, cell] of this.cells) {
      cloned.cells.set(key, {
        data: new Uint32Array(cell.data),
        filledCount: cell.filledCount,
        dirty: cell.dirty,
      });
    }
    cloned.bounds = this.bounds ? { ...this.bounds } : null;
    cloned.boundsDirty = this.boundsDirty;
    return cloned;
  }

  clear(): void {
    this.cells.clear();
    this.bounds = null;
    this.boundsDirty = true;
  }
}
