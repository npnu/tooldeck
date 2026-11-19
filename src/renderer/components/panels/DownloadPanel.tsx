import { useEffect, useState } from 'react';
import {
  Download, Link2, Play, Trash2, FolderOpen, AlertTriangle, CheckCircle2,
  XCircle, Loader2, RotateCcw, DownloadCloud,
} from 'lucide-react';
import { api } from '../../api';
import { EmptyState, SectionTitle, useToast } from '../ui';
import type { BinariesStatus, DownloadItem, DownloadOptions } from '../../../shared/types';

const STATUS = {
  queued: { label: '待機中', icon: Loader2, color: 'text-muted' },
  downloading: { label: 'ダウンロード中', icon: Loader2, color: 'text-sky-400' },
  done: { label: '完了', icon: CheckCircle2, color: 'text-emerald-400' },
  error: { label: 'エラー', icon: XCircle, color: 'text-rose-400' },
  cancelled: { label: 'キャンセル', icon: XCircle, color: 'text-amber-400' },
};

export default function DownloadPanel() {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<DownloadOptions['mode']>('video');
  const [quality, setQuality] = useState('1080');
  const [subtitles, setSubtitles] = useState(false);
  const [playlist, setPlaylist] = useState(false);
  const [template, setTemplate] = useState('%(title)s [%(id)s]');
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [binaries, setBinaries] = useState<BinariesStatus | null>(null);
  const [downloadDir, setDownloadDir] = useState('');

  useEffect(() => {
    api.downloads.list().then(setItems);
    api.binaries().then(setBinaries);
    api.settings().then((s) => setDownloadDir(s.downloadDir));
    const offs = [
      api.events.onDownloadUpdate(setItems),
      api.events.onBinariesProgress(setBinaries),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const start = async () => {
    if (!url.trim()) return toast('URLを入力してください', 'error');
    if (!binaries?.ytDlp) {
      toast(binaries?.busy ? 'ツールを準備中です。少しお待ちください' : 'yt-dlp が未配置です。自動セットアップを実行してください', 'error');
      return;
    }
    await api.downloads.start({
      url: url.trim(), mode, quality, subtitles, playlist, filenameTemplate: template,
    });
    setUrl('');
    toast('ダウンロードを開始しました');
  };

  return (
    <div>
      <SectionTitle
        icon={<Download size={20} />}
        title="ダウンロード"
        description="YouTube などを高画質で保存。MP3抽出・プレイリスト・字幕に対応。"
        right={
          <button className="btn" onClick={async () => {
            const dir = await api.directoryDialog();
            if (!dir) return;
            await api.setSettings({ downloadDir: dir });
            setDownloadDir(dir);
            toast('保存先を変更しました');
          }}><FolderOpen size={15} /> 保存先変更</button>
        }
      />

      {binaries && (
        <div className={`mb-4 rounded-xl border p-4 text-sm ${
          binaries.error ? 'border-rose-500/30 bg-rose-500/10'
            : binaries.busy ? 'border-sky-500/30 bg-sky-500/10'
            : binaries.ytDlp && binaries.ffmpeg ? 'border-emerald-500/25 bg-emerald-500/10'
            : 'border-amber-500/30 bg-amber-500/10'
        }`}>
          <div className="flex items-center gap-3">
            {binaries.busy ? <DownloadCloud className="shrink-0 text-sky-400" size={18} />
              : binaries.ytDlp && binaries.ffmpeg ? <CheckCircle2 className="shrink-0 text-emerald-400" size={18} />
              : <AlertTriangle className="shrink-0 text-amber-400" size={18} />}
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {binaries.busy ? binaries.task || 'ダウンロードツールを準備中...'
                  : binaries.ytDlp && binaries.ffmpeg ? 'ダウンロードツールの準備完了'
                  : 'ダウンロードツールが未設定です'}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className={binaries.ytDlp ? 'text-emerald-400' : 'text-amber-400'}>yt-dlp: {binaries.ytDlp ? 'OK' : '未配置'}</span>
                <span className={binaries.ffmpeg ? 'text-emerald-400' : 'text-amber-400'}>FFmpeg: {binaries.ffmpeg ? 'OK' : '未配置'}</span>
                {binaries.error && <span className="text-rose-400">{binaries.error}</span>}
              </div>
            </div>
            {!binaries.busy && (
              <button className="btn px-3 py-1.5 text-xs" onClick={async () => {
                setBinaries(await api.ensureBinaries(true));
                toast('更新を開始しました');
              }}>
                <RotateCcw size={13} /> {binaries.ytDlp ? '更新' : '自動セットアップ'}
              </button>
            )}
          </div>
          {binaries.busy && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/20">
              <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${binaries.percent}%` }} />
            </div>
          )}
        </div>
      )}

      <div className="card mb-5 p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Link2 size={16} className="absolute left-3 top-3 text-muted" />
            <input className="input h-11 pl-10" placeholder="https://www.youtube.com/watch?v=..." value={url}
              onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && start()} />
          </div>
          <button className="btn btn-primary h-11 px-6" onClick={start}><Play size={16} /> 開始</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="label">形式</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value as DownloadOptions['mode'])}>
              <option value="video">動画 (MP4)</option>
              <option value="audio">音声のみ (MP3)</option>
              <option value="best">最適な形式</option>
            </select>
          </div>
          <div>
            <label className="label">最大画質</label>
            <select className="input" value={quality} onChange={(e) => setQuality(e.target.value)} disabled={mode === 'audio'}>
              <option value="2160">4K (2160p)</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
              <option value="">指定なし</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">ファイル名テンプレート</label>
            <input className="input" value={template} onChange={(e) => setTemplate(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-5 text-sm text-muted">
          <label className="flex items-center gap-2"><input type="checkbox" checked={subtitles} onChange={(e) => setSubtitles(e.target.checked)} /> 字幕を埋め込む</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={playlist} onChange={(e) => setPlaylist(e.target.checked)} /> プレイリスト全体</label>
          <span className="ml-auto truncate text-xs">保存先: {downloadDir || '既定のダウンロード/ToolDeck'}</span>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">キュー ({items.length})</h2>
        <button className="btn px-3 py-1 text-xs" onClick={async () => {
          await api.downloads.clearFinished();
          toast('完了済みを削除しました', 'info');
        }}><RotateCcw size={13} /> 完了済みを削除</button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Download size={26} />} title="ダウンロードはありません" hint="上のフォームにURLを入れて開始してください。" />
      ) : (
        <div className="space-y-2">
          {items.map((d) => {
            const s = STATUS[d.status];
            const Icon = s.icon;
            return (
              <div key={d.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${s.color}`}><Icon size={18} className={d.status === 'downloading' ? 'animate-spin' : ''} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium" title={d.title}>{d.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                      <span className={s.color}>{s.label}</span>
                      {d.speed && <span>{d.speed}</span>}
                      {d.eta && <span>ETA {d.eta}</span>}
                      {d.size && <span>{d.size}</span>}
                      <span className="truncate">{d.error}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {(d.status === 'downloading' || d.status === 'queued') && (
                      <button className="rounded-lg p-2 text-muted hover:bg-rose-500/15 hover:text-rose-400" title="キャンセル" onClick={() => api.downloads.cancel(d.id)}><XCircle size={16} /></button>
                    )}
                    {d.status === 'done' && d.outputPath && (
                      <button className="rounded-lg p-2 text-muted hover:bg-accent/15 hover:text-accent" title="ファイルを開く" onClick={() => api.showItem(d.outputPath)}><FolderOpen size={16} /></button>
                    )}
                    <button className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-txt" title="削除" onClick={() => api.downloads.remove(d.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
                {(d.status === 'downloading' || d.status === 'done') && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel">
                    <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${d.progress}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
