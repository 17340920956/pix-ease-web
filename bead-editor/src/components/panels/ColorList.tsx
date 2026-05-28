import { useBeadStore } from '../../store/useBeadStore';

export function ColorList() {
  const { colorCounts, backgroundCount, selectedColor, setSelectedColor, beadW, beadH } = useBeadStore();
  const total = colorCounts.reduce((sum, c) => sum + c.count, 0);

  if (colorCounts.length === 0) {
    return (
      <div className="color-list">
        <h3 className="panel-title">颜色用量</h3>
        <p className="empty-hint">上传图片后自动生成颜色列表</p>
      </div>
    );
  }

  return (
    <div className="color-list">
      <h3 className="panel-title">
        颜色用量
        <span className="panel-subtitle">
          {beadW}x{beadH} / {colorCounts.length}色 / {total}颗
        </span>
      </h3>
      <div className="color-grid">
        {colorCounts.map((c) => (
          <button
            key={c.code}
            className={`color-chip ${selectedColor === c.hex ? 'active' : ''}`}
            onClick={() => setSelectedColor(selectedColor === c.hex ? null : c.hex)}
            title={`${c.name} (${c.code}): ${c.count}颗`}
          >
            <span
              className="color-swatch"
              style={{ backgroundColor: c.hex }}
            />
            <span className="color-info">
              <span className="color-name">{c.code}</span>
              <span className="color-count">{c.count}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
