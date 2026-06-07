/**
 * 拼豆图纸后处理 — 梯度自适应平滑 + 孤立像素平滑 + 过渡色去除
 * 
 * 设计原则：
 * - 逐像素精确匹配保留细节
 * - 梯度自适应：纯色区强力平滑消除色斑，边缘区保留细节不做处理
 */

import type { BeadColor } from '@/lib/bead/types';
import { rgbToLab, ciede2000, parseHexColor } from '@/lib/pixelation/colorMatch';

export interface PostprocessOptions {
  smoothIsolated?: boolean;
  strengthenEdges?: boolean;
  removeTransition?: boolean;
  transitionThreshold?: number;
  maxColors?: number;
  aggressiveSmooth?: boolean;
  mergeSimilarNeighborhood?: boolean;
  mergeColorThreshold?: number;
}

export function postprocessBeadMap(
  beadMap: Map<string, string>,
  palette: BeadColor[],
  width: number,
  height: number,
  options: PostprocessOptions = {}
): Map<string, string> {
  const {
    smoothIsolated = true,
    removeTransition = false,
    transitionThreshold = 3,
    maxColors = 0,
    mergeSimilarNeighborhood = true,
    mergeColorThreshold = 0,
  } = options;

  let result = new Map(beadMap);

  // 第一遍：中值滤波消除碎色斑点
  result = medianFilter(result, width, height, 2);

  // 第二遍：相邻相似色合并（消除残余同系色斑）
  if (mergeSimilarNeighborhood) {
    result = mergeSimilarNeighbors(result, palette, width, height, 10);
  }

  // 第三遍：孤立像素平滑
  if (smoothIsolated) {
    result = smoothIsolatedPixels(result, width, height);
  }

  // 第四遍：去除过渡色
  if (removeTransition) {
    result = removeTransitionColors(result, palette, transitionThreshold);
  }

  // 可选：限制色板数量
  if (maxColors > 0) {
    const colorCount = countColors(result);
    if (colorCount > maxColors) {
      result = mergeSimilarColors(result, palette, maxColors);
    }
  }

  return result;
}

/**
 * 合并相邻相似色（CIEDE2000 距离 < threshold 的颜色统一为邻居中的主导色）
 */
function mergeSimilarNeighbors(
  beadMap: Map<string, string>,
  palette: BeadColor[],
  width: number,
  height: number,
  threshold: number,
): Map<string, string> {
  // 预计算色板 LAB
  const paletteLab = new Map<string, [number, number, number]>();
  for (const c of palette) {
    paletteLab.set(c.hex.toUpperCase(), rgbToLab(c.rgb[0], c.rgb[1], c.rgb[2]));
  }

  // 统计每个颜色的频率
  const colorFreq = new Map<string, number>();
  beadMap.forEach(hex => {
    const upper = hex.toUpperCase();
    colorFreq.set(upper, (colorFreq.get(upper) || 0) + 1);
  });

  // 找出主导色（频率 > 2% 的颜色）
  const totalPixels = beadMap.size;
  const dominantThreshold = Math.max(1, Math.floor(totalPixels * 0.02));
  const dominantColors = new Set<string>();
  colorFreq.forEach((count, hex) => {
    if (count >= dominantThreshold) dominantColors.add(hex);
  });

  if (dominantColors.size === 0) return beadMap;

  // 对每个像素，检查其 8 个邻居
  // 如果当前像素是非主导色，且邻居中有主导色且颜色相近（CIEDE2000 < threshold），则替换为邻居主导色
  const result = new Map(beadMap);
  const changes: { key: string; newHex: string }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const hex = beadMap.get(key);
      if (!hex) continue;

      const upperHex = hex.toUpperCase();
      // 只处理非主导色（低频色）
      if (dominantColors.has(upperHex)) continue;

      const [r, g, b] = parseHexColor(hex);
      const [L, a, b_] = rgbToLab(r, g, b);

      // 在 8 邻居中找主导色
      let bestNeighborHex = '';
      let bestDist = Infinity;
      for (const [dx, dy] of NEIGHBOR_OFFSETS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nKey = `${nx},${ny}`;
          const nHex = beadMap.get(nKey);
          if (!nHex) continue;
          const nUpper = nHex.toUpperCase();
          if (!dominantColors.has(nUpper)) continue;

          const nLab = paletteLab.get(nUpper);
          if (!nLab) continue;
          const dist = ciede2000(L, a, b_, nLab[0], nLab[1], nLab[2]);
          if (dist < threshold && dist < bestDist) {
            bestDist = dist;
            bestNeighborHex = nHex;
          }
        }
      }

      if (bestNeighborHex) {
        changes.push({ key, newHex: bestNeighborHex });
      }
    }
  }

  for (const { key, newHex } of changes) {
    result.set(key, newHex);
  }

  return result;
}

