# 像素工坊 V2 引擎架构设计文档

## 目标

将像素工坊从当前的中级 Web 编辑器升级为专业级别的像素艺术工具，同时解决所有已知的性能瓶颈。本文档参考业界同类产品的通用功能设计，所有技术方案均为独立设计。

---

## 一、现有架构问题分析

### 1.1 性能瓶颈

| 问题 | 影响 | 当前实现 | 优化方向 |
|------|------|----------|----------|
| **像素存储** | 内存占用高，访问慢 | `Map<string, string>` ("x,y" -> "#hex") | 扁平 TypedArray + 稀疏索引 |
| **图层混合** | 每帧 O(n*m) 遍历 | 逐像素遍历所有图层 | 脏矩形追踪 + 增量渲染 |
| **渲染循环** | 全量重绘 | 每次操作重绘整个画布 | 瓦片缓存 + 视口裁剪 |
| **撤销系统** | 内存爆炸 | 存储完整像素变更列表 | 分层快照 + RLE 编码 |
| **导出功能** | 同步阻塞主线程 | 逐像素 CPU 渲染 | Web Worker + OffscreenCanvas |
| **选区操作** | 遍历整个选区矩形 | `for` 循环遍历所有坐标 | 稀疏迭代 + 边界裁剪 |

### 1.2 架构缺陷

- **单 Store 过大**: `usePixelStore.ts` 1400+ 行，职责混杂
- **渲染与状态耦合**: Canvas 绘制逻辑直接嵌入 React 组件
- **无瓦片系统**: 无法支持游戏开发中的 Tilemap 工作流
- **动画系统简陋**: 无时间轴，无补间，无标签系统
- **笔刷系统原始**: 仅支持方形笔刷

---

## 二、V2 核心架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        React UI Layer                        │
│  (工具栏 / 时间轴 / 图层面板 / 调色板 / 属性面板)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Zustand Store Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  ToolStore  │  │  ViewStore  │  │   AnimationStore    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ LayerStore  │  │ PaletteStore│  │   ProjectStore      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Pixel Engine Core (Web Worker)            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ TileManager │  │ BrushEngine │  │  SelectionEngine    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │RenderEngine │  │ UndoManager │  │  ExportEngine       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │TilemapEngine│  │AnimEngine   │  │  PaletteManager     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Model Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ SparseGrid  │  │ LayerBuffer │  │   FrameBuffer       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ UndoTree    │  │ TileSet     │  │   SpriteSheet       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 职责 | 运行环境 |
|------|------|----------|
| `ToolStore` | 当前工具、笔刷参数、颜色状态 | 主线程 |
| `ViewStore` | 视口、缩放、网格、参考图 | 主线程 |
| `LayerStore` | 图层元数据（不存储像素数据） | 主线程 |
| `PixelEngine` | 所有像素操作、渲染、导出 | Web Worker |
| `TileManager` | 瓦片缓存、脏矩形追踪 | Web Worker |
| `BrushEngine` | 笔刷形状、间距、散射、压感 | Web Worker |
| `RenderEngine` | 离屏渲染、图层合成、视口裁剪 | Web Worker |
| `UndoManager` | 分层快照、分支历史、压缩 | Web Worker |

---

## 三、数据模型重构

### 3.1 像素存储: SparseGrid

当前使用 `Map<string, string>` 存储像素，存在以下问题：
- 字符串键 `"x,y"` 内存开销大
- 字符串值 `"#RRGGBB"` 解析/序列化开销
- 遍历性能差

**V2 方案: 扁平 TypedArray + 空间哈希索引**

```typescript
// src/engine/data/SparseGrid.ts

const CELL_SIZE = 64; // 每个区块 64x64 像素
const CELL_PIXELS = CELL_SIZE * CELL_SIZE;

interface Cell {
  // 使用 Uint32Array 存储颜色 (ARGB)
  // 0 表示透明
  data: Uint32Array; // 长度 = CELL_SIZE * CELL_SIZE
  // 非空像素计数，用于快速判断是否需要渲染
  filledCount: number;
  // 脏标记，用于增量渲染
  dirty: boolean;
}

export class SparseGrid {
  // 空间哈希: cellKey -> Cell
  // cellKey = `${cellX},${cellY}`
  private cells = new Map<string, Cell>();
  
  // 边界框缓存，用于快速导出
  private bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  private boundsDirty = true;

  getPixel(x: number, y: number): number {
    const cellX = Math.floor(x / CELL_SIZE);
    const cellY = Math.floor(y / CELL_SIZE);
    const cell = this.cells.get(`${cellX},${cellY}`);
    if (!cell) return 0;
    const localX = x - cellX * CELL_SIZE;
    const localY = y - cellY * CELL_SIZE;
    return cell.data[localY * CELL_SIZE + localX];
  }

  setPixel(x: number, y: number, color: number): boolean {
    const cellX = Math.floor(x / CELL_SIZE);
    const cellY = Math.floor(y / CELL_SIZE);
    const key = `${cellX},${cellY}`;
    let cell = this.cells.get(key);
    
    if (!cell && color === 0) return false; // 设置透明到空单元格，无需操作
    
    if (!cell) {
      cell = {
        data: new Uint32Array(CELL_PIXELS),
        filledCount: 0,
        dirty: true,
      };
      this.cells.set(key, cell);
    }
    
    const localX = x - cellX * CELL_SIZE;
    const localY = y - cellY * CELL_SIZE;
    const idx = localY * CELL_SIZE + localX;
    const oldColor = cell.data[idx];
    
    if (oldColor === color) return false;
    
    if (oldColor === 0) cell.filledCount++;
    if (color === 0) cell.filledCount--;
    
    cell.data[idx] = color;
    cell.dirty = true;
    this.boundsDirty = true;
    
    // 如果单元格变空，清理内存
    if (cell.filledCount === 0) {
      this.cells.delete(key);
    }
    
    return true;
  }

  // 批量设置像素，用于笔刷/填充操作
  setPixels(updates: { x: number; y: number; color: number }[]): PixelChange[] {
    const changes: PixelChange[] = [];
    for (const { x, y, color } of updates) {
      const before = this.getPixel(x, y);
      if (this.setPixel(x, y, color)) {
        changes.push({ x, y, before, after: color });
      }
    }
    return changes;
  }

  // 获取脏单元格列表，用于增量渲染
  getDirtyCells(): { cellX: number; cellY: number; cell: Cell }[] {
    const result: { cellX: number; cellY: number; cell: Cell }[] = [];
    for (const [key, cell] of this.cells) {
      if (cell.dirty) {
        const [cellX, cellY] = key.split(',').map(Number);
        result.push({ cellX, cellY, cell });
      }
    }
    return result;
  }

  clearDirtyFlags(): void {
    for (const cell of this.cells.values()) {
      cell.dirty = false;
    }
  }

  // 获取边界框
  getBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    if (!this.boundsDirty && this.bounds) return this.bounds;
    // 计算边界...
    return this.bounds!;
  }

  // 迭代器：只遍历非空像素
  *pixels(): Generator<{ x: number; y: number; color: number }> {
    for (const [key, cell] of this.cells) {
      if (cell.filledCount === 0) continue;
      const [cellX, cellY] = key.split(',').map(Number);
      const baseX = cellX * CELL_SIZE;
      const baseY = cellY * CELL_SIZE;
      for (let i = 0; i < CELL_PIXELS; i++) {
        const color = cell.data[i];
        if (color !== 0) {
          yield {
            x: baseX + (i % CELL_SIZE),
            y: baseY + Math.floor(i / CELL_SIZE),
            color,
          };
        }
      }
    }
  }
}
```

