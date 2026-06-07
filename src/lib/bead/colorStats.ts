import type { BeadColor } from '@/lib/bead/types';
import { buildHexMap } from '@/lib/pixelation/colorMatch';

export interface ColorStat {
  code: string;
  name: string;
  hex: string;
  count: number;
  percentage: number;
}

export interface ColorStatsResult {
  stats: ColorStat[];
  total: number;
}

/**
 * 根据 beadMap 和色板计算颜色统计信息
 */
export function computeColorStats(
  beadMap: Map<string, string>,
  paletteColors: BeadColor[],
): ColorStatsResult {
  const countMap = new Map<string, number>();
  beadMap.forEach((hex) => {
    countMap.set(hex, (countMap.get(hex) || 0) + 1);
  });

  const hexMap = buildHexMap(paletteColors);
  const stats: ColorStat[] = [];
  let total = 0;

  countMap.forEach((count, hex) => {
    const c = hexMap.get(hex.toUpperCase());
    if (c) {
      stats.push({ code: c.code, name: c.name, hex: c.hex, count, percentage: 0 });
      total += count;
    }
  });

  stats.sort((a, b) => a.code.localeCompare(b.code));
  stats.forEach((s) => {
    s.percentage = total > 0 ? (s.count / total) * 100 : 0;
  });

  return { stats, total };
}
