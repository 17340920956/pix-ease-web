export interface BeadColor {
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
}

export type BeadShape = 'circle' | 'square';

/** 精细度等级 */
export type QualityTier = 'standard' | 'fine' | 'ultra';

export interface ColorStat {
  code: string;
  name: string;
  hex: string;
  count: number;
  percentage: number;
}

export interface HistoryEntry {
  beads: Map<string, string>;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}