**性能对比**:
- 内存: `Map<string,string>` 每个像素约 72 字节 -> `SparseGrid` 每个像素约 4 字节
- 访问: 字符串解析 + 哈希查找 -> 整数运算 + 数组索引
- 遍历: 遍历所有键值对 -> 只遍历非空单元格内的非空像素

### 3.2 图层系统: LayerBuffer

```typescript
// src/engine/data/LayerBuffer.ts

export interface LayerBuffer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  // 像素数据
  grid: SparseGrid;
  // 缩略图缓存 (128x128)
  thumbnail: ImageBitmap | null;
  thumbnailDirty: boolean;
}
```

### 3.3 帧系统: FrameBuffer

```typescript
// src/engine/data/FrameBuffer.ts

export interface FrameBuffer {
  id: string;
  name: string;
  duration: number; // 毫秒
  // 每帧每图层的像素数据
  // 使用 Copy-on-Write 优化内存
  layerGrids: Map<string, SparseGrid>;
}
```

**Copy-on-Write 优化**:
- 复制帧时，不复制像素数据，只复制引用
- 只有当某帧的某图层被修改时，才创建独立的 SparseGrid
- 使用 `StructuredClone` + `SharedArrayBuffer` 实现高效共享

---

## 四、渲染引擎

### 4.1 瓦片渲染系统

```typescript
// src/engine/render/TileRenderer.ts

const TILE_SIZE = 256; // 渲染瓦片大小（屏幕像素）

interface RenderTile {
  // 离屏 Canvas
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  // 瓦片对应的画布坐标范围
  pixelX: number;
  pixelY: number;
  // 缩放级别
  scale: number;
  // 脏标记
  dirty: boolean;
}

export class TileRenderer {
  private tileCache = new Map<string, RenderTile>();
  private viewport: ViewportState;
  private projectWidth: number;
  private projectHeight: number;

  // 主渲染入口
  render(
    targetCtx: CanvasRenderingContext2D,
    layers: LayerBuffer[],
    viewport: ViewportState,
    options: RenderOptions
  ): void {
    // 1. 计算可见瓦片范围
    const visibleTiles = this.getVisibleTiles(viewport);
    
    // 2. 标记需要重绘的瓦片
    this.markDirtyTiles(layers, visibleTiles);
    
    // 3. 重绘脏瓦片
    for (const tile of visibleTiles) {
      if (tile.dirty) {
        this.renderTile(tile, layers, options);
        tile.dirty = false;
      }
    }
    
    // 4. 将瓦片合成到目标画布
    for (const tile of visibleTiles) {
      targetCtx.drawImage(
        tile.canvas,
        tile.pixelX * viewport.scale + viewport.cameraX,
        tile.pixelY * viewport.scale + viewport.cameraY
      );
    }
  }

  private renderTile(tile: RenderTile, layers: LayerBuffer[], options: RenderOptions): void {
    const ctx = tile.ctx;
    const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    const data = imageData.data;
    
    // 计算此瓦片覆盖的画布像素范围
    const startPixelX = Math.floor(tile.pixelX / tile.scale);
    const startPixelY = Math.floor(tile.pixelY / tile.scale);
    const endPixelX = startPixelX + Math.ceil(TILE_SIZE / tile.scale);
    const endPixelY = startPixelY + Math.ceil(TILE_SIZE / tile.scale);
    
    // 逐像素渲染
    for (let py = startPixelY; py < endPixelY; py++) {
      for (let px = startPixelX; px < endPixelX; px++) {
        // 获取合并后的颜色
        const [r, g, b, a] = this.sampleMergedPixel(px, py, layers);
        
        // 填充到瓦片的对应区域
        const screenX = Math.floor((px - startPixelX) * tile.scale);
        const screenY = Math.floor((py - startPixelY) * tile.scale);
        const pixelScale = Math.ceil(tile.scale);
        
        for (let sy = 0; sy < pixelScale; sy++) {
          for (let sx = 0; sx < pixelScale; sx++) {
            const idx = ((screenY + sy) * TILE_SIZE + (screenX + sx)) * 4;
            if (idx < data.length) {
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = a;
            }
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
}
```

### 4.2 增量渲染策略

```typescript
// 渲染优化策略

enum RenderStrategy {
  // 全量重绘 - 仅在必要时使用（如缩放变化）
  FULL,
  // 增量重绘 - 只重绘变更的瓦片
  INCREMENTAL,
  // 预览叠加 - 在已有渲染结果上叠加预览（如形状绘制预览）
  OVERLAY,
}

// 脏矩形追踪
class DirtyRectTracker {
  private dirtyRects: { x: number; y: number; width: number; height: number }[] = [];
  
  addRect(x: number, y: number, width: number, height: number): void {
    this.dirtyRects.push({ x, y, width, height });
    // 合并重叠矩形（简化版）
    if (this.dirtyRects.length > 10) {
      this.mergeRects();
    }
  }
  
  addPixel(x: number, y: number, brushSize: number): void {
    const half = Math.floor(brushSize / 2);
    this.addRect(x - half, y - half, brushSize, brushSize);
  }
  
  getAndClear(): { x: number; y: number; width: number; height: number }[] {
    const rects = [...this.dirtyRects];
    this.dirtyRects = [];
    return rects;
  }
}
```

---

## 五、笔刷引擎

### 5.1 笔刷数据结构

