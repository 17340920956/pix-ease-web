function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function rad2deg(rad: number): number {
  return rad * (180 / Math.PI);
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  let vr = r / 255;
  let vg = g / 255;
  let vb = b / 255;

  vr = vr > 0.04045 ? Math.pow((vr + 0.055) / 1.055, 2.4) : vr / 12.92;
  vg = vg > 0.04045 ? Math.pow((vg + 0.055) / 1.055, 2.4) : vg / 12.92;
  vb = vb > 0.04045 ? Math.pow((vb + 0.055) / 1.055, 2.4) : vb / 12.92;

  vr *= 100;
  vg *= 100;
  vb *= 100;

  const x = vr * 0.4124564 + vg * 0.3575761 + vb * 0.1804375;
  const y = vr * 0.2126729 + vg * 0.7151522 + vb * 0.0721750;
  const z = vr * 0.0193339 + vg * 0.1191920 + vb * 0.9503041;

  return [x, y, z];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let vx = x / refX;
  let vy = y / refY;
  let vz = z / refZ;

  vx = vx > 0.008856 ? Math.cbrt(vx) : (903.3 * vx + 16) / 116;
  vy = vy > 0.008856 ? Math.cbrt(vy) : (903.3 * vy + 16) / 116;
  vz = vz > 0.008856 ? Math.cbrt(vz) : (903.3 * vz + 16) / 116;

  const L = Math.max(0, 116 * vy - 16);
  const a = 500 * (vx - vy);
  const bVal = 200 * (vy - vz);

  return [L, a, bVal];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function ciede2000(L1: number, a1: number, b1: number, L2: number, a2: number, b2: number): number {
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const Cbarp = (C1p + C2p) / 2;

  let h1p = rad2deg(Math.atan2(b1, a1p));
  if (h1p < 0) h1p += 360;
  let h2p = rad2deg(Math.atan2(b2, a2p));
  if (h2p < 0) h2p += 360;

  let deltahp: number;
  if (C1p === 0 || C2p === 0) {
    deltahp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    deltahp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    deltahp = h2p - h1p - 360;
  } else {
    deltahp = h2p - h1p + 360;
  }

  const deltaLp = L2 - L1;
  const deltaCp = C2p - C1p;
  const deltaHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(deltahp) / 2);

  let Hbarp: number;
  if (C1p === 0 || C2p === 0) {
    Hbarp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    Hbarp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    Hbarp = (h1p + h2p + 360) / 2;
  } else {
    Hbarp = (h1p + h2p - 360) / 2;
  }

  const Lbarp = (L1 + L2) / 2;

  const T = 1 - 0.17 * Math.cos(deg2rad(Hbarp - 30))
    + 0.24 * Math.cos(deg2rad(2 * Hbarp))
    + 0.32 * Math.cos(deg2rad(3 * Hbarp + 6))
    - 0.2 * Math.cos(deg2rad(4 * Hbarp - 63));

  const SL = 1 + (0.015 * (Lbarp - 50) * (Lbarp - 50)) / Math.sqrt(20 + (Lbarp - 50) * (Lbarp - 50));
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;

  const deltaTheta = 30 * Math.exp(-((Hbarp - 275) / 25) * ((Hbarp - 275) / 25));
  const RC = 2 * Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)));
  const RT = -Math.sin(deg2rad(2 * deltaTheta)) * RC;

  const termL = deltaLp / (kL * SL);
  const termC = deltaCp / (kC * SC);
  const termH = deltaHp / (kH * SH);

  return Math.sqrt(termL * termL + termC * termC + termH * termH + RT * termC * termH);
}

export function findClosestColor(
  r: number,
  g: number,
  b: number,
  palette: Array<{ hex: string }>,
): { hex: string; index: number } {
  const [L1, a1, b1] = rgbToLab(r, g, b);

  let minDist = Infinity;
  let bestIndex = 0;
  let bestHex = palette[0].hex;

  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb] = hexToRgb(palette[i].hex);
    const [L2, a2, b2] = rgbToLab(pr, pg, pb);
    const dist = ciede2000(L1, a1, b1, L2, a2, b2);

    if (dist < minDist) {
      minDist = dist;
      bestIndex = i;
      bestHex = palette[i].hex;
    }
  }

  return { hex: bestHex, index: bestIndex };
}

