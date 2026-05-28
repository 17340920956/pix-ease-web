import { create } from 'zustand';
import type { BeadSize, BeadShape, ViewMode, ToolType, ColorCount, HistoryEntry, BeadColor } from '../types';
import { getColors } from '../palette/colors';

interface BeadStore {
  imageUrl: string | null;
  originalImage: ImageData | null;

  beadSize: BeadSize;
  beadShape: BeadShape;
  viewMode: ViewMode;
  showGridLabels: boolean;
  showColorCodes: boolean;
  customWidth: number;
  customHeight: number;
  useCustomSize: boolean;
  dithering: boolean;
  removeBackground: boolean;
  brand: string;

  beads: Map<string, string>;
  beadW: number;
  beadH: number;
  colorCounts: ColorCount[];
  backgroundCount: number;
  isProcessing: boolean;
  progressMessage: string;

  tool: ToolType;
  selectedColor: string | null;

  history: HistoryEntry[];
  historyIndex: number;

  setImageUrl: (url: string | null) => void;
  setOriginalImage: (img: ImageData | null) => void;
  setBeadSize: (size: BeadSize) => void;
  setBeadShape: (shape: BeadShape) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowGridLabels: (v: boolean) => void;
  setShowColorCodes: (v: boolean) => void;
  setCustomWidth: (w: number) => void;
  setCustomHeight: (h: number) => void;
  setUseCustomSize: (v: boolean) => void;
  setDithering: (v: boolean) => void;
  setRemoveBackground: (v: boolean) => void;
  setBrand: (brand: string) => void;
  setBeads: (beads: Map<string, string>, w: number, h: number) => void;
  setColorCounts: (counts: ColorCount[]) => void;
  setBackgroundCount: (count: number) => void;
  setIsProcessing: (v: boolean) => void;
  setProgressMessage: (msg: string) => void;
  setTool: (tool: ToolType) => void;
  setSelectedColor: (color: string | null) => void;
  setPixel: (x: number, y: number, color: string | null) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

export const useBeadStore = create<BeadStore>((set, get) => ({
  imageUrl: null,
  originalImage: null,
  beadSize: 64,
  beadShape: 'circle' as BeadShape,
  viewMode: 'edit' as ViewMode,
  showGridLabels: false,
  showColorCodes: false,
  customWidth: 41,
  customHeight: 44,
  useCustomSize: false,
  dithering: true,
  removeBackground: true,
  brand: 'artkal',

  beads: new Map(),
  beadW: 0,
  beadH: 0,
  colorCounts: [],
  backgroundCount: 0,
  isProcessing: false,
  progressMessage: '',

  tool: 'pen' as ToolType,
  selectedColor: null,

  history: [],
  historyIndex: -1,

  setImageUrl: (url) => set({ imageUrl: url }),
  setOriginalImage: (img) => set({ originalImage: img }),
  setBeadSize: (size) => set({ beadSize: size }),
  setBeadShape: (shape) => set({ beadShape: shape }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowGridLabels: (v) => set({ showGridLabels: v }),
  setShowColorCodes: (v) => set({ showColorCodes: v }),
  setCustomWidth: (w) => set({ customWidth: w }),
  setCustomHeight: (h) => set({ customHeight: h }),
  setUseCustomSize: (v) => set({ useCustomSize: v }),
  setDithering: (v) => set({ dithering: v }),
  setRemoveBackground: (v) => set({ removeBackground: v }),
  setBrand: (brand) => set({ brand }),

  setBeads: (beads, w, h) => {
    set({
      beads,
      beadW: w,
      beadH: h,
      history: [{ beads: new Map(beads) }],
      historyIndex: 0,
    });
  },

  setColorCounts: (counts) => set({ colorCounts: counts }),
  setBackgroundCount: (count) => set({ backgroundCount: count }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  setProgressMessage: (msg) => set({ progressMessage: msg }),

  setTool: (tool) => set({ tool }),
  setSelectedColor: (color) => set({ selectedColor: color }),

  setPixel: (x, y, color) => {
    const { beads, tool, selectedColor } = get();
    const next = new Map(beads);
    const key = `${x},${y}`;

    if (tool === 'eraser' || color === null) {
      next.delete(key);
    } else if (tool === 'pen') {
      const c = color ?? selectedColor;
      if (c) next.set(key, c);
    }

    const hi = get().historyIndex;
    const newH = get().history.slice(0, hi + 1);
    newH.push({ beads: new Map(next) });
    set({ beads: next, history: newH, historyIndex: newH.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const entry = history[historyIndex - 1];
    set({
      beads: new Map(entry.beads),
      historyIndex: historyIndex - 1,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const entry = history[historyIndex + 1];
    set({
      beads: new Map(entry.beads),
      historyIndex: historyIndex + 1,
    });
  },

  reset: () => set({
    imageUrl: null,
    originalImage: null,
    beads: new Map(),
    beadW: 0,
    beadH: 0,
    colorCounts: [],
    backgroundCount: 0,
    isProcessing: false,
    progressMessage: '',
    history: [],
    historyIndex: -1,
  }),
}));