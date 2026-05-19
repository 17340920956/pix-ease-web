import { create } from 'zustand';

/**
 * 图片处理类型
 */
export type ProcessType = 'convert' | 'compress' | 'pixelate' | 'ascii';

/**
 * 图片格式类型
 */
export type ImageFormat = 'jpg' | 'png' | 'webp' | 'avif' | 'gif' | 'heic' | 'svg';

/**
 * 压缩质量等级
 */
export type CompressQuality = 'lossless' | 'high' | 'extreme' | 'custom';

/**
 * 像素风格类型
 */
export type PixelStyle = 'pixel' | 'gameboy' | 'ascii-bw' | 'ascii-color';

/**
 * ASCII 字符集预设
 */
export type AsciiPreset = 'default' | 'blocks' | 'symbols' | 'custom';

/**
 * 图片处理记录参数
 */
export interface ProcessParams {
  /** 处理类型 */
  processType: ProcessType;
  /** 目标格式 */
  targetFormat?: ImageFormat;
  /** 压缩质量 */
  compressQuality?: CompressQuality;
  /** 自定义质量值 */
  customQuality?: number;
  /** 像素大小 */
  pixelSize?: number;
  /** 像素风格 */
  pixelStyle?: PixelStyle;
  /** ASCII 字符集预设 */
  asciiPreset?: AsciiPreset;
  /** ASCII 输出宽度 */
  asciiWidth?: number;
}

/**
 * 图片文件接口
 */
export interface ImageFile {
  /** 文件唯一标识 */
  id: string;
  /** 原始文件 */
  file: File;
  /** 预览 URL */
  previewUrl: string;
  /** 处理后的 URL */
  processedUrl?: string;
  /** 原始尺寸 */
  originalSize: number;
  /** 处理后尺寸 */
  processedSize?: number;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
  /** 状态 */
  status: 'pending' | 'processing' | 'completed' | 'error';
  /** 错误信息 */
  error?: string;
  /** 处理时记录的参数 */
  processParams?: ProcessParams;
}

/**
 * 图片处理状态存储接口
 */
interface ImageState {
  /** 图片列表 */
  images: ImageFile[];
  /** 当前处理类型 */
  processType: ProcessType;
  /** 目标格式 */
  targetFormat: ImageFormat;
  /** 压缩质量 */
  compressQuality: CompressQuality;
  /** 自定义质量值 */
  customQuality: number;
  /** 像素大小 */
  pixelSize: number;
  /** 像素风格 */
  pixelStyle: PixelStyle;
  /** ASCII 字符集预设 */
  asciiPreset: AsciiPreset;
  /** 自定义 ASCII 字符集 */
  asciiCustomChars: string;
  /** ASCII 输出宽度 */
  asciiWidth: number;
  /** ASCII 背景颜色 */
  asciiBgColor: string;
  /** ASCII 文字颜色列表（支持多色） */
  asciiTextColors: string[];
  /** 当前选中的文字颜色索引 */
  asciiTextColorIndex: number;
  /** 像素化是否显示辅助网格 */
  showPixelGrid: boolean;
  /** 是否正在处理 */
  isProcessing: boolean;
  /** 添加图片 */
  addImages: (files: File[]) => void;
  /** 移除图片 */
  removeImage: (id: string) => void;
  /** 更新图片 */
  updateImage: (id: string, updates: Partial<ImageFile>) => void;
  /** 设置处理类型 */
  setProcessType: (type: ProcessType) => void;
  /** 设置目标格式 */
  setTargetFormat: (format: ImageFormat) => void;
  /** 设置压缩质量 */
  setCompressQuality: (quality: CompressQuality) => void;
  /** 设置自定义质量 */
  setCustomQuality: (quality: number) => void;
  /** 设置像素大小 */
  setPixelSize: (size: number) => void;
  /** 设置像素风格 */
  setPixelStyle: (style: PixelStyle) => void;
  /** 设置 ASCII 预设 */
  setAsciiPreset: (preset: AsciiPreset) => void;
  /** 设置自定义 ASCII 字符 */
  setAsciiCustomChars: (chars: string) => void;
  /** 设置 ASCII 宽度 */
  setAsciiWidth: (width: number) => void;
  /** 设置 ASCII 背景颜色 */
  setAsciiBgColor: (color: string) => void;
  /** 设置 ASCII 文字颜色列表 */
  setAsciiTextColors: (colors: string[]) => void;
  /** 设置当前选中的文字颜色索引 */
  setAsciiTextColorIndex: (index: number) => void;
  /** 设置像素化网格显示 */
  setShowPixelGrid: (show: boolean) => void;
  /** 清空图片 */
  clearImages: () => void;
  /** 重置状态 */
  reset: () => void;
}

