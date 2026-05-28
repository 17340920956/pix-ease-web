import { create } from 'zustand';

export type BrandKey = 'perler' | 'hama' | 'artkal' | 'mard';

export type BeadStyle = 'square' | 'circle';

export type BeadCountTier = 'small' | 'medium' | 'large';

export function beadDimensionsForTier(
  origW: number,
  origH: number,
  tier: BeadCountTier,
): { beadW: number; beadH: number } {
  if (origW <= 160 && origH <= 160) {
    return { beadW: origW, beadH: origH };
  }

  const aspect = Math.max(0.15, Math.min(6.5, origW / origH));

  const targetMap: Record<BeadCountTier, number> = {
    small: 1800,
    medium: 5000,
    large: 12800,
  };

  const target = targetMap[tier];

  let beadH = Math.round(Math.sqrt(target / aspect));
  let beadW = Math.round(beadH * aspect);

  beadW = Math.max(20, Math.min(160, beadW));
  beadH = Math.max(20, Math.min(160, beadH));

  return { beadW, beadH };
}

export interface BeadPixel {
  x: number;
  y: number;
  color: string;
}

export interface ColorCount {
  code: string;
  name: string;
  hex: string;
  count: number;
  percentage: number;
}

interface PerlerState {
  imageUrl: string | null;
  originalWidth: number;
  originalHeight: number;
  brand: BrandKey;
  maxColors: number;
  beadStyle: BeadStyle;
  beadCountTier: BeadCountTier;
  dithering: boolean;
  pixels: Map<string, string>;
  beadWidthActual: number;
  beadHeightActual: number;
  backgroundCount: number;
  colorCounts: ColorCount[];
  totalBeads: number;
  isProcessing: boolean;
  gridPixelSize: number;
  removeBackground: boolean;

  setImageUrl: (url: string | null) => void;
  setOriginalSize: (w: number, h: number) => void;
  setBrand: (brand: BrandKey) => void;
  setMaxColors: (colors: number) => void;
  setBeadStyle: (style: BeadStyle) => void;
  setBeadCountTier: (tier: BeadCountTier) => void;
  setPixels: (pixels: Map<string, string>) => void;
  setBeadDimensions: (w: number, h: number) => void;
  setBackgroundCount: (count: number) => void;
  setColorCounts: (counts: ColorCount[]) => void;
  setTotalBeads: (total: number) => void;
  setIsProcessing: (v: boolean) => void;
  setGridPixelSize: (v: number) => void;
  setRemoveBackground: (v: boolean) => void;
  setDithering: (v: boolean) => void;
  setPixel: (x: number, y: number, color: string) => void;
  reset: () => void;
}

export const usePerlerStore = create<PerlerState>((set) => ({
  imageUrl: null,
  originalWidth: 0,
  originalHeight: 0,
  brand: 'artkal',
  maxColors: 0,
  beadStyle: 'circle',
  beadCountTier: 'medium',
  dithering: true,
  pixels: new Map(),
  beadWidthActual: 0,
  beadHeightActual: 0,
  backgroundCount: 0,
  colorCounts: [],
  totalBeads: 0,
  isProcessing: false,
  gridPixelSize: 20,
  removeBackground: true,

  setImageUrl: (url) => set({ imageUrl: url }),
  setOriginalSize: (w, h) => set({ originalWidth: w, originalHeight: h }),
  setBrand: (brand) => set({ brand }),
  setMaxColors: (colors) => set({ maxColors: colors }),
  setBeadStyle: (style) => set({ beadStyle: style }),
  setBeadCountTier: (tier) => set({ beadCountTier: tier }),
  setDithering: (v) => set({ dithering: v }),
  setPixels: (pixels) => set({ pixels }),
  setBeadDimensions: (w, h) => set({ beadWidthActual: w, beadHeightActual: h }),
  setBackgroundCount: (count) => set({ backgroundCount: count }),
  setColorCounts: (counts) => set({ colorCounts: counts }),
  setTotalBeads: (total) => set({ totalBeads: total }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  setGridPixelSize: (v) => set({ gridPixelSize: v }),
  setRemoveBackground: (v) => set({ removeBackground: v }),
  setPixel: (x, y, color) =>
    set((state) => {
      const key = `${x},${y}`;
      const newPixels = new Map(state.pixels);
      if (color === null || color === 'transparent' || color === '') {
        newPixels.delete(key);
      } else {
        newPixels.set(key, color);
      }
      return { pixels: newPixels };
    }),
  reset: () =>
    set({
      imageUrl: null,
      originalWidth: 0,
      originalHeight: 0,
      pixels: new Map(),
      beadWidthActual: 0,
      beadHeightActual: 0,
      backgroundCount: 0,
      colorCounts: [],
      totalBeads: 0,
      isProcessing: false,
      removeBackground: true,
    }),
}));