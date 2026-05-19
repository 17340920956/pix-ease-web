import {
  SparseGrid,
  PixelChange,
  LayerBuffer,
  FrameBuffer,
  BlendMode,
  ProjectSettings,
  createLayerBuffer,
  createFrameBuffer,
} from './data';
import { TileRenderer } from './render';
import { BrushEngine, BrushSettings } from './brush';
import { SelectionEngine, TransformEngine, TransformParams } from './selection';
import { AnimationEngine } from './animation';
import { UndoManager } from './undo';
import { PngExporter, GifExporter, SpriteSheetExporter } from './export';
import { ViewportState, RenderOptions, ExportOptions, EngineState } from './protocol';

export class PixelEngine {
  private project: ProjectSettings;
  private layers = new Map<string, LayerBuffer>();
  private layerOrder: string[] = [];
  private animationEngine: AnimationEngine;
  private tileRenderer = new TileRenderer();
  private brushEngine = new BrushEngine();
  private selectionEngine = new SelectionEngine();
  private transformEngine = new TransformEngine();
  private undoManager = new UndoManager();
  private pngExporter = new PngExporter();
  private gifExporter = new GifExporter();
  private spriteSheetExporter = new SpriteSheetExporter();

  constructor(project: ProjectSettings) {
    this.project = project;
    const defaultLayer = createLayerBuffer('layer-0', '图层 1');
    this.layers.set(defaultLayer.id, defaultLayer);
    this.layerOrder = [defaultLayer.id];
    this.animationEngine = new AnimationEngine(this.layerOrder);
  }

  init(project: ProjectSettings): void {
    this.project = project;
    this.layers.clear();
    this.layerOrder = [];
    const defaultLayer = createLayerBuffer('layer-0', '图层 1');
    this.layers.set(defaultLayer.id, defaultLayer);
    this.layerOrder = [defaultLayer.id];
    this.animationEngine = new AnimationEngine(this.layerOrder);
    this.undoManager.clear();
    this.selectionEngine.clear();
  }

  // Layer operations
  addLayer(name: string): string {
    const layer = createLayerBuffer(`layer-${Date.now()}`, name);
    this.layers.set(layer.id, layer);
    this.layerOrder.push(layer.id);
    return layer.id;
  }

  removeLayer(id: string): void {
    if (this.layerOrder.length <= 1) return;
    this.layers.delete(id);
    this.layerOrder = this.layerOrder.filter(lid => lid !== id);
  }

  setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (layer) layer.visible = visible;
  }

  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.get(id);
    if (layer) layer.opacity = opacity;
  }

  setLayerBlendMode(id: string, blendMode: BlendMode): void {
    const layer = this.layers.get(id);
    if (layer) layer.blendMode = blendMode;
  }

  mergeLayerDown(id: string): void {
    const index = this.layerOrder.indexOf(id);
    if (index <= 0) return;

    const targetLayer = this.layers.get(id);
    const belowLayer = this.layers.get(this.layerOrder[index - 1]);
    if (!targetLayer || !belowLayer) return;

    // Merge target layer pixels into below layer
    for (const { x, y, color } of targetLayer.grid.pixels()) {
      if (color !== 0) {
        belowLayer.grid.setPixel(x, y, color);
      }
    }

    this.removeLayer(id);
  }

  // Pixel operations
  setPixel(layerId: string, x: number, y: number, color: number): PixelChange[] {
    const layer = this.layers.get(layerId);
    if (!layer || layer.locked) return [];

    const before = layer.grid.getPixel(x, y);
    if (layer.grid.setPixel(x, y, color)) {
      return [{ x, y, before, after: color }];
    }
    return [];
  }

  stroke(
    layerId: string,
    path: { x: number; y: number; pressure?: number }[],
    brush: BrushSettings,
    color: number
  ): { changes: PixelChange[]; affectedArea: { minX: number; minY: number; maxX: number; maxY: number } } {
    const layer = this.layers.get(layerId);
    if (!layer || layer.locked) {
      return { changes: [], affectedArea: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
    }

    const changes = this.brushEngine.stroke(path, brush, layer.grid, color);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const change of changes) {
      minX = Math.min(minX, change.x);
      minY = Math.min(minY, change.y);
      maxX = Math.max(maxX, change.x);
      maxY = Math.max(maxY, change.y);
    }

    if (changes.length > 0) {
      this.undoManager.createSnapshot('绘制', changes, layerId);
    }

    return {
      changes,
      affectedArea: { minX, minY, maxX, maxY },
    };
  }

  fill(layerId: string, x: number, y: number, color: number): PixelChange[] {
    const layer = this.layers.get(layerId);
    if (!layer || layer.locked) return [];

    const targetColor = layer.grid.getPixel(x, y);
    if (targetColor === color) return [];

    const changes: PixelChange[] = [];
    const stack: [number, number][] = [[x, y]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const currentColor = layer.grid.getPixel(cx, cy);
      if (currentColor !== targetColor) continue;

      const before = layer.grid.getPixel(cx, cy);
      if (layer.grid.setPixel(cx, cy, color)) {
        changes.push({ x: cx, y: cy, before, after: color });
      }

      if (visited.size > 65536) break; // Safety limit

      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    if (changes.length > 0) {
      this.undoManager.createSnapshot('填充', changes, layerId);
    }

    return changes;
  }

  // Selection operations
  createRectSelection(x: number, y: number, width: number, height: number): void {
    this.selectionEngine.createRect(x, y, width, height);
  }

  createEllipseSelection(cx: number, cy: number, rx: number, ry: number): void {
    this.selectionEngine.createEllipse(cx, cy, rx, ry);
  }

  createWandSelection(
    x: number,
    y: number,
    tolerance: number,
    contiguous: boolean
  ): void {
    const currentFrame = this.animationEngine.getCurrentFrame();
    const mergedGrid = new SparseGrid();

    // Merge all visible layers
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.visible) continue;

      const frameGrid = currentFrame.layerGrids.get(layerId);
      if (!frameGrid) continue;

      for (const { x: px, y: py, color } of frameGrid.pixels()) {
        if (color !== 0) {
          mergedGrid.setPixel(px, py, color);
        }
      }
    }

    this.selectionEngine.createWand(x, y, tolerance, contiguous, mergedGrid, this.project.width, this.project.height);
  }

  clearSelection(): void {
    this.selectionEngine.clear();
  }

  transformSelection(
    operation: 'move' | 'rotate' | 'scale' | 'flipH' | 'flipV',
    params: TransformParams,
    layerId: string
  ): PixelChange[] {
    const layer = this.layers.get(layerId);
    if (!layer || layer.locked) return [];

    const currentFrame = this.animationEngine.getCurrentFrame();
    const frameGrid = currentFrame.layerGrids.get(layerId);
    if (!frameGrid) return [];

    const changes = this.transformEngine.transform(
      operation,
      params,
      frameGrid,
      layer.grid,
      this.selectionEngine
    );

    if (changes.length > 0) {
      this.undoManager.createSnapshot('变换', changes, layerId);
    }

    return changes;
  }

  // Undo/Redo
  undo(): { changes: PixelChange[]; layerId: string } | null {
    const result = this.undoManager.undo();
    if (result) {
      const layer = this.layers.get(result.layerId);
      if (layer) {
        for (const change of result.changes) {
          layer.grid.setPixel(change.x, change.y, change.after);
        }
      }
    }
    return result;
  }

  redo(): { changes: PixelChange[]; layerId: string } | null {
    const result = this.undoManager.redo();
    if (result) {
      const layer = this.layers.get(result.layerId);
      if (layer) {
        for (const change of result.changes) {
          layer.grid.setPixel(change.x, change.y, change.after);
        }
      }
    }
    return result;
  }

  // Animation operations
  addFrame(): void {
    this.animationEngine.addFrame();
  }

  removeFrame(index: number): void {
    this.animationEngine.removeFrame(index);
  }

  duplicateFrame(index: number): void {
    this.animationEngine.duplicateFrame(index);
  }

  setCurrentFrame(index: number): void {
    this.animationEngine.setCurrentFrame(index);
  }

  togglePlayback(): void {
    this.animationEngine.togglePlayback();
  }

  setFps(fps: number): void {
    this.animationEngine.setFps(fps);
  }

  // Render
  render(viewport: ViewportState, options: RenderOptions): ImageBitmap {
    const canvas = new OffscreenCanvas(800, 600); // Default size, should be dynamic
    const ctx = canvas.getContext('2d')!;

    const sortedLayers = this.layerOrder
      .map(id => this.layers.get(id))
      .filter((l): l is LayerBuffer => l !== undefined);

    this.tileRenderer.render(ctx, sortedLayers, viewport, options);

    return canvas.transferToImageBitmap();
  }

  // Export
  async export(options: ExportOptions): Promise<Blob> {
    const sortedLayers = this.layerOrder
      .map(id => this.layers.get(id))
      .filter((l): l is LayerBuffer => l !== undefined);

    switch (options.format) {
      case 'png':
        return this.pngExporter.export(sortedLayers, {
          scale: options.scale || 1,
          borderSize: options.borderSize || 0,
          borderColor: options.borderColor || '#000000',
          projectWidth: this.project.width,
          projectHeight: this.project.height,
          backgroundColor: this.project.backgroundColor,
        });
      case 'gif':
        return GifExporter.exportFromFrames(
          this.animationEngine.getState().frames,
          sortedLayers,
          {
            width: this.project.width,
            height: this.project.height,
            fps: options.fps || 12,
            loop: true,
          }
        );
      case 'spritesheet':
        const result = await this.spriteSheetExporter.export(
          this.animationEngine.getState().frames,
          sortedLayers,
          {
            columns: options.columns || 4,
            scale: options.scale || 1,
            packTags: false,
            frameWidth: this.project.width,
            frameHeight: this.project.height,
          }
        );
        return result.image;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  // State
  getState(): EngineState {
    const animState = this.animationEngine.getState();
    return {
      project: this.project,
      layers: this.layerOrder.map(id => {
        const layer = this.layers.get(id)!;
        return {
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          locked: layer.locked,
          opacity: layer.opacity,
          blendMode: layer.blendMode,
        };
      }),
      layerOrder: [...this.layerOrder],
      frames: animState.frames.map(f => ({
        id: f.id,
        name: f.name,
        duration: f.duration,
      })),
      currentFrameIndex: animState.currentFrameIndex,
      isPlaying: animState.isPlaying,
      fps: animState.fps,
      canUndo: this.undoManager.canUndo(),
      canRedo: this.undoManager.canRedo(),
      selectionBounds: this.selectionEngine.getBounds(),
    };
  }

  dispose(): void {
    this.animationEngine.dispose();
    this.brushEngine.clearCache();
    this.tileRenderer.clearCache();
  }
}
