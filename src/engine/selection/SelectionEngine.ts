import { SparseGrid, PixelChange } from '../data';

export type SelectionMask =
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'lasso'; points: [number, number][] }
  | { type: 'wand'; x: number; y: number; tolerance: number; contiguous: boolean }
  | { type: 'bitmap'; data: Uint8Array; width: number; height: number; offsetX: number; offsetY: number };

export class SelectionEngine {
  private mask: Uint8Array | null = null;
  private maskWidth: number = 0;
  private maskHeight: number = 0;
  private maskOffsetX: number = 0;
  private maskOffsetY: number = 0;
  private currentMask: SelectionMask | null = null;

  getMask(): { data: Uint8Array; width: number; height: number; offsetX: number; offsetY: number } | null {
    if (!this.mask) return null;
    return {
      data: this.mask,
      width: this.maskWidth,
      height: this.maskHeight,
      offsetX: this.maskOffsetX,
      offsetY: this.maskOffsetY,
    };
  }

  getCurrentMask(): SelectionMask | null {
    return this.currentMask;
  }

  createRect(x: number, y: number, width: number, height: number): void {
    this.maskWidth = Math.abs(width);
    this.maskHeight = Math.abs(height);
    this.maskOffsetX = width < 0 ? x + width : x;
    this.maskOffsetY = height < 0 ? y + height : y;
    this.mask = new Uint8Array(this.maskWidth * this.maskHeight).fill(255);
    this.currentMask = { type: 'rect', x: this.maskOffsetX, y: this.maskOffsetY, width: this.maskWidth, height: this.maskHeight };
  }

  createEllipse(cx: number, cy: number, rx: number, ry: number): void {
    this.maskWidth = rx * 2 + 1;
    this.maskHeight = ry * 2 + 1;
    this.maskOffsetX = cx - rx;
    this.maskOffsetY = cy - ry;
    this.mask = new Uint8Array(this.maskWidth * this.maskHeight);

    for (let y = 0; y < this.maskHeight; y++) {
      for (let x = 0; x < this.maskWidth; x++) {
        const dx = x - rx;
        const dy = y - ry;
        if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
          this.mask[y * this.maskWidth + x] = 255;
        }
      }
    }

    this.currentMask = { type: 'ellipse', cx, cy, rx, ry };
  }

  createLasso(points: [number, number][]): void {
    if (points.length < 3) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    this.maskWidth = maxX - minX + 1;
    this.maskHeight = maxY - minY + 1;
    this.maskOffsetX = minX;
    this.maskOffsetY = minY;
    this.mask = new Uint8Array(this.maskWidth * this.maskHeight);

    // Scanline fill
    for (let y = 0; y < this.maskHeight; y++) {
      const intersections: number[] = [];
      const py = minY + y;

      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];

        if ((y1 <= py && y2 > py) || (y2 <= py && y1 > py)) {
          const x = x1 + (py - y1) * (x2 - x1) / (y2 - y1);
          intersections.push(x);
        }
      }

      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length; i += 2) {
        const start = Math.max(0, Math.ceil(intersections[i] - minX));
        const end = Math.min(this.maskWidth, Math.floor(intersections[i + 1] - minX));
        for (let x = start; x <= end; x++) {
          this.mask[y * this.maskWidth + x] = 255;
        }
      }
    }

    this.currentMask = { type: 'lasso', points };
  }

  createWand(
    x: number,
    y: number,
    tolerance: number,
    contiguous: boolean,
    source: SparseGrid,
    projectWidth: number,
    projectHeight: number
  ): void {
    this.maskWidth = projectWidth;
    this.maskHeight = projectHeight;
    this.maskOffsetX = 0;
    this.maskOffsetY = 0;
    this.mask = new Uint8Array(projectWidth * projectHeight);

    const targetColor = source.getPixel(x, y);

    if (contiguous) {
      this.floodFillSelect(x, y, targetColor, tolerance, source);
    } else {
      this.globalColorSelect(targetColor, tolerance, source, projectWidth, projectHeight);
    }

    this.currentMask = { type: 'wand', x, y, tolerance, contiguous };
  }

  private floodFillSelect(
    startX: number,
    startY: number,
    targetColor: number,
    tolerance: number,
    source: SparseGrid
  ): void {
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    const targetRgb = this.colorToRgb(targetColor);

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (x < 0 || x >= this.maskWidth || y < 0 || y >= this.maskHeight) continue;

      const color = source.getPixel(x, y);
      if (!this.colorMatch(color, targetColor, tolerance, targetRgb)) continue;

      this.mask![y * this.maskWidth + x] = 255;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  private globalColorSelect(
    targetColor: number,
    tolerance: number,
    source: SparseGrid,
    width: number,
    height: number
  ): void {
    const targetRgb = this.colorToRgb(targetColor);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = source.getPixel(x, y);
        if (this.colorMatch(color, targetColor, tolerance, targetRgb)) {
          this.mask![y * width + x] = 255;
        }
      }
    }
  }

  private colorToRgb(color: number): [number, number, number] {
    return [
      (color >>> 24) & 0xff,
      (color >>> 16) & 0xff,
      (color >>> 8) & 0xff,
    ];
  }

  private colorMatch(
    color: number,
    targetColor: number,
    tolerance: number,
    targetRgb?: [number, number, number]
  ): boolean {
    if (color === targetColor) return true;
    if (color === 0 || targetColor === 0) return color === targetColor;

    const rgb = targetRgb || this.colorToRgb(targetColor);
    const cr = (color >>> 24) & 0xff;
    const cg = (color >>> 16) & 0xff;
    const cb = (color >>> 8) & 0xff;

    const dr = cr - rgb[0];
    const dg = cg - rgb[1];
    const db = cb - rgb[2];

    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    return distance <= tolerance * 4.42; // 4.42 ≈ sqrt(3 * 255^2) / 255
  }

  isSelected(x: number, y: number): boolean {
    if (!this.mask) return false;
    const mx = x - this.maskOffsetX;
    const my = y - this.maskOffsetY;
    if (mx < 0 || mx >= this.maskWidth || my < 0 || my >= this.maskHeight) return false;
    return this.mask[my * this.maskWidth + mx] > 0;
  }

  clear(): void {
    this.mask = null;
    this.currentMask = null;
    this.maskWidth = 0;
    this.maskHeight = 0;
  }

  invert(projectWidth: number, projectHeight: number): void {
    if (!this.mask) {
      this.createRect(0, 0, projectWidth, projectHeight);
      return;
    }

    const newMask = new Uint8Array(projectWidth * projectHeight);
    for (let y = 0; y < projectHeight; y++) {
      for (let x = 0; x < projectWidth; x++) {
        newMask[y * projectWidth + x] = this.isSelected(x, y) ? 0 : 255;
      }
    }

    this.mask = newMask;
    this.maskWidth = projectWidth;
    this.maskHeight = projectHeight;
    this.maskOffsetX = 0;
    this.maskOffsetY = 0;
  }

  getBounds(): { x: number; y: number; width: number; height: number } | null {
    if (!this.mask) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasSelection = false;

    for (let y = 0; y < this.maskHeight; y++) {
      for (let x = 0; x < this.maskWidth; x++) {
        if (this.mask[y * this.maskWidth + x] > 0) {
          minX = Math.min(minX, x + this.maskOffsetX);
          minY = Math.min(minY, y + this.maskOffsetY);
          maxX = Math.max(maxX, x + this.maskOffsetX);
          maxY = Math.max(maxY, y + this.maskOffsetY);
          hasSelection = true;
        }
      }
    }

    if (!hasSelection) return null;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }
}
