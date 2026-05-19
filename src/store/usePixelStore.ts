import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { coordKey, generateId, toMap, hexToRgba, rgbaToHex, hslToRgb, rgbToHsl } from '@/lib/pixelUtils';
import { BlendMode } from '@/types/pixel';

export type PixelTool =
  | 'brush'
  | 'eraser'
  | 'picker'
  | 'bucket'
  | 'hand'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'select'
  | 'move'
  | 'spray'
  | 'gradient';

export type SymmetryMode = 'none' | 'horizontal' | 'vertical' | 'quad';

export interface PixelCoord { x: number; y: number }

export interface Selection { x: number; y: number; width: number; height: number }

export interface PixelChange { x: number; y: number; before: string | null; after: string | null }

export interface PixelCommand { changes: PixelChange[]; layerId: string }

export interface ViewportState { cameraX: number; cameraY: number; scale: number }

export interface Layer {
  id: string;
  name: string;
  pixels: Map<string, string>;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
}

export interface Frame {
  id: string;
  name: string;
  duration: number;
  layerPixels: Record<string, Map<string, string>>;
}

export interface Animation {
  frames: Frame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  fps: number;
  onionSkinning: boolean;
  onionSkinFrames: number;
}

export interface PaletteColor { color: string; name?: string }

export interface Palette { id: string; name: string; colors: PaletteColor[] }

export interface ProjectSettings {
  width: number;
  height: number;
  backgroundColor: string;
  transparent: boolean;
}

export interface ShortcutMap { [key: string]: string }

const MAX_UNDO_HISTORY = 200;

const blendPixel = (
  baseR: number, baseG: number, baseB: number, baseA: number,
  blendR: number, blendG: number, blendB: number, blendA: number,
  mode: BlendMode
): [number, number, number, number] => {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  if (blendA === 0) return [baseR, baseG, baseB, baseA];
  if (baseA === 0) return [blendR, blendG, blendB, blendA];

  let r: number, g: number, b: number;
  switch (mode) {
    case 'multiply': r = (baseR * blendR) / 255; g = (baseG * blendG) / 255; b = (baseB * blendB) / 255; break;
    case 'screen': r = 255 - ((255 - baseR) * (255 - blendR)) / 255; g = 255 - ((255 - baseG) * (255 - blendG)) / 255; b = 255 - ((255 - baseB) * (255 - blendB)) / 255; break;
    case 'overlay':
      r = baseR < 128 ? (2 * baseR * blendR) / 255 : 255 - (2 * (255 - baseR) * (255 - blendR)) / 255;
      g = baseG < 128 ? (2 * baseG * blendG) / 255 : 255 - (2 * (255 - baseG) * (255 - blendG)) / 255;
      b = baseB < 128 ? (2 * baseB * blendB) / 255 : 255 - (2 * (255 - baseB) * (255 - blendB)) / 255;
      break;
    case 'darken': r = Math.min(baseR, blendR); g = Math.min(baseG, blendG); b = Math.min(baseB, blendB); break;
    case 'lighten': r = Math.max(baseR, blendR); g = Math.max(baseG, blendG); b = Math.max(baseB, blendB); break;
    case 'difference': r = Math.abs(baseR - blendR); g = Math.abs(baseG - blendG); b = Math.abs(baseB - blendB); break;
    case 'exclusion': r = baseR + blendR - (2 * baseR * blendR) / 255; g = baseG + blendG - (2 * baseG * blendG) / 255; b = baseB + blendB - (2 * baseB * blendB) / 255; break;
    case 'hard-light':
      r = blendR < 128 ? (2 * baseR * blendR) / 255 : 255 - (2 * (255 - baseR) * (255 - blendR)) / 255;
      g = blendG < 128 ? (2 * baseG * blendG) / 255 : 255 - (2 * (255 - baseG) * (255 - blendG)) / 255;
      b = blendB < 128 ? (2 * baseB * blendB) / 255 : 255 - (2 * (255 - baseB) * (255 - blendB)) / 255;
      break;
    case 'soft-light':
      r = blendR < 128 ? baseR - (1 - 2 * blendR / 255) * baseR * (1 - baseR / 255) : baseR + (2 * blendR / 255 - 1) * (Math.sqrt(baseR / 255) * 255 - baseR);
      g = blendG < 128 ? baseG - (1 - 2 * blendG / 255) * baseG * (1 - baseG / 255) : baseG + (2 * blendG / 255 - 1) * (Math.sqrt(baseG / 255) * 255 - baseG);
      b = blendB < 128 ? baseB - (1 - 2 * blendB / 255) * baseB * (1 - baseB / 255) : baseB + (2 * blendB / 255 - 1) * (Math.sqrt(baseB / 255) * 255 - baseB);
      break;
    case 'color-dodge': r = baseR === 255 ? 255 : Math.min(255, (blendR * 255) / (255 - baseR)); g = baseG === 255 ? 255 : Math.min(255, (blendG * 255) / (255 - baseG)); b = baseB === 255 ? 255 : Math.min(255, (blendB * 255) / (255 - baseB)); break;
    case 'color-burn': r = baseR === 0 ? 0 : 255 - Math.min(255, ((255 - blendR) * 255) / baseR); g = baseG === 0 ? 0 : 255 - Math.min(255, ((255 - blendG) * 255) / baseG); b = baseB === 0 ? 0 : 255 - Math.min(255, ((255 - blendB) * 255) / baseB); break;
    case 'hue': {
      const [bh, bs, bl] = rgbToHsl(baseR / 255, baseG / 255, baseB / 255);
      const [sh] = rgbToHsl(blendR / 255, blendG / 255, blendB / 255);
      const [nr, ng, nb] = hslToRgb(sh, bs, bl);
      return [clamp(nr * 255), clamp(ng * 255), clamp(nb * 255), 255];
    }
    case 'saturation': {
      const [, bs2, bl2] = rgbToHsl(baseR / 255, baseG / 255, baseB / 255);
      const [, ss] = rgbToHsl(blendR / 255, blendG / 255, blendB / 255);
      const [nr2, ng2, nb2] = hslToRgb(0, ss, bl2);
      const [bh2] = rgbToHsl(baseR / 255, baseG / 255, baseB / 255);
      const [nr3, ng3, nb3] = hslToRgb(bh2, ss, bl2);
      return [clamp(nr3 * 255), clamp(ng3 * 255), clamp(nb3 * 255), 255];
    }
    case 'color': {
      const [, , bl3] = rgbToHsl(baseR / 255, baseG / 255, baseB / 255);
      const [ch, cs] = rgbToHsl(blendR / 255, blendG / 255, blendB / 255);
      const [nr4, ng4, nb4] = hslToRgb(ch, cs, bl3);
      return [clamp(nr4 * 255), clamp(ng4 * 255), clamp(nb4 * 255), 255];
    }
    case 'luminosity': {
      const [bh4, bs4] = rgbToHsl(baseR / 255, baseG / 255, baseB / 255);
      const [, , ll] = rgbToHsl(blendR / 255, blendG / 255, blendB / 255);
      const [nr5, ng5, nb5] = hslToRgb(bh4, bs4, ll);
      return [clamp(nr5 * 255), clamp(ng5 * 255), clamp(nb5 * 255), 255];
    }
    default: r = blendR; g = blendG; b = blendB;
  }
  return [clamp(r), clamp(g), clamp(b), 255];
};