/**
 * 生成唯一 ID
 */
const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * 图片处理状态管理 Store
 * 管理图片处理过程中的所有状态
 */
export const useImageStore = create<ImageState>((set) => ({
  images: [],
  processType: 'convert',
  targetFormat: 'jpg',
  compressQuality: 'high',
  customQuality: 80,
  pixelSize: 8,
  pixelStyle: 'pixel',
  asciiPreset: 'default',
  asciiCustomChars: '',
  asciiWidth: 120,
  asciiBgColor: '#0f172a',
  asciiTextColors: ['#e2e8f0', '#000000', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'],
  asciiTextColorIndex: 0,
  showPixelGrid: false,
  isProcessing: false,
  addImages: (files) =>
    set((state) => {
      const newImages: ImageFile[] = files.map((file) => ({
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        originalSize: file.size,
        width: 0,
        height: 0,
        status: 'pending',
      }));
      return { images: [...state.images, ...newImages] };
    }),
  removeImage: (id) =>
    set((state) => {
      const image = state.images.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
        if (image.processedUrl) {
          URL.revokeObjectURL(image.processedUrl);
        }
      }
      return {
        images: state.images.filter((img) => img.id !== id),
      };
    }),
  updateImage: (id, updates) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      ),
    })),
  setProcessType: (type) =>
    set((state) => {
      const updates: Partial<ImageState> = { processType: type };
      if (type === 'pixelate') {
        updates.pixelStyle = 'pixel';
      } else if (type === 'ascii') {
        updates.pixelStyle = 'ascii-bw';
      }
      return { ...state, ...updates };
    }),
  setTargetFormat: (format) => set({ targetFormat: format }),
  setCompressQuality: (quality) => set({ compressQuality: quality }),
  setCustomQuality: (quality) => set({ customQuality: quality }),
  setPixelSize: (size) => set({ pixelSize: size }),
  setPixelStyle: (style) => set({ pixelStyle: style }),
  setAsciiPreset: (preset) => set({ asciiPreset: preset }),
  setAsciiCustomChars: (chars) => set({ asciiCustomChars: chars }),
  setAsciiWidth: (width) => set({ asciiWidth: width }),
  setAsciiBgColor: (color) => set({ asciiBgColor: color }),
  setAsciiTextColors: (colors) => set({ asciiTextColors: colors }),
  setAsciiTextColorIndex: (index) => set({ asciiTextColorIndex: index }),
  setShowPixelGrid: (show) => set({ showPixelGrid: show }),
  clearImages: () =>
    set((state) => {
      state.images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return { images: [] };
    }),
  reset: () =>
    set((state) => {
      state.images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return {
        images: [],
        processType: 'convert',
        targetFormat: 'jpg',
        compressQuality: 'high',
        customQuality: 80,
        pixelSize: 8,
        pixelStyle: 'pixel',
        asciiPreset: 'default',
        asciiCustomChars: '',
        asciiWidth: 120,
        asciiBgColor: '#0f172a',
        asciiTextColors: ['#e2e8f0', '#000000', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'],
        asciiTextColorIndex: 0,
        showPixelGrid: false,
        isProcessing: false,
      };
    }),
}));
