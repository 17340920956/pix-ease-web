import { useRef, useCallback } from 'react';
import { useBeadStore } from './store/useBeadStore';
import { Toolbar } from './components/toolbar/Toolbar';
import { BeadCanvas } from './components/canvas/BeadCanvas';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { ColorList } from './components/panels/ColorList';
import { ExportPanel } from './components/panels/ExportPanel';

export default function App() {
  const { isProcessing, progressMessage } = useBeadStore();
  const panelRef = useRef<{ triggerUpload: () => void }>(null);

  const handleUploadClick = useCallback(() => {
    panelRef.current?.triggerUpload();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-logo">
            <span className="logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="4"/>
              </svg>
            </span>
            Pix Bead
          </h1>
          <span className="app-tag">AI 拼豆图编辑器</span>
        </div>
        <div className="header-right">
          {isProcessing && (
            <span className="processing-badge">
              <span className="spinner" />
              {progressMessage || '处理中...'}
            </span>
          )}
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar sidebar-left">
          <SettingsPanel ref={panelRef} />
        </aside>

        <main className="main-canvas">
          <Toolbar />
          <BeadCanvas onUploadClick={handleUploadClick} />
        </main>

        <aside className="sidebar sidebar-right">
          <ColorList />
          <ExportPanel />
        </aside>
      </div>
    </div>
  );
}
