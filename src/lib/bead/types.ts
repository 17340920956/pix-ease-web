export interface BeadColor {
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
}

export interface BeadBrand {
  name: string;
  colors: BeadColor[];
}

export type BeadSize = 32 | 64 | 128;
export type PixelSize = number;
export type BeadShape = 'circle' | 'square';
export type ToolType = 'pen' | 'eraser' | 'picker' | 'select';
export type ViewMode = 'edit' | 'pattern';

export interface ColorCount {
  code: string;
  name: string;
  hex: string;
  count: number;
}

export interface HistoryEntry {
  beads: Map<string, string>;
}

export interface ExportConfig {
  showGrid: boolean;
  showLabels: boolean;
  format: 'png' | 'pdf' | 'json';
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}