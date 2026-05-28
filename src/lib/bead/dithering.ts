export function floydSteinberg(
  pixels: Float32Array,
  w: number,
  h: number,
  alpha?: Uint8Array,
  alphaThreshold?: number,
): void {
  const threshold = alphaThreshold ?? 10;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pi = y * w + x;
      if (alpha && alpha[pi] < threshold) continue;

      const i = pi * 3;
      const nr = Math.max(0, Math.min(255, Math.round(pixels[i])));
      const ng = Math.max(0, Math.min(255, Math.round(pixels[i + 1])));
      const nb = Math.max(0, Math.min(255, Math.round(pixels[i + 2])));
      const er = pixels[i] - nr;
      const eg = pixels[i + 1] - ng;
      const eb = pixels[i + 2] - nb;
      pixels[i] = nr;
      pixels[i + 1] = ng;
      pixels[i + 2] = nb;

      if (x + 1 < w && (!alpha || alpha[pi + 1] >= threshold)) {
        const ri = (y * w + x + 1) * 3;
        pixels[ri] += (er * 7) / 16;
        pixels[ri + 1] += (eg * 7) / 16;
        pixels[ri + 2] += (eb * 7) / 16;
      }
      if (y + 1 < h) {
        if (x > 0 && (!alpha || alpha[(y + 1) * w + x - 1] >= threshold)) {
          const li = ((y + 1) * w + x - 1) * 3;
          pixels[li] += (er * 3) / 16;
          pixels[li + 1] += (eg * 3) / 16;
          pixels[li + 2] += (eb * 3) / 16;
        }
        if (!alpha || alpha[(y + 1) * w + x] >= threshold) {
          const bi = ((y + 1) * w + x) * 3;
          pixels[bi] += (er * 5) / 16;
          pixels[bi + 1] += (eg * 5) / 16;
          pixels[bi + 2] += (eb * 5) / 16;
        }
        if (x + 1 < w && (!alpha || alpha[(y + 1) * w + x + 1] >= threshold)) {
          const ri = ((y + 1) * w + x + 1) * 3;
          pixels[ri] += (er * 1) / 16;
          pixels[ri + 1] += (eg * 1) / 16;
          pixels[ri + 2] += (eb * 1) / 16;
        }
      }
    }
  }
}