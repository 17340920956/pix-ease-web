/**
 * 超像素区域匹配算法 — 自创算法
 * 
 * 核心流程：
 * 1. 颜色预量化 — 将 RGB 舍入到 32 的倍数，消除微小色差
 * 2. 区域生长 — BFS 将量化后颜色相同的相邻像素划分为同一区域
 * 3. 区域平均色匹配 — 用原始像素值计算区域平均色，统一匹配到色板
 * 4. 区域一致性校验 — 相邻区域匹配到同系色时，根据区域面积大小决定是否统一
 * 
 * 相比传统方法：
 * - 预量化消除微小色差，从根源上减少色斑
 * - 区域生长保留不规则形状边界，不丢失细节
 * - 区域平均色匹配保证区域内颜色统一
 */

import type { BeadColor } from '@/lib/bead/types';
import { nearestColor, parseHexColor } from '@/lib/bead/colorMatch';

export interface SuperpixelMatchOptions {
  /** 颜色预量化等级数（默认 32） */
  quantizeLevels?: number;
  /** 区域最小面积（像素数），小于此值的区域合并到邻居（默认 1） */
  minRegionSize?: number;
}

export interface MatchResult {
  beadMap: Map<string, string>;
  superpixelCount: number;
  colorCount: number;
}

/**
 * 超像素区域匹配
 */
export function superpixelMatch(
  imageData: Uint8ClampedArray | ImageData,
  width: number,
  height: number,
  alphaMask: Uint8Array,
  palette: BeadColor[],
  options: SuperpixelMatchOptions = {},
): MatchResult {
  const {
    quantizeLevels = 32,
    minRegionSize = 1,
  } = options;

  const src = imageData instanceof ImageData ? imageData.data : imageData;

  // 步骤 1：颜色预量化 — 将 RGB 舍入到 quantizeLevels 的倍数
  // 消除微小色差，从根源上减少色斑
  const quantized = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const d = i * 4;
    quantized[d] = Math.round(src[d] / quantizeLevels) * quantizeLevels;
    quantized[d + 1] = Math.round(src[d + 1] / quantizeLevels) * quantizeLevels;
    quantized[d + 2] = Math.round(src[d + 2] / quantizeLevels) * quantizeLevels;
    quantized[d + 3] = alphaMask[i];
  }

  // 步骤 2：区域生长 — BFS 将颜色相同的相邻像素划分为同一区域
  const regions = new Int32Array(width * height);
  regions.fill(-1);
  let regionCount = 0;

  // 区域统计：每个区域的 RGB 总和和像素数
  const regionSumR = new Float64Array(width * height);
  const regionSumG = new Float64Array(width * height);
  const regionSumB = new Float64Array(width * height);
  const regionSize = new Uint32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (alphaMask[i] < 10 || regions[i] >= 0) continue;

      // BFS 区域生长
      const regionId = regionCount++;
      const queue: number[] = [i];
      regions[i] = regionId;

      const d = i * 4;
      const seedR = quantized[d], seedG = quantized[d + 1], seedB = quantized[d + 2];

      let head = 0;
      while (head < queue.length) {
        const pi = queue[head++];
        const py = (pi / width) | 0;
        const px = pi - py * width;

        // 累加到区域统计
        const pd = pi * 4;
        regionSumR[regionId] += src[pd];
        regionSumG[regionId] += src[pd + 1];
        regionSumB[regionId] += src[pd + 2];
        regionSize[regionId]++;

        // 检查 4 邻居
        // 左
        if (px > 0) {
          const ni = pi - 1;
          if (alphaMask[ni] >= 10 && regions[ni] < 0) {
            const nd = ni * 4;
            if (quantized[nd] === seedR && quantized[nd + 1] === seedG && quantized[nd + 2] === seedB) {
              regions[ni] = regionId;
              queue.push(ni);
            }
          }
        }
        // 右
        if (px < width - 1) {
          const ni = pi + 1;
          if (alphaMask[ni] >= 10 && regions[ni] < 0) {
            const nd = ni * 4;
            if (quantized[nd] === seedR && quantized[nd + 1] === seedG && quantized[nd + 2] === seedB) {
              regions[ni] = regionId;
              queue.push(ni);
            }
          }
        }
        // 上
        if (py > 0) {
          const ni = pi - width;
          if (alphaMask[ni] >= 10 && regions[ni] < 0) {
            const nd = ni * 4;
            if (quantized[nd] === seedR && quantized[nd + 1] === seedG && quantized[nd + 2] === seedB) {
              regions[ni] = regionId;
              queue.push(ni);
            }
          }
        }
        // 下
        if (py < height - 1) {
          const ni = pi + width;
          if (alphaMask[ni] >= 10 && regions[ni] < 0) {
            const nd = ni * 4;
            if (quantized[nd] === seedR && quantized[nd + 1] === seedG && quantized[nd + 2] === seedB) {
              regions[ni] = regionId;
              queue.push(ni);
            }
          }
        }
      }
    }
  }

  // 步骤 3：合并小区域到邻居
  if (minRegionSize > 1) {
    for (let r = 0; r < regionCount; r++) {
      if (regionSize[r] < minRegionSize && regionSize[r] > 0) {
        // 找到该区域的一个像素
        let px = -1, py = -1;
        for (let i = 0; i < width * height; i++) {
          if (regions[i] === r) {
            py = Math.floor(i / width);
            px = i - py * width;
            break;
          }
        }
        if (px < 0) continue;

        // 找邻居区域
        const neighborRegions = new Map<number, number>();
        const queue: number[] = [py * width + px];
        const visited = new Set<number>();
        visited.add(py * width + px);

        let head = 0;
        while (head < queue.length) {
          const pi = queue[head++];
          const ppy = Math.floor(pi / width);
          const ppx = pi - ppy * width;
          const neighbors = [
            ppx > 0 ? pi - 1 : -1,
            ppx < width - 1 ? pi + 1 : -1,
            ppy > 0 ? pi - width : -1,
            ppy < height - 1 ? pi + width : -1,
          ];
          for (const ni of neighbors) {
            if (ni < 0 || alphaMask[ni] < 10) continue;
            const nr = regions[ni];
            if (nr !== r && nr >= 0) {
              neighborRegions.set(nr, (neighborRegions.get(nr) || 0) + 1);
            }
            if (!visited.has(ni) && regions[ni] === r) {
              visited.add(ni);
              queue.push(ni);
            }
          }
        }

        // 合并到最大的邻居区域
        let bestNeighbor = -1;
        let bestCount = 0;
        for (const [nr, count] of neighborRegions) {
          if (count > bestCount) {
            bestCount = count;
            bestNeighbor = nr;
          }
        }
        if (bestNeighbor >= 0) {
          for (let i = 0; i < width * height; i++) {
            if (regions[i] === r) {
              regions[i] = bestNeighbor;
              regionSumR[bestNeighbor] += src[i * 4];
              regionSumG[bestNeighbor] += src[i * 4 + 1];
              regionSumB[bestNeighbor] += src[i * 4 + 2];
              regionSize[bestNeighbor]++;
            }
          }
          regionSize[r] = 0;
        }
      }
    }
  }

  // 步骤 4：区域平均色匹配到色板
  const regionPalette = new Array<string>(regionCount);
  for (let r = 0; r < regionCount; r++) {
    if (regionSize[r] === 0) continue;
    const avgR = Math.round(regionSumR[r] / regionSize[r]);
    const avgG = Math.round(regionSumG[r] / regionSize[r]);
    const avgB = Math.round(regionSumB[r] / regionSize[r]);
    const matched = nearestColor(avgR, avgG, avgB, palette);
    regionPalette[r] = matched.hex;
  }

  // 步骤 5：区域一致性校验 — 相邻区域如果匹配到同系色，根据面积决定统一
  enforceRegionConsistency(regions, regionPalette, regionSize, regionCount, width, height);

  // 步骤 6：生成 beadMap
  const beadMap = new Map<string, string>();
  const countMap = new Map<string, number>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (alphaMask[i] < 10) continue;
      const regionId = regions[i];
      const hex = regionPalette[regionId];
      if (!hex) continue;
      beadMap.set(`${x},${y}`, hex);
      countMap.set(hex, (countMap.get(hex) || 0) + 1);
    }
  }

  let activeRegionCount = 0;
  for (let i = 0; i < regionCount; i++) {
    if (regionSize[i] > 0) activeRegionCount++;
  }

  return {
    beadMap,
    superpixelCount: activeRegionCount,
    colorCount: countMap.size,
  };
}

