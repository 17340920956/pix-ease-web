/**
 * 颜色工具函数 — 项目中多处使用的共享色彩计算
 */

/** 根据 hex 背景色返回合适的文字颜色（深色用白字，浅色用深字） */
export function textColor(hex: string): string {
  const rr = parseInt(hex.slice(1, 3), 16);
  const gg = parseInt(hex.slice(3, 5), 16);
  const bb = parseInt(hex.slice(5, 7), 16);
  return (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255 > 0.5 ? '#333' : '#fff';
}

/** 将 hex 颜色解析为 RGB 三元组 */
export function parseHexColor(hex: string): [number, number, number] {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** 感知亮度（ITU-R BT.601） */
export function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** hex → [r, g, b, 255]（带 alpha 通道的解析，兼容旧 API） */
export function hexToRgba(hex: string): [number, number, number, number] {
  const [r, g, b] = parseHexColor(hex);
  return [r, g, b, 255];
}
