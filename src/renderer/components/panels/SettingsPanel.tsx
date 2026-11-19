import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, FolderOpen, Keyboard, Info, Power } from 'lucide-react';
import { api } from '../../api';
import { SectionTitle, useToast } from '../ui';
import type { Settings } from '../../../shared/types';

export const settingsBus = {
  listeners: new Set<(s: Settings) => void>(),
  subscribe(fn: (s: Settings) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  emit(s: Settings) {
    this.listeners.forEach((fn) => fn(s));
  },
};

export default function SettingsPanel() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [version, setVersion] = useState('');
  const [binaries, setBinaries] = useState<import('../../../shared/types').BinariesStatus | null>(null);

  useEffect(() => {
    api.settings().then(setSettings);
    api.version().then(setVersion);
    api.binaries().then(setBinaries);
  }, []);

  const update = async (patch: Partial<Settings>) => {
    if (!settings) return;
    const next = await api.setSettings(patch);
    setSettings(next);
    settingsBus.emit(next);
  };

  if (!settings) return null;

  const presets = [
    'CommandOrControl+Shift+V', 'CommandOrControl+Shift+D', 'CommandOrControl+Shift+S',
    'CommandOrControl+Alt+V', 'CommandOrControl+Alt+D', 'Alt+Space',
  ];

  return (
    <div className="max-w-3xl">
      <SectionTitle icon={<SettingsIcon size={20} />} title="設定" description="外観・動作・ショートカットをカスタマイズ。" />

      <div className="card mb-4 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Sun size={16} className="text-accent" /> 外観</h2>
        <label className="label">テーマ</label>
        <div className="flex gap-2">
          <button className={`btn flex-1 ${settings.theme === 'dark' ? 'btn-primary' : ''}`} onClick={() => update({ theme: 'dark' })}><Moon size={15} /> ダーク</button>
          <button className={`btn flex-1 ${settings.theme === 'light' ? 'btn-primary' : ''}`} onClick={() => update({ theme: 'light' })}><Sun size={15} /> ライト</button>
        </div>
        <label className="label mt-5">アクセントカラー</label>
        <div className="flex items-center gap-3">
          <input type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent" value={settings.accent}
            onChange={(e) => update({ accent: e.target.value })} />
          <input className="input max-w-[160px] font-mono" value={settings.accent} onChange={(e) => update({ accent: e.target.value })} />
          <div className="flex gap-1">
            {['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'].map((c) => (
              <button key={c} className="h-8 w-8 rounded-full border-2 border-line transition hover:scale-110"
                style={{ backgroundColor: c }} onClick={() => update({ accent: c })} />
            ))}
          </div>
        </div>
      </div>

      <div className="card mb-4 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><FolderOpen size={16} className="text-accent" /> クリップボード</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.clipboardEnabled}
          onChange={(e) => update({ clipboardEnabled: e.target.checked })} /> クリップボード履歴を記録する</label>
        <label className="label mt-4">保存件数: {settings.clipboardLimit}</label>
        <input type="range" min="20" max="1000" step="20" className="w-full accent-[rgb(var(--accent))]" value={settings.clipboardLimit}
          onChange={(e) => update({ clipboardLimit: Number(e.target.value) })} />
      </div>

      <div className="card mb-4 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Keyboard size={16} className="text-accent" /> ショートカット</h2>
        <div className="space-y-3">
          {([
            { key: 'clipboardHotkey' as const, label: 'クリップボード履歴' },
            { key: 'downloadHotkey' as const, label: 'ダウンロード画面' },
            { key: 'screenshotHotkey' as const, label: 'スクショ' },
          ]).map((h) => (
            <div key={h.key} className="grid grid-cols-[140px_1fr_160px] items-center gap-3">
              <label className="text-sm">{h.label}</label>
              <input className="input font-mono text-xs" value={settings[h.key]} onChange={(e) => update({ [h.key]: e.target.value } as Partial<Settings>)} />
              <select className="input text-xs" value="" onChange={(e) => { if (e.target.value) update({ [h.key]: e.target.value } as Partial<Settings>); }}>
                <option value="">プリセット...</option>
                {presets.map((p) => <option key={p} value={p}>{p.replace('CommandOrControl', 'Ctrl')}</option>)}
              </select>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">Electron アクセラレーター形式（例: CommandOrControl+Shift+V）。変更はすぐ反映されます。</p>
      </div>

      <div className="card mb-4 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><FolderOpen size={16} className="text-accent" /> ダウンロード</h2>
        <div className="flex gap-2">
          <input className="input flex-1" readOnly value={settings.downloadDir || '（既定: ダウンロード/ToolDeck）'} />
          <button className="btn" onClick={async () => {
            const d = await api.directoryDialog();
            if (d) { await update({ downloadDir: d }); toast('保存先を変更しました'); }
          }}>変更</button>
          {settings.downloadDir && <button className="btn" onClick={() => update({ downloadDir: '' })}>既定に戻す</button>}
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn" onClick={async () => {
            const s = await api.settings();
            if (s.downloadDir) api.openPath(s.downloadDir);
          }}><FolderOpen size={14} /> 保存先を開く</button>
        </div>
        <div className="mt-5 border-t border-line/60 pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.autoSetupBinaries}
              onChange={(e) => update({ autoSetupBinaries: e.target.checked })} />
            起動時に yt-dlp / FFmpeg が無ければ自動ダウンロードする
          </label>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted">
            <span>yt-dlp: <b className={binaries?.ytDlp ? 'text-emerald-400' : 'text-amber-400'}>{binaries?.ytDlp ? 'OK' : '未配置'}</b></span>
            <span>FFmpeg: <b className={binaries?.ffmpeg ? 'text-emerald-400' : 'text-amber-400'}>{binaries?.ffmpeg ? 'OK' : '未配置'}</b></span>
            <button className="btn ml-auto px-3 py-1 text-xs" disabled={binaries?.busy} onClick={async () => {
              setBinaries(await api.ensureBinaries(true));
              toast('更新を開始しました');
            }}>今すぐ再セットアップ</button>
          </div>
          {binaries?.busy && (
            <div className="mt-2 text-xs text-sky-400">{binaries.task} {binaries.percent}%</div>
          )}
        </div>
      </div>

      <div className="card mb-4 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Power size={16} className="text-accent" /> 起動</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.launchAtStartup}
          onChange={(e) => update({ launchAtStartup: e.target.checked })} /> Windows 起動時に自動開始</label>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Info size={16} className="text-accent" /> 情報</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">バージョン</span><span>ToolDeck v{version}</span></div>
          <div className="flex justify-between"><span className="text-muted">yt-dlp.exe</span><span className={binaries?.ytDlp ? 'text-emerald-400' : 'text-rose-400'}>{binaries?.ytDlp ? 'OK' : '未配置'}</span></div>
          <div className="flex justify-between"><span className="text-muted">ffmpeg.exe</span><span className={binaries?.ffmpeg ? 'text-emerald-400' : 'text-amber-400'}>{binaries?.ffmpeg ? 'OK' : '未配置'}</span></div>
        </div>
        <button className="btn mt-5 w-full text-rose-400" onClick={() => api.quit()}><Power size={15} /> ToolDeck を終了</button>
      </div>
    </div>
  );
}