/**
 * 区域一致性校验
 */
function enforceRegionConsistency(
  regions: Int32Array,
  regionPalette: string[],
  regionSize: Uint32Array,
  regionCount: number,
  width: number,
  height: number,
): void {
  // 构建区域邻接关系
  const regionNeighbors = new Map<number, Set<number>>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const regionId = regions[i];
      if (regionId < 0 || regionId >= regionCount) continue;

      if (!regionNeighbors.has(regionId)) {
        regionNeighbors.set(regionId, new Set());
      }

      // 检查 4 邻居
      if (x > 0) {
        const nr = regions[i - 1];
        if (nr >= 0 && nr !== regionId) regionNeighbors.get(regionId)!.add(nr);
      }
      if (x < width - 1) {
        const nr = regions[i + 1];
        if (nr >= 0 && nr !== regionId) regionNeighbors.get(regionId)!.add(nr);
      }
      if (y > 0) {
        const nr = regions[i - width];
        if (nr >= 0 && nr !== regionId) regionNeighbors.get(regionId)!.add(nr);
      }
      if (y < height - 1) {
        const nr = regions[i + width];
        if (nr >= 0 && nr !== regionId) regionNeighbors.get(regionId)!.add(nr);
      }
    }
  }

  // 颜色相似度检查（RGB 距离 < 20 认为是同系色）
  const isSimilarColor = (hex1: string, hex2: string): boolean => {
    const [r1, g1, b1] = parseHexColor(hex1);
    const [r2, g2, b2] = parseHexColor(hex2);
    const dist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
    return dist < 20;
  };

  // 统一小区域到相邻大区域的同系色
  const updates = new Map<number, string>();

  for (const [regionId, hex] of regionPalette.entries()) {
    if (!hex) continue;
    const neighbors = regionNeighbors.get(regionId);
    if (!neighbors || neighbors.size === 0) continue;

    // 统计相邻区域的颜色分布
    const neighborColorFreq = new Map<string, number>();
    for (const n of neighbors) {
      if (regionSize[n] === 0) continue;
      const nHex = regionPalette[n];
      if (nHex && nHex !== hex && isSimilarColor(hex, nHex)) {
        neighborColorFreq.set(nHex, (neighborColorFreq.get(nHex) || 0) + 1);
      }
    }

    // 如果某个同系色邻居出现频率最高，统一为该色
    let maxFreq = 0;
    let bestHex = hex;
    for (const [nHex, freq] of neighborColorFreq) {
      if (freq > maxFreq) {
        maxFreq = freq;
        bestHex = nHex;
      }
    }

    if (bestHex !== hex && maxFreq >= 2) {
      updates.set(regionId, bestHex);
    }
  }

  // 应用更新
  for (const [regionId, newHex] of updates) {
    regionPalette[regionId] = newHex;
  }
}
