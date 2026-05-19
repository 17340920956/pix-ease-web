import { SparseGrid } from './SparseGrid';
import { BlendMode } from '@/types/pixel';

export interface LayerBuffer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  grid: SparseGrid;
  thumbnail: ImageBitmap | null;
  thumbnailDirty: boolean;
}

export function createLayerBuffer(id: string, name: string): LayerBuffer {
  return {
    id,
    name,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    grid: new SparseGrid(),
    thumbnail: null,
    thumbnailDirty: true,
  };
}
