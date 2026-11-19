import {
  Clipboard, Download, Scissors, Type, Files, QrCode, KeyRound, Palette, StickyNote, Settings,
} from 'lucide-react';
import { PANELS } from '../../shared/types';

const ICONS: Record<string, React.ReactNode> = {
  clipboard: <Clipboard size={18} />,
  download: <Download size={18} />,
  screenshot: <Scissors size={18} />,
  text: <Type size={18} />,
  file: <Files size={18} />,
  qr: <QrCode size={18} />,
  password: <KeyRound size={18} />,
  color: <Palette size={18} />,
  notes: <StickyNote size={18} />,
  settings: <Settings size={18} />,
};

export default function Sidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line/60 bg-panel">
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {PANELS.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
              active === p.id
                ? 'bg-accent/15 font-semibold text-accent shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.25)]'
                : 'text-muted hover:bg-white/5 hover:text-txt'
            }`}
          >
            {ICONS[p.id]}
            {p.label}
          </button>
        ))}
      </div>
      <div className="border-t border-line/60 p-4 text-[11px] leading-relaxed text-muted/70">
        <div className="font-semibold text-muted">ショートカット</div>
        <div className="mt-1">Ctrl+Shift+V 履歴</div>
        <div>Ctrl+Shift+D ダウンロード</div>
        <div>Ctrl+Shift+S スクショ</div>
      </div>
    </aside>
  );
}
