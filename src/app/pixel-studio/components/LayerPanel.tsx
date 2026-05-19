'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Merge,
} from 'lucide-react';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

interface LayerData {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

interface LayerPanelProps {
  layers: LayerData[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onRemoveLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onMergeDown: (id: string) => void;
}

export default memo(function LayerPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onRemoveLayer,
  onDuplicateLayer,
  onToggleVisibility,
  onToggleLock,
  onSetOpacity,
  onMoveLayer,
  onMergeDown,
}: LayerPanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          图层
        </span>
        <motion.button
          onClick={onAddLayer}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          transition={springFast}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title="添加图层"
        >
          <Plus className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {[...layers].reverse().map((layer, revIndex) => {
          const index = layers.length - 1 - revIndex;
          const isActive = layer.id === activeLayerId;
          const canMoveUp = index < layers.length - 1;
          const canMoveDown = index > 0;
          const canMerge = index > 0;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all group"
              style={{
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--button-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              <motion.button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.88 }}
                transition={springFast}
                className="p-0.5 rounded flex-shrink-0 transition-colors"
                style={{ color: layer.visible ? 'var(--text-secondary)' : 'var(--text-muted)' }}
                title={layer.visible ? '隐藏' : '显示'}
              >
                {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </motion.button>

              <span
                className="flex-1 text-xs truncate"
                style={{ color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }}
              >
                {layer.name}
              </span>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {canMoveUp && (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'up'); }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.88 }}
                    transition={springFast}
                    className="p-0.5 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="上移"
                  >
                    <ArrowUp className="w-2.5 h-2.5" />
                  </motion.button>
                )}
                {canMoveDown && (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'down'); }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.88 }}
                    transition={springFast}
                    className="p-0.5 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="下移"
                  >
                    <ArrowDown className="w-2.5 h-2.5" />
                  </motion.button>
                )}
                <motion.button
                  onClick={(e) => { e.stopPropagation(); onDuplicateLayer(layer.id); }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.88 }}
                  transition={springFast}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="复制"
                >
                  <Copy className="w-2.5 h-2.5" />
                </motion.button>
                {canMerge && (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); onMergeDown(layer.id); }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.88 }}
                    transition={springFast}
                    className="p-0.5 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="向下合并"
                  >
                    <Merge className="w-2.5 h-2.5" />
                  </motion.button>
                )}
                {layers.length > 1 && (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.88 }}
                    transition={springFast}
                    className="p-0.5 rounded transition-colors"
                    style={{ color: 'var(--danger)' }}
                    title="删除"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </motion.button>
                )}
              </div>

              <motion.button
                onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.88 }}
                transition={springFast}
                className="p-0.5 rounded flex-shrink-0 transition-colors"
                style={{ color: layer.locked ? 'var(--warning)' : 'var(--text-muted)' }}
                title={layer.locked ? '解锁' : '锁定'}
              >
                {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </motion.button>
            </div>
          );
        })}
      </div>

      {layers.length === 0 && (
        <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
          暂无图层
        </div>
      )}
    </div>
  );
});