export function hexToRgbRaw(hex: string): [number, number, number] {
  return hexToRgb(hex);
}

function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

const DIRS: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

function computeGradientMap(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const total = width * height;
  const grad = new Float32Array(total);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const [L, a, bbV] = rgbToLab(r, g, b);

      let maxD = 0;
      const neighbors = [
        y > 0 ? (y - 1) * width + x : -1,
        y < height - 1 ? (y + 1) * width + x : -1,
        x > 0 ? y * width + (x - 1) : -1,
        x < width - 1 ? y * width + (x + 1) : -1,
      ];
      for (const ni of neighbors) {
        if (ni < 0) continue;
        const nr = data[ni * 4], ng = data[ni * 4 + 1], nb = data[ni * 4 + 2];
        const [nL, na, nbV] = rgbToLab(nr, ng, nb);
        const d = ciede2000(L, a, bbV, nL, na, nbV);
        if (d > maxD) maxD = d;
      }
      grad[i] = maxD;
    }
  }
  return grad;
}

export function detectBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const totalPixels = width * height;
  if (width < 5 || height < 5) return new Uint8Array(totalPixels);

  const result = new Uint8Array(totalPixels);

  let transparentCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] < 128) { result[i] = 1; transparentCount++; }
  }
  if (transparentCount > totalPixels * 0.003) return result;

  const cornerPixels = Math.min(24, Math.floor(Math.min(width, height) * 0.1));
  const corners: Array<{ sx: number; sy: number }> = [
    { sx: 0, sy: 0 },
    { sx: width - cornerPixels, sy: 0 },
    { sx: 0, sy: height - cornerPixels },
    { sx: width - cornerPixels, sy: height - cornerPixels },
  ];

  const bgCandidates: Array<[number, number, number]> = [];
  for (const { sx, sy } of corners) {
    let sumR = 0, sumG = 0, sumB = 0, cnt = 0;
    for (let dy = 0; dy < cornerPixels; dy++) {
      for (let dx = 0; dx < cornerPixels; dx++) {
        const i = (sy + dy) * width + (sx + dx);
        if (data[i * 4 + 3] >= 128) {
          sumR += data[i * 4]; sumG += data[i * 4 + 1]; sumB += data[i * 4 + 2];
          cnt++;
        }
      }
    }
    if (cnt > 0) {
      bgCandidates.push([Math.round(sumR / cnt), Math.round(sumG / cnt), Math.round(sumB / cnt)]);
    }
  }

  if (bgCandidates.length === 0) return new Uint8Array(totalPixels);

  const tolerances = [8.0, 16.0, 28.0, 44.0];

  let bestMask = new Uint8Array(totalPixels);
  let bestScore = -Infinity;

  for (const [br, bg, bb] of bgCandidates) {
    const [bL, ba, bbLab] = rgbToLab(br, bg, bb);

    for (const tolerance of tolerances) {
      const visited = new Uint8Array(totalPixels);
      const mask = new Uint8Array(totalPixels);
      const queue: [number, number][] = [];

      for (const { sx, sy } of corners) {
        for (let dy = 0; dy < cornerPixels; dy++) {
          for (let dx = 0; dx < cornerPixels; dx++) {
            const cx = sx + dx, cy = sy + dy;
            const ci = cy * width + cx;
            if (data[ci * 4 + 3] < 128 || visited[ci]) continue;
            const r = data[ci * 4], g = data[ci * 4 + 1], b = data[ci * 4 + 2];
            const [L, a, bbV] = rgbToLab(r, g, b);
            if (ciede2000(L, a, bbV, bL, ba, bbLab) <= tolerance) {
              visited[ci] = 1; mask[ci] = 1; queue.push([cx, cy]);
            }
          }
        }
      }

      if (queue.length === 0) continue;

      let head = 0;
      while (head < queue.length) {
        const [cx, cy] = queue[head++];
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          if (visited[ni]) continue;
          if (data[ni * 4 + 3] < 128) continue;
          const r = data[ni * 4], g = data[ni * 4 + 1], b = data[ni * 4 + 2];
          const [L, a, bbV] = rgbToLab(r, g, b);
          if (ciede2000(L, a, bbV, bL, ba, bbLab) <= tolerance) {
            visited[ni] = 1; mask[ni] = 1; queue.push([nx, ny]);
          }
        }
      }

      const bgCount = mask.reduce((s, v) => s + v, 0);
      const bgPercent = bgCount / totalPixels;
      if (bgCount === 0 || bgPercent > 0.97) continue;

      let score = 0;
      if (bgPercent >= 0.03 && bgPercent <= 0.55) score += 30;
      else if (bgPercent > 0.55 && bgPercent <= 0.80) score += 24;
      else if (bgPercent > 0.80 && bgPercent <= 0.94) score += 18;
      else score += 8;

      const tolIdx = tolerances.indexOf(tolerance);
      score += (tolerances.length - tolIdx) * 3;

      let cornersTouched = 0;
      for (const { sx, sy } of corners) {
        const midI = (sy + Math.floor(cornerPixels / 2)) * width + (sx + Math.floor(cornerPixels / 2));
        if (mask[midI]) cornersTouched++;
      }
      score += cornersTouched * 4;

      if (score > bestScore) {
        bestScore = score;
        bestMask = new Uint8Array(mask);
      }
    }
  }

  const bgCount = bestMask.reduce((s, v) => s + v, 0);
  if (bgCount === 0) return new Uint8Array(totalPixels);

  return bestMask;
}

