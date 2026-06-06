/**
 * 颜色匹配 — CIEDE2000 感知色差 + 智能后匹配色板缩减
 *
 * 管线：
 * 1. 色板预计算 LAB + RGB
 * 2. 两阶段搜索：RGB 欧氏距离粗筛 → CIEDE2000 精匹配
 * 3. 智能缩减：基于实际用色的相似色合并（非预聚类）
 */

import type { BeadColor } from './types';

// ========================================================
// RGB → LAB 转换
// ========================================================

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let vr = r / 255, vg = g / 255, vb = b / 255;
  vr = vr > 0.04045 ? Math.pow((vr + 0.055) / 1.055, 2.4) : vr / 12.92;
  vg = vg > 0.04045 ? Math.pow((vg + 0.055) / 1.055, 2.4) : vg / 12.92;
  vb = vb > 0.04045 ? Math.pow((vb + 0.055) / 1.055, 2.4) : vb / 12.92;
  vr *= 100; vg *= 100; vb *= 100;
  const x = vr * 0.4124564 + vg * 0.3575761 + vb * 0.1804375;
  const y = vr * 0.2126729 + vg * 0.7151522 + vb * 0.0721750;
  const z = vr * 0.0193339 + vg * 0.1191920 + vb * 0.9503041;
  const refX = 95.047, refY = 100.0, refZ = 108.883;
  const vx = x / refX, vy = y / refY, vz = z / refZ;
  const fx = vx > 0.008856 ? Math.cbrt(vx) : (903.3 * vx + 16) / 116;
  const fy = vy > 0.008856 ? Math.cbrt(vy) : (903.3 * vy + 16) / 116;
  const fz = vz > 0.008856 ? Math.cbrt(vz) : (903.3 * vz + 16) / 116;
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// ========================================================
// CIEDE2000
// ========================================================

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const POW25_7 = Math.pow(25, 7);

export function ciede2000(L1: number, a1: number, b1: number, L2: number, a2: number, b2: number): number {
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + POW25_7)));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const Cbarp = (C1p + C2p) / 2;

  let h1p = Math.atan2(b1, a1p) * RAD2DEG; if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * RAD2DEG; if (h2p < 0) h2p += 360;

  let deltahp: number;
  if (C1p === 0 || C2p === 0) {
    deltahp = 0;
  } else {
    const diff = h2p - h1p;
    deltahp = Math.abs(diff) <= 180 ? diff : (diff > 180 ? diff - 360 : diff + 360);
  }

  const deltaLp = L2 - L1;
  const deltaCp = C2p - C1p;
  const deltaHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deltahp * DEG2RAD / 2);

  let Hbarp: number;
  if (C1p === 0 || C2p === 0) {
    Hbarp = h1p + h2p;
  } else {
    const sum = h1p + h2p;
    Hbarp = Math.abs(h1p - h2p) <= 180 ? sum / 2 : (sum < 360 ? (sum + 360) / 2 : (sum - 360) / 2);
  }

  const Lbarp = (L1 + L2) / 2;
  const cosH = Math.cos((Hbarp - 30) * DEG2RAD);
  const cos2H = Math.cos(2 * Hbarp * DEG2RAD);
  const cos3H = Math.cos((3 * Hbarp + 6) * DEG2RAD);
  const cos4H = Math.cos((4 * Hbarp - 63) * DEG2RAD);
  const T = 1 - 0.17 * cosH + 0.24 * cos2H + 0.32 * cos3H - 0.2 * cos4H;

  const dL = Lbarp - 50;
  const dL2 = dL * dL;
  const SL = 1 + 0.015 * dL2 / Math.sqrt(20 + dL2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;

  const expArg = (Hbarp - 275) / 25;
  const deltaTheta = 30 * Math.exp(-(expArg * expArg));
  const RC = 2 * Math.sqrt(Cbar7 / (Cbar7 + POW25_7));
  const RT = -Math.sin(2 * deltaTheta * DEG2RAD) * RC;

  const tL = deltaLp / SL;
  const tC = deltaCp / SC;
  const tH = deltaHp / SH;
  return Math.sqrt(tL * tL + tC * tC + tH * tH + RT * tC * tH);
}

// ========================================================
// 色板管理
// ========================================================

interface PaletteEntry {
  color: BeadColor;
  lab: [number, number, number];
  r: number; g: number; b: number;
}

let cachedPalette: BeadColor[] | null = null;
let cachedEntries: PaletteEntry[] | null = null;

function ensurePalette(palette: BeadColor[]): PaletteEntry[] {
  if (cachedEntries && cachedPalette === palette) return cachedEntries;

  const entries: PaletteEntry[] = new Array(palette.length);
  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    entries[i] = {
      color: c,
      lab: rgbToLab(c.rgb[0], c.rgb[1], c.rgb[2]),
      r: c.rgb[0], g: c.rgb[1], b: c.rgb[2],
    };
  }
  cachedPalette = palette;
  cachedEntries = entries;
  return entries;
}

export function clearColorCache() {
  cachedPalette = null;
  cachedEntries = null;
  lookupCache.clear();
  cacheKeys.length = 0;
}

// ========================================================
// RGB 量化缓存
// ========================================================

const CACHE_QUANTIZE = 2;
const MAX_CACHE_SIZE = 4096;
const lookupCache = new Map<number, BeadColor>();
const cacheKeys: number[] = [];

