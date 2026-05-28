import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Circle, Rect, Line, Text } from 'react-konva';
import Konva from 'konva';
import { useBeadStore } from '../../store/useBeadStore';
import { getColors } from '../../palette/colors';

const CELL_SIZE = 18;
const BEAD_RADIUS = 7;
const BEAD_SQUARE_SIZE = 14;
const BEAD_CORNER = 2;
const GRID_COLOR = '#e0e0e0';
const GRID_MAJOR_COLOR = '#b0b0b0';
const LABEL_COLOR = '#666666';
const CODE_FONT_SIZE = 6;

interface Props {
  onUploadClick: () => void;
}

export function BeadCanvas({ onUploadClick }: Props) {
  const store = useBeadStore();
  const {
    beads, beadW, beadH, tool, selectedColor, beadShape,
    viewMode, showGridLabels, showColorCodes,
    undo, redo, setPixel, imageUrl,
  } = store;

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const isDrawing = useRef(false);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: rect.width, h: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - pos.x) / oldScale,
      y: (pointer.y - pos.y) / oldScale,
    };

    const newScale = e.evt.deltaY < 0
      ? Math.min(3, oldScale * scaleBy)
      : Math.max(0.2, oldScale / scaleBy);

    setScale(newScale);
    setPos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, [scale, pos]);

  const getCellFromPointer = useCallback((): [number, number] | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const point = stage.getPointerPosition();
    if (!point) return null;
    const x = Math.floor((point.x - pos.x) / (CELL_SIZE * scale));
    const y = Math.floor((point.y - pos.y) / (CELL_SIZE * scale));
    if (x < 0 || x >= beadW || y < 0 || y >= beadH) return null;
    return [x, y];
  }, [pos, scale, beadW, beadH]);

  const handleMouseDown = useCallback(() => {
    if (tool === 'select') return;
    isDrawing.current = true;
    const cell = getCellFromPointer();
    if (!cell) return;
    const [x, y] = cell;
    if (tool === 'eraser') {
      setPixel(x, y, null);
    } else if (tool === 'pen' && selectedColor) {
      setPixel(x, y, selectedColor);
    }
  }, [tool, selectedColor, getCellFromPointer, setPixel]);

  const handleMouseMove = useCallback(() => {
    if (!isDrawing.current) return;
    const cell = getCellFromPointer();
    if (!cell) return;
    const [x, y] = cell;
    if (tool === 'eraser') {
      setPixel(x, y, null);
    } else if (tool === 'pen' && selectedColor) {
      setPixel(x, y, selectedColor);
    }
  }, [tool, selectedColor, getCellFromPointer, setPixel]);

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const gridLines = useMemo(() => {
    const lines: Array<{ points: number[]; stroke: string; width: number }> = [];
    const totalW = beadW * CELL_SIZE;
    const totalH = beadH * CELL_SIZE;

    for (let x = 0; x <= beadW; x++) {
      const isMajor = x % 5 === 0;
      lines.push({
        points: [x * CELL_SIZE, 0, x * CELL_SIZE, totalH],
        stroke: isMajor ? GRID_MAJOR_COLOR : GRID_COLOR,
        width: isMajor ? 1 : 0.5,
      });
    }
    for (let y = 0; y <= beadH; y++) {
      const isMajor = y % 5 === 0;
      lines.push({
        points: [0, y * CELL_SIZE, totalW, y * CELL_SIZE],
        stroke: isMajor ? GRID_MAJOR_COLOR : GRID_COLOR,
        width: isMajor ? 1 : 0.5,
      });
    }
    return lines;
  }, [beadW, beadH]);

  const gridLabels = useMemo(() => {
    if (!showGridLabels) return [];
    const labels: Array<{ x: number; y: number; text: string }> = [];

    for (let x = 0; x < beadW; x += 5) {
      labels.push({ x: x * CELL_SIZE + 2, y: 2, text: String(x) });
    }
    for (let y = 0; y < beadH; y += 5) {
      labels.push({ x: 2, y: y * CELL_SIZE + 12, text: String(y) });
    }
    return labels;
  }, [showGridLabels, beadW, beadH]);

  const beadShapes = useMemo(() => {
    const shapes: Array<{
      x: number; y: number; color: string; code: string; key: string;
    }> = [];
    const colors = getColors(store.brand);
    const codeMap = new Map<string, string>();
    for (const c of colors) {
      codeMap.set(c.hex.toUpperCase(), c.code);
    }

    beads.forEach((hex, key) => {
      const [x, y] = key.split(',').map(Number);
      const code = codeMap.get(hex.toUpperCase()) || '';
      shapes.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        color: hex,
        code,
        key,
      });
    });
    return shapes;
  }, [beads, store.brand]);

  const isSquare = beadShape === 'square';
  const beadOffset = isSquare ? BEAD_SQUARE_SIZE / 2 : 0;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (!imageUrl || beadW === 0 || beadH === 0) {
    return (
      <div
        ref={containerRef}
        className="canvas-container canvas-empty"
        onClick={onUploadClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="canvas-drop-hint">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
          <p>拖拽图片到此处，或点击上传按钮</p>
          <p className="hint-sub">支持 JPG / PNG / WebP</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="canvas-container">
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
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTap={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <Layer>
          {gridLines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.stroke}
              strokeWidth={line.width}
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}
          {beadShapes.map((b) => (
              isSquare ? (
                <Rect
                  key={b.key}
                  x={b.x - beadOffset}
                  y={b.y - beadOffset}
                  width={BEAD_SQUARE_SIZE}
                  height={BEAD_SQUARE_SIZE}
                  cornerRadius={BEAD_CORNER}
                  fill={b.color}
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={0.5}
                  perfectDrawEnabled={false}
                  shadowForStrokeEnabled={false}
                  listening={false}
                />
              ) : (
                <Circle
                  key={b.key}
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
              )
            ))}
          {showColorCodes && beadShapes.map((b) => (
            <Text
              key={`code-${b.key}`}
              x={b.x - CELL_SIZE / 2 + 1}
              y={b.y - 3}
              text={b.code}
              fontSize={CODE_FONT_SIZE}
              fontFamily="monospace"
              fill={b.color === '#000000' ? '#fff' : '#000'}
              opacity={0.7}
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}
          {gridLabels.map((l, i) => (
            <Text
              key={`label-${i}`}
              x={l.x}
              y={l.y}
              text={l.text}
              fontSize={8}
              fontFamily="monospace"
              fill={LABEL_COLOR}
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
