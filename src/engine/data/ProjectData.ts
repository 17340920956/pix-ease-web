export interface ProjectSettings {
  width: number;
  height: number;
  backgroundColor: number;
  transparent: boolean;
}

export interface ProjectData {
  version: string;
  settings: ProjectSettings;
  layerOrder: string[];
  frames: FrameData[];
  currentFrameIndex: number;
  palettes: PaletteData[];
}

export interface FrameData {
  id: string;
  name: string;
  duration: number;
  layerPixels: Record<string, [number, number, number][]>;
}

export interface PaletteData {
  id: string;
  name: string;
  colors: number[];
}

export function createDefaultProject(width: number = 64, height: number = 64): ProjectSettings {
  return {
    width,
    height,
    backgroundColor: 0xffffffff,
    transparent: false,
  };
}