```typescript
// src/engine/brush/BrushEngine.ts

export interface BrushStamp {
  // 笔刷印记的位图数据 (RGBA)
  data: Uint8ClampedArray;
  width: number;
  height: number;
  // 印记中心偏移
  centerX: number;
  centerY: number;
}

export interface BrushSettings {
  // 笔刷类型
  type: 'pixel' | 'circle' | 'square' | 'line' | 'texture' | 'pattern';
  // 尺寸
  size: number;
  // 间距 (0-1，相对于笔刷直径)
  spacing: number;
  // 散射角度
  scatterAngle: number;
  // 散射位置
  scatterPosition: number;
  // 不透明度抖动
  opacityJitter: number;
  // 流量
  flow: number;
  // 混合模式
  blendMode: BlendMode;
  // 纹理笔刷的纹理 ID
  textureId?: string;
  // 动态属性 (压感支持)
  dynamics: {
    size: boolean;
    opacity: boolean;
    flow: boolean;
  };
}

export class BrushEngine {
  // 笔刷印记缓存
  private stampCache = new Map<string, BrushStamp>();
  
  // 生成笔刷印记
  generateStamp(settings: BrushSettings, pressure: number = 1): BrushStamp {
    const cacheKey = this.getStampCacheKey(settings, pressure);
    if (this.stampCache.has(cacheKey)) {
      return this.stampCache.get(cacheKey)!;
    }
    
    const stamp = this.createStamp(settings, pressure);
    this.stampCache.set(cacheKey, stamp);
    return stamp;
  }
  
  private createStamp(settings: BrushSettings, pressure: number): BrushStamp {
    const size = settings.dynamics.size 
      ? Math.max(1, settings.size * pressure) 
      : settings.size;
    
    const width = Math.ceil(size);
    const height = Math.ceil(size);
    const data = new Uint8ClampedArray(width * height * 4);
    
    switch (settings.type) {
      case 'circle':
        this.renderCircleStamp(data, width, height, size);
        break;
      case 'square':
        this.renderSquareStamp(data, width, height, size);
        break;
      case 'pixel':
        this.renderPixelStamp(data, width, height);
        break;
      // ... 其他类型
    }
    
    return { data, width, height, centerX: width / 2, centerY: height / 2 };
  }
  
  private renderCircleStamp(data: Uint8ClampedArray, width: number, height: number, size: number): void {
    const radius = size / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const alpha = dist <= radius ? 255 : 0;
        const idx = (y * width + x) * 4;
        data[idx + 3] = alpha;
      }
    }
  }
  
  // 沿路径绘制笔刷
  stroke(
    path: { x: number; y: number; pressure?: number }[],
    settings: BrushSettings,
    target: SparseGrid,
    color: number
  ): PixelChange[] {
    const changes: PixelChange[] = [];
    let lastPoint = path[0];
    let distanceAccumulator = 0;
    const stepSize = settings.size * settings.spacing;
    
    for (let i = 1; i < path.length; i++) {
      const point = path[i];
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      
      if (segmentLength === 0) continue;
      
      const nx = dx / segmentLength;
      const ny = dy / segmentLength;
      
      while (distanceAccumulator + stepSize <= segmentLength) {
        distanceAccumulator += stepSize;
        const t = distanceAccumulator / segmentLength;
        const px = lastPoint.x + nx * distanceAccumulator;
        const py = lastPoint.y + ny * distanceAccumulator;
        const pressure = point.pressure || 1;
        
        const stamp = this.generateStamp(settings, pressure);
        changes.push(...this.applyStamp(stamp, px, py, color, target));
      }
      
      distanceAccumulator -= segmentLength;
      lastPoint = point;
    }
    
    return changes;
  }
  
  private applyStamp(
    stamp: BrushStamp, 
    x: number, y: number, 
    color: number, 
    target: SparseGrid
  ): PixelChange[] {
    const changes: PixelChange[] = [];
    const startX = Math.floor(x - stamp.centerX);
    const startY = Math.floor(y - stamp.centerY);
    
    for (let sy = 0; sy < stamp.height; sy++) {
      for (let sx = 0; sx < stamp.width; sx++) {
        const idx = (sy * stamp.width + sx) * 4;
        const alpha = stamp.data[idx + 3];
        if (alpha === 0) continue;
        
        const px = startX + sx;
        const py = startY + sy;
        const finalAlpha = alpha / 255;
        
        // 颜色混合
        const finalColor = this.blendColor(color, target.getPixel(px, py), finalAlpha);
        const before = target.getPixel(px, py);
        if (target.setPixel(px, py, finalColor)) {
          changes.push({ x: px, y: py, before, after: finalColor });
        }
      }
    }
    
    return changes;
  }
}
```

### 5.2 距离场笔刷（软边笔刷）

```typescript
// 使用 Signed Distance Field 实现高质量软边笔刷

function renderSoftCircleStamp(
  data: Uint8ClampedArray, 
  width: number, height: number, 
  size: number, hardness: number
): void {
  const radius = size / 2;
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // SDF 计算
      const normalizedDist = dist / radius;
      let alpha: number;
      
      if (normalizedDist >= 1) {
        alpha = 0;
      } else if (normalizedDist <= hardness) {
        alpha = 1;
      } else {
        // 平滑过渡
        const t = (normalizedDist - hardness) / (1 - hardness);
        alpha = 1 - t * t * (3 - 2 * t); // smoothstep
      }
      
      const idx = (y * width + x) * 4;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
}
```

---

## 六、选区与变换系统

### 6.1 选区数据结构

