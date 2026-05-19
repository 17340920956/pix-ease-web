import { PixelChange, BlendMode, ProjectSettings } from './data';
import { BrushSettings } from './brush';
import { TransformParams } from './selection';

export interface ViewportState {
  cameraX: number;
  cameraY: number;
  scale: number;
}

export interface RenderOptions {
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  backgroundColor: number;
}

export interface ExportOptions {
  format: 'png' | 'gif' | 'apng' | 'spritesheet';
  scale?: number;
  borderSize?: number;
  borderColor?: string;
  columns?: number;
  fps?: number;
  loop?: boolean;
}

export type WorkerRequest =
  | { type: 'init'; project: ProjectSettings }
  | { type: 'setPixel'; layerId: string; x: number; y: number; color: number }
  | { type: 'stroke'; layerId: string; path: { x: number; y: number; pressure?: number }[]; brush: BrushSettings; color: number }
  | { type: 'fill'; layerId: string; x: number; y: number; color: number }
  | { type: 'render'; viewport: ViewportState; options: RenderOptions }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'export'; options: ExportOptions }
  | { type: 'addFrame' }
  | { type: 'removeFrame'; index: number }
  | { type: 'duplicateFrame'; index: number }
  | { type: 'setCurrentFrame'; index: number }
  | { type: 'togglePlayback' }
  | { type: 'setFps'; fps: number }
  | { type: 'createSelection'; mask: { type: 'rect' | 'ellipse'; x: number; y: number; width: number; height: number } | { type: 'wand'; x: number; y: number; tolerance: number; contiguous: boolean } }
  | { type: 'clearSelection' }
  | { type: 'transformSelection'; operation: 'move' | 'rotate' | 'scale' | 'flipH' | 'flipV'; params: TransformParams }
  | { type: 'addLayer'; name: string }
  | { type: 'removeLayer'; id: string }
  | { type: 'setLayerVisibility'; id: string; visible: boolean }
  | { type: 'setLayerOpacity'; id: string; opacity: number }
  | { type: 'setLayerBlendMode'; id: string; blendMode: BlendMode }
  | { type: 'mergeLayerDown'; id: string }
  | { type: 'getState' };

export type WorkerResponse =
  | { type: 'initialized' }
  | { type: 'pixelSet'; x: number; y: number; color: number }
  | { type: 'strokeComplete'; changes: PixelChange[]; affectedArea: { minX: number; minY: number; maxX: number; maxY: number } }
  | { type: 'renderComplete'; imageBitmap: ImageBitmap }
  | { type: 'undoComplete'; canUndo: boolean; canRedo: boolean }
  | { type: 'redoComplete'; canUndo: boolean; canRedo: boolean }
  | { type: 'exportComplete'; blob: Blob; format: string }
  | { type: 'frameAdded'; frameIndex: number }
  | { type: 'frameRemoved'; frameIndex: number }
  | { type: 'frameDuplicated'; frameIndex: number }
  | { type: 'currentFrameChanged'; frameIndex: number }
  | { type: 'playbackState'; isPlaying: boolean }
  | { type: 'selectionCreated'; bounds: { x: number; y: number; width: number; height: number } | null }
  | { type: 'selectionCleared' }
  | { type: 'transformComplete'; changes: PixelChange[] }
  | { type: 'layerAdded'; id: string; name: string }
  | { type: 'layerRemoved'; id: string }
  | { type: 'layerUpdated'; id: string }
  | { type: 'state'; state: EngineState }
  | { type: 'error'; message: string }
  | { type: 'progress'; percent: number };

export interface EngineState {
  project: ProjectSettings;
  layers: { id: string; name: string; visible: boolean; locked: boolean; opacity: number; blendMode: BlendMode }[];
  layerOrder: string[];
  frames: { id: string; name: string; duration: number }[];
  currentFrameIndex: number;
  isPlaying: boolean;
  fps: number;
  canUndo: boolean;
  canRedo: boolean;
  selectionBounds: { x: number; y: number; width: number; height: number } | null;
}

export function postRenderResult(
  worker: Worker,
  imageBitmap: ImageBitmap,
  affectedArea: { minX: number; minY: number; maxX: number; maxY: number }
): void {
  worker.postMessage(
    { type: 'renderComplete', imageBitmap, affectedArea },
    [imageBitmap]
  );
}
