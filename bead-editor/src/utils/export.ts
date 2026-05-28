import type { ExportConfig } from '../types';

export async function exportPNG(
  canvasEl: HTMLCanvasElement,
  _config: ExportConfig
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvasEl.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to export PNG'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJSON(
  beads: Map<string, string>,
  width: number,
  height: number,
  brand: string,
  beadSize: number
): Blob {
  const beadArray: Array<{ x: number; y: number; color: string }> = [];
  beads.forEach((color, key) => {
    const [x, y] = key.split(',').map(Number);
    beadArray.push({ x, y, color });
  });

  const project = {
    version: '1.0.0',
    brand,
    beadSize,
    width,
    height,
    beads: beadArray,
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(project, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export async function exportCanvasSnapshot(
  appEl: HTMLElement
): Promise<Blob> {
  const canvas = appEl.querySelector('canvas');
  if (!canvas) throw new Error('No canvas found');

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to capture canvas'));
    }, 'image/png');
  });
}

export function exportPatternPDF(
  beads: Map<string, string>,
  beadW: number,
  beadH: number,
  colorCounts: Array<{ code: string; name: string; hex: string; count: number }>,
  title: string
): void {
  const CELL = 12;
  const MARGIN = 40;
  const HEADER_H = 60;
  const FOOTER_H = 80;
  const PAGE_W = Math.max(600, beadW * CELL + MARGIN * 2);
  const PAGE_H = beadH * CELL + MARGIN * 2 + HEADER_H + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(title, MARGIN, 30);

  ctx.fillStyle = '#6b7280';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    `${beadW}x${beadH} / ${colorCounts.length}色 / ${colorCounts.reduce((s, c) => s + c.count, 0)}颗`,
    MARGIN,
    52
  );

  const offsetX = (PAGE_W - beadW * CELL) / 2;
  const offsetY = HEADER_H + MARGIN;

  for (let y = 0; y <= beadH; y++) {
    ctx.strokeStyle = y % 5 === 0 ? '#b0b0b0' : '#e0e0e0';
    ctx.lineWidth = y % 5 === 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + y * CELL);
    ctx.lineTo(offsetX + beadW * CELL, offsetY + y * CELL);
    ctx.stroke();
  }
  for (let x = 0; x <= beadW; x++) {
    ctx.strokeStyle = x % 5 === 0 ? '#b0b0b0' : '#e0e0e0';
    ctx.lineWidth = x % 5 === 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(offsetX + x * CELL, offsetY);
    ctx.lineTo(offsetX + x * CELL, offsetY + beadH * CELL);
    ctx.stroke();
  }

  beads.forEach((hex, key) => {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = hex;
    ctx.fillRect(offsetX + x * CELL + 1, offsetY + y * CELL + 1, CELL - 2, CELL - 2);
  });

  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  beads.forEach((hex, key) => {
    const [x, y] = key.split(',').map(Number);
    const code = colorCounts.find((c) => c.hex === hex)?.code || '';
    if (code) {
      ctx.fillStyle = hex === '#000000' ? '#fff' : '#000';
      ctx.fillText(code, offsetX + x * CELL + CELL / 2, offsetY + y * CELL + CELL / 2);
    }
  });

  const labelY = offsetY + beadH * CELL + 20;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#1a1a2e';
  ctx.fillText('颜色用量统计', MARGIN, labelY);

  let lx = MARGIN;
  let ly = labelY + 20;
  colorCounts.forEach((c) => {
    if (lx > PAGE_W - MARGIN - 80) {
      lx = MARGIN;
      ly += 22;
    }
    ctx.fillStyle = c.hex;
    ctx.fillRect(lx, ly - 10, 14, 14);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(lx, ly - 10, 14, 14);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = '9px monospace';
    ctx.fillText(`${c.code} ${c.count}`, lx + 18, ly + 2);
    lx += 80;
  });

  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, `${title.replace(/\s+/g, '_')}_pattern.png`);
    }
  }, 'image/png');
}