```typescript
// src/engine/selection/SelectionEngine.ts

export type SelectionMask = 
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'lasso'; points: [number, number][] }
  | { type: 'wand'; x: number; y: number; tolerance: number; contiguous: boolean }
  | { type: 'bitmap'; data: Uint8Array; width: number; height: number; offsetX: number; offsetY: number };

export class SelectionEngine {
  // 选区蒙版 (1 byte per pixel, 0 = 未选中, 255 = 选中)
  private mask: Uint8Array | null = null;
  private maskWidth: number = 0;
  private maskHeight: number = 0;
  private maskOffsetX: number = 0;
  private maskOffsetY: number = 0;

  // 创建矩形选区
  createRect(x: number, y: number, width: number, height: number): void {
    this.maskWidth = width;
    this.maskHeight = height;
    this.maskOffsetX = x;
    this.maskOffsetY = y;
    this.mask = new Uint8Array(width * height).fill(255);
  }

  // 创建魔棒选区
  createWand(
    x: number, y: number, 
    tolerance: number, 
    contiguous: boolean,
    source: SparseGrid
  ): void {
    const bounds = source.getBounds();
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;
    
    this.maskWidth = width;
    this.maskHeight = height;
    this.maskOffsetX = bounds.minX;
    this.maskOffsetY = bounds.minY;
    this.mask = new Uint8Array(width * height);
    
    const targetColor = source.getPixel(x, y);
    
    if (contiguous) {
      // 洪水填充式魔棒
      this.floodFillSelect(x, y, targetColor, tolerance, source);
    } else {
      // 全局颜色选择
      this.globalColorSelect(targetColor, tolerance, source);
    }
  }

  private floodFillSelect(
    startX: number, startY: number,
    targetColor: number, tolerance: number,
    source: SparseGrid
  ): void {
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    const targetRgb = this.colorToRgb(targetColor);
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      
      const color = source.getPixel(x, y);
      if (!this.colorMatch(color, targetColor, tolerance, targetRgb)) continue;
      
      const maskX = x - this.maskOffsetX;
      const maskY = y - this.maskOffsetY;
      if (maskX >= 0 && maskX < this.maskWidth && maskY >= 0 && maskY < this.maskHeight) {
        this.mask![maskY * this.maskWidth + maskX] = 255;
      }
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  // 变换选区内容
  transform(
    operation: 'move' | 'rotate' | 'scale' | 'flipH' | 'flipV' | 'skew',
    params: TransformParams,
    source: SparseGrid,
    target: SparseGrid
  ): PixelChange[] {
    const changes: PixelChange[] = [];
    
    switch (operation) {
      case 'rotate':
        return this.rotateSelection(params.angle, source, target);
      case 'scale':
        return this.scaleSelection(params.sx, params.sy, source, target);
      case 'flipH':
        return this.flipSelection(true, false, source, target);
      // ...
    }
    
    return changes;
  }

  private rotateSelection(angle: number, source: SparseGrid, target: SparseGrid): PixelChange[] {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const changes: PixelChange[] = [];
    
    // 计算选区中心
    const cx = this.maskOffsetX + this.maskWidth / 2;
    const cy = this.maskOffsetY + this.maskHeight / 2;
    
    for (let my = 0; my < this.maskHeight; my++) {
      for (let mx = 0; mx < this.maskWidth; mx++) {
        if (this.mask![my * this.maskWidth + mx] === 0) continue;
        
        const x = this.maskOffsetX + mx;
        const y = this.maskOffsetY + my;
        const color = source.getPixel(x, y);
        if (color === 0) continue;
        
        // 反向旋转采样
        const dx = x - cx;
        const dy = y - cy;
        const srcX = Math.round(cx + dx * cos + dy * sin);
        const srcY = Math.round(cy - dx * sin + dy * cos);
        
        // 使用双线性插值获取颜色
        const finalColor = this.bilinearSample(source, srcX, srcY);
        
        const before = target.getPixel(x, y);
        if (target.setPixel(x, y, finalColor)) {
          changes.push({ x, y, before, after: finalColor });
        }
      }
    }
    
    return changes;
  }

  private bilinearSample(source: SparseGrid, x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    
    const fx = x - x0;
    const fy = y - y0;
    
    const c00 = source.getPixel(x0, y0);
    const c10 = source.getPixel(x1, y0);
    const c01 = source.getPixel(x0, y1);
    const c11 = source.getPixel(x1, y1);
    
    // RGBA 分别插值
    return this.interpolateColor(c00, c10, c01, c11, fx, fy);
  }
}
```

---

## 七、动画系统

### 7.1 时间轴架构

```typescript
// src/engine/animation/AnimationEngine.ts

export interface AnimationTrack {
  id: string;
  name: string;
  // 关键帧列表
  keyframes: Keyframe[];
  // 轨道类型
  type: 'pixel' | 'transform' | 'visibility' | 'opacity';
}

export interface Keyframe {
  id: string;
  frameIndex: number; // 帧序号
  duration: number;   // 持续时间（帧数）
  // 缓动函数
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'step';
  // 数据
  data: KeyframeData;
}

export type KeyframeData =
  | { type: 'pixel'; grid: SparseGrid }
  | { type: 'transform'; translate: [number, number]; rotate: number; scale: [number, number] }
  | { type: 'visibility'; visible: boolean }
  | { type: 'opacity'; value: number };

export interface AnimationTag {
  name: string;
  fromFrame: number;
  toFrame: number;
  color: string;
}

export class AnimationEngine {
  private tracks: Map<string, AnimationTrack> = new Map();
  private tags: AnimationTag[] = [];
  private currentFrame: number = 0;
  private totalFrames: number = 0;
  private isPlaying: boolean = false;
  private fps: number = 12;

  // 添加标签（用于游戏开发中的动画状态标记）
  addTag(tag: AnimationTag): void {
    this.tags.push(tag);
    this.tags.sort((a, b) => a.fromFrame - b.fromFrame);
  }

  // 获取当前帧的所有图层状态
  getFrameState(frameIndex: number): Map<string, FrameState> {
    const state = new Map<string, FrameState>();
    
    for (const [layerId, track] of this.tracks) {
      // 找到当前帧对应的关键帧
      const keyframe = this.findKeyframeAtFrame(track, frameIndex);
      if (keyframe) {
        state.set(layerId, this.interpolateKeyframe(track, keyframe, frameIndex));
      }
    }
    
    return state;
  }

  // 洋葱皮渲染数据
  getOnionSkinFrames(currentFrame: number, count: number): OnionSkinFrame[] {
    const frames: OnionSkinFrame[] = [];
    
    for (let i = 1; i <= count; i++) {
      const frameIndex = currentFrame - i;
      if (frameIndex < 0) break;
      
      frames.push({
        frameIndex,
        opacity: 0.5 / i, // 越远的帧越透明
        state: this.getFrameState(frameIndex),
      });
    }
    
    return frames;
  }

  // 导出到精灵表（带标签信息）
  exportSpriteSheet(columns: number): SpriteSheetData {
    return {
      image: this.renderSpriteSheet(columns),
      frames: this.generateFrameData(),
      tags: this.tags,
    };
  }
}
```

### 7.2 补间动画

```typescript
// 补间插值

function interpolatePixels(
  from: SparseGrid, 
  to: SparseGrid, 
  t: number
): SparseGrid {
  const result = new SparseGrid();
  
  // 遍历两个网格的所有像素
  const allPixels = new Set<string>();
  for (const { x, y } of from.pixels()) allPixels.add(`${x},${y}`);
  for (const { x, y } of to.pixels()) allPixels.add(`${x},${y}`);
  
  for (const key of allPixels) {
    const [x, y] = key.split(',').map(Number);
    const fromColor = from.getPixel(x, y);
    const toColor = to.getPixel(x, y);
    
    if (fromColor === 0 && toColor === 0) continue;
    if (fromColor === 0) {
      result.setPixel(x, y, toColor); // 淡入
    } else if (toColor === 0) {
      if (t < 1) result.setPixel(x, y, fromColor); // 淡出
    } else {
      result.setPixel(x, y, lerpColor(fromColor, toColor, t));
    }
  }
  
  return result;
}
```

---

## 八、瓦片/Tile 系统

### 8.1 Tilemap 架构

