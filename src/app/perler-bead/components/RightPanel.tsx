'use client';

import { Palette, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { BeadColor, BeadShape, QualityTier } from '@/lib/bead/types';
import { brandPalettes } from '@/lib/colorData';
import { textColor } from '@/lib/colorUtils';
import AnimatedDropdown from '@/components/AnimatedDropdown';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

function PaletteCollapse({ palette }: { palette: BeadColor[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs font-medium w-full"
        style={{ color: 'var(--text-secondary)' }}
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        色卡预览
        <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>· {palette.length} 色</span>
      </button>
      {expanded && (
        <div className="grid grid-cols-10 gap-0.5">
          {palette.map((c) => (
            <div
              key={c.code}
              className="aspect-square rounded-sm border cursor-default flex items-center justify-center"
              style={{ backgroundColor: c.hex, borderColor: 'var(--border-color)' }}
              title={`${c.code} · ${c.name}`}
            >
              <span className="text-[7px] font-bold" style={{ color: textColor(c.hex) }}>{c.code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const QUALITY_TIERS: { value: QualityTier; label: string; desc: string; dim: number }[] = [
  { value: 'standard', label: '标准', desc: '最长边 60 格', dim: 60 },
  { value: 'fine', label: '精细', desc: '最长边 90 格', dim: 90 },
  { value: 'ultra', label: '极致', desc: '最长边 120 格', dim: 120 },
];

interface RightPanelProps {
  brand: string;
  qualityTier: QualityTier;
  customGridSize: number | '';
  removeBg: boolean;
  transitionColorThreshold: number | '';
  beadShape: BeadShape;
  showGridLines: boolean;
  maxColorLimit: number | '';
  hasGenerated: boolean;
  colorStatLength: number;
  onClose?: () => void;
  onBrandChange: (v: string) => void;
  onQualityTierChange: (v: QualityTier) => void;
  onCustomGridSizeChange: (v: number | '') => void;
  onApplyCustomGrid: () => void;
  onRemoveBgChange: () => void;
  onTransitionColorThresholdChange: (v: number | '') => void;
  onBeadShapeChange: (v: BeadShape) => void;
  onShowGridLinesChange: (v: boolean) => void;
  onMaxColorLimitChange: (v: number | '') => void;
  onApplyColorLimit: () => void;
}

export default function RightPanel({
  brand, qualityTier, customGridSize, removeBg, transitionColorThreshold, beadShape,
  maxColorLimit, hasGenerated, colorStatLength, showGridLines, onClose,
  onBrandChange, onQualityTierChange, onCustomGridSizeChange, onApplyCustomGrid, onRemoveBgChange,
  onTransitionColorThresholdChange,
  onBeadShapeChange, onShowGridLinesChange, onMaxColorLimitChange, onApplyColorLimit,
}: RightPanelProps) {
  const paletteOptions = Object.entries(brandPalettes).map(([key, val]) => ({
    value: key,
    label: val.label,
  }));

  return (
    <div className="w-72 flex-shrink-0 overflow-y-auto border-l flex flex-col" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
      {onClose && (
        <div className="flex items-center justify-between p-3 border-b md:hidden" style={{ borderColor: 'var(--border-color)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>图纸设置</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      )}
      <div className="p-4 space-y-5">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Palette className="w-4 h-4" />
          图纸设置
        </h3>

        {/* 品牌选择 */}
        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>拼豆品牌</label>
          <AnimatedDropdown
            value={brand}
            options={paletteOptions}
            onChange={onBrandChange}
            placeholder="选择品牌"
          />
        </div>

        {/* 色卡预览 - 折叠展示 */}
        <PaletteCollapse palette={brandPalettes[brand]?.colors || []} />

        {/* 精细度等级 */}
        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>精细度等级</label>
          <div className="grid grid-cols-3 gap-1.5">
            {QUALITY_TIERS.map((qt) => (
              <motion.button
                key={qt.value}
                onClick={() => onQualityTierChange(qt.value)}
                disabled={customGridSize !== ''}
                whileHover={{ scale: customGridSize !== '' ? 1 : 1.05 }}
                whileTap={{ scale: customGridSize !== '' ? 1 : 0.95 }}
                transition={springFast}
                className={`py-2 rounded-xl text-xs font-medium ${customGridSize !== '' ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                style={{
                  backgroundColor: qt.value === qualityTier ? 'var(--primary)' : 'var(--background)',
                  color: qt.value === qualityTier ? '#fff' : 'var(--text-secondary)',
                  border: qt.value === qualityTier ? 'none' : '1px solid var(--input-border)',
                }}
              >
                <div className="text-[11px]">{qt.label}</div>
                <div className="text-[10px] opacity-70">{qt.desc}</div>
              </motion.button>
            ))}
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {customGridSize !== '' ? `自定义网格已启用（${customGridSize} 格），精细度已禁用` : '标准保留轮廓 · 极致还原细节'}
          </p>
        </div>

        {/* 自定义网格 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>自定义网格</label>
            <input
              type="number" min={1} max={300} placeholder="最长边格数（1-300）"
              value={customGridSize}
              onChange={e => {
                const v = e.target.value === '' ? '' : parseInt(e.target.value);
                if (v === '' || (v >= 1 && v <= 300)) onCustomGridSizeChange(v);
              }}
              onKeyDown={e => { if (e.key === 'Enter' && customGridSize !== '') onApplyCustomGrid(); }}
              className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
            />
            <motion.button
              onClick={onApplyCustomGrid}
              disabled={customGridSize === '' || customGridSize < 1}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              transition={springFast}
              className="px-4 py-2 rounded-xl text-xs font-medium disabled:opacity-40 flex-shrink-0"
              style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              应用
            </motion.button>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {customGridSize !== '' ? `当前: 最长边 ${customGridSize} 格` : `当前使用精细度等级（最长边 ${QUALITY_TIERS.find(t => t.value === qualityTier)?.dim} 格）`}
          </p>
        </div>

        {/* 颜色数量限制 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>颜色数量限制</label>
            <input
              type="number" min={1} max={colorStatLength || 256} placeholder="不限"
              value={maxColorLimit} onChange={e => onMaxColorLimitChange(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
            />
            <motion.button
              onClick={onApplyColorLimit}
              disabled={maxColorLimit === '' || maxColorLimit < 1 || !hasGenerated}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              transition={springFast}
              className="px-4 py-2 rounded-xl text-xs font-medium disabled:opacity-40 flex-shrink-0"
              style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              应用
            </motion.button>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>限制后非保留色自动替换为最近色</p>
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--border-color)' }} />

        {/* AI 去背景 */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>AI 智能抠图</span>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>自动去除背景，保留主体</p>
          </div>
          <motion.button
            onClick={onRemoveBgChange}
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

        {/* 去除过渡色阈值 */}
        <div className="space-y-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>过渡色阈值</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>孤立像素阈值：</span>
              <input
                type="number" min={1} max={20} placeholder="3"
                value={transitionColorThreshold} onChange={e => onTransitionColorThresholdChange(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1.5 rounded-lg text-xs border outline-none"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
              />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>次以下将被替换</span>
            </div>
        </div>

        {/* 豆子形状 */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>豆子形状</span>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>方形色块 / 圆形色块</p>
          </div>
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--input-border)' }}>
            <motion.button
              onClick={() => onBeadShapeChange('square')}
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
              onClick={() => onBeadShapeChange('circle')}
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

        {/* 网格显示 */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>网格显示</span>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>5×5 细线 + 20×20 粗线</p>
          </div>
          <motion.button
            onClick={() => onShowGridLinesChange(!showGridLines)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={springFast}
            className="relative w-9 h-5 rounded-full flex-shrink-0"
            style={{ backgroundColor: showGridLines ? 'var(--primary)' : 'var(--input-border)' }}
          >
            <motion.span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
              animate={{ left: showGridLines ? 18 : 2 }}
              transition={springFast}
            />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
