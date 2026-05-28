#!/bin/bash
BASE=/Users/chen/codeRepository/pix-ease-bead/src
mkdir -p "$BASE"/{types,store,palette,utils,ai,workers,components/{canvas,toolbar,panels,layout}}

# types/index.ts
cat > "$BASE/types/index.ts" << 'EOF'
export interface BeadColor {
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
}

export interface BeadBrand {
  name: string;
  colors: BeadColor[];
}

export type BeadSize = 32 | 64 | 128;
export type ToolType = 'pen' | 'eraser' | 'picker' | 'select';

export interface BeadGrid {
  width: number;
  height: number;
  beads: Map<string, string>;
  backgroundCount: number;
}

export interface ColorCount {
  code: string;
  name: string;
  hex: string;
  count: number;
}

export interface HistoryEntry {
  beads: Map<string, string>;
}

export interface ExportConfig {
  showGrid: boolean;
  showLabels: boolean;
  format: 'png' | 'pdf' | 'json';
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
EOF

echo "types done"

# store/useBeadStore.ts
cat > "$BASE/store/useBeadStore.ts" << 'EOF'
import { create } from 'zustand';
import type { BeadGrid, BeadSize, ColorCount, HistoryEntry, ToolType } from '../types';

interface BeadStore {
  imageUrl: string | null;
  beadSize: BeadSize;
  dithering: boolean;
  removeBackground: boolean;
  brand: string;
  beads: Map<string, string>;
  beadW: number;
  beadH: number;
  colorCounts: ColorCount[];
  backgroundCount: number;
  isProcessing: boolean;
  tool: ToolType;
  selectedColor: string | null;
  history: HistoryEntry[];
  historyIndex: number;
  setImageUrl: (url: string | null) => void;
  setBeadSize: (size: BeadSize) => void;
  setDithering: (v: boolean) => void;
  setRemoveBackground: (v: boolean) => void;
  setBrand: (b: string) => void;
  setBeads: (beads: Map<string, string>) => void;
  setGrid: (grid: BeadGrid) => void;
  setColorCounts: (counts: ColorCount[]) => void;
  setIsProcessing: (v: boolean) => void;
  setTool: (tool: ToolType) => void;
  setSelectedColor: (color: string | null) => void;
  setPixel: (x: number, y: number, color: string | null) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  reset: () => void;
}

export const useBeadStore = create<BeadStore>((set, get) => ({
  imageUrl: null,
  beadSize: 64,
  dithering: true,
  removeBackground: true,
  brand: 'artkal',
  beads: new Map(),
  beadW: 0,
  beadH: 0,
  colorCounts: [],
  backgroundCount: 0,
  isProcessing: false,
  tool: 'pen',
  selectedColor: null,
  history: [],
  historyIndex: -1,

  setImageUrl: (url) => set({ imageUrl: url }),
  setBeadSize: (size) => set({ beadSize: size }),
  setDithering: (v) => set({ dithering: v }),
  setRemoveBackground: (v) => set({ removeBackground: v }),
  setBrand: (b) => set({ brand: b }),

  setBeads: (beads) => set({ beads: new Map(beads) }),
  setGrid: (grid) =>
    set({ beads: new Map(grid.beads), beadW: grid.width, beadH: grid.height, backgroundCount: grid.backgroundCount }),
  setColorCounts: (counts) => set({ colorCounts: counts }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  setTool: (tool) => set({ tool }),
  setSelectedColor: (color) => set({ selectedColor: color }),

  setPixel: (x, y, color) => {
    const { beads, tool, selectedColor } = get();
    const next = new Map(beads);
    const key = \`\${x},\${y}\`;
    if (tool === 'eraser' || color === null) next.delete(key);
    else if (tool === 'pen') { const c = color ?? selectedColor; if (c) next.set(key, c); }
    const hi = get().historyIndex;
    const newH = get().history.slice(0, hi + 1);
    newH.push({ beads: new Map(next) });
    set({ beads: next, history: newH, historyIndex: newH.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    set({ beads: new Map(history[historyIndex - 1].beads), historyIndex: historyIndex - 1 });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    set({ beads: new Map(history[historyIndex + 1].beads), historyIndex: historyIndex + 1 });
  },

  pushHistory: () => {
    const { beads, history, historyIndex } = get();
    const newH = history.slice(0, historyIndex + 1);
    newH.push({ beads: new Map(beads) });
    set({ history: newH, historyIndex: newH.length - 1 });
  },

  reset: () => set({
    imageUrl: null, beads: new Map(), beadW: 0, beadH: 0,
    colorCounts: [], backgroundCount: 0, isProcessing: false,
    history: [], historyIndex: -1, selectedColor: null,
  }),
}));
EOF
echo "store done"

# palette/colors.ts
cat > "$BASE/palette/colors.ts" << 'EOF'
import type { BeadColor, BeadBrand } from '../types';

const rgb = (r: number, g: number, b: number): [number, number, number] => [r, g, b];

export const mardColors: BeadColor[] = [
  { code:'A1',name:'Lemon Chiffon',hex:'#FAF4C8',rgb:rgb(250,244,200) },
  { code:'A2',name:'Light Yellow',hex:'#FFFFD5',rgb:rgb(255,255,213) },
  { code:'A3',name:'Pale Yellow',hex:'#FEFF8B',rgb:rgb(254,255,139) },
  { code:'A4',name:'Yellow',hex:'#FBED56',rgb:rgb(251,237,86) },
  { code:'A5',name:'Golden Yellow',hex:'#F4D738',rgb:rgb(244,215,56) },
  { code:'A6',name:'Orange',hex:'#FEAC4C',rgb:rgb(254,172,76) },
  { code:'A7',name:'Dark Orange',hex:'#FE8B4C',rgb:rgb(254,139,76) },
  { code:'A8',name:'Gold',hex:'#FFDA45',rgb:rgb(255,218,69) },
  { code:'B1',name:'Lime',hex:'#E6EE31',rgb:rgb(230,238,49) },
  { code:'B2',name:'Green',hex:'#63F347',rgb:rgb(99,243,71) },
  { code:'B3',name:'Pale Green',hex:'#9EF780',rgb:rgb(158,247,128) },
  { code:'B4',name:'Lime Green',hex:'#5DE035',rgb:rgb(93,224,53) },
  { code:'B5',name:'Spring Green',hex:'#35E352',rgb:rgb(53,227,82) },
  { code:'B6',name:'Aquamarine',hex:'#65E2A6',rgb:rgb(101,226,166) },
  { code:'B7',name:'Sea Green',hex:'#3DAF80',rgb:rgb(61,175,128) },
  { code:'B8',name:'Forest Green',hex:'#1C9C4F',rgb:rgb(28,156,79) },
  { code:'C1',name:'Honeydew',hex:'#E8FFE7',rgb:rgb(232,255,231) },
  { code:'C2',name:'Pale Turquoise',hex:'#A9F9FC',rgb:rgb(169,249,252) },
  { code:'C3',name:'Light Sky Blue',hex:'#A0E2FB',rgb:rgb(160,226,251) },
  { code:'C4',name:'Deep Sky Blue',hex:'#41CCFF',rgb:rgb(65,204,255) },
  { code:'C5',name:'Cerulean',hex:'#01ACEB',rgb:rgb(1,172,235) },
  { code:'C6',name:'Cornflower Blue',hex:'#50AAF0',rgb:rgb(80,170,240) },
  { code:'C7',name:'Royal Blue',hex:'#3677D2',rgb:rgb(54,119,210) },
  { code:'C8',name:'Medium Blue',hex:'#0F54C0',rgb:rgb(15,84,192) },
  { code:'C10',name:'Sky Blue',hex:'#3EBCE2',rgb:rgb(62,188,226) },
  { code:'C11',name:'Turquoise',hex:'#28DDDE',rgb:rgb(40,221,222) },
  { code:'D1',name:'Periwinkle',hex:'#AEB4F2',rgb:rgb(174,180,242) },
  { code:'D2',name:'Medium Purple',hex:'#858EDD',rgb:rgb(133,142,221) },
  { code:'D5',name:'Orchid',hex:'#B843C5',rgb:rgb(184,67,197) },
  { code:'D8',name:'Lavender',hex:'#E2D3FF',rgb:rgb(226,211,255) },
  { code:'E1',name:'Misty Rose',hex:'#FDD3CC',rgb:rgb(253,211,204) },
  { code:'E2',name:'Pink',hex:'#FEC0DF',rgb:rgb(254,192,223) },
  { code:'E3',name:'Hot Pink',hex:'#FFB7E7',rgb:rgb(255,183,231) },
  { code:'E4',name:'Deep Pink',hex:'#E8649E',rgb:rgb(232,100,158) },
  { code:'E5',name:'Magenta',hex:'#F551A2',rgb:rgb(245,81,162) },
  { code:'F1',name:'Light Coral',hex:'#FD957B',rgb:rgb(253,149,123) },
  { code:'F2',name:'Red',hex:'#FC3D46',rgb:rgb(252,61,70) },
  { code:'F3',name:'Tomato',hex:'#F74941',rgb:rgb(247,73,65) },
  { code:'F4',name:'Firebrick',hex:'#FC283C',rgb:rgb(252,40,60) },
  { code:'F5',name:'Crimson',hex:'#E7002F',rgb:rgb(231,0,47) },
  { code:'G1',name:'Linen',hex:'#FFE2CE',rgb:rgb(255,226,206) },
  { code:'G2',name:'Peach Puff',hex:'#FFC4AA',rgb:rgb(255,196,170) },
  { code:'G4',name:'Tan',hex:'#E1B383',rgb:rgb(225,179,131) },
  { code:'G5',name:'Gold',hex:'#EDB045',rgb:rgb(237,176,69) },
  { code:'G6',name:'Orange 2',hex:'#E99C17',rgb:rgb(233,156,23) },
  { code:'G8',name:'Brown',hex:'#753832',rgb:rgb(117,56,50) },
  { code:'H1',name:'White Smoke',hex:'#FDFBFF',rgb:rgb(253,251,255) },
  { code:'H2',name:'White',hex:'#FEFFFF',rgb:rgb(254,255,255) },
  { code:'H3',name:'Silver',hex:'#B6B1BA',rgb:rgb(182,177,186) },
  { code:'H4',name:'Gray',hex:'#89858C',rgb:rgb(137,133,140) },
  { code:'H5',name:'Dim Gray',hex:'#48464E',rgb:rgb(72,70,78) },
  { code:'H7',name:'Black',hex:'#000000',rgb:rgb(0,0,0) },
  { code:'H9',name:'Gainsboro',hex:'#EDEDED',rgb:rgb(237,237,237) },
  { code:'M1',name:'Sage',hex:'#BCC6B8',rgb:rgb(188,198,184) },
  { code:'M4',name:'Almond',hex:'#E3D2BC',rgb:rgb(227,210,188) },
  { code:'R1',name:'Red 2',hex:'#D50D21',rgb:rgb(213,13,33) },
  { code:'R2',name:'Hot Pink',hex:'#F92F83',rgb:rgb(249,47,131) },
  { code:'R3',name:'Orange 3',hex:'#FD8324',rgb:rgb(253,131,36) },
  { code:'R4',name:'Yellow 2',hex:'#F8EC31',rgb:rgb(248,236,49) },
  { code:'R5',name:'Green 2',hex:'#35C75B',rgb:rgb(53,199,91) },
  { code:'R6',name:'Teal',hex:'#238891',rgb:rgb(35,136,145) },
  { code:'R7',name:'Blue',hex:'#19779D',rgb:rgb(25,119,157) },
  { code:'R8',name:'Royal Blue',hex:'#1A60C3',rgb:rgb(26,96,195) },
  { code:'R9',name:'Purple',hex:'#9A56B4',rgb:rgb(154,86,180) },
  { code:'T1',name:'Pure White',hex:'#FFFFFF',rgb:rgb(255,255,255) },
];

export const artkalColors: BeadColor[] = [
  { code:'S01',name:'White',hex:'#FFFFFF',rgb:rgb(255,255,255) },
  { code:'S02',name:'Cream',hex:'#FFFDD0',rgb:rgb(255,253,208) },
  { code:'S03',name:'Pastel Yellow',hex:'#FDFD96',rgb:rgb(253,253,150) },
  { code:'S04',name:'Yellow',hex:'#FFFB00',rgb:rgb(255,251,0) },
  { code:'S05',name:'Golden Yellow',hex:'#FFD700',rgb:rgb(255,215,0) },
  { code:'S06',name:'Orange',hex:'#FF9833',rgb:rgb(255,152,51) },
  { code:'S07',name:'Apricot',hex:'#FFB380',rgb:rgb(255,179,128) },
  { code:'S10',name:'Red',hex:'#FF2828',rgb:rgb(255,40,40) },
  { code:'S11',name:'Dark Red',hex:'#C41E1E',rgb:rgb(196,30,30) },
  { code:'S14',name:'Pink',hex:'#FFA4CB',rgb:rgb(255,164,203) },
  { code:'S15',name:'Rose',hex:'#FF69B4',rgb:rgb(255,105,180) },
  { code:'S16',name:'Hot Pink',hex:'#F7007D',rgb:rgb(247,0,125) },
  { code:'S18',name:'Lavender',hex:'#CDB5E6',rgb:rgb(205,181,230) },
  { code:'S19',name:'Purple',hex:'#A259C9',rgb:rgb(162,89,201) },
  { code:'S20',name:'Violet',hex:'#581A80',rgb:rgb(88,26,128) },
  { code:'S22',name:'Light Blue',hex:'#ADD8E6',rgb:rgb(173,216,230) },
  { code:'S23',name:'Sky Blue',hex:'#6DC2E8',rgb:rgb(109,194,232) },
  { code:'S24',name:'Blue',hex:'#3B7DD8',rgb:rgb(59,125,216) },
  { code:'S25',name:'Navy',hex:'#1C2B47',rgb:rgb(28,43,71) },
  { code:'S27',name:'Turquoise',hex:'#34D8D8',rgb:rgb(52,216,216) },
  { code:'S29',name:'Mint',hex:'#98EBB2',rgb:rgb(152,235,178) },
  { code:'S30',name:'Green',hex:'#5BD650',rgb:rgb(91,214,80) },
  { code:'S31',name:'Dark Green',hex:'#227720',rgb:rgb(34,119,32) },
  { code:'S33',name:'Beige',hex:'#E8D5B7',rgb:rgb(232,213,183) },
  { code:'S35',name:'Light Brown',hex:'#CC9E6B',rgb:rgb(204,158,107) },
  { code:'S36',name:'Brown',hex:'#A5602A',rgb:rgb(165,96,42) },
  { code:'S37',name:'Dark Brown',hex:'#632E13',rgb:rgb(99,46,19) },
  { code:'S39',name:'Light Gray',hex:'#C8C8C8',rgb:rgb(200,200,200) },
  { code:'S40',name:'Gray',hex:'#808080',rgb:rgb(128,128,128) },
  { code:'S43',name:'Black',hex:'#1A1A1A',rgb:rgb(26,26,26) },
];

export const brands: Record<string, BeadBrand> = {
  artkal: { name:'Artkal (优肯)', colors: artkalColors },
  mard: { name:'MARD (64色)', colors: mardColors },
};

export const defaultBrand = 'artkal';

export function getPalette(brand: string): BeadColor[] {
  return brands[brand]?.colors ?? artkalColors;
}
EOF

# utils/colorMatch.ts
cat > "$BASE/utils/colorMatch.ts" << 'EOF'
import type { BeadColor } from '../types';

export function nearestColor(r: number, g: number, b: number, palette: BeadColor[]): BeadColor {
  let minDist = Infinity;
  let result = palette[0];
  for (const color of palette) {
    const [pr, pg, pb] = color.rgb;
    const dr = r - pr, dg = g - pg, db = b - pb;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) { minDist = dist; result = color; }
  }
  return result;
}
EOF

# utils/dithering.ts
cat > "$BASE/utils/dithering.ts" << 'EOF'
export function floydSteinberg(pixels: Float32Array, w: number, h: number): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const nr = Math.max(0, Math.min(255, Math.round(pixels[i])));
      const ng = Math.max(0, Math.min(255, Math.round(pixels[i + 1])));
      const nb = Math.max(0, Math.min(255, Math.round(pixels[i + 2])));
      const er = pixels[i] - nr, eg = pixels[i + 1] - ng, eb = pixels[i + 2] - nb;
      pixels[i] = nr; pixels[i + 1] = ng; pixels[i + 2] = nb;
      if (x + 1 < w) { const ri = (y * w + x + 1) * 3; pixels[ri] += er * 7/16; pixels[ri+1] += eg * 7/16; pixels[ri+2] += eb * 7/16; }
      if (y + 1 < h) {
        if (x > 0) { const li = ((y+1) * w + x - 1) * 3; pixels[li] += er * 3/16; pixels[li+1] += eg * 3/16; pixels[li+2] += eb * 3/16; }
        const bi = ((y+1) * w + x) * 3; pixels[bi] += er * 5/16; pixels[bi+1] += eg * 5/16; pixels[bi+2] += eb * 5/16;
        if (x + 1 < w) { const ri = ((y+1) * w + x + 1) * 3; pixels[ri] += er * 1/16; pixels[ri+1] += eg * 1/16; pixels[ri+2] += eb * 1/16; }
      }
    }
  }
}
EOF

# utils/boundingBox.ts
cat > "$BASE/utils/boundingBox.ts" << 'EOF'
import type { BBox } from '../types';

export function computeBBox(mask: Uint8Array, w: number, h: number): BBox | null {
  let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (mask[y * w + x] > 128) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      found = true;
    }
  }
  if (!found || maxX - minX < 4 || maxY - minY < 4) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
EOF

# utils/pixelate.ts
cat > "$BASE/utils/pixelate.ts" << 'EOF'
export function pixelateImage(src: ImageData, tw: number, th: number): ImageData {
  const c = new OffscreenCanvas(tw, th);
  const ctx = c.getContext('2d')!;
  const t = new OffscreenCanvas(src.width, src.height);
  t.getContext('2d')!.putImageData(src, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(t as unknown as CanvasImageSource, 0, 0, tw, th);
  return ctx.getImageData(0, 0, tw, th);
}
EOF

echo "palette+utils done"

# ai/rmbg.ts
cat > "$BASE/ai/rmbg.ts" << 'EOF'
let session: any = null;
let modelLoaded = false;

const MODEL_PATH = '/models/rmbg.onnx';
const CACHE_NAME = 'rmbg-model-v1';

async function loadFromCache(): Promise<ArrayBuffer | null> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const resp = await cache.match(MODEL_PATH);
    if (resp) return resp.arrayBuffer();
  } catch { /* ignore */ }
  return null;
}

async function saveToCache(buffer: ArrayBuffer): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(MODEL_PATH, new Response(buffer));
  } catch { /* ignore */ }
}

export async function initModel(): Promise<boolean> {
  if (modelLoaded) return true;
  try {
    let buffer = await loadFromCache();
    if (!buffer) {
      const resp = await fetch(MODEL_PATH);
      buffer = await resp.arrayBuffer();
      await saveToCache(buffer);
    }
    const ort = (self as any).ort || await import('onnxruntime-web');
    session = await ort.InferenceSession.create(buffer, {
      executionProviders: [(self as any).navigator?.gpu ? 'webgpu' : 'wasm'],
    });
    modelLoaded = true;
    return true;
  } catch (e) {
    console.warn('[RMBG] init failed:', e);
    return false;
  }
}

export async function removeBackground(imageData: ImageData): Promise<{
  imageData: ImageData;
  alphaMask: Uint8Array;
} | null> {
  if (!session) {
    const ok = await initModel();
    if (!ok) return null;
  }
  try {
    const { width, height, data } = imageData;
    const input = new Float32Array(3 * 1024 * 1024);
    const scaleX = 1024 / width, scaleY = 1024 / height;

    for (let y = 0; y < 1024; y++) {
      for (let x = 0; x < 1024; x++) {
        const sx = Math.min(width - 1, Math.round(x / scaleX));
        const sy = Math.min(height - 1, Math.round(y / scaleY));
        const si = (sy * width + sx) * 4;
        const di = (y * 1024 + x) * 3;
        input[di] = data[si] / 255;
        input[di + 1] = data[si + 1] / 255;
        input[di + 2] = data[si + 2] / 255;
      }
    }

    const tensor = new (session.handler as any).Tensor('float32', input, [1, 3, 1024, 1024]);
    const results = await session.run({ input: tensor });
    const output = results.output.data as Float32Array;

    const alphaMask = new Uint8Array(width * height);
    const outData = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ox = Math.min(1023, Math.round(x * scaleX));
        const oy = Math.min(1023, Math.round(y * scaleY));
        const alpha = Math.round(output[oy * 1024 + ox] * 255);
        const i = (y * width + x) * 4;
        outData[i] = data[i];
        outData[i + 1] = data[i + 1];
        outData[i + 2] = data[i + 2];
        outData[i + 3] = alpha;
        alphaMask[y * width + x] = alpha;
      }
    }

    return {
      imageData: new ImageData(outData, width, height),
      alphaMask,
    };
  } catch (e) {
    console.warn('[RMBG] inference failed:', e);
    return null;
  }
}
EOF

# ai/modelCache.ts
cat > "$BASE/ai/modelCache.ts" << 'EOF'
const DB_NAME = 'bead-models';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getModel(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('models', 'readonly');
      const req = tx.objectStore('models').get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setModel(key: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('models', 'readwrite');
      tx.objectStore('models').put(data, key);
      tx.oncomplete = () => resolve();
    });
  } catch { /* ignore */ }
}
EOF

# workers/ai.worker.ts
cat > "$BASE/workers/ai.worker.ts" << 'EOF'
import { removeBackground } from '../ai/rmbg';

self.onmessage = async (e: MessageEvent) => {
  const { type, imageData } = e.data;

  if (type === 'remove-bg') {
    try {
      const result = await removeBackground(imageData);
      if (result) {
        self.postMessage({ type: 'remove-bg-done', ...result });
      } else {
        self.postMessage({ type: 'remove-bg-error', error: 'Model not available' });
      }
    } catch (err: any) {
      self.postMessage({ type: 'remove-bg-error', error: err?.message || 'Unknown error' });
    }
  }
};
EOF

# utils/export.ts
cat > "$BASE/utils/export.ts" << 'EOF'
import type { BeadColor } from '../types';

export async function exportPNG(
  beads: Map<string, string>,
  w: number, h: number,
  palette: BeadColor[],
  config: { showGrid: boolean; showLabels: boolean },
): Promise<Blob> {
  const pixSize = 24;
  const canvas = new OffscreenCanvas(w * pixSize + 1, h * pixSize + 1);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const hexMap = new Map(palette.map(c => [c.hex.toUpperCase(), c]));

  beads.forEach((hex, key) => {
    const [x, y] = key.split(',').map(Number);
    const px = x * pixSize;
    const py = y * pixSize;
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.arc(px + pixSize / 2, py + pixSize / 2, pixSize / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    if (config.showLabels) {
      const c = hexMap.get(hex.toUpperCase());
      if (c) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.code, px + pixSize / 2, py + pixSize / 2);
      }
    }
  });

  if (config.showGrid) {
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x++) {
      ctx.beginPath(); ctx.moveTo(x * pixSize, 0); ctx.lineTo(x * pixSize, h * pixSize); ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * pixSize); ctx.lineTo(w * pixSize, y * pixSize); ctx.stroke();
    }
  }

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return blob;
}

export function exportJSON(beads: Map<string, string>, w: number, h: number): string {
  const grid: (string | null)[][] = Array.from({ length: h }, () => Array(w).fill(null));
  beads.forEach((hex, key) => {
    const [x, y] = key.split(',').map(Number);
    if (y < h && x < w) grid[y][x] = hex;
  });
  return JSON.stringify({ width: w, height: h, beads: grid }, null, 2);
}
EOF

echo "ai+worker+export done"

# main.tsx
cat > "$BASE/main.tsx" << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

# index.css
cat > "$BASE/index.css" << 'EOF'
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#1a1a2e;--bg-panel:#16213e;--bg-card:#0f3460;
  --text:#e0e0e0;--text-secondary:#a0a0b0;--text-muted:#6a6a7a;
  --primary:#e94560;--primary-hover:#ff6b81;--accent:#00d2ff;
  --border:#2a2a4a;--radius:8px;--radius-sm:4px;
}
html,body,#root{height:100%;width:100%}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);overflow:hidden}
button{cursor:pointer;border:none;background:none;color:inherit;font:inherit}
input{font:inherit}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
EOF

# App.tsx
cat > "$BASE/App.tsx" << 'EOF'
import { useCallback, useRef, useState } from 'react';
import { useBeadStore } from './store/useBeadStore';
import { getPalette } from './palette/colors';
import { nearestColor } from './utils/colorMatch';
import { floydSteinberg } from './utils/dithering';
import { computeBBox } from './utils/boundingBox';
import { pixelateImage } from './utils/pixelate';
import { exportPNG, exportJSON } from './utils/export';
import { BeadCanvas } from './components/canvas/BeadCanvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { ExportPanel } from './components/panels/ExportPanel';
import { ColorList } from './components/panels/ColorList';
import type { BeadSize } from './types';

export default function App() {
  const store = useBeadStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');

  const processImage = useCallback(async (file: File) => {
    setStatus('加载图片...');
    const url = URL.createObjectURL(file);
    store.setImageUrl(url);
    store.setIsProcessing(true);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    let imgData = ctx.getImageData(0, 0, img.width, img.height);
    let alphaMask = new Uint8Array(img.width * img.height);

    if (store.removeBackground) {
      setStatus('AI 去背景...');
      try {
        const worker = new Worker(new URL('./workers/ai.worker.ts', import.meta.url), { type: 'module' });
        const result = await new Promise<any>((resolve) => {
          worker.onmessage = (e) => { worker.terminate(); resolve(e.data); };
          worker.onerror = () => { worker.terminate(); resolve(null); };
          worker.postMessage({ type: 'remove-bg', imageData: imgData });
        });
        if (result?.type === 'remove-bg-done') {
          imgData = result.imageData;
          alphaMask = result.alphaMask;
          setStatus('AI 抠图完成，裁剪主体...');
        } else {
          setStatus('AI 不可用，使用快速抠图...');
          for (let i = 0; i < alphaMask.length; i++) {
            const r = imgData.data[i * 4], g = imgData.data[i * 4 + 1], b = imgData.data[i * 4 + 2];
            alphaMask[i] = (r > 250 && g > 250 && b > 250) ? 0 : 255;
          }
        }
      } catch {
        setStatus('AI 不可用，使用快速抠图...');
        for (let i = 0; i < alphaMask.length; i++) {
          const r = imgData.data[i * 4], g = imgData.data[i * 4 + 1], b = imgData.data[i * 4 + 2];
          alphaMask[i] = (r > 250 && g > 250 && b > 250) ? 0 : 255;
        }
      }
    }

    const bbox = computeBBox(alphaMask, img.width, img.height);
    let cropW = img.width, cropH = img.height, offsetX = 0, offsetY = 0;

    if (bbox) {
      const padX = Math.round(bbox.w * 0.08);
      const padY = Math.round(bbox.h * 0.08);
      const bx = Math.max(0, bbox.x - padX);
      const by = Math.max(0, bbox.y - padY);
      cropW = Math.min(img.width, bbox.x + bbox.w + padX) - bx;
      cropH = Math.min(img.height, bbox.y + bbox.h + padY) - by;

      const cropC = document.createElement('canvas');
      cropC.width = cropW;
      cropC.height = cropH;
      cropC.getContext('2d')!.drawImage(canvas, bx, by, cropW, cropH, 0, 0, cropW, cropH);
      imgData = cropC.getContext('2d')!.getImageData(0, 0, cropW, cropH);
    }

    setStatus('像素化 + 颜色匹配...');
    const beadSize = store.beadSize;
    imgData = pixelateImage(imgData, beadSize, beadSize);

    const palette = getPalette(store.brand);
    const pixels = new Float32Array(beadSize * beadSize * 3);

    for (let i = 0; i < beadSize * beadSize; i++) {
      pixels[i * 3] = imgData.data[i * 4];
      pixels[i * 3 + 1] = imgData.data[i * 4 + 1];
      pixels[i * 3 + 2] = imgData.data[i * 4 + 2];
    }

    if (store.dithering) {
      floydSteinberg(pixels, beadSize, beadSize);
    }

    const beads = new Map<string, string>();
    const colorCount = new Map<string, number>();

    for (let y = 0; y < beadSize; y++) {
      for (let x = 0; x < beadSize; x++) {
        const i = (y * beadSize + x) * 3;
        const r = Math.round(pixels[i]);
        const g = Math.round(pixels[i + 1]);
        const b = Math.round(pixels[i + 2]);
        const matched = nearestColor(r, g, b, palette);
        beads.set(`${x},${y}`, matched.hex);
        colorCount.set(matched.hex, (colorCount.get(matched.hex) || 0) + 1);
      }
    }

    const bgCount = colorCount.get('#FFFFFF') || colorCount.get('#FEFFFF') || 0;
    const counts = palette
      .filter(c => colorCount.has(c.hex.toUpperCase()))
      .map(c => ({ code: c.code, name: c.name, hex: c.hex, count: colorCount.get(c.hex.toUpperCase()) || 0 }))
      .sort((a, b) => b.count - a.count);

    store.setGrid({ beads, width: beadSize, height: beadSize, backgroundCount: bgCount });
    store.setColorCounts(counts);
    store.pushHistory();
    store.setIsProcessing(false);
    setStatus('');
  }, [store]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  }, [processImage]);

  const handleExportPNG = useCallback(async () => {
    const blob = await exportPNG(store.beads, store.beadW, store.beadH, getPalette(store.brand), { showGrid: true, showLabels: true });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bead-pattern.png';
    a.click();
    URL.revokeObjectURL(url);
  }, [store.beads, store.beadW, store.beadH, store.brand]);

  const handleExportJSON = useCallback(() => {
    const json = exportJSON(store.beads, store.beadW, store.beadH);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bead-project.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [store.beads, store.beadW, store.beadH]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Toolbar
        onUpload={() => fileRef.current?.click()}
        onUndo={store.undo}
        onRedo={store.redo}
        canUndo={store.historyIndex > 0}
        canRedo={store.historyIndex < store.history.length - 1}
      />
      <div style={{ flex: 1, position: 'relative', background: 'var(--bg)' }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
        {store.imageUrl ? (
          <BeadCanvas />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>🎨</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>拖入图片或点击上传开始创作</p>
            <button onClick={() => fileRef.current?.click()} style={{ padding: '10px 24px', background: 'var(--primary)', color: '#fff', borderRadius: 8, fontSize: 14 }}>
              上传图片
            </button>
          </div>
        )}
        {store.isProcessing && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, color: '#fff' }}>{status || '处理中...'}</p>
            </div>
          </div>
        )}
      </div>
      <div style={{ width: 260, background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <SettingsPanel />
        <ColorList onExportPNG={handleExportPNG} onExportJSON={handleExportJSON} />
        <ExportPanel onExportPNG={handleExportPNG} onExportJSON={handleExportJSON} />
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
EOF

# components/canvas/BeadCanvas.tsx
cat > "$BASE/components/canvas/BeadCanvas.tsx" << 'EOF'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Circle } from 'react-konva';
import Konva from 'konva';
import { useBeadStore } from '../../store/useBeadStore';
import { getPalette } from '../../palette/colors';

const BEAD_RADIUS = 10;
const BEAD_GAP = 2;
const CELL_SIZE = BEAD_RADIUS * 2 + BEAD_GAP;

export function BeadCanvas() {
  const store = useBeadStore();
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const resize = () => {
      const el = document.getElementById('canvas-container');
      if (el) setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const { beadW, beadH, beads, tool, selectedColor, brand } = store;
  const palette = useMemo(() => getPalette(brand), [brand]);

  const codeMap = useMemo(() => {
    const m = new Map<string, string>();
    palette.forEach(c => m.set(c.hex.toUpperCase(), c.code));
    return m;
  }, [palette]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const newScale = Math.max(0.2, Math.min(3, scale - e.evt.deltaY * 0.001));
    setScale(newScale);
  }, [scale]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      setDragging(true);
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const point = stage.getPointerPosition();
    if (!point) return;
    const x = Math.floor((point.x - pos.x) / (CELL_SIZE * scale));
    const y = Math.floor((point.y - pos.y) / (CELL_SIZE * scale));
    if (x >= 0 && x < beadW && y >= 0 && y < beadH) {
      if (tool === 'eraser') {
        store.setPixel(x, y, null);
      } else if (tool === 'pen' && selectedColor) {
        store.setPixel(x, y, selectedColor);
      }
    }
  }, [tool, selectedColor, pos, scale, beadW, beadH, store]);

  const beadCircles = useMemo(() => {
    const circles: Array<{ x: number; y: number; color: string; code: string }> = [];
    beads.forEach((hex, key) => {
      const [x, y] = key.split(',').map(Number);
      const code = codeMap.get(hex.toUpperCase()) || '';
      circles.push({
        x: x * CELL_SIZE + BEAD_RADIUS + BEAD_GAP,
        y: y * CELL_SIZE + BEAD_RADIUS + BEAD_GAP,
        color: hex,
        code,
      });
    });
    return circles;
  }, [beads, codeMap]);

  const totalW = beadW * CELL_SIZE + BEAD_GAP;
  const totalH = beadH * CELL_SIZE + BEAD_GAP;

  return (
    <div id="canvas-container" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <Stage
        ref={stageRef}
        width={containerSize.w}
        height={containerSize.h}
        scaleX={scale}
        scaleY={scale}
        x={pos.x}
        y={pos.y}
        draggable={tool === 'select'}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <Layer>
          {beadCircles.map((b, i) => (
            <Circle
              key={i}
              x={b.x}
              y={b.y}
              radius={BEAD_RADIUS}
              fill={b.color}
              stroke="rgba(0,0,0,0.12)"
              strokeWidth={0.5}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
              listening={false}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
EOF

echo "canvas comps done"

# components/toolbar/Toolbar.tsx
cat > "$BASE/components/toolbar/Toolbar.tsx" << 'EOF'
import { useBeadStore } from '../../store/useBeadStore';

interface Props {
  onUpload: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({ onUpload, onUndo, onRedo, canUndo, canRedo }: Props) {
  const store = useBeadStore();
  const tools = [
    { type: 'pen' as const, label: '画笔' },
    { type: 'eraser' as const, label: '橡皮' },
    { type: 'select' as const, label: '拖拽' },
  ];

  return (
    <div style={{ width: 48, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: 4 }}>
      <button onClick={onUpload} title="上传图片" style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--primary)', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      <div style={{ height: 1, width: 28, background: 'var(--border)', margin: '4px 0' }} />
      {tools.map(t => (
        <button key={t.type} onClick={() => store.setTool(t.type)} title={t.label} style={{
          width: 36, height: 36, borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: store.tool === t.type ? 'var(--primary)' : 'transparent',
          color: store.tool === t.type ? '#fff' : 'var(--text-secondary)',
        }}>{t.label[0]}</button>
      ))}
      <div style={{ height: 1, width: 28, background: 'var(--border)', margin: '4px 0' }} />
      <button onClick={onUndo} disabled={!canUndo} title="撤销" style={{ width: 36, height: 36, borderRadius: 6, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: canUndo ? 'var(--text)' : 'var(--text-muted)' }}>↩</button>
      <button onClick={onRedo} disabled={!canRedo} title="重做" style={{ width: 36, height: 36, borderRadius: 6, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: canRedo ? 'var(--text)' : 'var(--text-muted)' }}>↪</button>
    </div>
  );
}
EOF

# components/panels/SettingsPanel.tsx
cat > "$BASE/components/panels/SettingsPanel.tsx" << 'EOF'
import { useBeadStore } from '../../store/useBeadStore';
import { brands } from '../../palette/colors';
import type { BeadSize } from '../../types';

export function SettingsPanel() {
  const store = useBeadStore();
  const sizes: BeadSize[] = [32, 64, 128];

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>设置</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>品牌</label>
          <select value={store.brand} onChange={e => store.setBrand(e.target.value)}
            style={{ width: '100%', padding: '6px 8px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}>
            {Object.entries(brands).map(([key, b]) => <option key={key} value={key}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>豆数</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {sizes.map(s => (
              <button key={s} onClick={() => store.setBeadSize(s)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)',
                  background: store.beadSize === s ? 'var(--primary)' : 'transparent',
                  color: store.beadSize === s ? '#fff' : 'var(--text-secondary)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>抖动</span>
          <button onClick={() => store.setDithering(!store.dithering)}
            style={{ width: 36, height: 20, borderRadius: 10, position: 'relative',
              background: store.dithering ? 'var(--primary)' : 'var(--border)' }}>
            <span style={{ position: 'absolute', top: 2, left: store.dithering ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>去背景</span>
          <button onClick={() => store.setRemoveBackground(!store.removeBackground)}
            style={{ width: 36, height: 20, borderRadius: 10, position: 'relative',
              background: store.removeBackground ? 'var(--primary)' : 'var(--border)' }}>
            <span style={{ position: 'absolute', top: 2, left: store.removeBackground ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
EOF

# components/panels/ColorList.tsx
cat > "$BASE/components/panels/ColorList.tsx" << 'EOF'
import { useBeadStore } from '../../store/useBeadStore';

interface Props {
  onExportPNG: () => void;
  onExportJSON: () => void;
}

export function ColorList({ onExportPNG, onExportJSON }: Props) {
  const store = useBeadStore();
  const { colorCounts, selectedColor } = store;

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
        色卡清单 ({colorCounts.length}色)
      </h3>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {colorCounts.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>上传图片后自动生成</p>
        ) : (
          colorCounts.slice(0, 30).map(c => (
            <div key={c.hex}
              onClick={() => store.setSelectedColor(c.hex)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', borderRadius: 4, cursor: 'pointer',
                background: selectedColor === c.hex ? 'var(--bg-card)' : 'transparent' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: c.hex, border: '1px solid var(--border)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', flex: 1 }}>{c.code} {c.name}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>×{c.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
EOF

# components/panels/ExportPanel.tsx
cat > "$BASE/components/panels/ExportPanel.tsx" << 'EOF'
interface Props {
  onExportPNG: () => void;
  onExportJSON: () => void;
}

export function ExportPanel({ onExportPNG, onExportJSON }: Props) {
  return (
    <div style={{ padding: 12, marginTop: 'auto' }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>导出</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={onExportPNG} style={{ padding: '8px 0', background: 'var(--primary)', color: '#fff', borderRadius: 6, fontSize: 12 }}>
          导出 PNG 图纸
        </button>
        <button onClick={onExportJSON} style={{ padding: '8px 0', background: 'var(--bg-card)', color: 'var(--text)', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)' }}>
          导出 JSON 工程
        </button>
      </div>
    </div>
  );
}
EOF

echo "all components done"