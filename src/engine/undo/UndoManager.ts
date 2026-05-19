import { PixelChange } from '../data';

export interface UndoSnapshot {
  id: string;
  timestamp: number;
  summary: string;
  affectedLayers: Map<string, { minX: number; minY: number; maxX: number; maxY: number }>;
  compressedData: Uint8Array;
}

export class UndoManager {
  private snapshots: UndoSnapshot[] = [];
  private currentIndex: number = -1;
  private maxSnapshots: number = 50;

  createSnapshot(
    operation: string,
    changes: PixelChange[],
    layerId: string
  ): void {
    if (changes.length === 0) return;

    // Remove redo history when new action is performed
    if (this.currentIndex < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
    }

    // Calculate affected area
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const change of changes) {
      minX = Math.min(minX, change.x);
      minY = Math.min(minY, change.y);
      maxX = Math.max(maxX, change.x);
      maxY = Math.max(maxY, change.y);
    }

    const affectedLayers = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
    affectedLayers.set(layerId, { minX, minY, maxX, maxY });

    // Compress changes using simple RLE-like encoding
    const compressedData = this.compressChanges(changes);

    const snapshot: UndoSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      summary: operation,
      affectedLayers,
      compressedData,
    };

    this.snapshots.push(snapshot);
    this.currentIndex++;

    // Limit snapshot count
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
      this.currentIndex--;
    }
  }

  private compressChanges(changes: PixelChange[]): Uint8Array {
    // Simple binary format: [count:4][x:4][y:4][before:4][after:4]...
    const buffer = new ArrayBuffer(4 + changes.length * 16);
    const view = new DataView(buffer);
    let offset = 0;

    view.setInt32(offset, changes.length, true);
    offset += 4;

    for (const change of changes) {
      view.setInt32(offset, change.x, true);
      offset += 4;
      view.setInt32(offset, change.y, true);
      offset += 4;
      view.setUint32(offset, change.before, true);
      offset += 4;
      view.setUint32(offset, change.after, true);
      offset += 4;
    }

    return new Uint8Array(buffer, 0, offset);
  }

  private decompressChanges(compressed: Uint8Array): PixelChange[] {
    const view = new DataView(compressed.buffer, compressed.byteOffset);
    const changes: PixelChange[] = [];
    let offset = 0;

    const count = view.getInt32(offset, true);
    offset += 4;

    for (let i = 0; i < count; i++) {
      changes.push({
        x: view.getInt32(offset, true),
        y: view.getInt32(offset + 4, true),
        before: view.getUint32(offset + 8, true),
        after: view.getUint32(offset + 12, true),
      });
      offset += 16;
    }

    return changes;
  }

  undo(): { changes: PixelChange[]; layerId: string } | null {
    if (this.currentIndex < 0) return null;

    const snapshot = this.snapshots[this.currentIndex];
    const changes = this.decompressChanges(snapshot.compressedData);

    // Reverse changes for undo
    const reversedChanges = changes.map(c => ({
      ...c,
      before: c.after,
      after: c.before,
    }));

    this.currentIndex--;

    const layerId = Array.from(snapshot.affectedLayers.keys())[0];
    return { changes: reversedChanges, layerId };
  }

  redo(): { changes: PixelChange[]; layerId: string } | null {
    if (this.currentIndex >= this.snapshots.length - 1) return null;

    this.currentIndex++;
    const snapshot = this.snapshots[this.currentIndex];
    const changes = this.decompressChanges(snapshot.compressedData);

    const layerId = Array.from(snapshot.affectedLayers.keys())[0];
    return { changes, layerId };
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.snapshots.length - 1;
  }

  getHistory(): { id: string; summary: string; timestamp: number }[] {
    return this.snapshots.map(s => ({
      id: s.id,
      summary: s.summary,
      timestamp: s.timestamp,
    }));
  }

  clear(): void {
    this.snapshots = [];
    this.currentIndex = -1;
  }
}