const createLayer = (name: string): Layer => ({
  id: generateId(),
  name,
  pixels: new Map(),
  visible: true,
  opacity: 1,
  blendMode: 'normal',
  locked: false,
});

const createFrame = (index: number, layerIds: string[]): Frame => ({
  id: generateId(),
  name: `帧 ${index + 1}`,
  duration: 100,
  layerPixels: Object.fromEntries(layerIds.map((id) => [id, new Map()])),
});

const DEFAULT_PALETTES: Palette[] = [
  {
    id: 'default',
    name: '默认',
    colors: [
      { color: '#1d1d1f' }, { color: '#86868b' }, { color: '#a1a1a6' }, { color: '#d2d2d7' },
      { color: '#ff3b30' }, { color: '#ff9500' }, { color: '#ffcc00' }, { color: '#34c759' },
      { color: '#0071e3' }, { color: '#5ac8fa' }, { color: '#5856d6' }, { color: '#af52de' },
      { color: '#ff2d55' }, { color: '#a2845e' }, { color: '#ffffff' }, { color: '#f5f5f7' },
    ],
  },
  {
    id: 'pico8',
    name: 'PICO-8',
    colors: [
      { color: '#000000' }, { color: '#1D2B53' }, { color: '#7E2553' }, { color: '#008751' },
      { color: '#AB5236' }, { color: '#5F574F' }, { color: '#C2C3C7' }, { color: '#FFF1E8' },
      { color: '#FF004D' }, { color: '#FFA300' }, { color: '#FFEC27' }, { color: '#00E436' },
      { color: '#29ADFF' }, { color: '#83769C' }, { color: '#FF77A8' }, { color: '#FFCCAA' },
    ],
  },
  {
    id: 'db32',
    name: 'DB32',
    colors: [
      { color: '#000000' }, { color: '#222034' }, { color: '#45283c' }, { color: '#663931' },
      { color: '#8f563b' }, { color: '#df7126' }, { color: '#d9a066' }, { color: '#eec39a' },
      { color: '#fbf236' }, { color: '#99e550' }, { color: '#6abe30' }, { color: '#37946e' },
      { color: '#4b692f' }, { color: '#524b24' }, { color: '#323c39' }, { color: '#3f3f74' },
      { color: '#306082' }, { color: '#5b6ee1' }, { color: '#639bff' }, { color: '#5fcde4' },
      { color: '#cbdbfc' }, { color: '#ffffff' }, { color: '#9badb7' }, { color: '#847e87' },
      { color: '#696a6a' }, { color: '#595652' }, { color: '#76428a' }, { color: '#ac3232' },
      { color: '#d95763' }, { color: '#d77bba' }, { color: '#8f974a' }, { color: '#8a6f30' },
    ],
  },
  {
    id: 'endesga32',
    name: 'Endesga 32',
    colors: [
      { color: '#be4a2f' }, { color: '#d77643' }, { color: '#ead4aa' }, { color: '#e4a672' },
      { color: '#b86f50' }, { color: '#733e39' }, { color: '#3e2731' }, { color: '#a22633' },
      { color: '#e43b44' }, { color: '#f77622' }, { color: '#feae34' }, { color: '#fee761' },
      { color: '#63c74d' }, { color: '#3e8948' }, { color: '#265c42' }, { color: '#193c3e' },
      { color: '#124e89' }, { color: '#0099db' }, { color: '#2ce8f5' }, { color: '#ffffff' },
      { color: '#c0cbdc' }, { color: '#8b9bb4' }, { color: '#5a6988' }, { color: '#3a4466' },
      { color: '#262b44' }, { color: '#181425' }, { color: '#ff0044' }, { color: '#68386c' },
      { color: '#b55088' }, { color: '#f6757a' }, { color: '#e8b796' }, { color: '#c28569' },
    ],
  },
  {
    id: 'sweetie16',
    name: 'Sweetie 16',
    colors: [
      { color: '#1a1c2c' }, { color: '#5d275d' }, { color: '#b13e53' }, { color: '#ef7d57' },
      { color: '#ffcd75' }, { color: '#a7f070' }, { color: '#38b764' }, { color: '#257179' },
      { color: '#29366f' }, { color: '#3b5dc9' }, { color: '#41a6f6' }, { color: '#73eff7' },
      { color: '#f4f4f4' }, { color: '#94b0c2' }, { color: '#566c86' }, { color: '#333c57' },
    ],
  },
  {
    id: 'resurrect64',
    name: 'Resurrect 64',
    colors: [
      { color: '#2e222b' }, { color: '#533440' }, { color: '#7a3045' }, { color: '#9e3848' },
      { color: '#c24e4e' }, { color: '#d57468' }, { color: '#e09978' }, { color: '#e8bf8e' },
      { color: '#f5e6c8' }, { color: '#faf2e6' }, { color: '#ffffff' }, { color: '#c7d4d4' },
      { color: '#8fa7b2' }, { color: '#5e7e8a' }, { color: '#3d5e6a' }, { color: '#243f48' },
      { color: '#1e2d3d' }, { color: '#172838' }, { color: '#0f1c2e' }, { color: '#0a1224' },
      { color: '#2b1c38' }, { color: '#45264a' }, { color: '#6a3050' }, { color: '#8c3b4e' },
      { color: '#b04e4a' }, { color: '#d07050' }, { color: '#e09060' }, { color: '#eab476' },
      { color: '#f0d090' }, { color: '#f5e6b0' }, { color: '#faf2d8' }, { color: '#ffffff' },
      { color: '#3b2e40' }, { color: '#5c3a52' }, { color: '#824660' }, { color: '#a45668' },
      { color: '#c06870' }, { color: '#d58080' }, { color: '#e29a96' }, { color: '#ecb4b0' },
      { color: '#f4ccca' }, { color: '#f8e0de' }, { color: '#fbf0ee' }, { color: '#ffffff' },
      { color: '#1e2e1e' }, { color: '#2a4028' }, { color: '#3a5434' }, { color: '#4a6a40' },
      { color: '#5c8050' }, { color: '#709660' }, { color: '#88ac78' }, { color: '#a0c090' },
      { color: '#b8d4a8' }, { color: '#d0e4c0' }, { color: '#e4f0d8' }, { color: '#f0f8e8' },
      { color: '#faf8f0' }, { color: '#ffffff' }, { color: '#2e2420' }, { color: '#4a3830' },
      { color: '#684c3c' }, { color: '#886048' }, { color: '#a87858' }, { color: '#c09068' },
    ],
  },
  {
    id: 'gameboy',
    name: 'GameBoy',
    colors: [
      { color: '#0f380f' }, { color: '#306230' }, { color: '#8bac0f' }, { color: '#9bbc0f' },
    ],
  },
  {
    id: 'grayscale',
    name: '灰度',
    colors: [
      { color: '#000000' }, { color: '#111111' }, { color: '#222222' }, { color: '#333333' },
      { color: '#444444' }, { color: '#555555' }, { color: '#666666' }, { color: '#777777' },
      { color: '#888888' }, { color: '#999999' }, { color: '#aaaaaa' }, { color: '#bbbbbb' },
      { color: '#cccccc' }, { color: '#dddddd' }, { color: '#eeeeee' }, { color: '#ffffff' },
    ],
  },
  {
    id: 'nes',
    name: 'NES',
    colors: [
      { color: '#7C7C7C' }, { color: '#0000FC' }, { color: '#0000BC' }, { color: '#4428BC' },
      { color: '#940084' }, { color: '#A80020' }, { color: '#A81000' }, { color: '#881400' },
      { color: '#503000' }, { color: '#007800' }, { color: '#006800' }, { color: '#005800' },
      { color: '#004058' }, { color: '#000000' }, { color: '#BCBCBC' }, { color: '#0078F8' },
    ],
  },
];

