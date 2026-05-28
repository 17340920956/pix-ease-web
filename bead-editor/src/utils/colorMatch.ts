import type { BeadColor } from '../types';

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rmean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(
    (2 + rmean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rmean) / 256) * db * db
  );
}

export function nearestColor(
  r: number, g: number, b: number,
  palette: BeadColor[]
): BeadColor {
  let best = palette[0];
  let bestDist = Infinity;
  for (const c of palette) {
    const [cr, cg, cb] = c.rgb;
    const dist = colorDistance(r, g, b, cr, cg, cb);
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}