```typescript
// src/engine/tilemap/TilemapEngine.ts

export interface Tile {
  id: number;
  // 像素数据（引用 TileSet 中的数据）
  tileSetId: string;
  tileIndex: number;
  // 变换
  flipH: boolean;
  flipV: boolean;
  rotate90: number; // 0, 1, 2, 3 (x90度)
}

export interface TileSet {
  id: string;
  name: string;
  // 瓦片尺寸
  tileWidth: number;
  tileHeight: number;
  // 瓦片数据
  tiles: SparseGrid[];
  // 属性
  properties: Map<number, TileProperty>;
}

export interface Tilemap {
  width: number;  // 瓦片数量
  height: number;
  layers: TilemapLayer[];
}

export interface TilemapLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  // 二维瓦片数组
  tiles: (Tile | null)[][];
}

export class TilemapEngine {
  private tileSets = new Map<string, TileSet>();
  private tilemaps: Tilemap[] = [];

  // 从当前画布生成 TileSet
  generateTileSetFromCanvas(
    source: SparseGrid,
    tileWidth: number,
    tileHeight: number
  ): TileSet {
    const tiles: SparseGrid[] = [];
    const bounds = source.getBounds();
    
    const cols = Math.ceil((bounds.maxX - bounds.minX + 1) / tileWidth);
    const rows = Math.ceil((bounds.maxY - bounds.minY + 1) / tileHeight);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = new SparseGrid();
        const offsetX = bounds.minX + col * tileWidth;
        const offsetY = bounds.minY + row * tileHeight;
        
        for (let y = 0; y < tileHeight; y++) {
          for (let x = 0; x < tileWidth; x++) {
            const color = source.getPixel(offsetX + x, offsetY + y);
            if (color !== 0) {
              tile.setPixel(x, y, color);
            }
          }
        }
        
        tiles.push(tile);
      }
    }
    
    return {
      id: generateId(),
      name: 'Generated TileSet',
      tileWidth,
      tileHeight,
      tiles,
      properties: new Map(),
    };
  }

  // 渲染 Tilemap
  renderTilemap(tilemap: Tilemap, viewport: ViewportState): RenderResult {
    // 计算可见瓦片范围
    const visibleTiles = this.getVisibleTileRange(tilemap, viewport);
    
    // 渲染每个可见瓦片
    for (const { layer, x, y, tile } of visibleTiles) {
      if (!tile) continue;
      
      const tileSet = this.tileSets.get(tile.tileSetId);
      if (!tileSet) continue;
      
      const tileData = tileSet.tiles[tile.tileIndex];
      if (!tileData) continue;
      
      // 应用变换并渲染
      this.renderTile(tileData, x, y, tile, layer.opacity);
    }
  }

  // 自动瓦片 (Auto-tiling)
  autoTile(
    tilemap: Tilemap,
    layerId: string,
    x: number, y: number,
    tileId: number,
    rules: AutoTileRules
  ): void {
    const layer = tilemap.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // 根据相邻瓦片确定正确的瓦片变体
    const neighbors = this.getNeighbors(tilemap, layerId, x, y);
    const variant = rules.getVariant(neighbors);
    
    layer.tiles[y][x] = {
      id: tileId,
      tileSetId: rules.tileSetId,
      tileIndex: variant,
      flipH: false,
      flipV: false,
      rotate90: 0,
    };
  }
}
```

### 8.2 自动瓦片规则

```typescript
// 16 种瓦片变体的自动瓦片系统
// 基于 4 个相邻方向（上、右、下、左）的组合

export class AutoTileRules {
  // 邻居掩码 -> 瓦片变体索引
  private variantMap = new Map<number, number>();
  
  constructor(public tileSetId: string) {
    // 初始化 16 种变体映射
    this.initVariants();
  }
  
  private initVariants(): void {
    // 0: 孤立
    // 1-4: 单边
    // 5-8: 双边（角）
    // 9-12: 三边
    // 13-14: 双边（直线）
    // 15: 四边
    const variants = [
      0b0000, // 0
      0b0001, 0b0010, 0b0100, 0b1000, // 1-4
      0b0011, 0b0110, 0b1100, 0b1001, // 5-8 (角)
      0b0111, 0b1011, 0b1101, 0b1110, // 9-12 (三边)
      0b0101, 0b1010, // 13-14 (直线)
      0b1111, // 15
    ];
    
    variants.forEach((mask, index) => {
      this.variantMap.set(mask, index);
    });
  }
  
  getVariant(neighbors: { top: boolean; right: boolean; bottom: boolean; left: boolean }): number {
    let mask = 0;
    if (neighbors.top) mask |= 0b0001;
    if (neighbors.right) mask |= 0b0010;
    if (neighbors.bottom) mask |= 0b0100;
    if (neighbors.left) mask |= 0b1000;
    return this.variantMap.get(mask) || 0;
  }
}
```

---

## 九、导出系统

### 9.1 Web Worker 导出

