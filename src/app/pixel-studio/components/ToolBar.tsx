'use client';

import { memo, useState } from 'react';
import { Pencil, Eraser, PaintBucket, Pipette, Move, Square, Circle, Minus, Hand, SprayCan, ArrowUpDown } from 'lucide-react';

export type PixelTool = 'brush' | 'eraser' | 'bucket' | 'picker' | 'line' | 'rect' | 'ellipse' | 'move' | 'hand' | 'spray';

interface ToolConfig {
  id: PixelTool;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

const TOOLS: ToolConfig[] = [
  { id: 'brush', icon: <Pencil className="w-4 h-4" />, label: '画笔', shortcut: 'B' },
  { id: 'eraser', icon: <Eraser className="w-4 h-4" />, label: '橡皮', shortcut: 'E' },
  { id: 'bucket', icon: <PaintBucket className="w-4 h-4" />, label: '填充', shortcut: 'G' },
  { id: 'picker', icon: <Pipette className="w-4 h-4" />, label: '取色', shortcut: 'I' },
  { id: 'line', icon: <Minus className="w-4 h-4" />, label: '直线', shortcut: 'L' },
  { id: 'rect', icon: <Square className="w-4 h-4" />, label: '矩形', shortcut: 'R' },
  { id: 'ellipse', icon: <Circle className="w-4 h-4" />, label: '椭圆', shortcut: 'O' },
  { id: 'move', icon: <Move className="w-4 h-4" />, label: '移动', shortcut: 'M' },
  { id: 'hand', icon: <Hand className="w-4 h-4" />, label: '拖拽', shortcut: 'H' },
  { id: 'spray', icon: <SprayCan className="w-4 h-4" />, label: '喷枪', shortcut: 'S' },
];

const BRUSH_SIZES = [1, 2, 3, 4, 6, 8];

interface ToolBarProps {
  activeTool: PixelTool;
  brushSize: number;
  activeColor: string;
  secondaryColor: string;
  onSelectTool: (tool: PixelTool) => void;
  onSetBrushSize: (size: number) => void;
  onSwapColors: () => void;
}

const ToolButton = memo(function ToolButton({
  tool,
  isActive,
  onSelect,
}: {
  tool: ToolConfig;
  isActive: boolean;
  onSelect: (id: PixelTool) => void;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <button
      onClick={() => onSelect(tool.id)}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      className="relative w-9 h-8 flex items-center justify-center rounded-lg transition-all"
      style={{
        backgroundColor: showTip && !isActive ? 'var(--button-bg)' : isActive ? 'var(--primary)' : 'transparent',
        color: showTip && !isActive ? 'var(--text-primary)' : isActive ? '#ffffff' : 'var(--text-secondary)',
      }}
    >
      {tool.icon}
      {showTip && (
        <span
          className="absolute left-full ml-1.5 px-1.5 py-0.5 text-[10px] leading-none rounded whitespace-nowrap z-[999] border shadow-sm"
          style={{
            backgroundColor: 'var(--popover-bg, var(--card-bg))',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)',
          }}
        >
          {tool.label} ({tool.shortcut})
        </span>
      )}
    </button>
  );
});

const BrushSizeButton = memo(function BrushSizeButton({
  size,
  isActive,
  onSelect,
}: {
  size: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      className="w-9 h-7 flex items-center justify-center rounded transition-all relative"
      style={{ backgroundColor: isActive ? 'var(--primary-light)' : 'transparent' }}
    >
      <div
        className="rounded-full transition-all"
        style={{
          width: Math.min(size * 2 + 2, 16),
          height: Math.min(size * 2 + 2, 16),
          backgroundColor: isActive ? 'var(--primary)' : 'var(--text-secondary)',
        }}
      />
      {showTip && (
        <span
          className="absolute left-full ml-1.5 px-1.5 py-0.5 text-[10px] leading-none rounded whitespace-nowrap z-[999] border shadow-sm"
          style={{
            backgroundColor: 'var(--popover-bg, var(--card-bg))',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)',
          }}
        >
          {size}px
        </span>
      )}
    </button>
  );
});

export default memo(function ToolBar({
  activeTool,
  brushSize,
  activeColor,
  secondaryColor,
  onSelectTool,
  onSetBrushSize,
  onSwapColors,
}: ToolBarProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2">
      {TOOLS.map((tool) => (
        <ToolButton
          key={tool.id}
          tool={tool}
          isActive={activeTool === tool.id}
          onSelect={onSelectTool}
        />
      ))}

      <div className="w-6 h-px my-2" style={{ backgroundColor: 'var(--border-color)' }} />

      <div className="flex flex-col items-center gap-1">
        {BRUSH_SIZES.map((size) => (
          <BrushSizeButton
            key={size}
            size={size}
            isActive={brushSize === size}
            onSelect={() => onSetBrushSize(size)}
          />
        ))}
      </div>

      <div className="w-6 h-px my-2" style={{ backgroundColor: 'var(--border-color)' }} />

      <div
        className="relative w-9 h-9 cursor-pointer flex-shrink-0"
        onClick={onSwapColors}
        title="交换颜色 (X)"
      >
        <div
          className="absolute top-0 left-0 w-7 h-7 rounded transition-transform hover:scale-105"
          style={{ backgroundColor: activeColor, border: '1px solid rgba(128,128,128,0.55)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-7 h-7 rounded transition-transform hover:scale-105"
          style={{ backgroundColor: secondaryColor, border: '1px solid rgba(128,128,128,0.55)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <ArrowUpDown
            className="w-3.5 h-3.5"
            style={{ color: '#fff', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.85))' }}
          />
        </div>
      </div>
    </div>
  );
});