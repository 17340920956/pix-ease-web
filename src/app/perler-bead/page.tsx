'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  Pipette, Pencil, ZoomIn, ZoomOut, RotateCcw, Undo2, Redo2,
  AlignVerticalJustifyCenter, AlignHorizontalJustifyCenter, Grid3X3,
  LayoutGrid, Eye, EyeOff, PaintBucket, Eraser, MousePointer2,
  Image, Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthGuard from '@/components/AuthGuard';
import TopHeader from '@/components/TopHeader';
import Tooltip from '@/components/Tooltip';
import { brandPalettes, defaultBrand } from '@/lib/colorData';
import { initBackgroundRemoval } from '@/lib/backgroundRemoval';
import { runPipeline } from '@/lib/bead/pipeline';
import { buildHexMap, clearColorCache, parseHexColor } from '@/lib/bead/colorMatch';
import type { BeadColor, BeadShape, QualityTier } from '@/lib/bead/types';

import UploadZone from './components/UploadZone';
import ActionBar from './components/ActionBar';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';

// ========================================================
// 常量
// ========================================================

const QUALITY_DIMS: Record<QualityTier, number> = {
  standard: 60,
  fine: 90,
  ultra: 120,
};

interface ColorStat {
  code: string;
  name: string;
  hex: string;
  count: number;
  percentage: number;
}

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

// ========================================================
// 工具栏按钮组件
// ========================================================