```typescript
// src/engine/export/ExportEngine.ts
// 运行在 Web Worker 中

export class ExportEngine {
  // PNG 导出（支持多种缩放）
  async exportPng(
    layers: LayerBuffer[],
    options: PngExportOptions
  ): Promise<Blob> {
    const { scale = 1, borderSize = 0, borderColor = '#000000' } = options;
    
    // 计算边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const layer of layers) {
      if (!layer.visible) continue;
      const bounds = layer.grid.getBounds();
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    }
    
    if (minX === Infinity) {
      // 空画布，使用项目尺寸
      minX = 0; minY = 0;
      maxX = options.projectWidth - 1;
      maxY = options.projectHeight - 1;
    }
    
    const pixelWidth = maxX - minX + 1;
    const pixelHeight = maxY - minY + 1;
    const canvasWidth = pixelWidth * scale + borderSize * 2;
    const canvasHeight = pixelHeight * scale + borderSize * 2;
    
    // 使用 OffscreenCanvas（Web Worker 中可用）
    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d')!;
    
    // 绘制边框
    if (borderSize > 0) {
      ctx.fillStyle = borderColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // 直接操作 ImageData 以获得最佳性能
    const imageData = ctx.createImageData(pixelWidth * scale, pixelHeight * scale);
    const data = imageData.data;
    
    // 批量渲染像素
    for (let py = 0; py < pixelHeight; py++) {
      for (let px = 0; px < pixelWidth; px++) {
        const worldX = px + minX;
        const worldY = py + minY;
        
        // 合并所有可见图层的像素
        const [r, g, b, a] = this.mergePixel(worldX, worldY, layers);
        
        // 填充缩放后的像素块
        const baseIdx = ((py * scale) * pixelWidth * scale + (px * scale)) * 4;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const idx = baseIdx + (sy * pixelWidth * scale + sx) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = a;
          }
        }
      }
    }
    
    ctx.putImageData(imageData, borderSize, borderSize);
    
    // 转换为 Blob
    return canvas.convertToBlob({ type: 'image/png' });
  }

  // GIF 导出（使用 gif.js 的 Worker 版本）
  async exportGif(
    frames: FrameBuffer[],
    layers: LayerBuffer[],
    options: GifExportOptions
  ): Promise<Blob> {
    // 使用 gif.js 在 Worker 中编码
    const gifWorker = new Worker('/workers/gifWorker.js');
    
    return new Promise((resolve, reject) => {
      gifWorker.onmessage = (e) => {
        if (e.data.type === 'complete') {
          resolve(new Blob([e.data.buffer], { type: 'image/gif' }));
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.message));
        }
      };
      
      // 发送帧数据
      gifWorker.postMessage({
        type: 'encode',
        frames: frames.map(f => this.renderFrameToImageData(f, layers)),
        width: options.width,
        height: options.height,
        fps: options.fps,
      });
    });
  }

  // APNG 导出
  async exportApng(
    frames: FrameBuffer[],
    layers: LayerBuffer[],
    options: ApngExportOptions
  ): Promise<Blob> {
    // 使用 UPNG.js 或 apng-js 库
    // 在 Worker 中进行编码以避免阻塞主线程
    const encoder = new ApngEncoder();
    
    for (const frame of frames) {
      const imageData = this.renderFrameToImageData(frame, layers);
      encoder.addFrame(imageData, frame.duration);
    }
    
    return encoder.encode();
  }

  // 精灵表导出（带 JSON 元数据）
  async exportSpriteSheet(
    frames: FrameBuffer[],
    layers: LayerBuffer[],
    options: SpriteSheetOptions
  ): Promise<{ image: Blob; json: string }> {
    const { columns = 4, scale = 1, packTags = true } = options;
    
    // 如果启用标签打包，按标签分组排列
    if (packTags && options.tags) {
      return this.exportTaggedSpriteSheet(frames, layers, options);
    }
    
    const rows = Math.ceil(frames.length / columns);
    const canvasWidth = options.frameWidth * scale * columns;
    const canvasHeight = options.frameHeight * scale * rows;
    
    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d')!;
    
    const frameData: SpriteSheetFrame[] = [];
    
    frames.forEach((frame, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const offsetX = col * options.frameWidth * scale;
      const offsetY = row * options.frameHeight * scale;
      
      // 渲染帧
      const frameImage = this.renderFrame(frame, layers, scale);
      ctx.drawImage(frameImage, offsetX, offsetY);
      
      frameData.push({
        filename: `frame_${index}.png`,
        frame: { x: offsetX, y: offsetY, w: options.frameWidth * scale, h: options.frameHeight * scale },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: options.frameWidth, h: options.frameHeight },
        sourceSize: { w: options.frameWidth, h: options.frameHeight },
        duration: frame.duration,
      });
    });
    
    const image = await canvas.convertToBlob({ type: 'image/png' });
    const json = JSON.stringify({
      frames: frameData,
      meta: {
        app: 'PixEase',
        version: '2.0',
        image: 'spritesheet.png',
        size: { w: canvasWidth, h: canvasHeight },
        scale: scale.toString(),
        tags: options.tags || [],
      },
    }, null, 2);
    
    return { image, json };
  }
}
```

---

## 十、撤销系统重构

### 10.1 分层快照 + RLE 压缩

```typescript
// src/engine/undo/UndoManager.ts

export interface UndoSnapshot {
  id: string;
  timestamp: number;
  // 变更摘要（用于 UI 显示）
  summary: string;
  // 受影响的图层和区域
  affectedLayers: Map<string, { minX: number; minY: number; maxX: number; maxY: number }>;
  // 压缩后的变更数据
  compressedData: Uint8Array;
}

export class UndoManager {
  private snapshots: UndoSnapshot[] = [];
  private currentIndex: number = -1;
  private maxSnapshots: number = 50;
  private compressionLevel: number = 6; // 0-9

  // 创建快照
  createSnapshot(
    operation: string,
    changes: PixelChange[],
    layers: Map<string, LayerBuffer>
  ): void {
    // 移除当前位置之后的所有快照（分支历史）
    if (this.currentIndex < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
    }
    
    // 按图层分组变更
    const layerChanges = this.groupChangesByLayer(changes);
    
    // 计算受影响区域
    const affectedLayers = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
    for (const [layerId, changes] of layerChanges) {
      affectedLayers.set(layerId, this.calculateBounds(changes));
    }
    
    // RLE 压缩变更数据
    const compressedData = this.compressChanges(changes);
    
    const snapshot: UndoSnapshot = {
      id: generateId(),
      timestamp: Date.now(),
      summary: operation,
      affectedLayers,
      compressedData,
    };
    
    this.snapshots.push(snapshot);
    this.currentIndex++;
    
    // 限制快照数量
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
      this.currentIndex--;
    }
  }

  // RLE 压缩
  private compressChanges(changes: PixelChange[]): Uint8Array {
    // 将变更序列化为二进制格式，然后使用 RLE 压缩
    const buffer = new ArrayBuffer(changes.length * 16); // 预分配
    const view = new DataView(buffer);
    let offset = 0;
    
    for (const change of changes) {
      view.setInt32(offset, change.x, true);
      offset += 4;
      view.setInt32(offset, change.y, true);
      offset += 4;
      view.setUint32(offset, change.before || 0, true);
      offset += 4;
      view.setUint32(offset, change.after || 0, true);
      offset += 4;
    }
    
    // 使用 pako 进行 zlib 压缩
    const raw = new Uint8Array(buffer, 0, offset);
    return pako.deflate(raw, { level: this.compressionLevel });
  }

  // 解压变更
  private decompressChanges(compressed: Uint8Array): PixelChange[] {
    const raw = pako.inflate(compressed);
    const view = new DataView(raw.buffer);
    const changes: PixelChange[] = [];
    
    for (let offset = 0; offset < raw.length; offset += 16) {
      changes.push({
        x: view.getInt32(offset, true),
        y: view.getInt32(offset + 4, true),
        before: view.getUint32(offset + 8, true) || null,
        after: view.getUint32(offset + 12, true) || null,
      });
    }
    
    return changes;
  }

  // 撤销
  undo(layers: Map<string, LayerBuffer>): boolean {
    if (this.currentIndex < 0) return false;
    
    const snapshot = this.snapshots[this.currentIndex];
    const changes = this.decompressChanges(snapshot.compressedData);
    
    // 应用反向变更
    for (const change of changes) {
      const layer = layers.get(change.layerId);
      if (layer) {
        layer.grid.setPixel(change.x, change.y, change.before);
      }
    }
    
    this.currentIndex--;
    return true;
  }

  // 重做
  redo(layers: Map<string, LayerBuffer>): boolean {
    if (this.currentIndex >= this.snapshots.length - 1) return false;
    
    this.currentIndex++;
    const snapshot = this.snapshots[this.currentIndex];
    const changes = this.decompressChanges(snapshot.compressedData);
    
    // 应用正向变更
    for (const change of changes) {
      const layer = layers.get(change.layerId);
      if (layer) {
        layer.grid.setPixel(change.x, change.y, change.after);
      }
    }
    
    return true;
  }
}
```

---

## 十一、主线程与 Worker 通信协议

### 11.1 消息类型定义

