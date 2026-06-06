'use client';

import {
  Download, Upload, Trash2, Grid3X3, Loader2,
  AlertCircle, CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

interface ActionBarProps {
  isProcessing: boolean;
  hasGenerated: boolean;
  statusText: string;
  error: string | null;
  beadW: number;
  beadH: number;
  totalBeads: number;
  colorStatCount: number;
  activeTool: string | null;
  onUploadClick: () => void;
  onGenerate: () => void;
  onExport: () => void;
  onReset: () => void;
}

export default function ActionBar({
  isProcessing, hasGenerated, statusText, error,
  beadW, beadH, totalBeads, colorStatCount,
  activeTool,
  onUploadClick, onGenerate, onExport, onReset,
}: ActionBarProps) {
  return (
    <>
      {/* 操作栏 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <motion.button
            onClick={onUploadClick}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={springFast}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium"
            style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            <Upload className="w-3.5 h-3.5" />
            更换图片
          </motion.button>
          <motion.button
            onClick={onGenerate}
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
              onClick={onExport}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={springFast}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Download className="w-3.5 h-3.5" />
              导出 PNG
            </motion.button>
          )}
          <motion.button
            onClick={onReset}
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

      {/* 统计信息 */}
      {hasGenerated && (
        <p className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          {beadW} × {beadH} 豆 · {totalBeads} 颗 · {colorStatCount} 色
          {activeTool === 'brush' && ' · 点击豆格涂色'}
          {activeTool === 'picker' && ' · 点击豆格取色'}
          {!activeTool && ' · 滚轮缩放 · 按住拖拽平移'}
        </p>
      )}
    </>
  );
}
