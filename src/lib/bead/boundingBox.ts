import type { BBox } from './types';

export function findBoundingBox(
  alphaMask: Uint8Array,
  width: number,
  height: number,
  threshold: number = 30
): BBox {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alphaMask[y * width + x] >= threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }
  if (!found) return { x: 0, y: 0, w: width, h: height };
  const padW = Math.round((maxX - minX + 1) * 0.05);
  const padH = Math.round((maxY - minY + 1) * 0.05);
  minX = Math.max(0, minX - padW);
  minY = Math.max(0, minY - padH);
  maxX = Math.min(width - 1, maxX + padW);
  maxY = Math.min(height - 1, maxY + padH);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function centerCrop(imageData: ImageData, bbox: BBox): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = bbox.w;
  canvas.height = bbox.h;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, -bbox.x, -bbox.y);
  return ctx.getImageData(0, 0, bbox.w, bbox.h);
}

export function ensureMinSize(
  bbox: BBox, width: number, height: number, minRatio: number = 0.3
): BBox {
  const minW = Math.round(width * minRatio);
  const minH = Math.round(height * minRatio);
  let { x, y, w, h } = bbox;
  if (w < minW) {
    const dx = Math.round((minW - w) / 2);
    x = Math.max(0, x - dx);
    w = minW;
    if (x + w > width) x = width - w;
  }
  if (h < minH) {
    const dy = Math.round((minH - h) / 2);
    y = Math.max(0, y - dy);
    h = minH;
    if (y + h > height) y = height - h;
  }
  return { x: Math.max(0, x), y: Math.max(0, y), w, h };
}