```typescript
// src/engine/protocol.ts

// 主线程 -> Worker
export type WorkerRequest =
  | { type: 'init'; project: ProjectSettings }
  | { type: 'setPixel'; layerId: string; x: number; y: number; color: number }
  | { type: 'stroke'; layerId: string; path: StrokePoint[]; brush: BrushSettings }
  | { type: 'fill'; layerId: string; x: number; y: number; color: number }
  | { type: 'render'; viewport: ViewportState; options: RenderOptions }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'export'; format: 'png' | 'gif' | 'apng' | 'spritesheet'; options: ExportOptions }
  | { type: 'addFrame' }
  | { type: 'setFrame'; index: number }
  | { type: 'transformSelection'; operation: TransformOperation }
  | { type: 'loadProject'; data: ProjectData }
  | { type: 'saveProject' };

// Worker -> 主线程
export type WorkerResponse =
  | { type: 'initialized' }
  | { type: 'pixelSet'; x: number; y: number; color: number }
  | { type: 'strokeComplete'; changes: PixelChange[]; affectedArea: Bounds }
  | { type: 'renderComplete'; imageBitmap: ImageBitmap }
  | { type: 'undoComplete'; canUndo: boolean; canRedo: boolean }
  | { type: 'exportComplete'; blob: Blob; format: string }
  | { type: 'frameAdded'; frame: FrameBuffer }
  | { type: 'projectLoaded'; project: ProjectData }
  | { type: 'projectSaved'; data: Uint8Array }
  | { type: 'error'; message: string }
  | { type: 'progress'; percent: number };

// 使用 Transferable Objects 传输大数据
export function postRenderResult(
  worker: Worker,
  imageBitmap: ImageBitmap,
  affectedArea: Bounds
): void {
  worker.postMessage(
    { type: 'renderComplete', imageBitmap, affectedArea },
    [imageBitmap] // Transferable
  );
}
```

### 11.2 Worker 入口

```typescript
// src/workers/pixelEngine.worker.ts

import { PixelEngine } from '@/engine/PixelEngine';

const engine = new PixelEngine();

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { data } = e;
  
  try {
    switch (data.type) {
      case 'init':
        engine.init(data.project);
        self.postMessage({ type: 'initialized' });
        break;
        
      case 'stroke':
        const result = engine.stroke(data.layerId, data.path, data.brush);
        self.postMessage({
          type: 'strokeComplete',
          changes: result.changes,
          affectedArea: result.affectedArea,
        });
        break;
        
      case 'render':
        const imageBitmap = await engine.render(data.viewport, data.options);
        self.postMessage(
          { type: 'renderComplete', imageBitmap },
          [imageBitmap]
        );
        break;
        
      case 'export':
        const blob = await engine.export(data.format, data.options);
        self.postMessage({ type: 'exportComplete', blob, format: data.format });
        break;
        
      // ... 其他消息处理
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
```

---

## 十二、性能优化策略汇总

### 12.1 渲染优化

| 技术 | 描述 | 预期提升 |
|------|------|----------|
| **瓦片缓存** | 将画布分割为 256x256 瓦片，只重绘脏瓦片 | 10-100x |
| **脏矩形追踪** | 记录变更区域，避免全量重绘 | 5-20x |
| **离屏渲染** | 在 Worker 中使用 OffscreenCanvas | 不阻塞 UI |
| **ImageBitmap** | 使用 Transferable 对象传递渲染结果 | 零拷贝 |
| **视口裁剪** | 只渲染可见区域 | 无限画布支持 |

### 12.2 数据优化

| 技术 | 描述 | 预期提升 |
|------|------|----------|
| **TypedArray 存储** | Uint32Array 替代 Map<string,string> | 18x 内存减少 |
| **空间哈希** | 64x64 单元格稀疏存储 | 快速空区域跳过 |
| **Copy-on-Write** | 帧复制时共享像素数据 | 内存共享 |
| **RLE 压缩** | 撤销数据 zlib 压缩 | 5-10x 存储减少 |

### 12.3 笔刷优化

| 技术 | 描述 | 预期提升 |
|------|------|----------|
| **印记缓存** | 预生成笔刷形状 | 避免重复计算 |
| **间距绘制** | 按间距采样而非逐像素 | 减少绘制调用 |
| **批量写入** | 收集变更后统一写入 | 减少状态更新 |

### 12.4 导出优化

| 技术 | 描述 | 预期提升 |
|------|------|----------|
| **Web Worker** | 导出在后台线程执行 | 不阻塞 UI |
| **增量编码** | GIF/APNG 只编码变更区域 | 减少计算量 |
| **流式输出** | 大文件分块处理 | 避免内存溢出 |

---

## 十三、文件结构规划