function countColors(beadMap: Map<string, string>): number {
  const colors = new Set<string>();
  beadMap.forEach(hex => colors.add(hex.toUpperCase()));
  return colors.size;
}

// ========================================================
// 中值滤波 — 消除碎色斑点
// ========================================================

const NEIGHBOR_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

function medianFilter(
  beadMap: Map<string, string>,
  width: number,
  height: number,
  iterations: number,
): Map<string, string> {
  let result = new Map(beadMap);

  for (let iter = 0; iter < iterations; iter++) {
    const changes: { key: string; newHex: string }[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        const hex = result.get(key);
        if (!hex) continue;

        // 统计 3×3 邻居颜色频率（不包括自身）
        const freq = new Map<string, number>();
        let totalNeighbors = 0;
        for (const [dx, dy] of NEIGHBOR_OFFSETS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nKey = `${nx},${ny}`;
            const nHex = result.get(nKey);
            if (nHex) {
              freq.set(nHex, (freq.get(nHex) || 0) + 1);
              totalNeighbors++;
            }
          }
        }

        // 找出最频繁的邻居色
        let bestHex = '';
        let bestCount = 0;
        freq.forEach((count, nHex) => {
          if (count > bestCount) {
            bestCount = count;
            bestHex = nHex;
          }
        });

        // 关键修复：只有当邻居色与自身不同，且邻居色占绝对多数（≥6/8 = 75%）时才替换
        // 这确保只在"孤立的异色像素"时才替换，避免大面积区域被破坏
        if (bestHex !== hex && bestHex !== '' && bestCount >= 6) {
          changes.push({ key, newHex: bestHex });
        }
      }
    }

    for (const { key, newHex } of changes) {
      result.set(key, newHex);
    }
  }

  return result;
}

// ========================================================
// 孤立像素平滑
// ========================================================

function smoothIsolatedPixels(
  beadMap: Map<string, string>,
  width: number,
  height: number,
): Map<string, string> {
  const result = new Map(beadMap);
  const changes: { key: string; newHex: string }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const hex = beadMap.get(key);
      if (!hex) continue;

      // 统计 8 邻居颜色频率
      const neighborFreq = new Map<string, number>();
      for (const [dx, dy] of NEIGHBOR_OFFSETS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nKey = `${nx},${ny}`;
          const nHex = beadMap.get(nKey);
          if (nHex) {
            neighborFreq.set(nHex, (neighborFreq.get(nHex) || 0) + 1);
          }
        }
      }

      // 如果自身在邻居中几乎不存在（<=1），视为孤立噪点
      const selfCount = neighborFreq.get(hex) || 0;
      if (selfCount <= 1) {
        let mostFreqHex = '';
        let mostFreqCount = 0;
        neighborFreq.forEach((count, nHex) => {
          if (count > mostFreqCount) {
            mostFreqCount = count;
            mostFreqHex = nHex;
          }
        });

        // 邻居色占绝对多数（>=6/8 = 75%）时才替换
        if (mostFreqCount >= 6 && mostFreqHex) {
          changes.push({ key, newHex: mostFreqHex });
        }
      }
    }
  }

  for (const { key, newHex } of changes) {
    result.set(key, newHex);
  }

  return result;
}

