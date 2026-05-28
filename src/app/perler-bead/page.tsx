'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  Download, Upload, Trash2, Grid3X3, Palette, Info,
  ImageIcon, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TopHeader from '@/components/TopHeader';
import { brandPalettes, defaultBrand } from '@/lib/colorData';
import { removeImageBackground, initBackgroundRemoval } from '@/lib/backgroundRemoval';
import { pixelate, imageDataToRgbPixels } from '@/lib/bead/pixelate';
import { nearestColor, clearColorCache } from '@/lib/bead/colorMatch';
import type { BeadColor } from '@/lib/bead/types';

const BOARD_SIZE = 29;
const BOARD_SIZES = [
  { label: '1×1 豆板', w: 29, h: 29, desc: '29×29' },
  { label: '2×2 豆板', w: 58, h: 58, desc: '58×58' },
  { label: '3×3 豆板', w: 87, h: 87, desc: '87×87' },
  { label: '4×4 豆板', w: 116, h: 116, desc: '116×116' },
];

interface ColorStat {
  code: string;
  name: string;
  hex: string;
  count: number;
  percentage: number;
}

export default function PerlerBeadPage() {
  return <PerlerBeadContent />;
}

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

function PerlerBeadContent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);
  const exportDataRef = useRef<{ beadMap: Map<string, string>; paletteColors: { code: string; hex: string }[]; bw: number; bh: number } | null>(null);
  const handleGenerateRef = useRef<() => void>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [brand, setBrand] = useState(defaultBrand);
  const [boardIndex, setBoardIndex] = useState(0);
  const [removeBg, setRemoveBg] = useState(false);
  const [useDithering, setUseDithering] = useState(true);
  const [beadShape, setBeadShape] = useState<'circle' | 'square'>('square');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');
  const [colorStats, setColorStats] = useState<ColorStat[]>([]);
  const [totalBeads, setTotalBeads] = useState(0);
  const [beadW, setBeadW] = useState(0);
  const [beadH, setBeadH] = useState(0);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [renderVersion, setRenderVersion] = useState(0);

  const board = BOARD_SIZES[boardIndex];
  const palette = brandPalettes[brand] || brandPalettes[defaultBrand];

  useEffect(() => {
    initBackgroundRemoval().catch(() => {});
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      e.target.value = '';
    },
    [],
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setError(null);
    setHasGenerated(false);
    setColorStats([]);
    setTotalBeads(0);

    if (!file.type.startsWith('image/')) {
      setError('请上传 PNG / JPG / WebP 格式的图片');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('图片大小不能超过 50MB');
      return;
    }

    setIsUploading(true);
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('图片加载失败'));
        image.src = url;
      });

      setImageUrl(url);
      setOrigW(img.width);
      setOrigH(img.height);
      setStatusText(`已上传 ${img.width}×${img.height}`);
      setTimeout(() => handleGenerateRef.current?.(), 0);
    } catch (err: any) {
      setError(err?.message || '上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!imageUrl) return;

    setIsProcessing(true);
    setError(null);
    setHasGenerated(false);
    setColorStats([]);
    setTotalBeads(0);
    clearColorCache();

    const maxDim = board.w;

    try {
      console.log('[perler] step1: loading image...');
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`图片加载失败: ${imageUrl.substring(0, 60)}`));
        image.src = imageUrl;
      });
      console.log('[perler] step1: image loaded', img.width, img.height);

      setStatusText('处理图片...');
      let workingData: ImageData;
      const srcCanvas = document.createElement('canvas');

      if (removeBg) {
        try {
          console.log('[perler] step2: AI background removal...');
          const aiResult = await removeImageBackground(imageUrl);
          if (aiResult) {
            console.log('[perler] step2: AI result received, size:', aiResult.size);
            const aiUrl = URL.createObjectURL(aiResult);
            const aiImg = await new Promise<HTMLImageElement>((res, rej) => {
              const ri = new Image();
              ri.onload = () => res(ri);
              ri.onerror = () => rej(new Error('AI抠图结果加载失败'));
              ri.src = aiUrl;
            });
            URL.revokeObjectURL(aiUrl);

            srcCanvas.width = aiImg.width;
            srcCanvas.height = aiImg.height;
            const ctx = srcCanvas.getContext('2d')!;
            ctx.drawImage(aiImg, 0, 0);
            workingData = ctx.getImageData(0, 0, aiImg.width, aiImg.height);
            console.log('[perler] step2: AI processing done, data length:', workingData.data.length);
            setStatusText('AI 抠图完成');
          } else {
            throw new Error('AI 抠图失败');
          }
        } catch {
          console.log('[perler] step2: AI failed, falling back to original');
          setStatusText('抠图失败，使用原图');
          srcCanvas.width = img.width;
          srcCanvas.height = img.height;
          const ctx = srcCanvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          workingData = ctx.getImageData(0, 0, img.width, img.height);
        }
      } else {
        console.log('[perler] step2: skipping AI, using original');
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        const ctx = srcCanvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        workingData = ctx.getImageData(0, 0, img.width, img.height);
      }

      const imgW = workingData.width;
      const imgH = workingData.height;
      let bw: number, bh: number;
      if (imgW >= imgH) {
        bw = maxDim;
        bh = Math.max(1, Math.round(maxDim * imgH / imgW));
      } else {
        bh = maxDim;
        bw = Math.max(1, Math.round(maxDim * imgW / imgH));
      }

      console.log('[perler] step3: pixelating...', workingData.width, workingData.height, '->', bw, bh);
      setStatusText('像素化处理...');
      const pixelated = pixelate(workingData, bw, bh);
      console.log('[perler] step3: pixelated done, size:', pixelated.width, pixelated.height);

      const alphaValues = new Uint8Array(bw * bh);
      for (let i = 0; i < bw * bh; i++) {
        alphaValues[i] = pixelated.data[i * 4 + 3];
      }

