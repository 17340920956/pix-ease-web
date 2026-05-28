import type { BeadColor } from './types';

const D65 = { X: 95.047, Y: 100.0, Z: 108.883 };

function srgbToLinear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  return {
    x: (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) * 100,
    y: (0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl) * 100,
    z: (0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl) * 100,
  };
}

function xyzToLab(x: number, y: number, z: number): { l: number; a: number; b: number } {
  const fx = f(x / D65.X);
  const fy = f(y / D65.Y);
  const fz = f(z / D65.Z);

  function f(t: number): number {
    return t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116);
  }

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function deltaE76(hex1: string, hex2: string): number {
  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const c1 = parse(hex1);
  const c2 = parse(hex2);
  const xyz1 = rgbToXyz(c1.r, c1.g, c1.b);
  const xyz2 = rgbToXyz(c2.r, c2.g, c2.b);
  const lab1 = xyzToLab(xyz1.x, xyz1.y, xyz1.z);
  const lab2 = xyzToLab(xyz2.x, xyz2.y, xyz2.z);
  return Math.sqrt((lab1.l - lab2.l) ** 2 + (lab1.a - lab2.a) ** 2 + (lab1.b - lab2.b) ** 2);
}

const colorCache = new Map<string, number>();
const MAX_CACHE_SIZE = 100000;

function getDeltaE(hex1: string, hex2: string): number {
  const key = hex1 < hex2 ? `${hex1}|${hex2}` : `${hex2}|${hex1}`;
  if (colorCache.has(key)) return colorCache.get(key)!;
  const d = deltaE76(hex1, hex2);
  if (colorCache.size >= MAX_CACHE_SIZE) {
    colorCache.clear();
  }
  colorCache.set(key, d);
  return d;
}

export function clearColorCache() {
  colorCache.clear();
}

export function nearestColor(
  r: number, g: number, b: number,
  palette: BeadColor[]
): BeadColor {
  const srcHex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  let best = palette[0];
  let bestDist = Infinity;
  for (const c of palette) {
    const dist = getDeltaE(srcHex, c.hex);
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}