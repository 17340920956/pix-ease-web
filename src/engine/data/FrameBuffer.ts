import { SparseGrid } from './SparseGrid';

export interface FrameBuffer {
  id: string;
  name: string;
  duration: number;
  layerGrids: Map<string, SparseGrid>;
}

export function createFrameBuffer(
  id: string,
  name: string,
  layerIds: string[],
  duration: number = 100
): FrameBuffer {
  const layerGrids = new Map<string, SparseGrid>();
  for (const layerId of layerIds) {
    layerGrids.set(layerId, new SparseGrid());
  }
  return {
    id,
    name,
    duration,
    layerGrids,
  };
}

export function cloneFrameBuffer(frame: FrameBuffer): FrameBuffer {
  const clonedGrids = new Map<string, SparseGrid>();
  for (const [layerId, grid] of frame.layerGrids) {
    clonedGrids.set(layerId, grid.clone());
  }
  return {
    id: frame.id,
    name: frame.name,
    duration: frame.duration,
    layerGrids: clonedGrids,
  };
}
