'use client';

import { memo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Download,
  Grid3x3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Undo2,
  Redo2,
} from 'lucide-react';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

interface TopMenuBarProps {
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClearCanvas: () => void;
  onExportPng: () => void;
  onImportImage: (file: File) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotateClockwise: () => void;
  onRotateCounterClockwise: () => void;
}

function ToolbarButton({
  onClick,
  disabled,
  icon,
  label,
  active,
  danger,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <motion.button
        onClick={onClick}
        disabled={disabled}
        title={label}
        whileHover={{ scale: disabled ? 1 : 1.08 }}
        whileTap={{ scale: disabled ? 1 : 0.94 }}
        transition={springFast}
        className="w-8 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-25"
        style={{
          backgroundColor: active ? 'var(--primary-light)' : 'transparent',
          color: danger ? 'var(--danger)' : active ? 'var(--primary)' : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !active) {
            e.currentTarget.style.backgroundColor = 'var(--button-bg)';
            e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-secondary)';
          }
        }}
      >
        {icon}
      </motion.button>
      {showTip && !disabled && (
        <span
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 text-[11px] font-medium leading-none rounded-md whitespace-nowrap z-[9999] border shadow-lg pointer-events-none"
          style={{
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export default memo(function TopMenuBar({
  showGrid,
  canUndo,
  canRedo,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onClearCanvas,
  onExportPng,
  onImportImage,
  onUndo,
  onRedo,
  onFlipHorizontal,
  onFlipVertical,
  onRotateClockwise,
  onRotateCounterClockwise,
}: TopMenuBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex items-center gap-0.5 px-2 py-1 flex-shrink-0 overflow-x-auto scrollbar-hide"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-color)',
        zIndex: 0,
      }}
    >
      <ToolbarButton onClick={onUndo} disabled={!canUndo} label="撤销 (Ctrl+Z)"
        icon={<Undo2 className="w-4 h-4" />} />
      <ToolbarButton onClick={onRedo} disabled={!canRedo} label="重做 (Ctrl+Shift+Z)"
        icon={<Redo2 className="w-4 h-4" />} />

      <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />

      <ToolbarButton onClick={onZoomIn} label="放大"
        icon={<ZoomIn className="w-4 h-4" />} />
      <ToolbarButton onClick={onZoomOut} label="缩小"
        icon={<ZoomOut className="w-4 h-4" />} />
      <ToolbarButton onClick={onToggleGrid} label={showGrid ? '隐藏网格' : '显示网格'} active={showGrid}
        icon={<Grid3x3 className="w-4 h-4" />} />

      <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />

      <ToolbarButton onClick={() => fileInputRef.current?.click()} label="导入图片"
        icon={<Upload className="w-4 h-4" />} />
      <ToolbarButton onClick={onExportPng} label="导出 PNG"
        icon={<Download className="w-4 h-4" />} />

      <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />

      <ToolbarButton onClick={onFlipHorizontal} label="水平翻转"
        icon={<FlipHorizontal className="w-4 h-4" />} />
      <ToolbarButton onClick={onFlipVertical} label="垂直翻转"
        icon={<FlipVertical className="w-4 h-4" />} />
      <ToolbarButton onClick={onRotateClockwise} label="顺时针旋转90°"
        icon={<RotateCw className="w-4 h-4" />} />
      <ToolbarButton onClick={onRotateCounterClockwise} label="逆时针旋转90°"
        icon={<RotateCcw className="w-4 h-4" />} />

      <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />

      <ToolbarButton onClick={onClearCanvas} label="清空画布" danger
        icon={<Trash2 className="w-4 h-4" />} />

      <div className="flex-1" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportImage(file);
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
});