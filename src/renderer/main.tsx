import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import ScreenshotOverlay from './components/ScreenshotOverlay';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-panel p-8 text-center text-txt">
          <div className="text-lg font-semibold">画面の表示に失敗しました</div>
          <pre className="max-w-2xl overflow-auto rounded-xl border border-line bg-surface p-4 text-left text-xs text-rose-400">
            {String(this.state.error.message ?? this.state.error)}
          </pre>
          <button className="btn btn-primary" onClick={() => location.reload()}>再読み込み</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const isOverlay = new URLSearchParams(location.search).get('overlay') === '1';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isOverlay ? <ScreenshotOverlay /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
);