export function computeSubjectBBox(
  bgMask: Uint8Array,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | null {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!bgMask[y * width + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }
  if (!found) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function createSubjectOnWhite(
  data: Uint8ClampedArray,
  bgMask: Uint8Array,
  width: number,
  height: number,
): Uint8ClampedArray {
  const totalPixels = width * height;
  const clean = new Uint8ClampedArray(totalPixels * 4);

  for (let i = 0; i < totalPixels; i++) {
    const srcOff = i * 4;

    if (bgMask[i]) {
      clean[srcOff] = 255;
      clean[srcOff + 1] = 255;
      clean[srcOff + 2] = 255;
      clean[srcOff + 3] = 255;
    } else {
      clean[srcOff] = data[srcOff];
      clean[srcOff + 1] = data[srcOff + 1];
      clean[srcOff + 2] = data[srcOff + 2];
      clean[srcOff + 3] = 255;
    }
  }

  return clean;
}

function removeNoise(
  pixels: Map<string, string>,
  width: number,
  height: number,
): Map<string, string> {
  const totalPixels = width * height;

  if (totalPixels <= 5000) {
    return pixels;
  }

  let minRegion = 1;
  if (totalPixels > 5000) minRegion = 2;
  if (totalPixels > 15000) minRegion = 3;

  const visited = new Uint8Array(totalPixels);
  const cleaned = new Map(pixels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      if (visited[i]) continue;
      const color = pixels.get(`${x},${y}`);
      if (!color) continue;

      const region: [number, number][] = [];
      const q: [number, number][] = [[x, y]];
      visited[i] = 1;
      let qHead = 0;

      while (qHead < q.length) {
        const [cx, cy] = q[qHead++];
        region.push([cx, cy]);
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = idx(nx, ny, width);
          if (visited[ni]) continue;
          if (pixels.get(`${nx},${ny}`) === color) {
            visited[ni] = 1;
            q.push([nx, ny]);
          }
        }
      }

      if (region.length < minRegion) {
        const neighborColors = new Map<string, number>();
        for (const [rx, ry] of region) {
          for (const [dx, dy] of DIRS) {
            const nx = rx + dx;
            const ny = ry + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const ncolor = pixels.get(`${nx},${ny}`);
            if (ncolor && ncolor !== color) {
              neighborColors.set(ncolor, (neighborColors.get(ncolor) || 0) + 1);
            }
          }
        }
        let bestColor = '';
        let bestCount = 0;
        for (const [nc, cnt] of neighborColors) {
          if (cnt > bestCount) {
            bestCount = cnt;
            bestColor = nc;
          }
        }
        if (bestColor) {
          for (const [rx, ry] of region) {
            cleaned.set(`${rx},${ry}`, bestColor);
          }
        }
      }
    }
  }

  return cleaned;
}

