import { spawn, execFile, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { app, BrowserWindow } from 'electron';
import { store } from './store';
import { ytDlpPath, ffmpegPath, binariesReady } from './binaries';
import type { DownloadItem, DownloadOptions } from '../shared/types';

export { ytDlpPath, ffmpegPath, binariesReady } from './binaries';

const queue: DownloadItem[] = [];
let active: { item: DownloadItem; proc: ChildProcess } | null = null;

function emit() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('download:update', listDownloads());
  }
}

function patch(id: string, changes: Partial<DownloadItem>) {
  const item = queue.find((d) => d.id === id);
  if (!item) return;
  Object.assign(item, changes);
  const all = store.get('downloads') as DownloadItem[];
  const idx = all.findIndex((d) => d.id === id);
  if (idx >= 0) all[idx] = { ...item };
  else all.unshift({ ...item });
  store.set('downloads', all.slice(0, 100));
  emit();
}

export function listDownloads(): DownloadItem[] {
  const persisted = store.get('downloads') as DownloadItem[];
  return queue.length ? [...queue, ...persisted.filter((p) => !queue.some((q) => q.id === p.id))] : persisted;
}

function buildArgs(options: DownloadOptions, outputTemplate: string): string[] {
  const args: string[] = [options.url, '--newline', '--no-warnings', '-o', outputTemplate];

  const ff = ffmpegPath();
  if (fs.existsSync(ff)) args.push('--ffmpeg-location', ff);

  if (!options.playlist) args.push('--no-playlist');

  let format = 'best';
  if (options.mode === 'audio') {
    format = 'bestaudio/best';
    args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
  } else if (options.mode === 'video') {
    const h = options.quality.replace(/[^\d]/g, '');
    format = h
      ? `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]`
      : 'bestvideo+bestaudio/best';
    args.push('--merge-output-format', 'mp4');
  } else {
    format = 'best';
  }
  args.push('-f', format);

  if (options.subtitles) {
    args.push('--write-subs', '--write-auto-subs', '--sub-langs', 'ja.*,en.*', '--embed-subs');
  }
  return args;
}

function parseProgress(chunk: string, item: DownloadItem) {
  const lines = chunk.split(/[\r\n]+/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const dest = line.match(/\[download\] Destination: (.+)/);
    if (dest) patch(item.id, { outputPath: dest[1] });
    const pct = line.match(/(\d+(?:\.\d+)?)%/);
    if (pct) {
      const speed = line.match(/at\s+([0-9.]+\s*\S+\/s)/);
      const eta = line.match(/ETA\s+(\S+)/);
      const size = line.match(/of\s+~?([\d.]+\s*\S+)/);
      patch(item.id, {
        progress: Math.min(100, Number(pct[1])),
        status: 'downloading',
        speed: speed ? speed[1] : item.speed,
        eta: eta ? eta[1] : item.eta,
        size: size ? size[1] : item.size,
      });
    }
    if (line.includes('[download] 100%')) patch(item.id, { progress: 100 });
  }
}

function fetchTitle(item: DownloadItem) {
  const exe = ytDlpPath();
  if (!fs.existsSync(exe)) return;
  execFile(
    exe,
    [item.url, '--skip-download', '--no-warnings', '--print', '%(title)s'],
    { timeout: 30_000, windowsHide: true },
    (err, stdout) => {
      if (!err && stdout.trim()) patch(item.id, { title: stdout.trim().split('\n')[0] });
    },
  );
}

function pump() {
  if (active || queue.length === 0) return;
  const next = queue.find((d) => d.status === 'queued');
  if (!next) return;

  const exe = ytDlpPath();
  if (!fs.existsSync(exe)) {
    patch(next.id, { status: 'error', error: 'yt-dlp.exe が bin/ にありません。README を参照してください。' });
    return;
  }

  const settings = store.get('settings');
  const dir = settings.downloadDir || path.join(app.getPath('downloads'), 'ToolDeck');
  fs.mkdirSync(dir, { recursive: true });
  const options = next.options ?? {
    url: next.url,
    mode: 'video' as const,
    quality: '',
    subtitles: false,
    playlist: false,
    filenameTemplate: '%(title)s [%(id)s]',
  };
  const template = path.join(dir, `${options.filenameTemplate || '%(title)s [%(id)s]'}.%(ext)s`);
  const args = buildArgs(options, template);

  const proc = spawn(exe, args, { windowsHide: true });
  active = { item: next, proc };
  patch(next.id, { status: 'downloading', title: next.title || 'タイトル取得中...' });
  fetchTitle(next);

  let stderr = '';
  proc.stdout?.on('data', (data: Buffer) => parseProgress(data.toString(), next));
  proc.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString();
  });
  proc.on('close', (code) => {
    if (!active || active.item.id !== next.id) return;
    active = null;
    if (code === 0) {
      patch(next.id, { status: 'done', progress: 100, speed: '', eta: '' });
    } else if (next.status !== 'cancelled') {
      const detail = stderr.trim().split('\n').slice(-2).join(' ').slice(0, 300);
      patch(next.id, { status: 'error', error: detail || `終了コード ${code}` });
    }
    pump();
  });
  proc.on('error', (err) => {
    if (!active || active.item.id !== next.id) return;
    active = null;
    patch(next.id, { status: 'error', error: err.message });
    pump();
  });
}

export function startDownload(options: DownloadOptions): DownloadItem {
  const item: DownloadItem = {
    id: crypto.randomUUID(),
    url: options.url,
    title: options.url,
    status: 'queued',
    progress: 0,
    speed: '',
    eta: '',
    size: '',
    outputPath: '',
    error: '',
    createdAt: Date.now(),
    options,
  };
  queue.unshift(item);
  const all = store.get('downloads') as DownloadItem[];
  store.set('downloads', [item, ...all].slice(0, 100));
  emit();
  pump();
  return item;
}

export function cancelDownload(id: string) {
  const item = queue.find((d) => d.id === id);
  if (!item) return;
  if (active?.item.id === id) {
    item.status = 'cancelled';
    active.proc.kill();
  } else {
    patch(id, { status: 'cancelled' });
  }
  emit();
}

export function removeDownload(id: string) {
  const idx = queue.findIndex((d) => d.id === id);
  if (idx >= 0) queue.splice(idx, 1);
  store.set('downloads', (store.get('downloads') as DownloadItem[]).filter((d) => d.id !== id));
  emit();
}

export function clearFinishedDownloads() {
  const kept = (store.get('downloads') as DownloadItem[]).filter(
    (d) => d.status === 'downloading' || d.status === 'queued',
  );
  store.set('downloads', kept);
  emit();
}