// ========================================================
// 移除过渡色（低频颜色）
// ========================================================

function removeTransitionColors(
  beadMap: Map<string, string>,
  palette: BeadColor[],
  minCount: number
): Map<string, string> {
  // 统计颜色频率
  const colorFreq = new Map<string, number>();
  beadMap.forEach(hex => {
    const upper = hex.toUpperCase();
    colorFreq.set(upper, (colorFreq.get(upper) || 0) + 1);
  });

  // 找出稀有颜色
  const rareColors = new Set<string>();
  colorFreq.forEach((count, hex) => {
    if (count < minCount) rareColors.add(hex);
  });

  if (rareColors.size === 0) return beadMap;

  // 构建主导色 LAB 映射
  const dominantLab = new Map<string, [number, number, number]>();
  const dominantHexes: string[] = [];
  colorFreq.forEach((count, hex) => {
    if (count >= minCount) {
      const [r, g, b] = parseHexColor(hex);
      dominantLab.set(hex, rgbToLab(r, g, b));
      dominantHexes.push(hex);
    }
  });

  if (dominantHexes.length === 0) return beadMap;

  const result = new Map(beadMap);
  result.forEach((hex, key) => {
    const upper = hex.toUpperCase();
    if (rareColors.has(upper)) {
      const [r, g, b] = parseHexColor(hex);
      const [rL, ra, rb] = rgbToLab(r, g, b);

      let bestDist = Infinity;
      let bestHex = dominantHexes[0];
      for (const dHex of dominantHexes) {
        const dLab = dominantLab.get(dHex);
        if (!dLab) continue;
        // 使用 CIEDE2000 感知色差
        const dist = ciede2000(rL, ra, rb, dLab[0], dLab[1], dLab[2]);
        if (dist < bestDist) {
          bestDist = dist;
          bestHex = dHex;
        }
      }

      result.set(key, bestHex);
    }
  });

  return result;
}

// ========================================================
// 合并相似颜色（限制色板数量）
// ========================================================

function mergeSimilarColors(
  beadMap: Map<string, string>,
  palette: BeadColor[],
  targetColors: number
): Map<string, string> {
  // 统计颜色频率，按频率排序
  const colorFreq = new Map<string, number>();
  beadMap.forEach(hex => {
    const upper = hex.toUpperCase();
    colorFreq.set(upper, (colorFreq.get(upper) || 0) + 1);
  });

  const sortedColors = [...colorFreq.entries()].sort((a, b) => b[1] - a[1]);

  if (sortedColors.length <= targetColors) {
    return beadMap;
  }

  // 保留最常用的颜色
  const keepColors = sortedColors.slice(0, targetColors);
  const keepSet = new Set(keepColors.map(([hex]) => hex));

  // 预计算保留颜色的 LAB
  const keepLab = new Map<string, [number, number, number]>();
  for (const [hex] of keepColors) {
    const [r, g, b] = parseHexColor(hex);
    keepLab.set(hex, rgbToLab(r, g, b));
  }

  const result = new Map<string, string>();
  beadMap.forEach((hex) => {
    const upper = hex.toUpperCase();
    if (keepSet.has(upper)) {
      result.set(hex, hex);
    } else {
      const [r, g, b] = parseHexColor(hex);
      const [rL, ra, rb] = rgbToLab(r, g, b);

      let bestDist = Infinity;
      let bestHex = keepColors[0][0];
      for (const [kHex, lab] of keepLab) {
        const dist = ciede2000(rL, ra, rb, lab[0], lab[1], lab[2]);
        if (dist < bestDist) {
          bestDist = dist;
          bestHex = kHex;
        }
      }

      result.set(hex, bestHex);
    }
  });

  return result;
}