const DEFAULT_SHORTCUTS: ShortcutMap = {
  b: 'brush', e: 'eraser', i: 'picker', g: 'bucket',
  l: 'line', r: 'rect', o: 'ellipse', m: 'move', h: 'hand',
  '[': 'zoom-out', ']': 'zoom-in',
};

interface PixelState {
  project: ProjectSettings;
  setProjectSettings: (settings: Partial<ProjectSettings>) => void;

  layers: Layer[];
  activeLayerId: string;
  addLayer: (name?: string) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, mode: BlendMode) => void;
  mergeLayerDown: (id: string) => void;
  duplicateLayer: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  renameLayer: (id: string, name: string) => void;

  animation: Animation;
  addFrame: () => void;
  removeFrame: (index: number) => void;
  setCurrentFrame: (index: number) => void;
  duplicateFrame: (index: number) => void;
  setFrameDuration: (index: number, duration: number) => void;
  toggleAnimation: () => void;
  setFps: (fps: number) => void;
  toggleOnionSkinning: () => void;
  setOnionSkinFrames: (frames: number) => void;

  tool: PixelTool;
  color: string;
  backgroundColor: string;
  secondaryColor: string;
  brushSize: number;
  setTool: (tool: PixelTool) => void;
  setColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  swapColors: () => void;

  viewport: ViewportState;
  pan: (dx: number, dy: number) => void;
  zoom: (factor: number, centerX?: number, centerY?: number) => void;
  resetViewport: () => void;
  setViewport: (viewport: Partial<ViewportState>) => void;

  gridSize: number;
  showGrid: boolean;
  setGridSize: (size: number) => void;
  toggleGrid: () => void;

  isDrawing: boolean;
  startDrawing: () => void;
  endDrawing: () => void;
  commitDrawing: (changes: PixelChange[]) => void;

  setPixel: (x: number, y: number, color: string | null) => void;
  removePixel: (x: number, y: number) => void;
  getPixel: (x: number, y: number) => string | null;
  getMergedPixel: (x: number, y: number) => string | null;
  fillArea: (startX: number, startY: number, fillColor: string) => void;
  replaceColor: (oldColor: string, newColor: string, scope: 'layer' | 'all') => void;

  undoStack: PixelCommand[];
  redoStack: PixelCommand[];
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  selection: Selection | null;
  selectionPixels: Map<string, string>;
  setSelection: (selection: Selection | null) => void;
  clearSelection: () => void;
  selectAll: () => void;
  invertSelection: () => void;
  deleteSelection: () => void;
  copySelection: () => void;
  pasteSelection: () => void;
  cutSelection: () => void;

  shapeStart: PixelCoord | null;
  setShapeStart: (coord: PixelCoord | null) => void;

  symmetryMode: SymmetryMode;
  symmetryCenter: { x: number; y: number };
  setSymmetryMode: (mode: SymmetryMode) => void;
  setSymmetryCenter: (center: { x: number; y: number }) => void;

  palettes: Palette[];
  activePaletteId: string;
  palette: string[];
  addPalette: (name: string, colors?: PaletteColor[]) => void;
  removePalette: (id: string) => void;
  setActivePalette: (id: string) => void;
  addPaletteColor: (color: string) => void;
  removePaletteColor: (index: number) => void;
  importPalette: (data: string, format: 'gpl' | 'pal' | 'hex') => void;
  exportPalette: (format: 'gpl' | 'pal' | 'hex') => string;

  pixelPerfect: boolean;
  togglePixelPerfect: () => void;

  ditherPattern: number;
  setDitherPattern: (pattern: number) => void;

  tileMode: boolean;
  toggleTileMode: () => void;

  referenceImage: string | null;
  referenceOpacity: number;
  setReferenceImage: (image: string | null) => void;
  setReferenceOpacity: (opacity: number) => void;

  clearCanvas: () => void;
  clearLayer: (id: string) => void;
  resizeCanvas: (width: number, height: number, anchor: string) => void;
  cropToSelection: () => void;

  shortcuts: ShortcutMap;
  setShortcut: (key: string, action: string) => void;
  resetShortcuts: () => void;

  exportToCanvas: (scale?: number, borderSize?: number, borderColor?: string) => HTMLCanvasElement | null;
  exportToSpriteSheet: (columns?: number, scale?: number) => HTMLCanvasElement | null;
  exportToGif: () => Blob | null;
  exportToApng: () => Blob | null;

  lastSaved: number;
  autoSave: () => void;
  loadAutoSave: () => boolean;
}

