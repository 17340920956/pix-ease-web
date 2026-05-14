import { create } from 'zustand';

/**
 * GIF 帧数据接口
 */
export interface GifFrame {
  /** 帧唯一标识 */
  id: string;
  /** 帧图像数据 */
  imageData: ImageData;
  /** 帧延迟（毫秒） */
  delay: number;
  /** 帧 Canvas 元素 */
  canvas?: HTMLCanvasElement;
}

/**
 * GIF 编辑状态存储接口
 */
interface GifState {
  /** 原始 GIF 文件 */
  originalFile: File | null;
  /** 帧列表 */
  frames: GifFrame[];
  /** 当前选中帧索引 */
  selectedFrameIndex: number;
  /** 是否正在处理 */
  isProcessing: boolean;
  /** 处理进度 */
  progress: number;
  /** 播放速度 */
  playbackSpeed: number;
  /** 是否显示设置 */
  showSettings: boolean;
  /** 帧列表是否展开 */
  framesExpanded: boolean;
  /** 设置原始文件 */
  setOriginalFile: (file: File | null) => void;
  /** 设置帧列表 */
  setFrames: (frames: GifFrame[]) => void;
  /** 添加单帧 */
  addFrame: (frame: GifFrame, index?: number) => void;
  /** 批量添加帧 */
  addFrames: (newFrames: GifFrame[]) => void;
  /** 删除帧 */
  removeFrame: (index: number) => void;
  /** 更新帧 */
  updateFrame: (index: number, updates: Partial<GifFrame>) => void;
  /** 移动帧 */
  moveFrame: (fromIndex: number, toIndex: number) => void;
  /** 重新排序帧 */
  reorderFrames: (frames: GifFrame[]) => void;
  /** 设置选中帧 */
  setSelectedFrameIndex: (index: number) => void;
  /** 设置处理状态 */
  setIsProcessing: (processing: boolean) => void;
  /** 设置进度 */
  setProgress: (progress: number) => void;
  /** 设置播放速度 */
  setPlaybackSpeed: (speed: number) => void;
  /** 设置显示设置 */
  setShowSettings: (show: boolean) => void;
  /** 设置帧列表展开 */
  setFramesExpanded: (expanded: boolean) => void;
  /** 重置状态 */
  reset: () => void;
}

/**
 * GIF 编辑状态管理 Store
 * 管理 GIF 编辑过程中的所有状态
 */
export const useGifStore = create<GifState>((set) => ({
  originalFile: null,
  frames: [],
  selectedFrameIndex: 0,
  isProcessing: false,
  progress: 0,
  playbackSpeed: 1,
  showSettings: false,
  framesExpanded: false,
  setOriginalFile: (file) => set({ originalFile: file }),
  setFrames: (frames) => set({ frames }),
  addFrame: (frame, index) =>
    set((state) => {
      const newFrames = [...state.frames];
      if (index !== undefined) {
        newFrames.splice(index, 0, frame);
      } else {
        newFrames.push(frame);
      }
      return { frames: newFrames };
    }),
  addFrames: (newFrames) =>
    set((state) => ({
      frames: [...state.frames, ...newFrames],
    })),
  removeFrame: (index) =>
    set((state) => ({
      frames: state.frames.filter((_, i) => i !== index),
      selectedFrameIndex: Math.min(state.selectedFrameIndex, state.frames.length - 2),
    })),
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
  reorderFrames: (frames) => set({ frames }),
  setSelectedFrameIndex: (index) => set({ selectedFrameIndex: index }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setProgress: (progress) => set({ progress }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setShowSettings: (show) => set({ showSettings: show }),
  setFramesExpanded: (expanded) => set({ framesExpanded: expanded }),
  reset: () =>
    set({
      originalFile: null,
      frames: [],
      selectedFrameIndex: 0,
      isProcessing: false,
      progress: 0,
      playbackSpeed: 1,
      showSettings: false,
      framesExpanded: false,
    }),
}));
