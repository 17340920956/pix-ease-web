'use client';

import { useRef, useEffect, useCallback, memo } from 'react';

interface PixelCanvasProps {
  width: number;
  height: number;
  pixelSize: number;
  pixels: Map<string, string>;
  backgroundColor: string;
  showGrid: boolean;
  gridColor?: string;
  onPixelDraw: (x: number, y: number, color: string) => void;
  onPixelErase: (x: number, y: number) => void;
  onPixelPick?: (color: string) => void;
  activeColor: string;
  tool: string;
  brushSize: number;
  onStartDrawing: () => void;
  onEndDrawing: () => void;
}

const DEFAULT_GRID_COLOR = 'rgba(160, 160, 160, 0.3)';

function floodFillCoords(
  startX: number, startY: number,
  pixels: Map<string, string>, width: number, height: number
): [number, number][] {
  const result: [number, number][] = [];
  const visited = new Set<string>();
  const stack: [number, number][] = [[startX, startY]];
  const actualTarget = pixels.get(`${startX},${startY}`) || null;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if ((pixels.get(key) || null) !== actualTarget) continue;
    visited.add(key);
    result.push([x, y]);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return result;
}

function bresenhamLine(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const points: [number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0, y = y0;
  while (true) {
    points.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return points;
}

function rectOutline(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const points: [number, number][] = [];
  const xMin = Math.min(x0, x1), xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1), yMax = Math.max(y0, y1);
  for (let x = xMin; x <= xMax; x++) { points.push([x, yMin]); points.push([x, yMax]); }
  for (let y = yMin + 1; y < yMax; y++) { points.push([xMin, y]); points.push([xMax, y]); }
  return points;
}

function ellipseOutline(cx: number, cy: number, rx: number, ry: number): [number, number][] {
  const points = new Set<string>();
  if (rx <= 0 || ry <= 0) return [];
  let x = 0, y = ry;
  let d1 = ry * ry - rx * rx * ry + 0.25 * rx * rx;
  let dx = 2 * ry * ry * x, dy = 2 * rx * rx * y;
  while (dx < dy) {
    points.add(`${cx + x},${cy + y}`); points.add(`${cx - x},${cy + y}`);
    points.add(`${cx + x},${cy - y}`); points.add(`${cx - x},${cy - y}`);
    if (d1 < 0) { x++; dx += 2 * ry * ry; d1 += dx + ry * ry; }
    else { x++; y--; dx += 2 * ry * ry; dy -= 2 * rx * rx; d1 += dx - dy + ry * ry; }
  }
  let d2 = ry * ry * (x + 0.5) * (x + 0.5) + rx * rx * (y - 1) * (y - 1) - rx * rx * ry * ry;
  while (y >= 0) {
    points.add(`${cx + x},${cy + y}`); points.add(`${cx - x},${cy + y}`);
    points.add(`${cx + x},${cy - y}`); points.add(`${cx - x},${cy - y}`);
    if (d2 > 0) { y--; dy -= 2 * rx * rx; d2 += rx * rx - dy; }
    else { y--; x++; dx += 2 * ry * ry; dy -= 2 * rx * rx; d2 += dx - dy + rx * rx; }
  }
  return Array.from(points).map(s => s.split(',').map(Number) as [number, number]);
}

export default memo(function PixelCanvas({
  width,
  height,
  pixelSize,
  pixels,
  backgroundColor,
  showGrid,
  gridColor = DEFAULT_GRID_COLOR,
  onPixelDraw,
  onPixelErase,
  onPixelPick,
  activeColor,
  tool,
  brushSize,
  onStartDrawing,
  onEndDrawing,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);
  const sprayTimerRef = useRef<number>(0);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchIdRef = useRef<number | null>(null);

  const canvasWidth = width * pixelSize;
  const canvasHeight = height * pixelSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const pixelMap: Map<string, string> =
      pixels instanceof Map ? pixels : new Map(Object.entries(pixels || {}));

    pixelMap.forEach((color, key) => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = color;
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    });
  }, [pixels, pixelSize, canvasWidth, canvasHeight]);

  const clearPreview = useCallback(() => {
    const pv = previewRef.current;
    if (!pv) return;
    const ctx = pv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight]);

  const drawPreviewShape = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    const pv = previewRef.current;
    if (!pv) return;
    const ctx = pv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = activeColor;
    let coords: [number, number][] = [];
    if (tool === 'line') coords = bresenhamLine(start.x, start.y, end.x, end.y);
    else if (tool === 'rect') coords = rectOutline(start.x, start.y, end.x, end.y);
    else if (tool === 'ellipse') {
      const rx = Math.abs(end.x - start.x);
      const ry = Math.abs(end.y - start.y);
      coords = ellipseOutline(start.x, start.y, rx, ry);
    }
    coords.forEach(([px, py]) => {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        ctx.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
      }
    });
  }, [tool, activeColor, pixelSize, width, height, canvasWidth, canvasHeight]);

  const getCoordsFromPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = Math.floor(((clientX - rect.left) * scaleX) / pixelSize);
      const py = Math.floor(((clientY - rect.top) * scaleY) / pixelSize);
      if (px < 0 || px >= width || py < 0 || py >= height) return null;
      return { x: px, y: py };
    },
    [pixelSize, width, height]
  );

  const drawSpray = useCallback(
    (cx: number, cy: number) => {
      const r = Math.max(brushSize, 2);
      const count = brushSize * 3;
      const drawn = new Set<string>();
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * r;
        const px = Math.round(cx + Math.cos(angle) * dist);
        const py = Math.round(cy + Math.sin(angle) * dist);
        if (px < 0 || px >= width || py < 0 || py >= height) continue;
        const key = `${px},${py}`;
        if (drawn.has(key)) continue;
        drawn.add(key);
        onPixelDraw(px, py, activeColor);
      }
    },
    [brushSize, width, height, activeColor, onPixelDraw]
  );

  const drawBrush = useCallback(
    (cx: number, cy: number) => {
      const r = Math.floor(brushSize / 2);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const px = cx + dx, py = cy + dy;
          if (px < 0 || px >= width || py < 0 || py >= height) continue;
          const key = `${px},${py}`;
          if (key === lastKeyRef.current) continue;
          if (tool === 'eraser') onPixelErase(px, py);
          else { onPixelDraw(px, py, activeColor); }
        }
      }
    },
    [brushSize, width, height, tool, activeColor, onPixelDraw, onPixelErase]
  );

  const startDraw = useCallback((coords: { x: number; y: number }) => {
    if (tool === 'bucket') {
      const pts = floodFillCoords(coords.x, coords.y, pixels, width, height);
      pts.forEach(([px, py]) => onPixelDraw(px, py, activeColor));
      return false;
    }
    if (tool === 'picker') {
      const color = pixels.get(`${coords.x},${coords.y}`);
      if (color) onPixelPick?.(color);
      return false;
    }
    if (tool === 'hand') return false;

    isDrawingRef.current = true;
    onStartDrawing();
    lastKeyRef.current = null;

    if (tool === 'line' || tool === 'rect' || tool === 'ellipse') {
      shapeStartRef.current = coords;
      drawPreviewShape(coords, coords);
    } else if (tool === 'spray') {
      drawSpray(coords.x, coords.y);
      sprayTimerRef.current = window.setInterval(() => drawSpray(coords.x, coords.y), 50);
    } else {
      drawBrush(coords.x, coords.y);
    }
    return true;
  }, [tool, pixels, width, height, activeColor, onPixelDraw, onPixelPick, onStartDrawing, drawBrush, drawSpray, drawPreviewShape]);

  const moveDraw = useCallback((coords: { x: number; y: number }) => {
    if (!isDrawingRef.current) return;
    if (tool === 'hand') return;
    if ((tool === 'line' || tool === 'rect' || tool === 'ellipse') && shapeStartRef.current) {
      drawPreviewShape(shapeStartRef.current, coords);
    } else if (tool === 'spray') {
      drawSpray(coords.x, coords.y);
    } else {
      drawBrush(coords.x, coords.y);
    }
  }, [tool, drawBrush, drawSpray, drawPreviewShape]);

  const endDraw = useCallback(() => {
    if ((tool === 'line' || tool === 'rect' || tool === 'ellipse') && shapeStartRef.current && isDrawingRef.current) {
      const pv = previewRef.current;
      if (pv) {
        const ctx = pv.getContext('2d');
        if (ctx) {
          const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const idx = (y * pixelSize * canvasWidth + x * pixelSize) * 4;
              if (idx + 3 < imgData.length && imgData[idx + 3] > 0) {
                onPixelDraw(x, y, activeColor);
              }
            }
          }
        }
      }
      clearPreview();
      shapeStartRef.current = null;
    }
    if (sprayTimerRef.current) { clearInterval(sprayTimerRef.current); sprayTimerRef.current = 0; }
    if (isDrawingRef.current) { isDrawingRef.current = false; onEndDrawing(); lastKeyRef.current = null; }
  }, [tool, activeColor, onPixelDraw, onEndDrawing, clearPreview, pixelSize, canvasWidth, height]);

  useEffect(() => {
    const handleGlobalUp = () => {
      if (sprayTimerRef.current) { clearInterval(sprayTimerRef.current); sprayTimerRef.current = 0; }
      if (isDrawingRef.current) { isDrawingRef.current = false; onEndDrawing(); clearPreview(); shapeStartRef.current = null; }
    };
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => { window.removeEventListener('mouseup', handleGlobalUp); window.removeEventListener('touchend', handleGlobalUp); };
  }, [onEndDrawing, clearPreview]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordsFromPoint(e.clientX, e.clientY);
    if (!coords) return;
    startDraw(coords);
  }, [getCoordsFromPoint, startDraw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordsFromPoint(e.clientX, e.clientY);
    if (!coords) return;
    moveDraw(coords);
  }, [getCoordsFromPoint, moveDraw]);

  const handleMouseUp = useCallback(() => endDraw(), [endDraw]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    const coords = getCoordsFromPoint(touch.clientX, touch.clientY);
    if (!coords) return;
    startDraw(coords);
  }, [getCoordsFromPoint, startDraw]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
    if (!touch) return;
    const coords = getCoordsFromPoint(touch.clientX, touch.clientY);
    if (!coords) return;
    moveDraw(coords);
  }, [getCoordsFromPoint, moveDraw]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
    if (!touch) return;
    touchIdRef.current = null;
    endDraw();
  }, [endDraw]);

  const gridStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: showGrid ? 1 : 0,
    transition: 'opacity 0.15s',
    backgroundImage: `
      linear-gradient(to right, ${gridColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
    `,
    backgroundSize: `${pixelSize}px ${pixelSize}px`,
  };

  const cursorMap: Record<string, string> = {
    bucket: 'crosshair', picker: 'crosshair', spray: 'crosshair',
    eraser: 'crosshair', line: 'crosshair', rect: 'crosshair',
    ellipse: 'crosshair', hand: 'grab', move: 'move',
  };

  return (
    <div
      className="relative inline-block select-none"
      style={{
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor,
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="block absolute inset-0"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          imageRendering: 'pixelated',
          cursor: cursorMap[tool] || 'crosshair',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <canvas
        ref={previewRef}
        width={canvasWidth}
        height={canvasHeight}
        className="block absolute inset-0 pointer-events-none"
        style={{ width: canvasWidth, height: canvasHeight, imageRendering: 'pixelated' }}
      />

      <div style={gridStyle} aria-hidden="true" />
    </div>
  );
});