'use client';

import { memo } from 'react';
import { Plus, Trash2, Copy, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface FrameData {
  id: string;
  name: string;
  duration: number;
}

interface FramePanelProps {
  frames: FrameData[];
  currentFrameIndex: number;
  isPlaying: boolean;
  fps: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onRemoveFrame: (index: number) => void;
  onDuplicateFrame: (index: number) => void;
  onSetFrameDuration: (index: number, duration: number) => void;
  onTogglePlayback: () => void;
  onSetFps: (fps: number) => void;
}

export default memo(function FramePanel({
  frames,
  currentFrameIndex,
  isPlaying,
  fps,
  onSelectFrame,
  onAddFrame,
  onRemoveFrame,
  onDuplicateFrame,
  onSetFrameDuration,
  onTogglePlayback,
  onSetFps,
}: FramePanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          帧 ({frames.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddFrame}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="添加帧"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {frames.length > 0 && (
        <>
          <div className="flex items-center justify-center gap-2 py-1">
            <button
              onClick={() => onSelectFrame(Math.max(0, currentFrameIndex - 1))}
              disabled={currentFrameIndex === 0}
              className="p-1 rounded disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onTogglePlayback}
              className="p-1.5 rounded-full"
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onSelectFrame(Math.min(frames.length - 1, currentFrameIndex + 1))}
              disabled={currentFrameIndex === frames.length - 1}
              className="p-1 rounded disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>FPS:</span>
            <input
              type="number"
              value={fps}
              onChange={(e) => onSetFps(Math.max(1, Math.min(30, Number(e.target.value) || 12)))}
              className="w-12 px-1 py-0.5 rounded text-xs text-center"
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
              }}
              min={1}
              max={30}
            />
          </div>

          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {frames.map((frame, index) => (
              <div
                key={frame.id}
                onClick={() => onSelectFrame(index)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all group"
                style={{
                  backgroundColor: index === currentFrameIndex ? 'var(--primary-light)' : 'transparent',
                  border: index === currentFrameIndex ? '1px solid var(--primary)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (index !== currentFrameIndex) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--button-bg)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (index !== currentFrameIndex) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span
                  className="flex-1 text-xs truncate"
                  style={{ color: index === currentFrameIndex ? 'var(--primary)' : 'var(--text-secondary)' }}
                >
                  {frame.name}
                </span>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicateFrame(index); }}
                    className="p-0.5 rounded"
                    style={{ color: 'var(--text-muted)' }}
                    title="复制帧"
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                  {frames.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveFrame(index); }}
                      className="p-0.5 rounded"
                      style={{ color: 'var(--danger)' }}
                      title="删除帧"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                <input
                  type="number"
                  value={frame.duration}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onSetFrameDuration(index, Math.max(10, Number(e.target.value) || 100))}
                  className="w-12 px-1 py-0.5 rounded text-xs text-center flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                  min={10}
                  step={10}
                  title="延迟 (ms)"
                />
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>ms</span>
              </div>
            ))}
          </div>
        </>
      )}

      {frames.length === 0 && (
        <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
          点击 + 添加帧
        </div>
      )}
    </div>
  );
});