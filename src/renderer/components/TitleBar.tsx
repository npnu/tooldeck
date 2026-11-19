import { Minus, Square, X, Sparkles } from 'lucide-react';
import { api } from '../api';

export default function TitleBar() {
  return (
    <div className="drag flex h-11 shrink-0 items-center justify-between border-b border-line/60 bg-surface/40 px-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-white shadow-glow">
          <Sparkles size={14} />
        </span>
        ToolDeck
        <span className="ml-2 text-xs font-normal text-muted">便利ツール、すべてひとつに</span>
      </div>
      <div className="no-drag flex items-center gap-1">
        <button title="最小化" onClick={() => api.minimize()} className="flex h-8 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-txt">
          <Minus size={16} />
        </button>
        <button title="最大化" onClick={() => api.maximize()} className="flex h-8 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-txt">
          <Square size={13} />
        </button>
        <button title="トレイへ隠す" onClick={() => api.close()} className="flex h-8 w-9 items-center justify-center rounded-lg text-muted hover:bg-rose-500/20 hover:text-rose-400">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
