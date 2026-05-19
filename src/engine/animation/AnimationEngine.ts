import { SparseGrid, FrameBuffer, createFrameBuffer } from '../data';

export interface AnimationTag {
  name: string;
  fromFrame: number;
  toFrame: number;
  color: string;
}

export interface AnimationState {
  frames: FrameBuffer[];
  currentFrameIndex: number;
  isPlaying: boolean;
  fps: number;
  onionSkinning: boolean;
  onionSkinFrames: number;
  tags: AnimationTag[];
}

export class AnimationEngine {
  private state: AnimationState;
  private layerIds: string[] = [];
  private playInterval: number | null = null;

  constructor(layerIds: string[]) {
    this.layerIds = layerIds;
    this.state = {
      frames: [createFrameBuffer('frame-0', '帧 1', layerIds)],
      currentFrameIndex: 0,
      isPlaying: false,
      fps: 12,
      onionSkinning: false,
      onionSkinFrames: 1,
      tags: [],
    };
  }

  getState(): AnimationState {
    return { ...this.state };
  }

  addFrame(): void {
    const newFrame = createFrameBuffer(
      `frame-${this.state.frames.length}`,
      `帧 ${this.state.frames.length + 1}`,
      this.layerIds
    );
    this.state.frames.push(newFrame);
    this.state.currentFrameIndex = this.state.frames.length - 1;
  }

  removeFrame(index: number): void {
    if (this.state.frames.length <= 1) return;
    this.state.frames.splice(index, 1);
    this.state.currentFrameIndex = Math.min(this.state.currentFrameIndex, this.state.frames.length - 1);
  }

  duplicateFrame(index: number): void {
    const frame = this.state.frames[index];
    if (!frame) return;

    const newFrame: FrameBuffer = {
      ...frame,
      id: `frame-${this.state.frames.length}`,
      name: `${frame.name} 副本`,
      layerGrids: new Map(
        Array.from(frame.layerGrids.entries()).map(([id, grid]) => [id, grid.clone()])
      ),
    };

    this.state.frames.splice(index + 1, 0, newFrame);
  }

  setCurrentFrame(index: number): void {
    if (index < 0 || index >= this.state.frames.length) return;
    this.state.currentFrameIndex = index;
  }

  setFrameDuration(index: number, duration: number): void {
    if (index < 0 || index >= this.state.frames.length) return;
    this.state.frames[index].duration = duration;
  }

  togglePlayback(): void {
    if (this.state.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  startPlayback(): void {
    this.state.isPlaying = true;
    const frameDuration = 1000 / this.state.fps;

    this.playInterval = self.setInterval(() => {
      this.state.currentFrameIndex = (this.state.currentFrameIndex + 1) % this.state.frames.length;
    }, frameDuration);
  }

  stopPlayback(): void {
    this.state.isPlaying = false;
    if (this.playInterval !== null) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  setFps(fps: number): void {
    this.state.fps = Math.max(1, Math.min(60, fps));
    if (this.state.isPlaying) {
      this.stopPlayback();
      this.startPlayback();
    }
  }

  toggleOnionSkinning(): void {
    this.state.onionSkinning = !this.state.onionSkinning;
  }

  setOnionSkinFrames(frames: number): void {
    this.state.onionSkinFrames = Math.max(1, Math.min(5, frames));
  }

  addTag(tag: AnimationTag): void {
    this.state.tags.push(tag);
    this.state.tags.sort((a, b) => a.fromFrame - b.fromFrame);
  }

  removeTag(index: number): void {
    this.state.tags.splice(index, 1);
  }

  getOnionSkinData(): { frameIndex: number; opacity: number }[] {
    if (!this.state.onionSkinning) return [];

    const result: { frameIndex: number; opacity: number }[] = [];
    for (let i = 1; i <= this.state.onionSkinFrames; i++) {
      const frameIndex = this.state.currentFrameIndex - i;
      if (frameIndex < 0) break;
      result.push({
        frameIndex,
        opacity: 0.5 / i,
      });
    }
    return result;
  }

  getCurrentFrame(): FrameBuffer {
    return this.state.frames[this.state.currentFrameIndex];
  }

  getFramePixels(layerId: string, frameIndex: number): SparseGrid | null {
    const frame = this.state.frames[frameIndex];
    if (!frame) return null;
    return frame.layerGrids.get(layerId) || null;
  }

  dispose(): void {
    this.stopPlayback();
  }
}
