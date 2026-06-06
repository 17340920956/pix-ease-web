/**
 * 拼豆图纸生成管线
 *
 * 将图片处理逻辑从 React 组件中分离，便于测试和复用。
 *
 * 管线步骤：
 *   1. AI 抠图（可选）→ alpha 掩码
 *   2. 图片复杂度分析
 *   3. 双边滤波 + 自适应增强（照片模式）
 *   4. 像素化降采样
 *   5. 超像素区域 CIEDE2000 匹配
 *   6. 后处理（中值滤波 + 相似色合并 + 孤立平滑 + 过渡色去除）
 */

import type { BeadColor } from './types';
import { removeImageBackground } from '@/lib/backgroundRemoval';
import { analyzeImageComplexity, type ImageAnalysis } from './analyze';
import { bilateralFilter } from './bilateralFilter';
import { autoEnhancePhoto, enhanceSaturation } from './enhance';
import { pixelateWithMask, type PixelateMode } from './pixelate';
import { superpixelMatch } from './superpixelMatch';
import { postprocessBeadMap } from './postprocess';
import { buildHexMap, clearColorCache } from './colorMatch';

export interface PipelineInput {
  imageUrl: string;
  maxDim: number;
  removeBg: boolean;
  palette: BeadColor[];
  transitionThreshold: number;
  onStatus?: (text: string) => void;
}

export interface PipelineResult {
  beadMap: Map<string, string>;
  bw: number;
  bh: number;
  paletteColors: BeadColor[];
  stats: { code: string; name: string; hex: string; count: number; percentage: number }[];
  totalBeads: number;
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { imageUrl, maxDim, removeBg, palette, transitionThreshold, onStatus } = input;
  const status = onStatus || (() => {});

  clearColorCache();

  // ── 1. 加载图片 ──
  const img = await loadImage(imageUrl);
  const imgW = img.width, imgH = img.height;

  let bw: number, bh: number;
  if (imgW >= imgH) {
    bw = maxDim; bh = Math.max(1, Math.round(maxDim * imgH / imgW));
  } else {
    bh = maxDim; bw = Math.max(1, Math.round(maxDim * imgW / imgH));
  }

  // ── 2. AI 抠图（可选）──
  let fullMask: Uint8Array | null = null;
  if (removeBg) {
    try {
      status('AI 抠图中...');
      fullMask = await getAlphaMask(imageUrl, imgW, imgH, status);
    } catch { status('抠图失败，使用原图'); }
  }

  // ── 3. 原图绘制 + 复杂度分析 ──
  const srcData = imageToData(img, imgW, imgH);
  status('分析图片...');
  const analysis = analyzeImageComplexity(srcData);

  // ── 4. 预处理（照片模式）──
  let processedData = srcData;
  if (analysis.isComplex) {
    status('预处理...');
    processedData = bilateralFilter(srcData, fullMask, { radius: 3, sigmaSpace: 3, sigmaColor: 40 });
    processedData = autoEnhancePhoto(processedData, fullMask);
    processedData = enhanceSaturation(processedData, fullMask, 1.1);
  }

  // ── 5. 像素化 ──
  status('像素化...');
  const mode: PixelateMode = analysis.isIllustration ? 'illustration' : analysis.isComplex ? 'photo' : 'simple';
  const pixelated = pixelateWithMask(processedData, bw, bh, fullMask, { mode });

  const alphaValues = new Uint8Array(bw * bh);
  for (let i = 0; i < bw * bh; i++) alphaValues[i] = pixelated.data[i * 4 + 3];

  // ── 6. 超像素区域匹配 ──
  status('颜色匹配...');
  const parsedColors = palette;
  const { beadMap: rawBeadMap } = superpixelMatch(
    pixelated, bw, bh, alphaValues, parsedColors,
    { quantizeLevels: 32, minRegionSize: 1 },
  );

  // ── 7. 后处理 ──
  status('优化...');
  const beadMap = postprocessBeadMap(rawBeadMap, parsedColors, bw, bh, {
    smoothIsolated: true,
    removeTransition: true,
    transitionThreshold,
    mergeSimilarNeighborhood: true,
    mergeColorThreshold: 12,
  });

  // ── 8. 统计 ──
  const countMap = new Map<string, number>();
  beadMap.forEach(hex => countMap.set(hex, (countMap.get(hex) || 0) + 1));

  const stats: PipelineResult['stats'] = [];
  const colorMap = buildHexMap(parsedColors);
  countMap.forEach((count, hex) => {
    if (count <= 0) return;
    const c = colorMap.get(hex.toUpperCase());
    if (c) stats.push({ code: c.code, name: c.name, hex: c.hex, count, percentage: 0 });
  });
  stats.sort((a, b) => a.code.localeCompare(b.code));
  const total = stats.reduce((s, c) => s + c.count, 0);
  stats.forEach(s => s.percentage = total > 0 ? (s.count / total) * 100 : 0);

  return { beadMap, bw, bh, paletteColors: parsedColors, stats, totalBeads: total };
}

// ── 工具函数 ──

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('img');
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('图片加载失败'));
    el.src = url;
  });
}

function imageToData(img: HTMLImageElement, w: number, h: number): ImageData {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, w, h);
}

async function getAlphaMask(imageUrl: string, w: number, h: number, status: (s: string) => void): Promise<Uint8Array | null> {
  const aiResult = await removeImageBackground(imageUrl, status);
  if (!aiResult) return null;
  const aiUrl = URL.createObjectURL(aiResult);
  const aiImg = await loadImage(aiUrl);
  URL.revokeObjectURL(aiUrl);

  const mc = document.createElement('canvas'); mc.width = w; mc.height = h;
  const mctx = mc.getContext('2d')!;
  mctx.drawImage(aiImg, 0, 0, w, h);
  const md = mctx.getImageData(0, 0, w, h);

  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = md.data[i * 4 + 3];
  return mask;
}
