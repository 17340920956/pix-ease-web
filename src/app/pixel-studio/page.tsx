'use client';

import { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { usePixelStore } from '@/store/usePixelStore';
import type { PixelChange } from '@/store/usePixelStore';
import AuthGuard from '@/components/AuthGuard';
import TopHeader from '@/components/TopHeader';
import ColorPalette from './components/ColorPalette';
import PixelCanvas from './components/PixelCanvas';
import ToolBar from './components/ToolBar';
import LayerPanel from './components/LayerPanel';
import TopMenuBar from './components/TopMenuBar';

export default function PixelStudioPage() {
  return (
    <AuthGuard>
      <PixelStudioContent />
    </AuthGuard>
  );
}

function PixelStudioContent() {
  const store = usePixelStore();
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);
  const primaryColorRef = useRef<HTMLInputElement>(null);
  const secondaryColorRef = useRef<HTMLInputElement>(null);
  const bgColorRef = useRef<HTMLInputElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(String(store.project.width));
  const [canvasH, setCanvasH] = useState(String(store.project.height));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [dialogW, setDialogW] = useState('64');
  const [dialogH, setDialogH] = useState('64');
  const [showPreview, setShowPreview] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const [previewW, setPreviewW] = useState(0);
  const [previewH, setPreviewH] = useState(0);
  const [exportPixelSize, setExportPixelSize] = useState(8);
  const [showBorder, setShowBorder] = useState(false);
  const [borderSize, setBorderSize] = useState(1);

  useEffect(() => {
    const hasContent = store.layers.some((l) => {
      if (l.pixels instanceof Map) return l.pixels.size > 0;
      if (typeof l.pixels === 'object' && l.pixels !== null) return Object.keys(l.pixels).length > 0;
      return false;
    });
    if (!hasContent) {
      setShowCreateDialog(true);
    }
  }, []);

  useEffect(() => {
    if (!store.activeLayerId && store.layers.length > 0) {
      store.setActiveLayer(store.layers[0].id);
    }
  }, []);

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const cw = store.project.width * store.viewport.scale;
    const ch = store.project.height * store.viewport.scale;
    el.scrollLeft = Math.max(0, (cw - el.clientWidth) / 2);
    el.scrollTop = Math.max(0, (ch - el.clientHeight) / 2);
  }, [store.project.width, store.project.height, store.viewport.scale]);

  const activeLayer = store.layers.find((l) => l.id === store.activeLayerId) || store.layers[0];
  const currentFrame = store.animation.frames[store.animation.currentFrameIndex];

  const currentPixels = useMemo(() => {
    let raw: unknown;
    if (currentFrame && activeLayer) {
      raw = currentFrame.layerPixels[activeLayer.id];
    } else {
      raw = activeLayer?.pixels;
    }
    if (raw instanceof Map) return raw;
    if (typeof raw === 'object' && raw !== null) {
      return new Map<string, string>(Object.entries(raw as Record<string, string>));
    }
    return new Map<string, string>();
  }, [currentFrame, activeLayer, store.layers]);

  const strokeRef = useRef<PixelChange[]>([]);

  const handlePixelDraw = useCallback(
    (x: number, y: number, color: string) => {
      const key = `${x},${y}`;
      const before = currentPixels.get(key) || null;
      if (before === color) return;
      strokeRef.current.push({ x, y, before, after: color });
      store.setPixel(x, y, color);
    },
    [store, currentPixels]
  );

  const handlePixelErase = useCallback(
    (x: number, y: number) => {
      const key = `${x},${y}`;
      const before = currentPixels.get(key) || null;
      if (before === null) return;
      strokeRef.current.push({ x, y, before, after: null });
      store.setPixel(x, y, null as any);
    },
    [store, currentPixels]
  );

  const handlePixelPick = useCallback(
    (color: string) => {
      store.setColor(color);
    },
    [store]
  );

  const handleStartDrawing = useCallback(() => {
    strokeRef.current = [];
    store.startDrawing();
  }, [store]);

  const handleEndDrawing = useCallback(() => {
    const changes = strokeRef.current;
    strokeRef.current = [];
    if (changes.length > 0) {
      store.commitDrawing(changes);
    } else {
      store.endDrawing();
    }
  }, [store]);

  const handleClearCanvas = useCallback(() => {
    store.clearCanvas();
    store.clearHistory();
  }, [store]);

  const handleResize = useCallback(() => {
    const w = Math.max(1, Math.min(256, parseInt(canvasW) || 64));
    const h = Math.max(1, Math.min(256, parseInt(canvasH) || 64));
    setCanvasW(String(w));
    setCanvasH(String(h));
    store.setProjectSettings({ width: w, height: h });
  }, [canvasW, canvasH, store]);

  const handleCreateProject = useCallback(() => {
    const w = Math.max(1, Math.min(256, parseInt(dialogW) || 64));
    const h = Math.max(1, Math.min(256, parseInt(dialogH) || 64));
    setDialogW(String(w));
    setDialogH(String(h));
    setCanvasW(String(w));
    setCanvasH(String(h));
    store.clearCanvas();
    store.clearHistory();
    store.setProjectSettings({ width: w, height: h });
    store.resetViewport();
    setShowCreateDialog(false);
  }, [dialogW, dialogH, store]);

  const generateExportDataUrl = useCallback((pixelSize: number, withBorder: boolean, bSize: number) => {
    const allPixels = new Map<string, string>();
    for (const layer of store.layers) {
      if (!layer.visible) continue;
      const layerPixels = layer.pixels instanceof Map ? layer.pixels : new Map<string, string>(Object.entries(layer.pixels || {} as Record<string, string>));
      layerPixels.forEach((color, key) => {
        if (!allPixels.has(key)) allPixels.set(key, color);
      });
    }

    if (allPixels.size === 0) return { dataUrl: '', w: 0, h: 0 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    allPixels.forEach((_, key) => {
      const [x, y] = key.split(',').map(Number);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    const contentW = maxX - minX + 1;
    const contentH = maxY - minY + 1;
    const borderPx = withBorder ? bSize : 0;
    const canvas = document.createElement('canvas');
    canvas.width = (contentW + borderPx * 2) * pixelSize;
    canvas.height = (contentH + borderPx * 2) * pixelSize;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (withBorder && bSize > 0) {
      ctx.fillStyle = store.project.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    allPixels.forEach((color, key) => {
      const [x, y] = key.split(',').map(Number);
      const dx = (x - minX + borderPx) * pixelSize;
      const dy = (y - minY + borderPx) * pixelSize;
      ctx.fillStyle = color;
      ctx.fillRect(dx, dy, pixelSize, pixelSize);
    });

    return { dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height };
  }, [store]);

  const handleExportPng = useCallback(() => {
    const result = generateExportDataUrl(exportPixelSize, showBorder, borderSize);
    setPreviewDataUrl(result.dataUrl);
    setPreviewW(result.w);
    setPreviewH(result.h);
    setShowPreview(true);
  }, [exportPixelSize, showBorder, borderSize, generateExportDataUrl]);

  const handleDownloadPng = useCallback(() => {
    const a = document.createElement('a');
    a.href = previewDataUrl;
    a.download = 'pixel-art.png';
    a.click();
  }, [previewDataUrl]);

  const handleImportImage = useCallback(
    async (file: File) => {
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = URL.createObjectURL(file);
        });

        const maxDim = 128;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, w, h);

        store.setProjectSettings({ width: w, height: h });
        store.clearCanvas();
        setCanvasW(String(w));
        setCanvasH(String(h));

        const imageData = ctx.getImageData(0, 0, w, h).data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = imageData[idx], g = imageData[idx + 1], b = imageData[idx + 2], a = imageData[idx + 3];
            if (a > 128) {
              const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
              store.setPixel(x, y, hex);
            }
          }
        }
      } catch (err) {
        console.error('Import failed:', err);
      }
    },
    [store]
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      {/* 顶部导航 */}
      <TopHeader />

      {/* 菜单栏 */}
      <TopMenuBar
        showGrid={store.showGrid}
        canUndo={store.undoStack.length > 0}
        canRedo={store.redoStack.length > 0}
        onToggleGrid={store.toggleGrid}
        onZoomIn={() => store.zoom(1.25)}
        onZoomOut={() => store.zoom(0.8)}
        onClearCanvas={handleClearCanvas}
        onExportPng={handleExportPng}
        onImportImage={handleImportImage}
        onUndo={store.undo}
        onRedo={store.redo}
      />

      <input ref={primaryColorRef} type="color" className="hidden" value={store.color} onChange={(e) => store.setColor(e.target.value)} />
      <input ref={secondaryColorRef} type="color" className="hidden" value={store.secondaryColor} onChange={(e) => store.setSecondaryColor(e.target.value)} />
      <input ref={bgColorRef} type="color" className="hidden" value={store.project.backgroundColor} onChange={(e) => store.setProjectSettings({ backgroundColor: e.target.value })} />

      {/* 主体：左侧工具栏 + 中间画布 + 右侧面板 */}
      <div className="flex-1 flex relative" style={{ overflow: 'hidden' }}>
        {/* 左侧工具栏 */}
        <div
          className="flex-shrink-0 py-2"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderRight: '1px solid var(--border-color)',
            width: 48,
            overflow: 'visible',
          }}
        >
          <ToolBar
            activeTool={store.tool as any}
            brushSize={store.brushSize}
            activeColor={store.color}
            secondaryColor={store.secondaryColor}
            onSelectTool={(tool) => store.setTool(tool)}
            onSetBrushSize={store.setBrushSize}
            onSwapColors={store.swapColors}
          />
        </div>

        {/* 中间占位 */}
        <div className="flex-1" style={{ backgroundColor: 'var(--background)' }} />

        {/* 右侧面板 */}
        <div
          className="flex-shrink-0 overflow-y-auto p-3 space-y-3"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderLeft: '1px solid var(--border-color)',
            width: 220,
          }}
        >
          {/* 色卡 */}
          <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--button-bg)' }}>
            <ColorPalette
              colors={store.palette}
              activeColor={store.color}
              secondaryColor={store.secondaryColor}
              onSelectColor={store.setColor}
              onSetSecondaryColor={store.setSecondaryColor}
              activePaletteId={store.activePaletteId}
              onSwitchPalette={store.setActivePalette}
              onAddColor={store.addPaletteColor}
            />
          </div>

          {/* 主/副色 + 背景色 */}
          <div className="rounded-xl p-3 space-y-3" style={{ backgroundColor: 'var(--button-bg)' }}>
            <div className="space-y-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>颜色</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded border-2 cursor-pointer"
                    style={{ backgroundColor: store.color, borderColor: 'var(--input-border)' }}
                    onClick={() => primaryColorRef.current?.click()}
                  />
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>主色</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded border-2 cursor-pointer"
                      style={{ backgroundColor: store.secondaryColor, borderColor: 'var(--input-border)' }}
                      onClick={() => secondaryColorRef.current?.click()}
                  />
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>副色</span>
                </div>
              </div>
            </div>

            <div
              className="w-full"
              style={{ height: '1px', backgroundColor: 'var(--border-color)' }}
            />

            <div className="space-y-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>背景色</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border-2 cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                  style={{
                    backgroundColor: store.project.backgroundColor,
                    borderColor: 'var(--input-border)',
                  }}
                  title="点击更换背景色"
                    onClick={() => bgColorRef.current?.click()}
                />
                <button
                  onClick={() => store.setProjectSettings({ backgroundColor: '#ffffff' })}
                  className="px-2 py-1 text-[10px] font-medium rounded transition-colors"
                  style={{
                    backgroundColor: 'var(--button-bg)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--input-border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--button-bg)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  重置白色
                </button>
              </div>
            </div>
          </div>

          {/* 图层 */}
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--button-bg)' }}>
            <LayerPanel
              layers={store.layers.map((l) => ({
                id: l.id,
                name: l.name,
                visible: l.visible,
                locked: l.locked,
                opacity: l.opacity,
              }))}
              activeLayerId={store.activeLayerId}
              onSelectLayer={store.setActiveLayer}
              onAddLayer={() => store.addLayer(`图层 ${store.layers.length + 1}`)}
              onRemoveLayer={store.removeLayer}
              onDuplicateLayer={store.duplicateLayer}
              onToggleVisibility={store.toggleLayerVisibility}
              onToggleLock={store.toggleLayerLock}
              onSetOpacity={store.setLayerOpacity}
              onMoveLayer={store.moveLayer}
              onMergeDown={store.mergeLayerDown}
            />
          </div>

          {/* 画布信息 */}
          <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--button-bg)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>画布尺寸</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={canvasW}
                onChange={(e) => setCanvasW(e.target.value)}
                className="w-14 px-1.5 py-1 text-xs text-center rounded"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                min={1}
                max={256}
              />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>×</span>
              <input
                type="number"
                value={canvasH}
                onChange={(e) => setCanvasH(e.target.value)}
                className="w-14 px-1.5 py-1 text-xs text-center rounded"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                min={1}
                max={256}
              />
              <button
                onClick={handleResize}
                className="px-2 py-1 text-[10px] font-medium rounded transition-colors flex-shrink-0"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                }}
              >
                调整
              </button>
            </div>
          </div>
        </div>

        {/* 中间画布（绝对定位，确保确定的尺寸和可靠滚动） */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 48,
            right: 220,
            bottom: 0,
            overflow: 'auto',
            backgroundColor: 'var(--background)',
          }}
          ref={canvasAreaRef}
        >
          <div style={{ display: 'table', margin: '0 auto' }}>
            <PixelCanvas
              width={store.project.width}
              height={store.project.height}
              pixelSize={store.viewport.scale}
              pixels={currentPixels}
              backgroundColor={store.project.backgroundColor}
              showGrid={store.showGrid}
              onPixelDraw={handlePixelDraw}
              onPixelErase={handlePixelErase}
              onPixelPick={handlePixelPick}
              activeColor={store.color}
              tool={store.tool}
              brushSize={store.brushSize}
              onStartDrawing={handleStartDrawing}
              onEndDrawing={handleEndDrawing}
            />
          </div>
        </div>
      </div>

      <canvas ref={exportCanvasRef} className="hidden" />

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
          <div
            className="rounded-2xl p-6 shadow-2xl w-[320px] space-y-4"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h2 className="text-base font-bold text-center" style={{ color: 'var(--text-primary)' }}>
              创建像素画
            </h2>

            <div className="flex items-center justify-center gap-2">
              <div className="space-y-1">
                <label className="text-[10px]" style={{ color: 'var(--text-muted)' }}>宽度</label>
                <input
                  type="number"
                  value={dialogW}
                  onChange={(e) => setDialogW(e.target.value)}
                  className="w-20 px-3 py-2 text-sm text-center rounded-lg"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                  min={1}
                  max={256}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject(); }}
                />
              </div>
              <span className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>×</span>
              <div className="space-y-1">
                <label className="text-[10px]" style={{ color: 'var(--text-muted)' }}>高度</label>
                <input
                  type="number"
                  value={dialogH}
                  onChange={(e) => setDialogH(e.target.value)}
                  className="w-20 px-3 py-2 text-sm text-center rounded-lg"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                  min={1}
                  max={256}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject(); }}
                />
              </div>
            </div>

            <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
              像素范围 1 ~ 256
            </p>

            <button
              onClick={handleCreateProject}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
            >
              创建
            </button>
          </div>
        </div>
      )}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setShowPreview(false)}>
          <div
            className="rounded-2xl shadow-2xl max-w-[92vw] max-h-[92vh] overflow-auto"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>预览导出</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {previewW} × {previewH} px
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--button-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row">
              <div className="p-4 flex items-center justify-center min-w-[200px]" style={{ backgroundColor: 'var(--background)' }}>
                <img
                  src={previewDataUrl}
                  alt="预览"
                  style={{ imageRendering: 'pixelated', maxWidth: '70vw', maxHeight: '50vh' }}
                />
              </div>

              <div className="p-4 border-t md:border-t-0 md:border-l flex flex-col gap-3 min-w-[200px]" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    像素块大小: {exportPixelSize}px
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={32}
                    value={exportPixelSize}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setExportPixelSize(val);
                      const result = generateExportDataUrl(val, showBorder, borderSize);
                      setPreviewDataUrl(result.dataUrl);
                      setPreviewW(result.w);
                      setPreviewH(result.h);
                    }}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showBorder}
                      onChange={(e) => {
                        setShowBorder(e.target.checked);
                        const result = generateExportDataUrl(exportPixelSize, e.target.checked, borderSize);
                        setPreviewDataUrl(result.dataUrl);
                        setPreviewW(result.w);
                        setPreviewH(result.h);
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>添加边框</span>
                  </label>
                </div>

                {showBorder && (
                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                      边框粗细: {borderSize}px
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={borderSize}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBorderSize(val);
                        const result = generateExportDataUrl(exportPixelSize, true, val);
                        setPreviewDataUrl(result.dataUrl);
                        setPreviewW(result.w);
                        setPreviewH(result.h);
                      }}
                      className="w-full"
                    />
                  </div>
                )}

                <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  边框颜色 = 画布背景 ({store.project.backgroundColor})
                </div>

                <div className="flex items-center gap-2 mt-auto pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'var(--button-bg)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--input-border)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--button-bg)'; }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      handleDownloadPng();
                      setShowPreview(false);
                    }}
                    className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                  >
                    下载 PNG
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

