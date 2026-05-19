import { SparseGrid, PixelChange } from '../data';
import { SelectionEngine } from './SelectionEngine';

export interface TransformParams {
  translateX?: number;
  translateY?: number;
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
  flipH?: boolean;
  flipV?: boolean;
}

export class TransformEngine {
  transform(
    operation: 'move' | 'rotate' | 'scale' | 'flipH' | 'flipV',
    params: TransformParams,
    source: SparseGrid,
    target: SparseGrid,
    selection: SelectionEngine
  ): PixelChange[] {
    const changes: PixelChange[] = [];
    const bounds = selection.getBounds();
    if (!bounds) return changes;

    switch (operation) {
      case 'move':
        return this.moveSelection(params.translateX || 0, params.translateY || 0, source, target, selection);
      case 'rotate':
        return this.rotateSelection(params.rotate || 0, source, target, selection);
      case 'scale':
        return this.scaleSelection(params.scaleX || 1, params.scaleY || 1, source, target, selection);
      case 'flipH':
        return this.flipSelection(true, false, source, target, selection);
      case 'flipV':
        return this.flipSelection(false, true, source, target, selection);
    }

    return changes;
  }

  private moveSelection(
    dx: number,
    dy: number,
    source: SparseGrid,
    target: SparseGrid,
    selection: SelectionEngine
  ): PixelChange[] {
    const changes: PixelChange[] = [];
    const bounds = selection.getBounds()!;

    // Clear original positions
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (selection.isSelected(x, y)) {
          const before = target.getPixel(x, y);
          if (before !== 0) {
            target.setPixel(x, y, 0);
            changes.push({ x, y, before, after: 0 });
          }
        }
      }
    }

    // Set new positions
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (selection.isSelected(x, y)) {
          const color = source.getPixel(x, y);
          if (color !== 0) {
            const newX = x + dx;
            const newY = y + dy;
            const before = target.getPixel(newX, newY);
            target.setPixel(newX, newY, color);
            changes.push({ x: newX, y: newY, before, after: color });
          }
        }
      }
    }

    return changes;
  }

  private rotateSelection(
    angle: number,
    source: SparseGrid,
    target: SparseGrid,
    selection: SelectionEngine
  ): PixelChange[] {
    const changes: PixelChange[] = [];
    const bounds = selection.getBounds()!;
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    // Clear original
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (selection.isSelected(x, y)) {
          const before = target.getPixel(x, y);
          if (before !== 0) {
            target.setPixel(x, y, 0);
            changes.push({ x, y, before, after: 0 });
          }
        }
      }
    }

    // Rotate and set new positions
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (selection.isSelected(x, y)) {
          const color = source.getPixel(x, y);
          if (color === 0) continue;

          const dx = x - cx;
          const dy = y - cy;
          const newX = Math.round(cx + dx * cos - dy * sin);
          const newY = Math.round(cy + dx * sin + dy * cos);

          const before = target.getPixel(newX, newY);
          target.setPixel(newX, newY, color);
          changes.push({ x: newX, y: newY, before, after: color });
        }
      }
    }

    return changes;
  }

  private scaleSelection(
    scaleX: number,
    scaleY: number,
    source: SparseGrid,
    target: SparseGrid,
    selection: SelectionEngine
  ): PixelChange[] {
    const changes: PixelChange[] = [];
    const bounds = selection.getBounds()!;
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    // Clear original
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (selection.isSelected(x, y)) {
          const before = target.getPixel(x, y);
          if (before !== 0) {
            target.setPixel(x, y, 0);
            changes.push({ x, y, before, after: 0 });
          }
        }
      }
    }

    // Scale and set new positions
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (selection.isSelected(x, y)) {
          const color = source.getPixel(x, y);
          if (color === 0) continue;

          const dx = x - cx;
          const dy = y - cy;
          const newX = Math.round(cx + dx * scaleX);
          const newY = Math.round(cy + dy * scaleY);

          const before = target.getPixel(newX, newY);
          target.setPixel(newX, newY, color);
          changes.push({ x: newX, y: newY, before, after: color });
        }
      }
    }

    return changes;
  }

  private flipSelection(
    flipH: boolean,
    flipV: boolean,
    source: SparseGrid,
    target: SparseGrid,
    selection: SelectionEngine
  ): PixelChange[] {
    const changes: PixelChange[] = [];
    const bounds = selection.getBounds()!;

    // Clear original
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (selection.isSelected(x, y)) {
          const before = target.getPixel(x, y);
          if (before !== 0) {
            target.setPixel(x, y, 0);
            changes.push({ x, y, before, after: 0 });
          }
        }
      }
    }

    // Flip and set new positions
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (selection.isSelected(x, y)) {
          const color = source.getPixel(x, y);
          if (color === 0) continue;

          let newX = x;
          let newY = y;

          if (flipH) {
            newX = bounds.x + bounds.width - 1 - (x - bounds.x);
          }
          if (flipV) {
            newY = bounds.y + bounds.height - 1 - (y - bounds.y);
          }

          const before = target.getPixel(newX, newY);
          target.setPixel(newX, newY, color);
          changes.push({ x: newX, y: newY, before, after: color });
        }
      }
    }

    return changes;
  }
}
