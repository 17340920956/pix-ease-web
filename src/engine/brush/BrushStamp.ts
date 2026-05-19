export interface BrushStamp {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function renderCircleStamp(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  size: number,
  hardness: number = 1
): void {
  const radius = size / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const normalizedDist = dist / radius;
      let alpha: number;

      if (normalizedDist >= 1) {
        alpha = 0;
      } else if (normalizedDist <= hardness) {
        alpha = 1;
      } else {
        const t = (normalizedDist - hardness) / (1 - hardness);
        alpha = 1 - t * t * (3 - 2 * t);
      }

      const idx = (y * width + x) * 4;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
}

export function renderSquareStamp(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  size: number,
  hardness: number = 1
): void {
  const halfSize = size / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = Math.abs(x - centerX);
      const dy = Math.abs(y - centerY);
      const maxDist = Math.max(dx, dy);

      const normalizedDist = maxDist / halfSize;
      let alpha: number;

      if (normalizedDist >= 1) {
        alpha = 0;
      } else if (normalizedDist <= hardness) {
        alpha = 1;
      } else {
        const t = (normalizedDist - hardness) / (1 - hardness);
        alpha = 1 - t * t * (3 - 2 * t);
      }

      const idx = (y * width + x) * 4;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
}

export function renderPixelStamp(
  data: Uint8ClampedArray,
  width: number,
  height: number
): void {
  for (let i = 3; i < data.length; i += 4) {
    data[i] = 255;
  }
}
