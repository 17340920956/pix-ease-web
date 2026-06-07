/**
 * 通用 Flood Fill（油漆桶）算法
 *
 * 适用于任何基于网格的填充场景。
 * 调用者提供 getColor 和 setPixel 回调，算法本身不依赖具体数据结构。
 */

export interface FloodFillOptions {
  /** 最大填充像素数，防止溢出（默认 65536） */
  maxPixels?: number;
  /** 获取指定位置的颜色，不存在则返回 null */
  getColor: (x: number, y: number) => string | null;
  /** 设置指定位置的颜色 */
  setPixel: (x: number, y: number, color: string) => void;
}

/**
 * 执行 Flood Fill
 * @param startX - 起始 X 坐标
 * @param startY - 起始 Y 坐标
 * @param newColor - 填充颜色
 * @param width - 网格宽度
 * @param height - 网格高度
 * @param options - 配置项
 * @returns 被填充的坐标数量
 */
export function floodFill(
  startX: number,
  startY: number,
  newColor: string,
  width: number,
  height: number,
  options: FloodFillOptions,
): number {
  const { maxPixels = 65536, getColor, setPixel } = options;

  const targetColor = getColor(startX, startY);
  if (targetColor === null || targetColor === newColor) return 0;

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();
  let count = 0;

  while (stack.length > 0 && count < maxPixels) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (getColor(x, y) !== targetColor) continue;

    visited.add(key);
    setPixel(x, y, newColor);
    count++;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return count;
}
