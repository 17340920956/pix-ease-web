import { useBeadStore } from '../../store/useBeadStore';
import type { ToolType } from '../../types';

const tools: Array<{ type: ToolType; label: string; icon: React.ReactNode }> = [
  {
    type: 'select',
    label: '移动',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 9l4-4 4 4"/><path d="M9 5v14"/>
        <path d="M19 15l-4 4-4-4"/><path d="M15 19V5"/>
      </svg>
    ),
  },
  {
    type: 'pen',
    label: '画笔',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
    ),
  },
  {
    type: 'eraser',
    label: '橡皮擦',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"/>
        <path d="M17 17L7 7"/>
      </svg>
    ),
  },
  {
    type: 'picker',
    label: '取色',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>
    ),
  },
];

export function Toolbar() {
  const { tool, setTool, undo, redo, historyIndex, history } = useBeadStore();
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">工具</span>
        <div className="toolbar-tools">
          {tools.map((t) => (
            <button
              key={t.type}
              className={`tool-btn ${tool === t.type ? 'active' : ''}`}
              onClick={() => setTool(t.type)}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="toolbar-label">编辑</span>
        <div className="toolbar-tools">
          <button
            className={`tool-btn ${!canUndo ? 'disabled' : ''}`}
            onClick={undo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
          </button>
          <button
            className={`tool-btn ${!canRedo ? 'disabled' : ''}`}
            onClick={redo}
            disabled={!canRedo}
            title="重做 (Ctrl+Shift+Z)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