export const usePixelStore = create<PixelState>()(
  persist(
    (set, get) => ({
      project: { width: 64, height: 64, backgroundColor: '#ffffff', transparent: false },
      setProjectSettings: (settings) => set((state) => ({ project: { ...state.project, ...settings } })),

      layers: [createLayer('图层 1')],
      activeLayerId: '',

      addLayer: (name) => {
        const { layers } = get();
        const newLayer = createLayer(name || `图层 ${layers.length + 1}`);
        set({ layers: [...layers, newLayer], activeLayerId: newLayer.id });
      },

      removeLayer: (id) => {
        const { layers, activeLayerId } = get();
        if (layers.length <= 1) return;
        const newLayers = layers.filter((l) => l.id !== id);
        set({
          layers: newLayers,
          activeLayerId: activeLayerId === id ? newLayers[0].id : activeLayerId,
        });
      },

      setActiveLayer: (id) => set({ activeLayerId: id }),

      toggleLayerVisibility: (id) => {
        const { layers } = get();
        set({ layers: layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)) });
      },

      toggleLayerLock: (id) => {
        const { layers } = get();
        set({ layers: layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)) });
      },

      setLayerOpacity: (id, opacity) => {
        const { layers } = get();
        set({ layers: layers.map((l) => (l.id === id ? { ...l, opacity } : l)) });
      },

      setLayerBlendMode: (id, mode) => {
        const { layers } = get();
        set({ layers: layers.map((l) => (l.id === id ? { ...l, blendMode: mode } : l)) });
      },

      mergeLayerDown: (id) => {
        const { layers } = get();
        const index = layers.findIndex((l) => l.id === id);
        if (index <= 0) return;
        const current = layers[index];
        const below = layers[index - 1];
        const currentPixels = toMap(current.pixels);
        const belowPixels = toMap(below.pixels);
        const mergedPixels = new Map(belowPixels);
        currentPixels.forEach((color, key) => {
          const bxKey = belowPixels.get(key);
          const [bx, by, bb, ba] = hexToRgba(bxKey || (below.blendMode === 'normal' ? '#000000' : '#ffffff'));
          const [cr, cg, cb] = hexToRgba(color);
          const [mr, mg, mb] = blendPixel(bx, by, bb, ba, cr, cg, cb, 255, current.blendMode);
          mergedPixels.set(key, rgbaToHex(mr, mg, mb));
        });
        const newLayers = [...layers];
        newLayers[index - 1] = { ...below, pixels: mergedPixels };
        newLayers.splice(index, 1);
        set({ layers: newLayers, activeLayerId: below.id });
      },

      duplicateLayer: (id) => {
        const { layers } = get();
        const layer = layers.find((l) => l.id === id);
        if (!layer) return;
        const newLayer = { ...layer, id: generateId(), name: `${layer.name} 副本`, pixels: new Map(toMap(layer.pixels)) };
        const index = layers.findIndex((l) => l.id === id);
        const newLayers = [...layers];
        newLayers.splice(index + 1, 0, newLayer);
        set({ layers: newLayers, activeLayerId: newLayer.id });
      },

      moveLayer: (id, direction) => {
        const { layers } = get();
        const index = layers.findIndex((l) => l.id === id);
        if (index === -1) return;
        const newIndex = direction === 'up' ? index + 1 : index - 1;
        if (newIndex < 0 || newIndex >= layers.length) return;
        const newLayers = [...layers];
        [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];
        set({ layers: newLayers });
      },

      renameLayer: (id, name) => {
        const { layers } = get();
        set({ layers: layers.map((l) => (l.id === id ? { ...l, name } : l)) });
      },

      animation: {
        frames: [],
        currentFrameIndex: 0,
        isPlaying: false,
        fps: 12,
        onionSkinning: false,
        onionSkinFrames: 1,
      },

      addFrame: () => {
        const { animation, layers } = get();
        const newFrame = createFrame(animation.frames.length, layers.map((l) => l.id));
        set({
          animation: {
            ...animation,
            frames: [...animation.frames, newFrame],
            currentFrameIndex: animation.frames.length,
          },
        });
      },

      removeFrame: (index) => {
        const { animation } = get();
        if (animation.frames.length <= 1) return;
        const newFrames = [...animation.frames];
        newFrames.splice(index, 1);
        set({
          animation: {
            ...animation,
            frames: newFrames,
            currentFrameIndex: Math.min(animation.currentFrameIndex, newFrames.length - 1),
          },
        });
      },

      setCurrentFrame: (index) => {
        const { animation } = get();
        if (index < 0 || index >= animation.frames.length) return;
        set({ animation: { ...animation, currentFrameIndex: index } });
      },

      duplicateFrame: (index) => {
        const { animation } = get();
        const frame = animation.frames[index];
        if (!frame) return;
        const newFrame: Frame = {
          ...frame,
          id: generateId(),
          name: `${frame.name} 副本`,
          layerPixels: Object.fromEntries(
            Object.entries(frame.layerPixels).map(([lid, px]) => [lid, new Map(px)])
          ),
        };
        const newFrames = [...animation.frames];
        newFrames.splice(index + 1, 0, newFrame);
        set({ animation: { ...animation, frames: newFrames } });
      },

      setFrameDuration: (index, duration) => {
        const { animation } = get();
        const newFrames = [...animation.frames];
        newFrames[index] = { ...newFrames[index], duration };
        set({ animation: { ...animation, frames: newFrames } });
      },

      toggleAnimation: () => {
        const { animation } = get();
        set({ animation: { ...animation, isPlaying: !animation.isPlaying } });
      },

      setFps: (fps) => {
        const { animation } = get();
        set({ animation: { ...animation, fps } });
      },

      toggleOnionSkinning: () => {
        const { animation } = get();
        set({ animation: { ...animation, onionSkinning: !animation.onionSkinning } });
      },

      setOnionSkinFrames: (frames) => {
        const { animation } = get();
        set({ animation: { ...animation, onionSkinFrames: frames } });
      },

      tool: 'brush',
      color: '#1d1d1f',
      backgroundColor: '#ffffff',
      secondaryColor: '#86868b',
      brushSize: 1,

      setTool: (tool) => set({ tool }),
      setColor: (color) => set({ color }),
      setBackgroundColor: (color) => set({ backgroundColor: color }),
      setSecondaryColor: (color) => set({ secondaryColor: color }),
      setBrushSize: (size) => set({ brushSize: Math.max(1, Math.min(64, size)) }),
      swapColors: () => set((state) => ({ color: state.secondaryColor, secondaryColor: state.color })),

      viewport: { cameraX: 0, cameraY: 0, scale: 16 },

      pan: (dx, dy) =>
        set((state) => ({
          viewport: { ...state.viewport, cameraX: state.viewport.cameraX + dx, cameraY: state.viewport.cameraY + dy },
        })),

      zoom: (factor, centerX, centerY) =>
        set((state) => {
          const newScale = Math.max(1, Math.min(128, Math.round(state.viewport.scale * factor)));
          const ratio = newScale / state.viewport.scale;
          let cameraX = state.viewport.cameraX;
          let cameraY = state.viewport.cameraY;
          if (centerX !== undefined && centerY !== undefined) {
            cameraX = centerX - (centerX - cameraX) * ratio;
            cameraY = centerY - (centerY - cameraY) * ratio;
          }
          return { viewport: { ...state.viewport, scale: newScale, cameraX, cameraY } };
        }),

      resetViewport: () => set({ viewport: { cameraX: 0, cameraY: 0, scale: 16 } }),
      setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),

      gridSize: 16,
      showGrid: true,
      setGridSize: (size) => set({ gridSize: size, viewport: { ...get().viewport, scale: size } }),
      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

      isDrawing: false,

      startDrawing: () => set({ isDrawing: true }),

      endDrawing: () => set({ isDrawing: false }),

      commitDrawing: (changes) => {
        if (changes.length === 0) return;
        const { activeLayerId, undoStack } = get();

        const deduped = new Map<string, PixelChange>();
        for (const c of changes) {
          const key = coordKey(c.x, c.y);
          const prev = deduped.get(key);
          if (prev) {
            prev.after = c.after;
          } else {
            deduped.set(key, { x: c.x, y: c.y, before: c.before, after: c.after });
          }
        }

        const uniqueChanges = Array.from(deduped.values());
        const command: PixelCommand = { changes: uniqueChanges, layerId: activeLayerId };
        const newUndoStack = [...undoStack, command];
        if (newUndoStack.length > MAX_UNDO_HISTORY) newUndoStack.shift();

        set({ undoStack: newUndoStack, redoStack: [], isDrawing: false });
      },

      setPixel: (x, y, color) => {
        const { activeLayerId, layers, symmetryMode, symmetryCenter } = get();
        const layer = layers.find((l) => l.id === activeLayerId);
        if (!layer || layer.locked) return;

        const coords: [number, number][] = [[x, y]];
        if (symmetryMode !== 'none') {
          const cx = symmetryCenter.x;
          const cy = symmetryCenter.y;
          if (symmetryMode === 'horizontal' || symmetryMode === 'quad') coords.push([cx * 2 - x, y]);
          if (symmetryMode === 'vertical' || symmetryMode === 'quad') coords.push([x, cy * 2 - y]);
          if (symmetryMode === 'quad') coords.push([cx * 2 - x, cy * 2 - y]);
        }

        const newLayers = layers.map((l) => {
          if (l.id !== activeLayerId) return l;
          const newPixels = new Map(toMap(l.pixels));
          coords.forEach(([px, py]) => {
            const key = coordKey(px, py);
            if (color === null) newPixels.delete(key);
            else newPixels.set(key, color);
          });
          return { ...l, pixels: newPixels };
        });
        set({ layers: newLayers });
      },

      removePixel: (x, y) => {
        const { activeLayerId, layers } = get();
        const newLayers = layers.map((l) => {
          if (l.id !== activeLayerId) return l;
          const newPixels = new Map(toMap(l.pixels));
          newPixels.delete(coordKey(x, y));
          return { ...l, pixels: newPixels };
        });
        set({ layers: newLayers });
      },

      getPixel: (x, y) => {
        const { layers, activeLayerId } = get();
        const layer = layers.find((l) => l.id === activeLayerId);
        if (!layer) return null;
        return toMap(layer.pixels).get(coordKey(x, y)) || null;
      },

      getMergedPixel: (x, y) => {
        const { layers, backgroundColor } = get();
        const key = coordKey(x, y);
        let [r, g, b, a] = hexToRgba(backgroundColor);

        for (const layer of layers) {
          if (!layer.visible) continue;
          const color = toMap(layer.pixels).get(key);
          if (!color) continue;
          const [lr, lg, lb] = hexToRgba(color);
          const opacity = layer.opacity;
          if (layer.blendMode === 'normal') {
            r = r * (1 - opacity) + lr * opacity;
            g = g * (1 - opacity) + lg * opacity;
            b = b * (1 - opacity) + lb * opacity;
          } else {
            const [br, bg, bb] = blendPixel(r, g, b, a, lr, lg, lb, 255, layer.blendMode);
            r = r + (br - r) * opacity;
            g = g + (bg - g) * opacity;
            b = b + (bb - b) * opacity;
          }
          a = 255;
        }

        return rgbaToHex(Math.round(r), Math.round(g), Math.round(b));
      },

      fillArea: (startX, startY, fillColor) => {
        const { layers, activeLayerId, undoStack } = get();
        const layer = layers.find((l) => l.id === activeLayerId);
        if (!layer || layer.locked) return;

        const pixels = toMap(layer.pixels);
        const targetColor = pixels.get(coordKey(startX, startY)) || null;
        if (targetColor === fillColor) return;

        const newPixels = new Map(pixels);
        const changes: PixelChange[] = [];
        const visited = new Set<string>();
        const stack: [number, number][] = [[startX, startY]];
        const MAX_FILL = 65536;

        while (stack.length > 0 && changes.length < MAX_FILL) {
          const [x, y] = stack.pop()!;
          const key = coordKey(x, y);
          if (visited.has(key)) continue;
          visited.add(key);
          const currentColor = pixels.get(key) || null;
          if (currentColor !== targetColor) continue;
          changes.push({ x, y, before: currentColor, after: fillColor });
          newPixels.set(key, fillColor);
          stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        if (changes.length > 0) {
          const newLayers = layers.map((l) => (l.id === activeLayerId ? { ...l, pixels: newPixels } : l));
          const newUndoStack = [...undoStack, { changes, layerId: activeLayerId }];
          if (newUndoStack.length > MAX_UNDO_HISTORY) newUndoStack.splice(0, newUndoStack.length - MAX_UNDO_HISTORY);
          set({ layers: newLayers, undoStack: newUndoStack, redoStack: [] });
        }
      },

      replaceColor: (oldColor, newColor, scope) => {
        const { layers, activeLayerId, undoStack } = get();
        const targetLayers = scope === 'layer' ? layers.filter((l) => l.id === activeLayerId) : layers;
        const allChanges: PixelChange[] = [];
        const newLayers = layers.map((l) => {
          if (!targetLayers.includes(l)) return l;
          const newPixels = new Map(toMap(l.pixels));
          const layerChanges: PixelChange[] = [];
          newPixels.forEach((color, key) => {
            if (color === oldColor) {
              const [x, y] = key.split(',').map(Number);
              layerChanges.push({ x, y, before: color, after: newColor });
              newPixels.set(key, newColor);
            }
          });
          allChanges.push(...layerChanges);
          return { ...l, pixels: newPixels };
        });
        if (allChanges.length > 0) {
          const newUndoStack = [...undoStack, { changes: allChanges, layerId: activeLayerId }];
          if (newUndoStack.length > MAX_UNDO_HISTORY) newUndoStack.splice(0, newUndoStack.length - MAX_UNDO_HISTORY);
          set({ layers: newLayers, undoStack: newUndoStack, redoStack: [] });
        } else {
          set({ layers: newLayers });
        }
      },

      undoStack: [],
      redoStack: [],

      undo: () => {
        const { undoStack, redoStack, layers } = get();
        if (undoStack.length === 0) return;
        const command = undoStack[undoStack.length - 1];
        const newLayers = layers.map((l) => {
          if (l.id !== command.layerId) return l;
          const newPixels = new Map(toMap(l.pixels));
          for (const change of command.changes) {
            const key = coordKey(change.x, change.y);
            if (change.before === null) newPixels.delete(key);
            else newPixels.set(key, change.before);
          }
          return { ...l, pixels: newPixels };
        });
        set({ layers: newLayers, undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, command] });
      },

      redo: () => {
        const { undoStack, redoStack, layers } = get();
        if (redoStack.length === 0) return;
        const command = redoStack[redoStack.length - 1];
        const newLayers = layers.map((l) => {
          if (l.id !== command.layerId) return l;
          const newPixels = new Map(toMap(l.pixels));
          for (const change of command.changes) {
            const key = coordKey(change.x, change.y);
            if (change.after === null) newPixels.delete(key);
            else newPixels.set(key, change.after);
          }
          return { ...l, pixels: newPixels };
        });
        set({ layers: newLayers, undoStack: [...undoStack, command], redoStack: redoStack.slice(0, -1) });
      },

      canUndo: () => get().undoStack.length > 0,
      canRedo: () => get().redoStack.length > 0,
      clearHistory: () => set({ undoStack: [], redoStack: [] }),

      selection: null,
      selectionPixels: new Map(),

      setSelection: (selection) => set({ selection }),
      clearSelection: () => set({ selection: null, selectionPixels: new Map() }),

      selectAll: () => {
        const { project } = get();
        set({ selection: { x: 0, y: 0, width: project.width, height: project.height } });
      },

      invertSelection: () => {
        const { selection, project } = get();
        if (!selection) {
          set({ selection: { x: 0, y: 0, width: project.width, height: project.height } });
          return;
        }
        const { x, y, width, height } = selection;
        if (x === 0 && y === 0 && width === project.width && height === project.height) {
          set({ selection: null });
          return;
        }
        const newSelection = { x: 0, y: 0, width: project.width, height: project.height };
        set({ selection: newSelection });
      },

      deleteSelection: () => {
        const { selection, activeLayerId, layers, undoStack } = get();
        if (!selection) return;
        const layer = layers.find((l) => l.id === activeLayerId);
        if (!layer || layer.locked) return;

        const pixels = toMap(layer.pixels);
        const changes: PixelChange[] = [];
        const newPixels = new Map(pixels);
        for (let x = selection.x; x < selection.x + selection.width; x++) {
          for (let y = selection.y; y < selection.y + selection.height; y++) {
            const key = coordKey(x, y);
            const before = pixels.get(key) || null;
            if (before !== null) {
              changes.push({ x, y, before, after: null });
              newPixels.delete(key);
            }
          }
        }
        if (changes.length > 0) {
          const newLayers = layers.map((l) => (l.id === activeLayerId ? { ...l, pixels: newPixels } : l));
          const newUndoStack = [...undoStack, { changes, layerId: activeLayerId }];
          if (newUndoStack.length > MAX_UNDO_HISTORY) newUndoStack.splice(0, newUndoStack.length - MAX_UNDO_HISTORY);
          set({ layers: newLayers, undoStack: newUndoStack, redoStack: [] });
        }
      },

      copySelection: () => {
        const { selection, layers, activeLayerId } = get();
        if (!selection) return;
        const layer = layers.find((l) => l.id === activeLayerId);
        if (!layer) return;
        const pixels = toMap(layer.pixels);
        const copied = new Map<string, string>();
        for (let x = selection.x; x < selection.x + selection.width; x++) {
          for (let y = selection.y; y < selection.y + selection.height; y++) {
            const key = coordKey(x, y);
            const color = pixels.get(key);
            if (color) copied.set(key, color);
          }
        }
        set({ selectionPixels: copied });
      },

      pasteSelection: () => {
        const { selectionPixels, selection, activeLayerId, layers, undoStack } = get();
        if (selectionPixels.size === 0) return;
        const layer = layers.find((l) => l.id === activeLayerId);
        if (!layer || layer.locked) return;

        let minX = Infinity, minY = Infinity;
        selectionPixels.forEach((_, key) => {
          const [x, y] = key.split(',').map(Number);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
        });

        const pasteX = selection ? selection.x : 0;
        const pasteY = selection ? selection.y : 0;
        const offsetX = pasteX - minX;
        const offsetY = pasteY - minY;

        const changes: PixelChange[] = [];
        const pixels = toMap(layer.pixels);
        const newPixels = new Map(pixels);
        selectionPixels.forEach((color, key) => {
          const [x, y] = key.split(',').map(Number);
          const newX = x + offsetX;
          const newY = y + offsetY;
          const newKey = coordKey(newX, newY);
          const before = pixels.get(newKey) || null;
          changes.push({ x: newX, y: newY, before, after: color });
          newPixels.set(newKey, color);
        });

        const newLayers = layers.map((l) => (l.id === activeLayerId ? { ...l, pixels: newPixels } : l));
        const newUndoStack = [...undoStack, { changes, layerId: activeLayerId }];
        if (newUndoStack.length > MAX_UNDO_HISTORY) newUndoStack.splice(0, newUndoStack.length - MAX_UNDO_HISTORY);
        set({ layers: newLayers, undoStack: newUndoStack, redoStack: [] });
      },

      cutSelection: () => {
        const { copySelection, deleteSelection } = get();
        copySelection();
        deleteSelection();
      },

      shapeStart: null,
      setShapeStart: (coord) => set({ shapeStart: coord }),

      symmetryMode: 'none',
      symmetryCenter: { x: 0, y: 0 },
      setSymmetryMode: (mode) => set({ symmetryMode: mode }),
      setSymmetryCenter: (center) => set({ symmetryCenter: center }),

      palettes: DEFAULT_PALETTES,
      activePaletteId: 'default',
      palette: DEFAULT_PALETTES[0].colors.map((c) => c.color),

      addPalette: (name, colors) => {
        const { palettes } = get();
        const newPalette: Palette = { id: generateId(), name, colors: colors || [] };
        set({
          palettes: [...palettes, newPalette],
          activePaletteId: newPalette.id,
          palette: (colors || []).map((c) => c.color),
        });
      },

      removePalette: (id) => {
        const { palettes, activePaletteId } = get();
        if (palettes.length <= 1) return;
        const newPalettes = palettes.filter((p) => p.id !== id);
        const newActiveId = activePaletteId === id ? newPalettes[0].id : activePaletteId;
        const activePalette = newPalettes.find((p) => p.id === newActiveId);
        set({
          palettes: newPalettes,
          activePaletteId: newActiveId,
          palette: activePalette ? activePalette.colors.map((c) => c.color) : [],
        });
      },

      setActivePalette: (id) => {
        const { palettes } = get();
        const palette = palettes.find((p) => p.id === id);
        set({ activePaletteId: id, palette: palette ? palette.colors.map((c) => c.color) : [] });
      },

      addPaletteColor: (color) =>
        set((state) => {
          const newPalettes = state.palettes.map((p) =>
            p.id === state.activePaletteId && !p.colors.find((c) => c.color === color)
              ? { ...p, colors: [...p.colors, { color }] }
              : p
          );
          const activePalette = newPalettes.find((p) => p.id === state.activePaletteId);
          return {
            palettes: newPalettes,
            palette: activePalette ? activePalette.colors.map((c) => c.color) : state.palette,
          };
        }),

      removePaletteColor: (index) =>
        set((state) => {
          const newPalettes = state.palettes.map((p) =>
            p.id === state.activePaletteId ? { ...p, colors: p.colors.filter((_, i) => i !== index) } : p
          );
          const activePalette = newPalettes.find((p) => p.id === state.activePaletteId);
          return {
            palettes: newPalettes,
            palette: activePalette ? activePalette.colors.map((c) => c.color) : state.palette,
          };
        }),

      importPalette: (data, format) => {
        const colors: PaletteColor[] = [];
        if (format === 'gpl') {
          data.split('\n').forEach((line) => {
            if (line.startsWith('#') || line.trim() === '' || line.startsWith('Name:') || line.startsWith('Columns:')) return;
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const r = parseInt(parts[0]);
              const g = parseInt(parts[1]);
              const b = parseInt(parts[2]);
              const name = parts.slice(3).join(' ');
              if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                colors.push({ color: rgbaToHex(r, g, b), name });
              }
            }
          });
        } else if (format === 'hex') {
          data.split('\n').forEach((line) => {
            const hex = line.trim();
            if (hex.match(/^#[0-9A-Fa-f]{6}$/)) colors.push({ color: hex });
          });
        }
        if (colors.length > 0) {
          get().addPalette(`导入的调色板`, colors);
        }
      },

      exportPalette: (format) => {
        const { palettes, activePaletteId } = get();
        const palette = palettes.find((p) => p.id === activePaletteId);
        if (!palette) return '';
        if (format === 'gpl') {
          let result = `GIMP Palette\nName: ${palette.name}\nColumns: 16\n#\n`;
          palette.colors.forEach((c) => {
            const [r, g, b] = hexToRgba(c.color);
            result += `${r} ${g} ${b} ${c.name || ''}\n`;
          });
          return result;
        }
        return palette.colors.map((c) => c.color).join('\n');
      },

      pixelPerfect: false,
      togglePixelPerfect: () => set((state) => ({ pixelPerfect: !state.pixelPerfect })),

      ditherPattern: 0,
      setDitherPattern: (pattern) => set({ ditherPattern: pattern }),

      tileMode: false,
      toggleTileMode: () => set((state) => ({ tileMode: !state.tileMode })),

      referenceImage: null,
      referenceOpacity: 0.5,
      setReferenceImage: (image) => set({ referenceImage: image }),
      setReferenceOpacity: (opacity) => set({ referenceOpacity: opacity }),

      clearCanvas: () => {
        const { layers, activeLayerId, undoStack } = get();
        const layer = layers.find((l) => l.id === activeLayerId);
        if (!layer || layer.locked) return;
        const changes: PixelChange[] = [];
        toMap(layer.pixels).forEach((color, key) => {
          const [x, y] = key.split(',').map(Number);
          changes.push({ x, y, before: color, after: null });
        });
        if (changes.length > 0) {
          const newLayers = layers.map((l) => (l.id === activeLayerId ? { ...l, pixels: new Map() } : l));
          const newUndoStack = [...undoStack, { changes, layerId: activeLayerId }];
          if (newUndoStack.length > MAX_UNDO_HISTORY) newUndoStack.splice(0, newUndoStack.length - MAX_UNDO_HISTORY);
          set({ layers: newLayers, undoStack: newUndoStack, redoStack: [] });
        }
      },

      clearLayer: (id) => {
        const { layers } = get();
        set({ layers: layers.map((l) => (l.id === id ? { ...l, pixels: new Map() } : l)) });
      },

      resizeCanvas: (width, height, anchor = 'center') => {
        const { project, layers } = get();
        const dx = width - project.width;
        const dy = height - project.height;
        let offsetX = 0, offsetY = 0;
        if (anchor === 'top-left') { offsetX = 0; offsetY = 0; }
        else if (anchor === 'top') { offsetX = Math.round(dx / 2); offsetY = 0; }
        else if (anchor === 'top-right') { offsetX = dx; offsetY = 0; }
        else if (anchor === 'left') { offsetX = 0; offsetY = Math.round(dy / 2); }
        else if (anchor === 'center') { offsetX = Math.round(dx / 2); offsetY = Math.round(dy / 2); }
        else if (anchor === 'right') { offsetX = dx; offsetY = Math.round(dy / 2); }
        else if (anchor === 'bottom-left') { offsetX = 0; offsetY = dy; }
        else if (anchor === 'bottom') { offsetX = Math.round(dx / 2); offsetY = dy; }
        else if (anchor === 'bottom-right') { offsetX = dx; offsetY = dy; }

        const newLayers = layers.map((l) => {
          const newPixels = new Map<string, string>();
          toMap(l.pixels).forEach((color, key) => {
            const [x, y] = key.split(',').map(Number);
            const nx = x + offsetX, ny = y + offsetY;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              newPixels.set(coordKey(nx, ny), color);
            }
          });
          return { ...l, pixels: newPixels };
        });
        set({ project: { ...project, width, height }, layers: newLayers });
      },

      cropToSelection: () => {
        const { selection, project } = get();
        if (!selection) return;
        set({ project: { ...project, width: selection.width, height: selection.height }, selection: null });
      },

      shortcuts: DEFAULT_SHORTCUTS,
      setShortcut: (key, action) => set((state) => ({ shortcuts: { ...state.shortcuts, [key]: action } })),
      resetShortcuts: () => set({ shortcuts: DEFAULT_SHORTCUTS }),

      exportToCanvas: (scale = 16, borderSize = 0, borderColor = '#000000') => {
        const { layers, project, backgroundColor } = get();

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasPixels = false;
        layers.forEach((layer) => {
          if (!layer.visible) return;
          toMap(layer.pixels).forEach((_, key) => {
            const [x, y] = key.split(',').map(Number);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            hasPixels = true;
          });
        });

        if (!hasPixels) {
          minX = 0; minY = 0; maxX = project.width - 1; maxY = project.height - 1;
        }

        const pixelWidth = maxX - minX + 1;
        const pixelHeight = maxY - minY + 1;
        const canvas = document.createElement('canvas');
        canvas.width = pixelWidth * scale + borderSize * 2;
        canvas.height = pixelHeight * scale + borderSize * 2;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        if (borderSize > 0) {
          ctx.fillStyle = borderColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const [bgR, bgG, bgB] = hexToRgba(backgroundColor);
        const imageData = ctx.createImageData(pixelWidth * scale, pixelHeight * scale);
        const data = imageData.data;

        for (let py = 0; py < pixelHeight; py++) {
          for (let px = 0; px < pixelWidth; px++) {
            const worldX = px + minX;
            const worldY = py + minY;
            const key = coordKey(worldX, worldY);

            let r = bgR, g = bgG, b = bgB, a = 255;
            for (const layer of layers) {
              if (!layer.visible) continue;
              const color = toMap(layer.pixels).get(key);
              if (!color) continue;
              const [lr, lg, lb] = hexToRgba(color);
              const opacity = layer.opacity;
              if (layer.blendMode === 'normal') {
                r = r * (1 - opacity) + lr * opacity;
                g = g * (1 - opacity) + lg * opacity;
                b = b * (1 - opacity) + lb * opacity;
              } else {
                const [br, bg2, bb] = blendPixel(r, g, b, a, lr, lg, lb, 255, layer.blendMode);
                r = r + (br - r) * opacity;
                g = g + (bg2 - g) * opacity;
                b = b + (bb - b) * opacity;
              }
            }

            r = Math.round(Math.max(0, Math.min(255, r)));
            g = Math.round(Math.max(0, Math.min(255, g)));
            b = Math.round(Math.max(0, Math.min(255, b)));

            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                const idx = ((py * scale + sy) * pixelWidth * scale + px * scale + sx) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = a;
              }
            }
          }
        }

        ctx.putImageData(imageData, borderSize, borderSize);
        return canvas;
      },

      exportToSpriteSheet: (columns = 4, scale = 1) => {
        const { animation, layers, project, backgroundColor } = get();
        if (animation.frames.length === 0) {
          const canvas = get().exportToCanvas(scale);
          return canvas;
        }

        const rows = Math.ceil(animation.frames.length / columns);
        const canvas = document.createElement('canvas');
        canvas.width = project.width * scale * columns;
        canvas.height = project.height * scale * rows;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        const [bgR, bgG, bgB] = hexToRgba(backgroundColor);

        animation.frames.forEach((frame, index) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          const offsetX = col * project.width * scale;
          const offsetY = row * project.height * scale;

          const imageData = ctx.createImageData(project.width * scale, project.height * scale);
          const data = imageData.data;

          for (let py = 0; py < project.height; py++) {
            for (let px = 0; px < project.width; px++) {
              const key = coordKey(px, py);
              let r = bgR, g = bgG, b = bgB, a = 255;

              for (const layer of layers) {
                if (!layer.visible) continue;
                const framePixels = toMap(frame.layerPixels[layer.id] || layer.pixels);
                const color = framePixels.get(key);
                if (!color) continue;
                const [lr, lg, lb] = hexToRgba(color);
                const opacity = layer.opacity;
                if (layer.blendMode === 'normal') {
                  r = r * (1 - opacity) + lr * opacity;
                  g = g * (1 - opacity) + lg * opacity;
                  b = b * (1 - opacity) + lb * opacity;
                } else {
                  const [br, bg2, bb] = blendPixel(r, g, b, a, lr, lg, lb, 255, layer.blendMode);
                  r = r + (br - r) * opacity;
                  g = g + (bg2 - g) * opacity;
                  b = b + (bb - b) * opacity;
                }
              }

              r = Math.round(Math.max(0, Math.min(255, r)));
              g = Math.round(Math.max(0, Math.min(255, g)));
              b = Math.round(Math.max(0, Math.min(255, b)));

              for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                  const idx = ((py * scale + sy) * project.width * scale + px * scale + sx) * 4;
                  data[idx] = r;
                  data[idx + 1] = g;
                  data[idx + 2] = b;
                  data[idx + 3] = a;
                }
              }
            }
          }

          ctx.putImageData(imageData, offsetX, offsetY);
        });

        return canvas;
      },

      exportToGif: () => {
        // TODO: 实现真正的 GIF 导出（需要 GIF 编码库）
        // 当前临时返回 PNG Blob 以保持兼容性
        const canvas = get().exportToCanvas(1);
        if (!canvas) return null;
        const dataUrl = canvas.toDataURL('image/png');
        const byteString = atob(dataUrl.split(',')[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        return new Blob([uint8Array], { type: 'image/png' });
      },

      exportToApng: () => {
        // TODO: 实现真正的 APNG 导出
        return get().exportToGif();
      },

      lastSaved: Date.now(),
      autoSave: () => {
        const state = get();
        const saveData = () => {
          const data = JSON.stringify({
            layers: state.layers.map((l) => ({
              ...l,
              pixels: Array.from(toMap(l.pixels).entries()),
            })),
            project: state.project,
            animation: {
              ...state.animation,
              frames: state.animation.frames.map((f) => ({
                ...f,
                layerPixels: Object.fromEntries(
                  Object.entries(f.layerPixels).map(([lid, px]) => [lid, Array.from((px as Map<string, string>).entries())])
                ),
              })),
            },
            palettes: state.palettes,
            activePaletteId: state.activePaletteId,
            tool: state.tool,
            color: state.color,
            brushSize: state.brushSize,
          });
          localStorage.setItem('pixease-autosave', data);
          set({ lastSaved: Date.now() });
        };
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(saveData, { timeout: 2000 });
        } else {
          setTimeout(saveData, 0);
        }
      },

      loadAutoSave: () => {
        const data = localStorage.getItem('pixease-autosave');
        if (!data) return false;
        try {
          const parsed = JSON.parse(data);
          const restoredLayers = parsed.layers.map((l: any) => ({
            ...l,
            pixels: new Map(l.pixels),
          }));
          const restoredAnimation = {
            ...parsed.animation,
            frames: (parsed.animation?.frames || []).map((f: any) => ({
              ...f,
              layerPixels: Object.fromEntries(
                Object.entries(f.layerPixels || {}).map(([lid, px]: [string, any]) => [lid, new Map(px as [string, string][])])
              ),
            })),
          };
          const activePalette = parsed.palettes?.find((p: any) => p.id === parsed.activePaletteId);
          set({
            layers: restoredLayers,
            project: parsed.project,
            animation: restoredAnimation,
            palettes: parsed.palettes || DEFAULT_PALETTES,
            activePaletteId: parsed.activePaletteId || 'default',
            activeLayerId: restoredLayers[0]?.id || '',
            palette: activePalette ? activePalette.colors.map((c: any) => c.color) : DEFAULT_PALETTES[0].colors.map((c) => c.color),
            tool: parsed.tool || 'brush',
            color: parsed.color || '#1d1d1f',
            brushSize: parsed.brushSize || 1,
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'pixease-pixel-store',
      storage: createJSONStorage(() => localStorage, {
        replacer: (_key, value) => {
          if (value instanceof Map) {
            return { __type: 'Map' as const, data: Array.from(value.entries()) };
          }
          return value;
        },
        reviver: (_key, value: unknown) => {
          if (value && typeof value === 'object' && '__type' in value && (value as Record<string, unknown>).__type === 'Map' && 'data' in value) {
            return new Map(((value as unknown) as { data: [string, string][] }).data);
          }
          return value;
        },
      }),
      partialize: (state) => ({
        project: state.project,
        layers: state.layers,
        activeLayerId: state.activeLayerId,
        animation: state.animation,
        palettes: state.palettes,
        activePaletteId: state.activePaletteId,
        shortcuts: state.shortcuts,
        gridSize: state.gridSize,
        showGrid: state.showGrid,
        color: state.color,
        secondaryColor: state.secondaryColor,
        tool: state.tool,
        brushSize: state.brushSize,
      }),
      onRehydrateStorage: () => {
        return (state?: PixelState, error?: unknown) => {
          if (error || !state) return;
          const s = state as Record<string, any>;
          if (Array.isArray(s.layers)) {
            s.layers = s.layers.map((l: Record<string, any>) => ({
              ...l,
              pixels: toMap(l.pixels),
            }));
          }
          const anim = s.animation as Record<string, any> | undefined;
          if (anim && Array.isArray(anim.frames)) {
            anim.frames = anim.frames.map((f: Record<string, any>) => ({
              ...f,
              layerPixels: Object.fromEntries(
                Object.entries((f.layerPixels || {}) as Record<string, any>).map(([k, v]) => [k, toMap(v)])
              ),
            }));
          }
        };
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<PixelState>;
        const mergedPalettes = (p.palettes || current.palettes).map((palette) => {
          const defaultPalette = DEFAULT_PALETTES.find((dp) => dp.id === palette.id);
          if (defaultPalette) {
            const existingColorIds = new Set(palette.colors.map((c) => c.color));
            const missingColors = defaultPalette.colors.filter(
              (dc) => !existingColorIds.has(dc.color)
            );
            return { ...palette, colors: [...palette.colors, ...missingColors] };
          }
          return palette;
        });
        const missingPalettes = DEFAULT_PALETTES.filter(
          (dp) => !mergedPalettes.some((mp) => mp.id === dp.id)
        );
        return {
          ...current,
          ...p,
          palettes: [...mergedPalettes, ...missingPalettes],
        };
      },
    }
  )
);