```
src/
├── engine/                          # 核心引擎（可运行在 Worker 中）
│   ├── data/                        # 数据结构
│   │   ├── SparseGrid.ts            # 稀疏网格（核心）
│   │   ├── LayerBuffer.ts           # 图层缓冲区
│   │   ├── FrameBuffer.ts           # 帧缓冲区
│   │   ├── ProjectData.ts           # 项目数据序列化
│   │   └── index.ts
│   ├── render/                      # 渲染系统
│   │   ├── TileRenderer.ts          # 瓦片渲染器
│   │   ├── LayerCompositor.ts       # 图层合成器
│   │   ├── ViewportCuller.ts        # 视口裁剪
│   │   └── index.ts
│   ├── brush/                       # 笔刷系统
│   │   ├── BrushEngine.ts           # 笔刷引擎
│   │   ├── BrushStamp.ts            # 笔刷印记
│   │   ├── DistanceField.ts         # 距离场
│   │   └── index.ts
│   ├── selection/                   # 选区系统
│   │   ├── SelectionEngine.ts       # 选区引擎
│   │   ├── SelectionMask.ts         # 选区蒙版
│   │   ├── TransformEngine.ts       # 变换引擎
│   │   └── index.ts
│   ├── animation/                   # 动画系统
│   │   ├── AnimationEngine.ts       # 动画引擎
│   │   ├── Timeline.ts              # 时间轴
│   │   ├── TweenEngine.ts           # 补间引擎
│   │   └── index.ts
│   ├── tilemap/                     # 瓦片系统
│   │   ├── TilemapEngine.ts         # 瓦片地图引擎
│   │   ├── TileSet.ts               # 瓦片集
│   │   ├── AutoTile.ts              # 自动瓦片
│   │   └── index.ts
│   ├── undo/                        # 撤销系统
│   │   ├── UndoManager.ts           # 撤销管理器
│   │   ├── SnapshotCompressor.ts    # 快照压缩
│   │   └── index.ts
│   ├── export/                      # 导出系统
│   │   ├── ExportEngine.ts          # 导出引擎
│   │   ├── PngExporter.ts           # PNG 导出
│   │   ├── GifExporter.ts           # GIF 导出
│   │   ├── ApngExporter.ts          # APNG 导出
│   │   ├── SpriteSheetExporter.ts   # 精灵表导出
│   │   └── index.ts
│   ├── palette/                     # 调色板
│   │   ├── PaletteManager.ts        # 调色板管理
│   │   ├── ColorQuantizer.ts        # 颜色量化
│   │   └── index.ts
│   ├── protocol.ts                  # Worker 通信协议
│   ├── PixelEngine.ts               # 引擎主入口
│   └── index.ts
├── workers/                         # Web Workers
│   ├── pixelEngine.worker.ts        # 像素引擎 Worker
│   ├── gifWorker.ts                 # GIF 编码 Worker
│   └── exportWorker.ts              # 导出 Worker
├── store/                           # Zustand Stores（仅 UI 状态）
│   ├── useToolStore.ts              # 工具状态
│   ├── useViewStore.ts              # 视图状态
│   ├── useLayerStore.ts             # 图层元数据
│   ├── useAnimationStore.ts         # 动画状态
│   ├── usePaletteStore.ts           # 调色板状态
│   └── useProjectStore.ts           # 项目状态
├── components/                      # React 组件
│   ├── canvas/                      # 画布组件
│   │   ├── PixelCanvas.tsx          # 主画布
│   │   ├── TileCanvas.tsx           # 瓦片画布
│   │   └── PreviewOverlay.tsx       # 预览叠加
│   ├── timeline/                    # 时间轴组件
│   │   ├── Timeline.tsx             # 时间轴容器
│   │   ├── FrameTrack.tsx           # 帧轨道
│   │   ├── KeyframeItem.tsx         # 关键帧项
│   │   └── TagTrack.tsx             # 标签轨道
│   ├── toolbar/                     # 工具栏
│   ├── panels/                      # 面板
│   └── ui/                          # 通用 UI
├── hooks/                           # 自定义 Hooks
│   ├── usePixelEngine.ts            # 引擎通信 Hook
│   ├── useBrushSettings.ts          # 笔刷设置
│   ├── useKeyboardShortcuts.ts      # 快捷键
│   └── useRenderLoop.ts             # 渲染循环
├── lib/                             # 工具函数
│   ├── colorUtils.ts                # 颜色工具
│   ├── mathUtils.ts                 # 数学工具
│   └── fileUtils.ts                 # 文件工具
└── types/                           # 类型定义
    ├── engine.ts                    # 引擎类型
    ├── project.ts                   # 项目类型
    └── export.ts                    # 导出类型
```

---

## 十四、迁移策略

### 14.1 阶段一：数据层重构（2 周）
1. 实现 `SparseGrid` 替换 `Map<string, string>`
2. 实现 `LayerBuffer` 和 `FrameBuffer`
3. 保持现有 API 兼容，内部使用新数据结构

### 14.2 阶段二：渲染引擎（2 周）
1. 实现 `TileRenderer` 和 `LayerCompositor`
2. 实现脏矩形追踪
3. 将渲染逻辑从 React 组件迁移到独立模块

### 14.3 阶段三：Worker 化（2 周）
1. 创建 `pixelEngine.worker.ts`
2. 实现主线程与 Worker 通信协议
3. 将像素操作迁移到 Worker

### 14.4 阶段四：功能增强（4 周）
1. 实现完整笔刷系统
2. 实现高级选区（魔棒、套索）
3. 实现变换工具（旋转、缩放、翻转）
4. 实现时间轴动画系统
5. 实现瓦片系统

### 14.5 阶段五：导出系统（2 周）
1. 实现 PNG/WebP 导出
2. 实现 GIF 导出（Worker 中）
3. 实现 APNG 导出
4. 实现精灵表导出（带 JSON）

---

## 十五、功能规划参考

> **知识产权声明**：以下功能列表参考了像素艺术编辑器的行业通用功能范畴，用于指导像素工坊的独立开发。所有技术实现方案均为自主设计，不涉及任何第三方软件的代码、算法或专有技术。Aseprite、Pixaki 等均为其各自所有者的商标。

### 专业像素编辑器通用功能对标

| 功能类别 | 行业通用功能 | 像素工坊 V2 规划 | 状态 |
|----------|-------------|-----------------|------|
| **绘制工具** | 像素完美绘制 | 支持 | 已有 |
| **图层系统** | 混合模式、不透明度、分组 | 16 种 + 扩展 | 需扩展 |
| **笔刷系统** | 自定义形状、软边、纹理 | 距离场 + 纹理 | 需实现 |
| **选区工具** | 矩形/椭圆/套索/魔棒 | 全部支持 | 需实现 |
| **变换操作** | 旋转/缩放/翻转/斜切 | 旋转/缩放/翻转 | 需实现 |
| **动画系统** | 时间轴、关键帧、补间 | 基础时间轴 | 需实现 |
| **动画辅助** | 标签、洋葱皮 | 支持 | 部分已有 |
| **瓦片系统** | Tilemap、自动瓦片 | 16 变体自动瓦片 | 需实现 |
| **脚本扩展** | 插件/脚本支持 | JS/TS (未来版本) | 未来 |
| **文件格式** | 原生格式 + 通用格式 | 自定义 JSON + PNG | 需实现 |
| **导出格式** | PNG/GIF/APNG/精灵表 | Worker 异步导出 | 需实现 |

---

## 十六、知识产权与合规声明

### 16.1 独立设计原则

本文档及像素工坊项目的所有技术方案均为**独立设计**：

1. **不复制代码**：不查看、不复制、不改写任何第三方像素编辑器的源代码
2. **不逆向工程**：不对任何商业软件进行逆向分析或反编译
3. **通用知识**：所有功能设计基于像素艺术编辑器的行业通用知识和公开技术原理
4. **自主实现**：所有算法和数据结构均为团队独立设计和编码

### 16.2 第三方资源使用规范

| 资源类型 | 使用原则 |
|----------|----------|
| 开源库 | 仅使用 MIT/Apache/BSD 等宽松许可证的库，遵守许可证要求 |
| 调色板预设 | 使用公开的通用调色板（如 PICO-8、DB32 等社区共享资源） |
| 图标/字体 | 使用开源图标库（Lucide）和系统字体 |
| 文件格式 | 支持通用开放格式（PNG/GIF/JSON），不破解专有格式 |

### 16.3 商标声明

本文档中提及的第三方产品名称（如 Aseprite、Pixaki、Photoshop、GIMP 等）均为其各自所有者的商标或注册商标，仅用于功能描述和类别说明，不构成任何关联、认可或竞争关系声明。

### 16.4 许可证

像素工坊项目采用独立的开源许可证（待定），所有原创代码归项目贡献者所有。

---

*文档版本: 1.1*
*日期: 2026-05-17*
*更新: 添加知识产权合规声明*
