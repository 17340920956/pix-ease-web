'use client';

interface LeftPanelProps {
  imageUrl: string | null;
  colorStats: ColorStat[];
  totalBeads: number;
}

interface ColorStat {
  code: string;
  name: string;
  hex: string;
  count: number;
  percentage: number;
}

import { ImageIcon, Info } from 'lucide-react';

function textColor(hex: string): string {
  const rr = parseInt(hex.slice(1, 3), 16);
  const gg = parseInt(hex.slice(3, 5), 16);
  const bb = parseInt(hex.slice(5, 7), 16);
  return (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255 > 0.5 ? '#333' : '#fff';
}

export default function LeftPanel({ imageUrl, colorStats, totalBeads }: LeftPanelProps) {
  return (
    <div className="w-72 flex-shrink-0 overflow-y-auto border-r flex flex-col" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
      {/* 原图预览 */}
      {imageUrl && (
        <div className="p-4 pb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>原图预览</span>
          <div className="mt-1.5 rounded-xl overflow-hidden border flex items-center justify-center" style={{ borderColor: 'var(--input-border)', aspectRatio: '1/1', backgroundColor: '#f0f0f0' }}>
            <img
              src={imageUrl}
              alt="原图"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* 色卡统计面板 */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Info className="w-4 h-4" />
              色卡统计
            </h3>
            {totalBeads > 0 && (
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {totalBeads} 颗 · {colorStats.length} 色
              </span>
            )}
          </div>
        </div>

        {colorStats.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-5">
            <div className="text-center space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                上传图片并生成图纸后<br />将显示颜色统计
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {colorStats.map((stat) => (
                <div
                  key={stat.code}
                  className="group flex rounded-full overflow-hidden text-[10px] h-6 cursor-default"
                  style={{
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  title={`${stat.name} · ${stat.percentage.toFixed(1)}%`}
                >
                  <div
                    className="flex items-center justify-center font-bold flex-1"
                    style={{ backgroundColor: stat.hex, color: textColor(stat.hex) }}
                  >
                    {stat.code}
                  </div>
                  <div
                    className="flex items-center justify-center font-bold tabular-nums flex-1"
                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                  >
                    {stat.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
