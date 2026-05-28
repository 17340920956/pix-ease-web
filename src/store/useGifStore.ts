import { create } from 'zustand';

export interface GifFrame {
  id: string;
  imageData: ImageData;
  delay: number;
  canvas?: HTMLCanvasElement;
  hidden?: boolean;
}

const MAX_HISTORY = 50;

interface GifState {
  originalFile: File | null;
  frames: GifFrame[];
  selectedFrameIndex: number;
  isProcessing: boolean;
  progress: number;
  playbackSpeed: number;
  showSettings: boolean;
  framesExpanded: boolean;

  history: GifFrame[][];
  historyIndex: number;

  setOriginalFile: (file: File | null) => void;
  setFrames: (frames: GifFrame[]) => void;
  addFrame: (frame: GifFrame, index?: number) => void;
  addFrames: (newFrames: GifFrame[]) => void;
  removeFrame: (index: number) => void;
  updateFrame: (index: number, updates: Partial<GifFrame>) => void;
  moveFrame: (fromIndex: number, toIndex: number) => void;
  reorderFrames: (frames: GifFrame[]) => void;
  setSelectedFrameIndex: (index: number) => void;
  setIsProcessing: (processing: boolean) => void;
  setProgress: (progress: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setShowSettings: (show: boolean) => void;
  setFramesExpanded: (expanded: boolean) => void;

  toggleFrameHidden: (index: number) => void;
  unhideAllFrames: () => void;
  undo: () => void;
  redo: () => void;

  reset: () => void;
}

const initialState = {
  originalFile: null as File | null,
  frames: [] as GifFrame[],
  selectedFrameIndex: 0,
  isProcessing: false,
  progress: 0,
  playbackSpeed: 1,
  showSettings: false,
  framesExpanded: false,
  history: [] as GifFrame[][],
  historyIndex: -1,
};

export const useGifStore = create<GifState>((set, get) => ({
  ...initialState,

  setOriginalFile: (file) => set({ originalFile: file }),

  setFrames: (frames) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(state.frames.map((f) => ({ ...f })));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return { frames, history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  addFrame: (frame, index) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(state.frames.map((f) => ({ ...f })));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      const newFrames = [...state.frames];
      if (index !== undefined) {
        newFrames.splice(index, 0, frame);
      } else {
        newFrames.push(frame);
      }
      return { frames: newFrames, history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  addFrames: (newFrames) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(state.frames.map((f) => ({ ...f })));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return {
        frames: [...state.frames, ...newFrames],
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

  removeFrame: (index) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(state.frames.map((f) => ({ ...f })));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return {
        frames: state.frames.filter((_, i) => i !== index),
        selectedFrameIndex: Math.min(state.selectedFrameIndex, state.frames.length - 2),
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

  updateFrame: (index, updates) =>
    set((state) => ({
      frames: state.frames.map((frame, i) =>
        i === index ? { ...frame, ...updates } : frame
      ),
    })),

  moveFrame: (fromIndex, toIndex) =>
    set((state) => {
      const newFrames = [...state.frames];
      const [movedFrame] = newFrames.splice(fromIndex, 1);
      newFrames.splice(toIndex, 0, movedFrame);
      return { frames: newFrames };
    }),

  reorderFrames: (frames) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(state.frames.map((f) => ({ ...f })));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return { frames, history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  setSelectedFrameIndex: (index) => set({ selectedFrameIndex: index }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setProgress: (progress) => set({ progress }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setShowSettings: (show) => set({ showSettings: show }),
  setFramesExpanded: (expanded) => set({ framesExpanded: expanded }),

  toggleFrameHidden: (index) =>
    set((state) => ({
      frames: state.frames.map((frame, i) =>
        i === index ? { ...frame, hidden: !frame.hidden } : frame
      ),
    })),

  unhideAllFrames: () =>
    set((state) => ({
      frames: state.frames.map((f) => ({ ...f, hidden: false })),
    })),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return;
    const prevFrames = history[historyIndex].map((f) => ({ ...f }));
    set({
      frames: prevFrames,
      historyIndex: historyIndex - 1,
      selectedFrameIndex: Math.min(get().selectedFrameIndex, Math.max(0, prevFrames.length - 1)),
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const nextFrames = history[historyIndex + 1].map((f) => ({ ...f }));
    set({
      frames: nextFrames,
      historyIndex: historyIndex + 1,
      selectedFrameIndex: Math.min(get().selectedFrameIndex, Math.max(0, nextFrames.length - 1)),
    });
  },

  reset: () =>
    set({
      ...initialState,
    }),
}));