function buildCacheKey(r: number, g: number, b: number): number {
  return (Math.round(r / CACHE_QUANTIZE) * CACHE_QUANTIZE << 16)
    | (Math.round(g / CACHE_QUANTIZE) * CACHE_QUANTIZE << 8)
    | Math.round(b / CACHE_QUANTIZE) * CACHE_QUANTIZE;
}

// ========================================================
// 颜色匹配核心 — 两阶段搜索
// ========================================================

/**
 * 颜色匹配 — 全量 CIEDE2000 感知色差匹配
 *
 * 所有色板统一使用全量 CIEDE2000，确保不同品牌的匹配策略完全一致。
 * 不做输入量化：像素化后的图像已经是平滑颜色块，直接匹配即可。
 * 量化会导致边界效应（相邻像素被量化到不同值），反而产生色斑。
 */

export function nearestColor(
  r: number, g: number, b: number,
  palette: BeadColor[],
): BeadColor {
  const cacheKey = buildCacheKey(r, g, b);
  const cached = lookupCache.get(cacheKey);
  if (cached) return cached;

  const entries = ensurePalette(palette);

  // 全量 CIEDE2000 精匹配
  const [pL, pa, pb] = rgbToLab(r, g, b);
  let best = entries[0];
  let bestScore = ciede2000(pL, pa, pb, best.lab[0], best.lab[1], best.lab[2]);
  for (let i = 1; i < entries.length; i++) {
    const e = entries[i];
    const dist = ciede2000(pL, pa, pb, e.lab[0], e.lab[1], e.lab[2]);
    if (dist < bestScore) {
      bestScore = dist;
      best = e;
    }
  }

  const result = best.color;

  if (lookupCache.size >= MAX_CACHE_SIZE) {
    lookupCache.delete(cacheKeys.shift()!);
  }
  lookupCache.set(cacheKey, result);
  cacheKeys.push(cacheKey);

  return result;
}

// ========================================================
// 智能后匹配色板缩减
// ========================================================

export interface ReduceResult {
  beadMap: Map<string, string>;
  countMap: Map<string, number>;
  mergedCount: number;
}

export function smartReducePalette(
  beadMap: Map<string, string>,
  countMap: Map<string, number>,
  hexMap: Map<string, BeadColor>,
  totalPixels: number,
  mergeThreshold: number = 4,
  minOccurrenceRate: number = 0.002,
): ReduceResult {
  const minOccurrence = Math.max(3, Math.ceil(totalPixels * minOccurrenceRate));

  // 收集活跃颜色
  const activeColors: { hex: string; color: BeadColor; lab: [number, number, number]; count: number }[] = [];
  countMap.forEach((cnt, hex) => {
    const upper = hex.toUpperCase();
    if (cnt >= minOccurrence) {
      const color = hexMap.get(upper);
      if (color) {
        activeColors.push({
          hex: upper,
          color,
          lab: rgbToLab(color.rgb[0], color.rgb[1], color.rgb[2]),
          count: cnt,
        });
      }
    }
  });

  if (activeColors.size <= 1) {
    return { beadMap: new Map(beadMap), countMap: new Map(countMap), mergedCount: 0 };
  }

  let mergedTotal = 0;
  let changed = true;
  const maxIterations = activeColors.length;

  for (let iter = 0; iter < maxIterations && changed; iter++) {
    changed = false;
    let bestPair: [number, number] | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < activeColors.length; i++) {
      for (let j = i + 1; j < activeColors.length; j++) {
        const a = activeColors[i].lab;
        const b = activeColors[j].lab;
        const dist = ciede2000(a[0], a[1], a[2], b[0], b[1], b[2]);
        if (dist < bestDist) {
          bestDist = dist;
          bestPair = [i, j];
        }
      }
    }

    if (bestPair && bestDist < mergeThreshold) {
      const [idxA, idxB] = bestPair;
      const keepIdx = activeColors[idxA].count >= activeColors[idxB].count ? idxA : idxB;
      const removeIdx = keepIdx === idxA ? idxB : idxA;
      const keepHex = activeColors[keepIdx].hex;
      const removeHex = activeColors[removeIdx].hex;

      let replaced = 0;
      beadMap.forEach((hex, key) => {
        if (hex.toUpperCase() === removeHex) {
          beadMap.set(key, keepHex);
          replaced++;
        }
      });

      if (replaced > 0) {
        const oldCnt = countMap.get(removeHex) || 0;
        countMap.set(keepHex, (countMap.get(keepHex) || 0) + oldCnt);
        countMap.delete(removeHex);
        activeColors[keepIdx].count += oldCnt;
        mergedTotal += replaced;
        changed = true;
      }

      activeColors.splice(removeIdx, 1);
    }
  }

  return { beadMap, countMap, mergedCount: mergedTotal };
}

// ========================================================
// 工具函数
// ========================================================

export function buildHexMap(colors: BeadColor[]): Map<string, BeadColor> {
  const map = new Map<string, BeadColor>();
  for (const c of colors) {
    map.set(c.hex.toUpperCase(), c);
  }
  return map;
}

/**
 * 将 hex 颜色解析为 RGB 三元组
 */
export function parseHexColor(hex: string): [number, number, number] {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}