const ToolButton = ({
  active, onClick, children, label, disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
  disabled?: boolean;
}) => (
  <Tooltip text={label || ''}>
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      transition={springFast}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 disabled:pointer-events-none"
      style={{
        backgroundColor: active ? 'var(--primary)' : 'var(--card-bg)',
        color: active ? '#fff' : 'var(--text-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      {children}
    </motion.button>
  </Tooltip>
);

const IconButton = ({
  onClick, children, label, disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
  disabled?: boolean;
}) => (
  <Tooltip text={label || ''}>
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      transition={springFast}
      className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 disabled:pointer-events-none"
      style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
    >
      {children}
    </motion.button>
  </Tooltip>
);

// ========================================================
// Flood Fill 算法
// ========================================================

function floodFill(
  bm: Map<string, string>,
  startX: number,
  startY: number,
  targetColor: string,
  newColor: string,
  bw: number,
  bh: number,
) {
  const existing = bm.get(`${startX},${startY}`);
  if (existing !== targetColor) return;
  if (targetColor === newColor) return;

  const queue: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    if (x < 0 || x >= bw || y < 0 || y >= bh) continue;
    if (bm.get(key) !== targetColor) continue;
    visited.add(key);
    bm.set(key, newColor);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

// ========================================================
// 页面入口
// ========================================================

export default function PerlerBeadPage() {
  return (
    <AuthGuard allowGuest>
      <PerlerBeadContent />
    </AuthGuard>
  );
}

function PerlerBeadContent() {
  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const exportDataRef = useRef<{
    beadMap: Map<string, string>;
    paletteColors: BeadColor[];
    bw: number;
    bh: number;
  } | null>(null);
  const beadMapRef = useRef<Map<string, string>>(new Map());
  const originalBeadMapRef = useRef<Map<string, string> | null>(null);
  const brushRafRef = useRef<number>(0);
  const imageUrlRef = useRef<string | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const handleGenerateRef = useRef<() => void>(() => {});
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // --- State ---
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  // 保持 ref 与 state 同步，避免 useCallback 闭包问题
  useEffect(() => { imageUrlRef.current = imageUrl; }, [imageUrl]);
  const [brand, setBrand] = useState(defaultBrand);
  const [qualityTier, setQualityTier] = useState<QualityTier>('standard');
  const [customGridSize, setCustomGridSize] = useState<number | ''>('');
  const [removeBg, setRemoveBg] = useState(false);
  const [transitionColorThreshold, setTransitionColorThreshold] = useState<number | ''>(3);
  const [beadShape, setBeadShape] = useState<BeadShape>('square');
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

  // --- 画布交互 ---
  const [activeTool, setActiveTool] = useState<'brush' | 'picker' | 'fill' | 'eraser' | null>(null);
  const [brushColor, setBrushColor] = useState<string>('#212121');
  const [brushCode, setBrushCode] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [maxColorLimit, setMaxColorLimit] = useState<number | ''>('');
  const [historyState, setHistoryState] = useState<{ entries: Map<string, string>[]; index: number }>({ entries: [], index: -1 });

  // --- 对称模式 ---
  const [symmetryMode, setSymmetryMode] = useState<'none' | 'horizontal' | 'vertical' | 'four-way'>('none');

  // --- 辅助线 ---
  const [showCenterLines, setShowCenterLines] = useState(false);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);

  // --- 移动端面板控制 ---
  const [mobilePanel, setMobilePanel] = useState<'none' | 'left' | 'right'>('none');

  // --- 派生数据 ---
  const maxDim = customGridSize !== '' && customGridSize >= 1 ? Math.min(300, customGridSize) : QUALITY_DIMS[qualityTier];
  const palette = useMemo(() => brandPalettes[brand] || brandPalettes[defaultBrand], [brand]);

  const rebuildColorStatsForCurrentPalette = useCallback(() => {
    const bm = beadMapRef.current;
    const cm = new Map<string, number>();
    bm.forEach((hex) => { cm.set(hex, (cm.get(hex) || 0) + 1); });
    const hexMap = buildHexMap(palette.colors);
    const stats: ColorStat[] = [];
    let total = 0;
    cm.forEach((count, hex) => {
      const c = hexMap.get(hex.toUpperCase());
      if (c) {
        stats.push({ code: c.code, name: c.name, hex: c.hex, count, percentage: 0 });
        total += count;
      }
    });
    stats.sort((a, b) => a.code.localeCompare(b.code));
    stats.forEach(s => s.percentage = total > 0 ? (s.count / total) * 100 : 0);
    setColorStats(stats);
    setTotalBeads(total);
  }, [palette.colors]);

  useEffect(() => {
    clearColorCache();
    if (hasGenerated && beadMapRef.current.size > 0) {
      rebuildColorStatsForCurrentPalette();
    }
  }, [brand, hasGenerated, rebuildColorStatsForCurrentPalette]);

  // 预加载 AI 抠图模型
  useEffect(() => {
    initBackgroundRemoval().catch(() => {});
  }, []);

  // ========================================================
  // 图片上传
  // ========================================================

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
        const image = document.createElement("img");
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('图片加载失败'));
        image.src = url;
      });

      setImageUrl(url);
      setOrigW(img.width);
      setOrigH(img.height);
      setStatusText(`已上传 ${img.width}×${img.height}`);
    } catch (err: any) {
      setError(err?.message || '上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ========================================================
  // 图纸生成
  // ========================================================

  const handleGenerate = useCallback(async () => {
    if (!imageUrl) return;

    setIsProcessing(true);
    setError(null); setHasGenerated(false); setColorStats([]); setTotalBeads(0);

    try {
      const threshold = transitionColorThreshold === '' ? 3 : Math.max(1, transitionColorThreshold);
      const result = await runPipeline({
        imageUrl,
        maxDim,
        removeBg,
        palette: palette.colors,
        transitionThreshold: threshold,
        onStatus: setStatusText,
      });

      setBeadW(result.bw); setBeadH(result.bh);
      setTotalBeads(result.totalBeads);
      setColorStats(result.stats);

      exportDataRef.current = {
        beadMap: result.beadMap,
        paletteColors: result.paletteColors,
        bw: result.bw, bh: result.bh,
      };
      beadMapRef.current = result.beadMap;
      originalBeadMapRef.current = new Map(result.beadMap);

      setStatusText(`生成完成 · ${result.totalBeads} 颗豆 · ${result.stats.length} 种颜色`);
      setHasGenerated(true); setRenderVersion(v => v + 1);
      setHistoryState({ entries: [new Map(result.beadMap)], index: 0 });
    } catch (err: any) {
      console.error('[perler] generate error:', err);
      setError(err?.message || String(err) || '生成失败，请重试');
    } finally { setIsProcessing(false); }
  }, [imageUrl, maxDim, removeBg, transitionColorThreshold, palette]);

  // 始终保持最新回调引用
  handleGenerateRef.current = handleGenerate;

  // 上传、更换图片 或 设置变更 → 自动重新生成
  useEffect(() => {
    if (imageUrl) {
      handleGenerateRef.current();
    }
  }, [imageUrl, removeBg, transitionColorThreshold, brand, qualityTier]);

  // ========================================================
  // 颜色统计更新（画笔操作后）
  // ========================================================

  const updateColorStats = useCallback((bm: Map<string, string>) => {
    const cm = new Map<string, number>();
    bm.forEach((hex) => { cm.set(hex, (cm.get(hex) || 0) + 1); });
    const hexMap = buildHexMap(palette.colors);
    const stats: ColorStat[] = [];
    let total = 0;
    cm.forEach((count, hex) => {
      const c = hexMap.get(hex.toUpperCase());
      if (c) stats.push({ code: c.code, name: c.name, hex: c.hex, count, percentage: 0 });
      total += count;
    });
    stats.sort((a, b) => a.code.localeCompare(b.code));
    stats.forEach(s => s.percentage = total > 0 ? (s.count / total) * 100 : 0);
    setColorStats(stats);
    setTotalBeads(total);
  }, [palette.colors]);

  const pushHistory = useCallback((bm: Map<string, string>) => {
    const snapshot = new Map(bm);
    setHistoryState(prev => {
      const entries = prev.entries.slice(0, prev.index + 1);
      entries.push(snapshot);
      if (entries.length > 50) entries.shift();
      return { entries, index: entries.length - 1 };
    });
  }, []);

  const handleUndo = useCallback(() => {
    setHistoryState(prev => {
      if (prev.index <= 0) return prev;
      const newIndex = prev.index - 1;
      const prevBm = new Map(prev.entries[newIndex]);
      beadMapRef.current = prevBm;
      exportDataRef.current = exportDataRef.current ? { ...exportDataRef.current, beadMap: prevBm } : null;
      updateColorStats(prevBm);
      setRenderVersion(v => v + 1);
      return { ...prev, index: newIndex };
    });
  }, [updateColorStats]);

  const handleRedo = useCallback(() => {
    setHistoryState(prev => {
      if (prev.index >= prev.entries.length - 1) return prev;
      const newIndex = prev.index + 1;
      const nextBm = new Map(prev.entries[newIndex]);
      beadMapRef.current = nextBm;
      exportDataRef.current = exportDataRef.current ? { ...exportDataRef.current, beadMap: nextBm } : null;
      updateColorStats(nextBm);
      setRenderVersion(v => v + 1);
      return { ...prev, index: newIndex };
    });
  }, [updateColorStats]);

  const applyBrushChange = useCallback((bm: Map<string, string>) => {
    pushHistory(bm);
    updateColorStats(bm);
    setRenderVersion(v => v + 1);
  }, [pushHistory, updateColorStats]);

  const lookupColorCode = useCallback((hex: string) => {
    const hexMap = buildHexMap(palette.colors);
    const c = hexMap.get(hex.toUpperCase());
    return c ? c.code : '';
  }, [palette.colors]);

  // ========================================================
  // 颜色数量限制
  // ========================================================

  const applyColorLimit = useCallback(() => {
    if (maxColorLimit === '' || maxColorLimit < 1) return;
    const bm = beadMapRef.current;
    const cm = new Map<string, number>();
    bm.forEach(hex => cm.set(hex, (cm.get(hex) || 0) + 1));
    const sorted = [...cm.entries()].sort((a, b) => b[1] - a[1]);
    const keep = new Set(sorted.slice(0, maxColorLimit).map(e => e[0]));

    const allColors = (brandPalettes[brand] || brandPalettes[defaultBrand]).colors;
    const hexToColor = buildHexMap(allColors);

    const newBm = new Map<string, string>();
    bm.forEach((hex, key) => {
      if (keep.has(hex)) { newBm.set(key, hex); return; }
      const src = hexToColor.get(hex.toUpperCase());
      let best = keep.values().next().value;
      let bestDist = Infinity;
      if (src) {
        const [sr, sg, sb] = src.rgb;
        keep.forEach(kh => {
          const tc = hexToColor.get(kh.toUpperCase());
          if (!tc) return;
          const d = (sr - tc.rgb[0]) ** 2 + (sg - tc.rgb[1]) ** 2 + (sb - tc.rgb[2]) ** 2;
          if (d < bestDist) { bestDist = d; best = kh; }
        });
      }
      newBm.set(key, best || hex);
    });
    beadMapRef.current = newBm;
    exportDataRef.current = exportDataRef.current ? { ...exportDataRef.current, beadMap: newBm } : null;
    pushHistory(newBm);
    updateColorStats(newBm);
    setRenderVersion(v => v + 1);
  }, [maxColorLimit, brand, pushHistory, updateColorStats]);

  // ========================================================
  // 重置
  // ========================================================

  const handleReset = useCallback(() => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    setImageUrl(null);
    setHasGenerated(false);
    setError(null);
    setColorStats([]);
    setTotalBeads(0);
    setStatusText('');
    setBeadW(0);
    setBeadH(0);
    setOrigW(0);
    setOrigH(0);
    setActiveTool(null);
    setBrushColor('#212121');
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setIsPanning(false);
    setMaxColorLimit('');
    setTransitionColorThreshold(3);
    setCustomGridSize('');
    beadMapRef.current = new Map();
    exportDataRef.current = null;
    setHistoryState({ entries: [], index: -1 });
    setBrushCode('');
    setSymmetryMode('none');
    setShowCenterLines(false);
  }, []);

  // ========================================================
  // 预览渲染
  // ========================================================

  useEffect(() => {
    const data = exportDataRef.current;
    if (!data || !previewCanvasRef.current) return;
    renderPreview(data.bw, data.bh, beadMapRef.current, data.paletteColors, beadShape, zoomLevel, panOffset);
  }, [beadShape, renderVersion, zoomLevel, panOffset, showCenterLines, showGridLines]);

  const renderPreview = useCallback(
    (w: number, h: number, beadMap: Map<string, string>, _colors: BeadColor[], shape: BeadShape, zoom: number, pan: { x: number; y: number }) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;

      const cellSize = Math.max(4, Math.min(24, Math.floor(700 / Math.max(w, h))) * zoom);
      const margin = cellSize >= 12 ? 24 : 22;
      const labelMargin = margin; // 左侧和底部留白宽度保持一致
      const totalW = w * cellSize + margin * 2;
      const canvasH = h * cellSize + margin * 2;

      canvas.width = totalW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;

      ctx.save();
      ctx.translate(pan.x, pan.y);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalW, canvasH);

      // 网格线 - 参考实际拼豆图纸风格（在豆子之前绘制，从间隙透出）
      if (showGridLines) {
        // 每个格子都画极细灰线 — 批量绘制
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        for (let y = 0; y <= h; y++) {
          const yy = margin + y * cellSize;
          ctx.moveTo(labelMargin, yy);
          ctx.lineTo(labelMargin + w * cellSize, yy);
        }
        for (let x = 0; x <= w; x++) {
          const xx = labelMargin + x * cellSize;
          ctx.moveTo(xx, margin);
          ctx.lineTo(xx, margin + h * cellSize);
        }
        ctx.stroke();

        // 每 5 格画蓝色线（小分区）— 批量绘制
        ctx.strokeStyle = 'rgba(80, 140, 220, 0.55)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let y = 0; y <= h; y += 5) {
          const yy = margin + y * cellSize;
          ctx.moveTo(labelMargin, yy);
          ctx.lineTo(labelMargin + w * cellSize, yy);
        }
        for (let x = 0; x <= w; x += 5) {
          const xx = labelMargin + x * cellSize;
          ctx.moveTo(xx, margin);
          ctx.lineTo(xx, margin + h * cellSize);
        }
        ctx.stroke();

        // 每 10 格画红色粗虚线（大分区）— 批量绘制
        ctx.strokeStyle = 'rgba(210, 80, 60, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        for (let y = 0; y <= h; y += 10) {
          const yy = margin + y * cellSize;
          ctx.moveTo(labelMargin, yy);
          ctx.lineTo(labelMargin + w * cellSize, yy);
        }
        for (let x = 0; x <= w; x += 10) {
          const xx = labelMargin + x * cellSize;
          ctx.moveTo(xx, margin);
          ctx.lineTo(xx, margin + h * cellSize);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 坐标标注（仅左侧Y轴 + 底部X轴，独立于网格显示）
      const gridMaxDim = Math.max(w, h);
      const labelInterval = gridMaxDim <= 100 ? 5 : 10;

      ctx.font = 'bold 9px -apple-system, system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(100, 100, 110, 0.75)';

      // 底部坐标（X轴）
      ctx.textAlign = 'center';
      for (let x = 0; x < w; x++) {
        if ((x + 1) % labelInterval === 0 || x === w - 1) {
          ctx.fillText(`${x + 1}`, labelMargin + x * cellSize + cellSize / 2, margin + h * cellSize + margin / 2 + 2);
        }
      }

      // 左侧坐标（Y轴）- 从下往上标注
      ctx.textAlign = 'right';
      for (let y = h - 1; y >= 0; y--) {
        const displayNum = h - y;
        if (displayNum % labelInterval === 0 || y === h - 1 || y === 0) {
          ctx.fillText(`${displayNum}`, labelMargin / 2 + 6, margin + y * cellSize + cellSize / 2);
        }
      }

      // 绘制豆子
      const blockPadding = cellSize * 0.08;
      const blockSize = cellSize - blockPadding * 2;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cx = labelMargin + x * cellSize + cellSize / 2;
          const cy = margin + y * cellSize + cellSize / 2;
          const hex = beadMap.get(`${x},${y}`);

          if (hex) {
            if (shape === 'square') {
              ctx.fillStyle = hex;
              ctx.fillRect(labelMargin + x * cellSize + blockPadding, margin + y * cellSize + blockPadding, blockSize, blockSize);
            } else {
              ctx.beginPath();
              ctx.arc(cx, cy, blockSize / 2, 0, Math.PI * 2);
              ctx.fillStyle = hex;
              ctx.fill();
            }
          }
        }
      }

      ctx.strokeStyle = '#d0d0d5';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(labelMargin, margin, w * cellSize, h * cellSize);

      // 辅助中心线
      if (showCenterLines) {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // 垂直中心线
        const centerX = margin + (w / 2) * cellSize;
        ctx.beginPath();
        ctx.moveTo(centerX, margin);
        ctx.lineTo(centerX, margin + h * cellSize);
        ctx.stroke();

        // 水平中心线
        const centerY = margin + (h / 2) * cellSize;
        ctx.beginPath();
        ctx.moveTo(margin, centerY);
        ctx.lineTo(margin + w * cellSize, centerY);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
      }

      ctx.restore();
    },
    [showCenterLines, showGridLines],
  );

  // ========================================================
  // 对称像素计算
  // ========================================================

  const getSymmetricPositions = useCallback((x: number, y: number, bw: number, bh: number) => {
    const positions: [number, number][] = [[x, y]];
    if (symmetryMode === 'none') return positions;

    const mirrorX = bw - 1 - x;
    const mirrorY = bh - 1 - y;

    if (symmetryMode === 'horizontal' || symmetryMode === 'four-way') {
      positions.push([mirrorX, y]);
    }
    if (symmetryMode === 'vertical' || symmetryMode === 'four-way') {
      positions.push([x, mirrorY]);
    }
    if (symmetryMode === 'four-way') {
      positions.push([mirrorX, mirrorY]);
    }

    return positions;
  }, [symmetryMode]);

  // ========================================================
  // 画布交互
  // ========================================================

  const cellSizeForZoom = useCallback(() => {
    const data = exportDataRef.current;
    if (!data) return 24;
    const base = Math.min(24, Math.floor(700 / Math.max(data.bw, data.bh)));
    return Math.max(4, base * zoomLevel);
  }, [zoomLevel]);

  const canvasToBead = useCallback((cx: number, cy: number) => {
    const canvas = previewCanvasRef.current;
    const data = exportDataRef.current;
    if (!canvas || !data) return null;
    const rect = canvas.getBoundingClientRect();
    const cs = cellSizeForZoom();
    const margin = cs >= 12 ? 24 : 22; // 与 renderPreview 保持一致
    const bx = Math.floor((cx - rect.left - panOffset.x - margin) / cs);
    const by = Math.floor((cy - rect.top - panOffset.y - margin) / cs);
    if (bx < 0 || bx >= data.bw || by < 0 || by >= data.bh) return null;
    return { x: bx, y: by };
  }, [cellSizeForZoom, panOffset]);

  const paintAtPosition = useCallback((bm: Map<string, string>, x: number, y: number, color: string, bw: number, bh: number) => {
    const positions = getSymmetricPositions(x, y, bw, bh);
    for (const [px, py] of positions) {
      if (px >= 0 && px < bw && py >= 0 && py < bh) {
        bm.set(`${px},${py}`, color);
      }
    }
  }, [getSymmetricPositions]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hasGenerated) return;
    if (e.button !== 0) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      return;
    }
    const pos = canvasToBead(e.clientX, e.clientY);
    if (!pos) return;
    const data = exportDataRef.current;
    if (!data) return;
    const bm = beadMapRef.current;

    if (activeTool === 'picker') {
      const color = bm.get(`${pos.x},${pos.y}`);
      if (color) {
        setBrushColor(color);
        setBrushCode(lookupColorCode(color));
        setActiveTool('brush');
      }
    } else if (activeTool === 'brush') {
      paintAtPosition(bm, pos.x, pos.y, brushColor, data.bw, data.bh);
      applyBrushChange(bm);
    } else if (activeTool === 'eraser') {
      const positions = getSymmetricPositions(pos.x, pos.y, data.bw, data.bh);
      for (const [px, py] of positions) {
        bm.delete(`${px},${py}`);
      }
      applyBrushChange(bm);
    } else if (activeTool === 'fill') {
      const targetColor = bm.get(`${pos.x},${pos.y}`);
      if (targetColor) {
        floodFill(bm, pos.x, pos.y, targetColor, brushColor, data.bw, data.bh);
        // 对称模式下对对称位置也进行填充
        if (symmetryMode !== 'none') {
          const symPositions = getSymmetricPositions(pos.x, pos.y, data.bw, data.bh);
          for (const [sx, sy] of symPositions) {
            if (sx === pos.x && sy === pos.y) continue;
            const symTarget = bm.get(`${sx},${sy}`);
            if (symTarget && symTarget !== brushColor) {
              floodFill(bm, sx, sy, symTarget, brushColor, data.bw, data.bh);
            }
          }
        }
        applyBrushChange(bm);
      }
    }
  }, [hasGenerated, activeTool, brushColor, canvasToBead, panOffset, applyBrushChange, lookupColorCode, symmetryMode, paintAtPosition, getSymmetricPositions]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
      return;
    }
    if (!hasGenerated || (activeTool !== 'brush' && activeTool !== 'eraser') || e.buttons !== 1) return;
    // 节流：每帧最多处理一次
    if (brushRafRef.current) return;
    // 捕获当前鼠标坐标，避免 RAF 回调中使用过期值
    const cx = e.clientX, cy = e.clientY;
    brushRafRef.current = requestAnimationFrame(() => {
      brushRafRef.current = 0;
      const pos = canvasToBead(cx, cy);
      if (!pos) return;
      const bm = beadMapRef.current;
      const data = exportDataRef.current;
      if (!data) return;
      if (activeTool === 'eraser') {
        const positions = getSymmetricPositions(pos.x, pos.y, data.bw, data.bh);
        for (const [px, py] of positions) bm.delete(`${px},${py}`);
      } else {
        paintAtPosition(bm, pos.x, pos.y, brushColor, data.bw, data.bh);
      }
      applyBrushChange(bm);
    });
  }, [hasGenerated, activeTool, brushColor, canvasToBead, isPanning, applyBrushChange, paintAtPosition, getSymmetricPositions]);

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoomLevel(z => Math.max(1, Math.min(5, z - e.deltaY * 0.005)));
  }, []);

  const resetView = useCallback(() => {
    const z = 1;
    const p = { x: 0, y: 0 };
    setZoomLevel(z);
    setPanOffset(p);
    // 重置容器滚动位置
    if (canvasContainerRef.current) {
      canvasContainerRef.current.scrollTop = 0;
      canvasContainerRef.current.scrollLeft = 0;
    }
    // 恢复原始图纸（撤销所有画笔/橡皮擦修改）
    const original = originalBeadMapRef.current;
    if (original) {
      const restored = new Map(original);
      beadMapRef.current = restored;
      if (exportDataRef.current) {
        exportDataRef.current = { ...exportDataRef.current, beadMap: restored };
      }
      updateColorStats(restored);
      pushHistory(restored);
    }
    const data = exportDataRef.current;
    if (data) {
      renderPreview(data.bw, data.bh, beadMapRef.current, data.paletteColors, beadShape, z, p);
    }
  }, [renderPreview, beadShape, updateColorStats, pushHistory]);

  // ========================================================
  // 快捷键
  // ========================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasGenerated) return;
      // 忽略在输入框中的按键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + Z: 撤销
      if (modKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      // Ctrl/Cmd + Shift + Z: 重做
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // 工具切换
      if (!modKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            setActiveTool(t => t === 'brush' ? null : 'brush');
            break;
          case 'e':
            setActiveTool(t => t === 'eraser' ? null : 'eraser');
            break;
          case 'i':
            setActiveTool(t => t === 'picker' ? null : 'picker');
            break;
          case 'f':
            setActiveTool(t => t === 'fill' ? null : 'fill');
            break;
          case '1':
            setSymmetryMode('none');
            break;
          case '2':
            setSymmetryMode('horizontal');
            break;
          case '3':
            setSymmetryMode('vertical');
            break;
          case '4':
            setSymmetryMode('four-way');
            break;
          case '+':
          case '=':
            setZoomLevel(z => Math.min(5, z + 0.5));
            break;
          case '-':
            setZoomLevel(z => Math.max(1, z - 0.5));
            break;
          case '0':
            resetView();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasGenerated, handleUndo, handleRedo, resetView]);

  // ========================================================
  // 导出 PNG
  // ========================================================

  const handleExportPNG = useCallback(() => {
    const data = exportDataRef.current;
    if (!data) return;
    const beadMap = beadMapRef.current;
    const w = beadW, h = beadH;

    const hexToCode = new Map<string, string>();
    for (const c of data.paletteColors) {
      hexToCode.set(c.hex.toUpperCase(), c.code);
    }

    const countMap = new Map<string, number>();
    for (const hex of beadMap.values()) {
      countMap.set(hex, (countMap.get(hex) || 0) + 1);
    }
    const legendItems: { code: string; hex: string; count: number; percentage: number }[] = [];
    countMap.forEach((count, hex) => {
      const code = hexToCode.get(hex.toUpperCase()) || '';
      legendItems.push({ code, hex, count, percentage: 0 });
    });
    const grandTotal = legendItems.reduce((s, i) => s + i.count, 0);
    legendItems.forEach(i => i.percentage = grandTotal > 0 ? (i.count / grandTotal) * 100 : 0);
    legendItems.sort((a, b) => b.count - a.count);

    // 导出配置
    const expCellSize = 28;
    const expTotalW = w * expCellSize;
    const expGridH = h * expCellSize;
    const expPad = 24;
    const borderW = 4;
    const borderRadius = 8;

    // 品牌头部设计
    const brandHeaderH = 80;
    const statsBarH = 48;

    // 图例配置 - 与页面色卡胶囊保持一致
    const itemsPerRow = Math.max(3, Math.min(5, Math.floor((expTotalW - expPad * 2) / 200)));
    const capsuleGap = 10;
    const capsuleH = 36;
    const capsuleW = Math.floor((expTotalW - expPad * 2 - (itemsPerRow - 1) * capsuleGap) / itemsPerRow);
    const capsuleR = 10;
    const legendRows = Math.ceil(legendItems.length / itemsPerRow);
    const legendTitleH = 24;
    const legendPadY = 20;
    const legendH = legendItems.length > 0
      ? legendPadY + legendTitleH + legendPadY + legendRows * (capsuleH + capsuleGap)
      : 0;
    const expTotalH = brandHeaderH + statsBarH + expGridH + legendH;

    const canvas = document.createElement('canvas');
    canvas.width = expTotalW + borderW * 2;
    canvas.height = expTotalH + borderW * 2;
    const ctx = canvas.getContext('2d')!;

    // 圆角矩形辅助函数
    function roundRect(x: number, y: number, width: number, height: number, radius: number) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arcTo(x + width, y, x + width, y + radius, radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
      ctx.lineTo(x + radius, y + height);
      ctx.arcTo(x, y + height, x, y + height - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
    }

    // 左半胶囊
    function halfCapsuleLeft(x: number, y: number, width: number, height: number, radius: number) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.arcTo(x, y + height, x, y + height - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
    }

    // 右半胶囊
    function halfCapsuleRight(x: number, y: number, width: number, height: number, radius: number) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arcTo(x + width, y, x + width, y + radius, radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
      ctx.lineTo(x, y + height);
      ctx.closePath();
    }

    // 背景底色
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 主内容区圆角背景
    ctx.fillStyle = '#ffffff';
    roundRect(borderW, borderW, expTotalW, expTotalH, borderRadius);
    ctx.fill();

    // ========================
    // 品牌头部区域
    // ========================
    const headerY = borderW;

    // 渐变背景条
    const gradient = ctx.createLinearGradient(borderW, headerY, borderW + expTotalW, headerY);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = gradient;
    roundRect(borderW, headerY, expTotalW, brandHeaderH, borderRadius);
    ctx.fill();

    // 品牌名称
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PixEase', expPad, headerY + 14);

    // 副标题
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('专业拼豆图纸设计', expPad, headerY + 44);

    // 右侧：生成时间
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    ctx.textAlign = 'right';
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`生成于 ${timeStr}`, borderW + expTotalW - expPad, headerY + 16);

    ctx.textAlign = 'right';
    ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`${w} × ${h} 格`, borderW + expTotalW - expPad, headerY + 38);

    // ========================
    // 统计信息栏
    // ========================
    const statsY = headerY + brandHeaderH;
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(borderW, borderW + statsY, expTotalW, statsBarH);

    // 分隔线
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(borderW, borderW + statsY);
    ctx.lineTo(borderW + expTotalW, borderW + statsY);
    ctx.stroke();

    // 统计信息
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.fillText('总计', expPad, borderW + statsY + statsBarH / 2);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    const totalBeadText = `${grandTotal.toLocaleString()} 颗`;
    ctx.fillText(totalBeadText, expPad + 36, borderW + statsY + statsBarH / 2);

    ctx.fillStyle = '#6b7280';
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.fillText(`颜色 ${legendItems.length} 种`, expPad + 140, borderW + statsY + statsBarH / 2);

    // 下分隔线
    const gridStartY = statsY + statsBarH;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(borderW, borderW + gridStartY);
    ctx.lineTo(borderW + expTotalW, borderW + gridStartY);
    ctx.stroke();

    // ========================
    // 网格区域
    // ========================
    const gridY = borderW + gridStartY;

    // 棋盘格背景
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if ((x + y) % 2 === 1) {
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(borderW + x * expCellSize, gridY + y * expCellSize, expCellSize, expCellSize);
        }
      }
    }

    // 网格线 — 按样式批量绘制
    // 每 20 格 — 灰色粗线
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let y = 0; y <= h; y += 20) {
      ctx.moveTo(borderW, gridY + y * expCellSize);
      ctx.lineTo(borderW + expTotalW, gridY + y * expCellSize);
    }
    for (let x = 0; x <= w; x += 20) {
      ctx.moveTo(borderW + x * expCellSize, gridY);
      ctx.lineTo(borderW + x * expCellSize, gridY + expGridH);
    }
    ctx.stroke();

    // 每 5 格 — 浅灰细线（跳过 20 的倍数，已由上面绘制）
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let y = 0; y <= h; y += 5) {
      if (y % 20 === 0) continue;
      ctx.moveTo(borderW, gridY + y * expCellSize);
      ctx.lineTo(borderW + expTotalW, gridY + y * expCellSize);
    }
    for (let x = 0; x <= w; x += 5) {
      if (x % 20 === 0) continue;
      ctx.moveTo(borderW + x * expCellSize, gridY);
      ctx.lineTo(borderW + x * expCellSize, gridY + expGridH);
    }
    ctx.stroke();

    const expBlockPadding = expCellSize * 0.08;
    const expBlockSize = expCellSize - expBlockPadding * 2;

    function expTextColor(hex: string): string {
      const [r, g, b] = parseHexColor(hex);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#333' : '#fff';
    }

    // 豆子渲染
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cx = borderW + x * expCellSize + expCellSize / 2;
        const cy = gridY + y * expCellSize + expCellSize / 2;
        const hex = beadMap.get(`${x},${y}`);
        const code = hex ? hexToCode.get(hex.toUpperCase()) : undefined;

        if (hex && code) {
          if (beadShape === 'square') {
            // 方形豆子 - 带轻微阴影
            const bx = borderW + x * expCellSize + expBlockPadding;
            const by = gridY + y * expCellSize + expBlockPadding;
            
            // 阴影
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.fillRect(bx + 1, by + 1, expBlockSize, expBlockSize);
            
            // 主体
            ctx.fillStyle = hex;
            ctx.fillRect(bx, by, expBlockSize, expBlockSize);
          } else {
            // 圆形豆子 - 带高光
            const radius = expBlockSize / 2;
            
            // 阴影
            ctx.beginPath();
            ctx.arc(cx + 1, cy + 1, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.fill();
            
            // 主体
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = hex;
            ctx.fill();
            
            // 高光
            ctx.beginPath();
            ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fill();
          }

          // 颜色代码
          ctx.fillStyle = expTextColor(hex);
          ctx.font = `bold ${Math.max(8, expCellSize * 0.32)}px -apple-system, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(code, cx, cy);
        }
      }
    }

    // ========================
    // 图例区域 - 与页面色卡胶囊保持一致
    // ========================
    if (legendItems.length > 0) {
      const legendStartY = gridY + expGridH;
      
      // 分隔线
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(borderW, borderW + legendStartY);
      ctx.lineTo(borderW + expTotalW, borderW + legendStartY);
      ctx.stroke();

      // 图例标题
      const titleY = borderW + legendStartY + legendPadY;
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('色卡图例', expPad, titleY);

      ctx.fillStyle = '#6b7280';
      ctx.font = '12px -apple-system, system-ui, sans-serif';
      ctx.fillText(`按数量排序 · 共 ${legendItems.length} 色`, expPad + 80, titleY);

      // 色卡胶囊
      const capsulesStartY = titleY + legendTitleH + legendPadY;
      
      legendItems.forEach((item, i) => {
        const col = i % itemsPerRow;
        const row = Math.floor(i / itemsPerRow);
        const cx = expPad + col * (capsuleW + capsuleGap);
        const cy = capsulesStartY + row * (capsuleH + capsuleGap);

        // 胶囊阴影
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        roundRect(cx + 1, cy + 2, capsuleW, capsuleH, capsuleR);
        ctx.fill();

        // 左半部分：颜色色块（与页面保持一致的圆角处理）
        const halfW = capsuleW / 2;
        
        // 颜色部分
        halfCapsuleLeft(cx, cy, halfW, capsuleH, capsuleR);
        ctx.fillStyle = item.hex;
        ctx.fill();

        // 颜色部分分隔线
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + halfW, cy + 2);
        ctx.lineTo(cx + halfW, cy + capsuleH - 2);
        ctx.stroke();

        // 右半部分：色号 + 数量
        halfCapsuleRight(cx + halfW, cy, halfW, capsuleH, capsuleR);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 外边框
        roundRect(cx, cy, capsuleW, capsuleH, capsuleR);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 右半部分文字
        const rightCenterX = cx + halfW + halfW / 2;
        
        // 色号
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 12px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.code, rightCenterX, cy + capsuleH / 2 - 6);

        // 数量
        ctx.fillStyle = '#6b7280';
        ctx.font = '11px -apple-system, system-ui, sans-serif';
        ctx.fillText(`×${item.count.toLocaleString()}`, rightCenterX, cy + capsuleH / 2 + 8);
      });
    }

    const link = document.createElement('a');
    link.download = `PixEase-拼豆图纸-${w}x${h}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [beadW, beadH, beadShape]);

  // ========================================================
  // UI 渲染
  // ========================================================

  const uploadClick = () => fileInputRef.current?.click();

  return (
    <div className="h-screen gradient-bg flex flex-col overflow-hidden">
      <TopHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：原图 + 色卡 — 桌面端常驻，移动端按需显示 */}
        {mobilePanel !== 'right' && (
          <div className={`${mobilePanel === 'left' ? 'flex' : 'hidden'} md:flex`}>
            <LeftPanel
              imageUrl={imageUrl}
              colorStats={colorStats}
              totalBeads={totalBeads}
              onClose={() => setMobilePanel('none')}
            />
          </div>
        )}

        {/* 中间：上传 / 预览 */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-6 gap-3 md:gap-4 min-w-0">
          <AnimatePresence mode="wait">
            {!imageUrl ? (
              <motion.div key="upload-zone" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex-1 flex items-center justify-center">
                <UploadZone
                  isUploading={isUploading}
                  error={error}
                  onClick={uploadClick}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col gap-3 min-h-0"
              >
                <ActionBar
                  isProcessing={isProcessing}
                  hasGenerated={hasGenerated}
                  statusText={statusText}
                  error={error}
                  beadW={beadW}
                  beadH={beadH}
                  totalBeads={totalBeads}
                  colorStatCount={colorStats.length}
                  activeTool={activeTool}
                  onUploadClick={uploadClick}
                  onGenerate={handleGenerate}
                  onExport={handleExportPNG}
                  onReset={handleReset}
                />

                {hasGenerated ? (
                  <div className="flex-1 flex flex-col min-h-0 gap-2">
                    {/* 工具栏 — 桌面端换行，移动端横向滚动 */}
                    <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto md:flex-wrap pb-1 md:pb-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {/* 工具按钮 — 移动端只显示图标 */}
                      <ToolButton
                        active={activeTool === 'brush'}
                        onClick={() => setActiveTool(t => t === 'brush' ? null : 'brush')}
                        label="画笔工具 (B)"
                      >
                        <Pencil className="w-3.5 h-3.5" /><span className="hidden md:inline">画笔</span>
                      </ToolButton>
                      <ToolButton
                        active={activeTool === 'eraser'}
                        onClick={() => setActiveTool(t => t === 'eraser' ? null : 'eraser')}
                        label="橡皮擦 (E)"
                      >
                        <Eraser className="w-3.5 h-3.5" /><span className="hidden md:inline">橡皮擦</span>
                      </ToolButton>
                      <ToolButton
                        active={activeTool === 'picker'}
                        onClick={() => setActiveTool(t => t === 'picker' ? null : 'picker')}
                        label="取色器 (I)"
                      >
                        <Pipette className="w-3.5 h-3.5" /><span className="hidden md:inline">取色</span>
                      </ToolButton>
                      <ToolButton
                        active={activeTool === 'fill'}
                        onClick={() => setActiveTool(t => t === 'fill' ? null : 'fill')}
                        label="油漆桶 (F)"
                      >
                        <PaintBucket className="w-3.5 h-3.5" /><span className="hidden md:inline">油漆桶</span>
                      </ToolButton>
                      {brushColor && (activeTool === 'brush' || activeTool === 'fill') && (
                        <Tooltip text={`当前颜色: ${brushCode || brushColor}`}>
                          <div className="flex items-center gap-1.5 cursor-default">
                            <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: brushColor, borderColor: 'var(--border-color)' }} />
                            {brushCode && (
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                                {brushCode}
                              </span>
                            )}
                          </div>
                        </Tooltip>
                      )}

                      {/* 分隔线 */}
                      <div className="w-px h-5" style={{ backgroundColor: 'var(--border-color)' }} />

                      {/* 对称模式 */}
                      <ToolButton
                        active={symmetryMode === 'none'}
                        onClick={() => setSymmetryMode('none')}
                        label="关闭对称 (1)"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </ToolButton>
                      <ToolButton
                        active={symmetryMode === 'horizontal'}
                        onClick={() => setSymmetryMode('horizontal')}
                        label="水平对称 (2)"
                      >
                        <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
                      </ToolButton>
                      <ToolButton
                        active={symmetryMode === 'vertical'}
                        onClick={() => setSymmetryMode('vertical')}
                        label="垂直对称 (3)"
                      >
                        <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                      </ToolButton>
                      <ToolButton
                        active={symmetryMode === 'four-way'}
                        onClick={() => setSymmetryMode('four-way')}
                        label="四向对称 (4)"
                      >
                        <Grid3X3 className="w-3.5 h-3.5" />
                      </ToolButton>

                      {/* 分隔线 */}
                      <div className="w-px h-5" style={{ backgroundColor: 'var(--border-color)' }} />

                      {/* 辅助线 */}
                      <ToolButton
                        active={showCenterLines}
                        onClick={() => setShowCenterLines(v => !v)}
                        label="显示中心线"
                      >
                        {showCenterLines ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </ToolButton>

                      {/* 分隔线 */}
                      <div className="w-px h-5" style={{ backgroundColor: 'var(--border-color)' }} />

                      {/* 撤销/重做 */}
                      <IconButton onClick={handleUndo} disabled={historyState.index <= 0} label="撤销 (Ctrl+Z)">
                        <Undo2 className="w-3.5 h-3.5" />
                      </IconButton>
                      <IconButton onClick={handleRedo} disabled={historyState.index >= historyState.entries.length - 1} label="重做 (Ctrl+Shift+Z)">
                        <Redo2 className="w-3.5 h-3.5" />
                      </IconButton>

                      {/* 缩放 */}
                      <IconButton onClick={() => setZoomLevel(z => Math.max(1, z - 0.5))} label="缩小 (+)">
                        <ZoomOut className="w-3.5 h-3.5" />
                      </IconButton>
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-primary)', minWidth: 28, textAlign: 'center' }}>{zoomLevel.toFixed(1)}×</span>
                      <IconButton onClick={() => setZoomLevel(z => Math.min(5, z + 0.5))} label="放大 (-)">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </IconButton>
                      <IconButton onClick={resetView} label="重置视图 (0)">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>

                    {/* 画布 */}
                    <div
                      ref={canvasContainerRef}
                      className="flex-1 rounded-2xl p-4 flex shadow-sm overflow-auto"
                      style={{
                        backgroundColor: '#f5f5f7',
                        border: '1px solid var(--border-color)',
                        cursor: activeTool === 'picker' ? 'crosshair' : activeTool === 'brush' || activeTool === 'fill' ? 'crosshair' : isPanning ? 'grabbing' : 'grab',
                      }}
                    >
                      <div className="rounded-lg overflow-hidden shadow-sm flex-shrink-0 m-auto" style={{ backgroundColor: '#ffffff' }}>
                        <canvas
                          ref={previewCanvasRef}
                          className="rounded-lg"
                          style={{ imageRendering: 'pixelated', display: 'block', maxWidth: 'none', maxHeight: 'none' }}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                          onWheel={handleWheel}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto rounded-2xl flex items-center justify-center min-h-0" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <canvas ref={previewCanvasRef} className="rounded-lg" style={{ imageRendering: 'pixelated', display: 'block' }} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </div>

        {/* 右侧：设置面板 — 桌面端常驻，移动端按需显示 */}
        {mobilePanel !== 'left' && (
          <div className={`${mobilePanel === 'right' ? 'flex' : 'hidden'} md:flex`}>
            <RightPanel
              brand={brand}
              qualityTier={qualityTier}
              customGridSize={customGridSize}
              removeBg={removeBg}
              transitionColorThreshold={transitionColorThreshold}
              beadShape={beadShape}
              showGridLines={showGridLines}
              maxColorLimit={maxColorLimit}
              hasGenerated={hasGenerated}
              colorStatLength={colorStats.length}
              onClose={() => setMobilePanel('none')}
              onBrandChange={setBrand}
              onQualityTierChange={setQualityTier}
              onCustomGridSizeChange={setCustomGridSize}
              onApplyCustomGrid={() => handleGenerateRef.current()}
              onRemoveBgChange={() => setRemoveBg(v => !v)}
              onTransitionColorThresholdChange={setTransitionColorThreshold}
              onBeadShapeChange={setBeadShape}
              onShowGridLinesChange={setShowGridLines}
              onMaxColorLimitChange={setMaxColorLimit}
              onApplyColorLimit={applyColorLimit}
            />
          </div>
        )}
      </div>

      {/* 移动端底部导航栏 — 仅在手机端显示 */}
      <div className="flex md:hidden items-center justify-around border-t px-2 py-1 safe-area-bottom" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)', paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => setMobilePanel(p => p === 'left' ? 'none' : 'left')}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-0"
          style={{ color: mobilePanel === 'left' ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          <Image className="w-5 h-5" />
          <span className="text-[10px]">原图</span>
        </button>
        <button
          onClick={() => { setMobilePanel('none'); setActiveTool(t => t === 'brush' ? null : 'brush'); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-0"
          style={{ color: activeTool === 'brush' ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          <Pencil className="w-5 h-5" />
          <span className="text-[10px]">画笔</span>
        </button>
        <button
          onClick={() => { setMobilePanel('none'); setActiveTool(null); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-0"
          style={{ color: activeTool === null ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          <MousePointer2 className="w-5 h-5" />
          <span className="text-[10px]">移动</span>
        </button>
        <button
          onClick={() => { setMobilePanel('none'); setZoomLevel(z => Math.max(1, z - 0.5)); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-0"
          style={{ color: 'var(--text-muted)' }}
        >
          <ZoomOut className="w-5 h-5" />
          <span className="text-[10px]">缩小</span>
        </button>
        <button
          onClick={() => { setMobilePanel('none'); setZoomLevel(z => Math.min(5, z + 0.5)); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-0"
          style={{ color: 'var(--text-muted)' }}
        >
          <ZoomIn className="w-5 h-5" />
          <span className="text-[10px]">放大</span>
        </button>
        <button
          onClick={() => setMobilePanel(p => p === 'right' ? 'none' : 'right')}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-0"
          style={{ color: mobilePanel === 'right' ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">设置</span>
        </button>
      </div>
    </div>
  );
}