// step4: convert to float pixels
      const floatPixels = imageDataToRgbPixels(pixelated);

      const parsedBeadColors: BeadColor[] = palette.colors.map((c) => {
        const hexStr = c.hex.replace('#', '');
        return {
          code: c.code,
          name: c.name,
          hex: c.hex,
          rgb: [
            parseInt(hexStr.substring(0, 2), 16),
            parseInt(hexStr.substring(2, 4), 16),
            parseInt(hexStr.substring(4, 6), 16),
          ] as [number, number, number],
        };
      });
      console.log('[perler] step5: color matching...');
      setStatusText('颜色匹配中...');

      let blackEntry = parsedBeadColors[0];
      let blackL = Infinity;
      for (const c of parsedBeadColors) {
        const lum = 0.2126 * c.rgb[0] + 0.7152 * c.rgb[1] + 0.0722 * c.rgb[2];
        if (lum < blackL) { blackL = lum; blackEntry = c; }
      }
      const DARK_THRESHOLD = 50;

      const beadMap = new Map<string, string>();
      const countMap = new Map<string, number>();
      let bgCount = 0;

      if (useDithering) {
        console.log('[perler] step5: Floyd-Steinberg quantization dithering...');
        const errors = new Float32Array(bw * bh * 3);
        for (let y = 0; y < bh; y++) {
          for (let x = 0; x < bw; x++) {
            const pi = y * bw + x;
            if (alphaValues[pi] < 10) continue;
            const idx = pi * 3;
            for (let c = 0; c < 3; c++) {
              const old = floatPixels[idx + c] + errors[idx + c];
              const nr = Math.min(255, Math.max(0, Math.round(old)));
              const err = old - nr;
              floatPixels[idx + c] = nr;
              if (x + 1 < bw && alphaValues[pi + 1] >= 10) {
                errors[(pi + 1) * 3 + c] += err * 7 / 16;
              }
              if (y + 1 < bh) {
                if (x > 0 && alphaValues[pi + bw - 1] >= 10) {
                  errors[(pi + bw - 1) * 3 + c] += err * 3 / 16;
                }
                if (alphaValues[pi + bw] >= 10) {
                  errors[(pi + bw) * 3 + c] += err * 5 / 16;
                }
                if (x + 1 < bw && alphaValues[pi + bw + 1] >= 10) {
                  errors[(pi + bw + 1) * 3 + c] += err * 1 / 16;
                }
              }
            }
          }
        }
      }

      console.log('[perler] step5: color matching...');
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const pi = y * bw + x;
          if (alphaValues[pi] < 10) {
            bgCount++;
            continue;
          }
          const idx = pi * 3;
          const r = Math.round(Math.max(0, Math.min(255, floatPixels[idx])));
          const g = Math.round(Math.max(0, Math.min(255, floatPixels[idx + 1])));
          const b = Math.round(Math.max(0, Math.min(255, floatPixels[idx + 2])));
          let matched: BeadColor;
          if (Math.max(r, g, b) < DARK_THRESHOLD) {
            matched = blackEntry;
          } else {
            matched = nearestColor(r, g, b, parsedBeadColors);
          }
          beadMap.set(`${x},${y}`, matched.hex);
          countMap.set(matched.hex, (countMap.get(matched.hex) || 0) + 1);
        }
      }
      console.log('[perler] step5: matched', beadMap.size, 'beads, bg=', bgCount);

      setBeadW(bw);
      setBeadH(bh);

      const stats: ColorStat[] = [];
      countMap.forEach((count, hex) => {
        const c = palette.colors.find(
          (pc) => pc.hex.toUpperCase() === hex.toUpperCase()
        );
        if (c) {
          stats.push({
            code: c.code,
            name: c.name,
            hex: c.hex,
            count,
            percentage: 0,
          });
        }
      });
      stats.sort((a, b) => a.code.localeCompare(b.code));
      const total = stats.reduce((s, c) => s + c.count, 0);
      stats.forEach((s) => (s.percentage = total > 0 ? (s.count / total) * 100 : 0));

      setTotalBeads(total);
      setColorStats(stats);
      setRenderVersion(v => v + 1);

      console.log('[perler] step7: rendering preview...', bw, bh, 'beadMap:', beadMap.size);
      exportDataRef.current = { beadMap, paletteColors: palette.colors, bw, bh };

      setStatusText(`生成完成 · ${total} 颗豆 · ${stats.length} 种颜色`);
      setHasGenerated(true);
    } catch (err: any) {
      console.error('[perler] generate error:', err);
      console.error('[perler] error type:', typeof err, 'name:', err?.name, 'message:', err?.message);
      console.error('[perler] error stack:', err?.stack);
      setError(err?.message || String(err) || '生成失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, board, removeBg, useDithering, brand, palette]);
  handleGenerateRef.current = handleGenerate;

  useEffect(() => {
    if (imageUrl) {
      handleGenerate();
    }
  }, [removeBg, useDithering, brand, boardIndex]);

  useEffect(() => {
    const data = exportDataRef.current;
    if (data) {
      renderPreview(data.bw, data.bh, data.beadMap, [], data.paletteColors, beadShape);
    }
  }, [beadShape, renderVersion]);

  const renderPreview = useCallback(
    (
      w: number, h: number,
      beadMap: Map<string, string>,
      _parsedBeadColors: BeadColor[],
      paletteColors: { code: string; hex: string }[],
      shape: 'circle' | 'square' = 'square',
    ) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;

      const cellSize = Math.min(24, Math.floor(700 / Math.max(w, h)));
      const margin = cellSize >= 12 ? 24 : 12;
      const totalW = w * cellSize + margin * 2;
      const canvasH = h * cellSize + margin * 2;

      canvas.width = totalW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#f5f5f7';
      ctx.fillRect(0, 0, totalW, canvasH);

      for (let gy = 0; gy < h; gy += 20) {
        for (let gx = 0; gx < w; gx += 20) {
          if ((gx / 20 + gy / 20) % 2 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.015)';
            ctx.fillRect(margin + gx * cellSize, margin + gy * cellSize, Math.min(20, w - gx) * cellSize, Math.min(20, h - gy) * cellSize);
          }
        }
      }

      const blockPadding = cellSize * 0.07;
      const blockSize = cellSize - blockPadding * 2;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cx = margin + x * cellSize + cellSize / 2;
          const cy = margin + y * cellSize + cellSize / 2;
          const hex = beadMap.get(`${x},${y}`);

          if (hex) {
            if (shape === 'square') {
              ctx.fillStyle = hex;
              ctx.fillRect(margin + x * cellSize + blockPadding, margin + y * cellSize + blockPadding, blockSize, blockSize);
            } else {
              ctx.beginPath();
              ctx.arc(cx, cy, blockSize / 2, 0, Math.PI * 2);
              ctx.fillStyle = hex;
              ctx.fill();
            }
          }
        }
      }

      if (cellSize >= 12) {
        ctx.font = `${Math.max(8, cellSize * 0.42)}px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c0c0c8';
        for (let x = 0; x < w; x += 5) {
          ctx.fillText(`${x}`, margin + x * cellSize + cellSize / 2, margin / 2);
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let y = 0; y < h; y += 5) {
          ctx.fillText(`${y}`, margin / 2 - 3, margin + y * cellSize + cellSize / 2);
        }
      }

      for (let y = 0; y <= h; y++) {
        const yy = margin + y * cellSize;
        const isMajor = y % 20 === 0;
        const isMinor = y % 5 === 0;
        if (!isMajor && !isMinor) continue;
        ctx.strokeStyle = isMajor ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.05)';
        ctx.lineWidth = isMajor ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(margin, yy);
        ctx.lineTo(margin + w * cellSize, yy);
        ctx.stroke();
      }
      for (let x = 0; x <= w; x++) {
        const xx = margin + x * cellSize;
        const isMajor = x % 20 === 0;
        const isMinor = x % 5 === 0;
        if (!isMajor && !isMinor) continue;
        ctx.strokeStyle = isMajor ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.05)';
        ctx.lineWidth = isMajor ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(xx, margin);
        ctx.lineTo(xx, margin + h * cellSize);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(margin, margin, w * cellSize, h * cellSize);
    },
    [],
  );

  const handleExportPNG = useCallback(() => {
    const exportData = exportDataRef.current;
    if (!exportData) return;
    const { beadMap, paletteColors } = exportData;
    const w = beadW;
    const h = beadH;

    const expCellSize = 24;
    const expTotalW = w * expCellSize;
    const expGridH = h * expCellSize;
    const expPad = 16;

    const hexToCode = new Map<string, string>();
    for (const c of paletteColors) {
      hexToCode.set(c.hex.toUpperCase(), c.code);
    }

    const countMap = new Map<string, number>();
    for (const hex of beadMap.values()) {
      countMap.set(hex, (countMap.get(hex) || 0) + 1);
    }
    const legendItems: { code: string; hex: string; count: number }[] = [];
    countMap.forEach((count, hex) => {
      const code = hexToCode.get(hex.toUpperCase()) || '';
      legendItems.push({ code, hex, count });
    });
    legendItems.sort((a, b) => a.code.localeCompare(b.code));

    const itemsPerRow = expTotalW > 750 ? 5 : 4;
    const capsuleGap = 8;
    const capsuleH = 28;
    const capsuleW = Math.floor((expTotalW - expPad * 2 - (itemsPerRow - 1) * capsuleGap) / itemsPerRow);
    const capsuleR = 6;
    const codePartW = Math.floor(capsuleW * 0.45);
    const countPartW = capsuleW - codePartW;
    const legendRows = Math.ceil(legendItems.length / itemsPerRow);
    const legendTitleH = 28;
    const legendPadY = 14;
    const legendH = legendItems.length > 0 ? legendPadY + legendTitleH + legendPadY + legendRows * (capsuleH + 6) + legendPadY : 0;
    const expTotalH = expGridH + legendH;

    const canvas = document.createElement('canvas');
    canvas.width = expTotalW;
    canvas.height = expTotalH;
    const ctx = canvas.getContext('2d')!;

    const bgColor = '#e8e8ed';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, expTotalW, expTotalH);

    for (let y = 0; y <= h; y++) {
      const yy = y * expCellSize;
      if (y % 20 === 0) {
        ctx.strokeStyle = '#aaaaaf';
        ctx.lineWidth = 1.2;
      } else if (y % 5 === 0) {
        ctx.strokeStyle = '#cdcdd5';
        ctx.lineWidth = 0.6;
      } else {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(expTotalW, yy);
      ctx.stroke();
    }
    for (let x = 0; x <= w; x++) {
      const xx = x * expCellSize;
      if (x % 20 === 0) {
        ctx.strokeStyle = '#aaaaaf';
        ctx.lineWidth = 1.2;
      } else if (x % 5 === 0) {
        ctx.strokeStyle = '#cdcdd5';
        ctx.lineWidth = 0.6;
      } else {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(xx, 0);
      ctx.lineTo(xx, expGridH);
      ctx.stroke();
    }

    const expBlockPadding = expCellSize * 0.05;
    const expBlockSize = expCellSize - expBlockPadding * 2;

    function expTextColor(hex: string): string {
      const rr = parseInt(hex.slice(1, 3), 16);
      const gg = parseInt(hex.slice(3, 5), 16);
      const bb = parseInt(hex.slice(5, 7), 16);
      return (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255 > 0.55 ? '#333' : '#fff';
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cx = x * expCellSize + expCellSize / 2;
        const cy = y * expCellSize + expCellSize / 2;
        const hex = beadMap.get(`${x},${y}`);
        const code = hex ? hexToCode.get(hex.toUpperCase()) : undefined;

        if (hex) {
          if (beadShape === 'square') {
            ctx.fillStyle = hex;
            ctx.fillRect(x * expCellSize + expBlockPadding, y * expCellSize + expBlockPadding, expBlockSize, expBlockSize);
          } else {
            ctx.beginPath();
            ctx.arc(cx, cy, expBlockSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = hex;
            ctx.fill();
          }

          if (code) {
            ctx.fillStyle = expTextColor(hex);
            ctx.font = `bold ${Math.max(8, expCellSize * 0.36)}px -apple-system, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(code, cx, cy);
          }
        }
      }
    }

    if (legendItems.length > 0) {
      const topY = expGridH + legendPadY;
      ctx.fillStyle = '#bbb';
      ctx.fillRect(0, expGridH, expTotalW, 1);

      ctx.fillStyle = '#333';
      ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const total = legendItems.reduce((s, i) => s + i.count, 0);
      ctx.fillText(`总计: ${total} 颗 | ${legendItems.length} 种颜色`, expPad, topY);

      legendItems.forEach((item, i) => {
        const col = i % itemsPerRow;
        const row = Math.floor(i / itemsPerRow);
        const cx = expPad + col * (capsuleW + capsuleGap);
        const cy = topY + legendTitleH + legendPadY + row * (capsuleH + 6);

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(cx + capsuleR, cy);
        ctx.lineTo(cx + capsuleW - capsuleR, cy);
        ctx.arcTo(cx + capsuleW, cy, cx + capsuleW, cy + capsuleR, capsuleR);
        ctx.lineTo(cx + capsuleW, cy + capsuleH - capsuleR);
        ctx.arcTo(cx + capsuleW, cy + capsuleH, cx + capsuleW - capsuleR, cy + capsuleH, capsuleR);
        ctx.lineTo(cx + capsuleR, cy + capsuleH);
        ctx.arcTo(cx, cy + capsuleH, cx, cy + capsuleH - capsuleR, capsuleR);
        ctx.lineTo(cx, cy + capsuleR);
        ctx.arcTo(cx, cy, cx + capsuleR, cy, capsuleR);
        ctx.closePath();
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx + capsuleR, cy);
        ctx.lineTo(cx + codePartW, cy);
        ctx.lineTo(cx + codePartW, cy + capsuleH);
        ctx.lineTo(cx + capsuleR, cy + capsuleH);
        ctx.arcTo(cx, cy + capsuleH, cx, cy + capsuleH - capsuleR, capsuleR);
        ctx.lineTo(cx, cy + capsuleR);
        ctx.arcTo(cx, cy, cx + capsuleR, cy, capsuleR);
        ctx.closePath();
        ctx.fillStyle = item.hex;
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = expTextColor(item.hex);
        ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.code, cx + codePartW / 2, cy + capsuleH / 2);

        ctx.fillStyle = '#444';
        ctx.font = '11px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`×${item.count}`, cx + codePartW + countPartW / 2, cy + capsuleH / 2);
      });
    }

    const link = document.createElement('a');
    link.download = `perler-bead-${w}x${h}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [beadW, beadH, beadShape]);

  const handleReset = useCallback(() => {
    setImageUrl(null);
    setHasGenerated(false);
    setError(null);
    setColorStats([]);
    setTotalBeads(0);
    setStatusText('');
  }, []);

  const paletteOptions = useMemo(
    () => Object.entries(brandPalettes).map(([key, val]) => ({
      value: key,
      label: `${val.label} (${val.colors.length}色)`,
    })),
    [],
  );

  const capsuleTextColor = (hex: string) => {
    const rr = parseInt(hex.slice(1, 3), 16);
    const gg = parseInt(hex.slice(3, 5), 16);
    const bb = parseInt(hex.slice(5, 7), 16);
    return (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255 > 0.5 ? '#333' : '#fff';
  };

  return (
    <div className="h-screen gradient-bg flex flex-col overflow-hidden">
      <TopHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* ========== 左侧边栏：原图预览 + 色卡统计 ========== */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r flex flex-col" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
          {/* 原图预览 */}
          {imageUrl && (
            <div className="p-4 pb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>原图预览</span>
              <div className="mt-1.5 rounded-xl overflow-hidden border flex items-center justify-center" style={{ borderColor: 'var(--input-border)', aspectRatio: '1/1', backgroundColor: '#f0f0f0' }}>
                <img
                  src={imageUrl}
                  alt="原图"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* 色卡统计面板 */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Info className="w-4 h-4" />
                  色卡统计
                </h3>
                {totalBeads > 0 && (
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    {totalBeads} 颗 · {colorStats.length} 色
                  </span>
                )}
              </div>
            </div>

            {colorStats.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-5">
                <div className="text-center space-y-2">
                  <ImageIcon className="w-8 h-8 mx-auto" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    上传图片并生成图纸后<br />将显示颜色统计
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-3 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  {colorStats.map((stat) => (
                    <div
                      key={stat.code}
                      className="group flex rounded-full overflow-hidden text-[10px] h-6 cursor-default"
                      style={{
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                      title={`${stat.name} · ${stat.percentage.toFixed(1)}%`}
                    >
                      <div
                        className="flex items-center justify-center font-bold flex-1"
                        style={{ backgroundColor: stat.hex, color: capsuleTextColor(stat.hex) }}
                      >
                        {stat.code}
                      </div>
                      <div
                        className="flex items-center justify-center font-bold tabular-nums flex-1"
                        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                      >
                        {stat.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========== 中间：上传 + 预览画布 ========== */}
        <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
          {/* 上传区域 */}
          <AnimatePresence mode="wait">
            {!imageUrl ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex items-center justify-center"
              >
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-[420px] max-w-[90%] h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:scale-[1.01]"
                  style={{
                    borderColor: error ? 'var(--danger)' : 'var(--input-border)',
                    backgroundColor: 'var(--card-bg)',
                  }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--primary)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                        正在读取图片...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
                        <Upload className="w-7 h-7" style={{ color: 'var(--primary)' }} />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          拖拽图片到此处，或点击上传
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          支持 PNG / JPG / WebP · 最大 50MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col gap-3 min-h-0"
              >
                {/* 操作栏 */}
                <div className="flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={() => fileInputRef.current?.click()}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      transition={springFast}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium"
                      style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      更换图片
                    </motion.button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    <motion.button
                      onClick={handleGenerate}
                      disabled={isProcessing}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      transition={springFast}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      {isProcessing ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />处理中...</>
                      ) : (
                        <><Grid3X3 className="w-3.5 h-3.5" />生成图纸</>
                      )}
                    </motion.button>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasGenerated && (
                      <motion.button
                        onClick={handleExportPNG}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        transition={springFast}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        导出 PNG
                      </motion.button>
                    )}
                    <motion.button
                      onClick={handleReset}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      transition={springFast}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                      style={{ backgroundColor: 'var(--card-bg)', color: 'var(--danger)', border: '1px solid var(--border-color)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      清空
                    </motion.button>
                  </div>
                </div>

                {/* 状态提示 */}
                {statusText && (
                  <div className="flex items-center gap-2 text-xs flex-shrink-0" style={{ color: hasGenerated ? '#34c759' : 'var(--text-muted)' }}>
                    {hasGenerated && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {statusText}
                  </div>
                )}

                {/* 错误提示 */}
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0" style={{ backgroundColor: 'rgba(255,59,48,0.08)', color: 'var(--danger)' }}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </div>
                )}

                {/* 预览画布 */}
                {hasGenerated ? (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-2">
                    <div
                      className="rounded-2xl p-4 flex items-center justify-center shadow-sm"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        backgroundImage: `
                          linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%),
                          linear-gradient(-45deg, rgba(0,0,0,0.03) 25%, transparent 25%),
                          linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.03) 75%),
                          linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.03) 75%)
                        `,
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                      }}
                    >
                      <canvas ref={previewCanvasRef} className="rounded-lg" style={{ imageRendering: 'pixelated', backgroundColor: '#f5f5f7', display: 'block' }} />
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {beadW} × {beadH} 豆 · {totalBeads} 颗 · {colorStats.length} 色
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto rounded-2xl flex items-center justify-center min-h-0" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <canvas ref={previewCanvasRef} className="rounded-lg" style={{ imageRendering: 'pixelated', display: 'block' }} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ========== 右侧边栏：图纸设置 ========== */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-l flex flex-col" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
          <div className="p-4 space-y-5">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Palette className="w-4 h-4" />
              图纸设置
            </h3>

            {/* 品牌选择 */}
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>拼豆品牌</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs border outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
              >
                {paletteOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 豆板尺寸 */}
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>豆板尺寸</label>
              <div className="grid grid-cols-4 gap-1.5">
                {BOARD_SIZES.map((bs, i) => (
                  <motion.button
                    key={bs.desc}
                    onClick={() => setBoardIndex(i)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={springFast}
                    className="py-2 rounded-xl text-xs font-medium"
                    style={{
                      backgroundColor: i === boardIndex ? 'var(--primary)' : 'var(--background)',
                      color: i === boardIndex ? '#fff' : 'var(--text-secondary)',
                      border: i === boardIndex ? 'none' : '1px solid var(--input-border)',
                    }}
                  >
                    <div className="text-[11px]">{bs.label}</div>
                    <div className="text-[10px] opacity-70">{bs.desc}</div>
                  </motion.button>
                ))}
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                单豆板 29×29，豆径 5mm
              </p>
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--border-color)' }} />

            {/* AI 去背景 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>AI 智能抠图</span>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>自动去除背景，保留主体</p>
              </div>
              <motion.button
                onClick={() => setRemoveBg(!removeBg)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                transition={springFast}
                className="relative w-9 h-5 rounded-full flex-shrink-0"
                style={{ backgroundColor: removeBg ? 'var(--primary)' : 'var(--input-border)' }}
              >
                <motion.span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                  animate={{ left: removeBg ? 18 : 2 }}
                  transition={springFast}
                />
              </motion.button>
            </div>

            {/* Floyd-Steinberg 抖动 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Floyd-Steinberg 抖动</span>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>优化渐变和边缘过渡</p>
              </div>
              <motion.button
                onClick={() => setUseDithering(!useDithering)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                transition={springFast}
                className="relative w-9 h-5 rounded-full flex-shrink-0"
                style={{ backgroundColor: useDithering ? 'var(--primary)' : 'var(--input-border)' }}
              >
                <motion.span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                  animate={{ left: useDithering ? 18 : 2 }}
                  transition={springFast}
                />
              </motion.button>
            </div>

            {/* 豆子形状 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>豆子形状</span>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>方形色块 / 圆形色块</p>
              </div>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--input-border)' }}>
                <motion.button
                  onClick={() => setBeadShape('square')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springFast}
                  className="px-3 py-1.5 text-xs font-medium"
                  style={{
                    backgroundColor: beadShape === 'square' ? 'var(--primary)' : 'var(--background)',
                    color: beadShape === 'square' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className="inline mr-1"><rect x="1" y="1" width="12" height="12" rx="1"/></svg>
                  方形
                </motion.button>
                <motion.button
                  onClick={() => setBeadShape('circle')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springFast}
                  className="px-3 py-1.5 text-xs font-medium"
                  style={{
                    backgroundColor: beadShape === 'circle' ? 'var(--primary)' : 'var(--background)',
                    color: beadShape === 'circle' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className="inline mr-1"><circle cx="7" cy="7" r="6"/></svg>
                  圆形
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}