export interface ProcessResult {
  pixels: Map<string, string>;
  beadWidth: number;
  beadHeight: number;
  backgroundCount: number;
}

export function processImageToBeads(
  imageData: ImageData,
  palette: Array<{ hex: string }>,
  maxColors: number,
  bgMask?: Uint8Array,
): ProcessResult {
  const { data, width, height } = imageData;

  const isBg = bgMask || detectBackground(data, width, height);

  const [whiteL, whiteA, whiteB] = rgbToLab(255, 255, 255);

  // First pass: count colors for palette reduction
  const rawColors = new Map<string, number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;
      if (isBg[i]) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const [L, a, bbV] = rgbToLab(r, g, b);
      if (ciede2000(L, a, bbV, whiteL, whiteA, whiteB) <= 2.0) continue;
      const { hex } = findClosestColor(r, g, b, palette);
      rawColors.set(hex, (rawColors.get(hex) || 0) + 1);
    }
  }

  let activePalette = palette;
  if (maxColors > 0 && rawColors.size > maxColors) {
    const sorted = Array.from(rawColors.entries()).sort((a, b) => b[1] - a[1]);
    const topHexes = new Set(sorted.slice(0, maxColors).map(([hex]) => hex));
    activePalette = palette.filter((c) => topHexes.has(c.hex));
    if (activePalette.length === 0) {
      activePalette = palette.slice(0, Math.min(maxColors, palette.length));
    }
  }

  // Second pass: Floyd-Steinberg dithering
  const pixels = new Map<string, string>();
  let backgroundCount = 0;

  const errR = new Float32Array(width * height);
  const errG = new Float32Array(width * height);
  const errB = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) {
        backgroundCount++;
        continue;
      }
      if (isBg[i]) {
        backgroundCount++;
        continue;
      }
      const origR = data[i];
      const origG = data[i + 1];
      const origB = data[i + 2];
      const [L, a, bbV] = rgbToLab(origR, origG, origB);
      if (ciede2000(L, a, bbV, whiteL, whiteA, whiteB) <= 2.0) {
        backgroundCount++;
        continue;
      }

      const adjR = Math.max(0, Math.min(255, Math.round(origR + errR[i])));
      const adjG = Math.max(0, Math.min(255, Math.round(origG + errG[i])));
      const adjB = Math.max(0, Math.min(255, Math.round(origB + errB[i])));

      const { hex } = findClosestColor(adjR, adjG, adjB, activePalette);
      pixels.set(`${x},${y}`, hex);

      const matchedHex = hex.replace('#', '');
      const mr = parseInt(matchedHex.substring(0, 2), 16);
      const mg = parseInt(matchedHex.substring(2, 4), 16);
      const mb = parseInt(matchedHex.substring(4, 6), 16);

      const quantErrR = adjR - mr;
      const quantErrG = adjG - mg;
      const quantErrB = adjB - mb;

      if (x + 1 < width) {
        const ri = y * width + (x + 1);
        errR[ri] += quantErrR * (7 / 16);
        errG[ri] += quantErrG * (7 / 16);
        errB[ri] += quantErrB * (7 / 16);
      }
      if (y + 1 < height) {
        if (x > 0) {
          const bli = (y + 1) * width + (x - 1);
          errR[bli] += quantErrR * (3 / 16);
          errG[bli] += quantErrG * (3 / 16);
          errB[bli] += quantErrB * (3 / 16);
        }
        const bi = (y + 1) * width + x;
        errR[bi] += quantErrR * (5 / 16);
        errG[bi] += quantErrG * (5 / 16);
        errB[bi] += quantErrB * (5 / 16);
        if (x + 1 < width) {
          const bri = (y + 1) * width + (x + 1);
          errR[bri] += quantErrR * (1 / 16);
          errG[bri] += quantErrG * (1 / 16);
          errB[bri] += quantErrB * (1 / 16);
        }
      }
    }
  }

  const cleanedPixels = removeNoise(pixels, width, height);

  return { pixels: cleanedPixels, beadWidth: width, beadHeight: height, backgroundCount };
}