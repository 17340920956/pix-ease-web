import { useCallback } from 'react';
import { useBeadStore } from '../../store/useBeadStore';
import { exportJSON, exportPatternPDF, downloadBlob } from '../../utils/export';

export function ExportPanel() {
  const { beads, beadW, beadH, brand, beadSize, colorCounts, imageUrl } = useBeadStore();
  const empty = !imageUrl || beads.size === 0;

  const handleExportPNG = useCallback(async () => {
    const stageEl = document.querySelector('.canvas-container canvas') as HTMLCanvasElement | null;
    if (!stageEl) return;

    const originalCanvas = stageEl;
    const exportCanvas = document.createElement('canvas');
    const cellSize = 18;
    const padding = 40;
    exportCanvas.width = beadW * cellSize + padding * 2;
    exportCanvas.height = beadH * cellSize + padding * 2;
    const ctx = exportCanvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    ctx.drawImage(originalCanvas, padding, padding);

    exportCanvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `bead-pattern-${beadW}x${beadH}.png`);
      }
    }, 'image/png');
  }, [beadW, beadH]);

  const handleExportJSON = useCallback(() => {
    const blob = exportJSON(beads, beadW, beadH, brand, beadSize);
    downloadBlob(blob, `bead-project-${beadW}x${beadH}.json`);
  }, [beads, beadW, beadH, brand, beadSize]);

  const handleExportPattern = useCallback(() => {
    exportPatternPDF(beads, beadW, beadH, colorCounts, '拼豆图纸');
  }, [beads, beadW, beadH, colorCounts]);

  return (
    <div className="export-panel">
      <h3 className="panel-title">导出</h3>
      <div className="export-buttons">
        <button
          className="btn btn-primary btn-full"
          onClick={handleExportPattern}
          disabled={empty}
        >
          导出图纸 PNG
        </button>
        <button
          className="btn btn-outline btn-full"
          onClick={handleExportPNG}
          disabled={empty}
        >
          导出画布 PNG
        </button>
        <button
          className="btn btn-outline btn-full"
          onClick={handleExportJSON}
          disabled={empty}
        >
          导出 JSON 工程
        </button>
      </div>
      {empty && <p className="empty-hint">生成图案后可导出</p>}
    </div>
  );
}
