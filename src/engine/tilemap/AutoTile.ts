export interface AutoTileRules {
  tileSetId: string;
  getVariant(neighbors: { top: boolean; right: boolean; bottom: boolean; left: boolean }): number;
}

export class AutoTile16 implements AutoTileRules {
  private variantMap = new Map<number, number>();
  tileSetId: string;

  constructor(tileSetId: string) {
    this.tileSetId = tileSetId;
    this.initVariants();
  }

  private initVariants(): void {
    const variants = [
      0b0000, // 0: isolated
      0b0001, 0b0010, 0b0100, 0b1000, // 1-4: single edge
      0b0011, 0b0110, 0b1100, 0b1001, // 5-8: corner
      0b0111, 0b1011, 0b1101, 0b1110, // 9-12: three edges
      0b0101, 0b1010, // 13-14: straight
      0b1111, // 15: all edges
    ];

    variants.forEach((mask, index) => {
      this.variantMap.set(mask, index);
    });
  }

  getVariant(neighbors: { top: boolean; right: boolean; bottom: boolean; left: boolean }): number {
    let mask = 0;
    if (neighbors.top) mask |= 0b0001;
    if (neighbors.right) mask |= 0b0010;
    if (neighbors.bottom) mask |= 0b0100;
    if (neighbors.left) mask |= 0b1000;
    return this.variantMap.get(mask) || 0;
  }
}

export class AutoTile47 implements AutoTileRules {
  private variantMap = new Map<number, number>();
  tileSetId: string;

  constructor(tileSetId: string) {
    this.tileSetId = tileSetId;
    this.initVariants();
  }

  private initVariants(): void {
    // 47-tile auto-tiling system with 8 neighbors
    // This is a simplified version - full implementation would map all 256 combinations
    const baseVariants = [
      0b00000000, // 0
      0b00000001, 0b00000010, 0b00000100, 0b00001000, // single
      0b00000011, 0b00000110, 0b00001100, 0b00001001, // corner pairs
      0b00001111, // all cardinal
    ];

    baseVariants.forEach((mask, index) => {
      this.variantMap.set(mask, index);
    });
  }

  getVariant(neighbors: { top: boolean; right: boolean; bottom: boolean; left: boolean }): number {
    let mask = 0;
    if (neighbors.top) mask |= 0b0001;
    if (neighbors.right) mask |= 0b0010;
    if (neighbors.bottom) mask |= 0b0100;
    if (neighbors.left) mask |= 0b1000;
    return this.variantMap.get(mask) || 0;
  }
}
