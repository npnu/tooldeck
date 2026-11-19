import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { app, BrowserWindow } from 'electron';
import type { BinariesStatus } from '../shared/types';

const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const FFMPEG_URL = 'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip';

/** Binaries downloaded at runtime live in userData (writable even when installed in Program Files). */
export function userBinDir(): string {
  const dir = path.join(app.getPath('userData'), 'bin');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function bundledBinDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'bin')
    : path.join(app.getAppPath(), 'bin');
}

function resolveBinary(name: string): string {
  const user = path.join(userBinDir(), name);
  if (fs.existsSync(user)) return user;
  const bundled = path.join(bundledBinDir(), name);
  if (fs.existsSync(bundled)) return bundled;
  return user;
}

export function ytDlpPath(): string {
  return resolveBinary('yt-dlp.exe');
}

export function ffmpegPath(): string {
  return resolveBinary('ffmpeg.exe');
}

export function binariesReady(): { ytDlp: boolean; ffmpeg: boolean } {
  return { ytDlp: fs.existsSync(ytDlpPath()), ffmpeg: fs.existsSync(ffmpegPath()) };
}

let status: BinariesStatus = {
  ...binariesReady(),
  busy: false,
  task: '',
  percent: 0,
  error: '',
  ytDlpPath: ytDlpPath(),
  ffmpegPath: ffmpegPath(),
};

export function binariesStatus(): BinariesStatus {
  return { ...status, ...binariesReady(), ytDlpPath: ytDlpPath(), ffmpegPath: ffmpegPath() };
}

function emit() {
  const current = binariesStatus();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('binaries:progress', current);
  }
}

async function downloadFile(url: string, target: string, label: string): Promise<void> {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.download`;
  status = { ...status, busy: true, task: label, percent: 0, error: '' };
  emit();

  const response = await fetch(url, { headers: { 'User-Agent': 'ToolDeck/1.0' } });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

  const total = Number(response.headers.get('content-length') ?? 0);
  let received = 0;
  const reader = response.body.getReader();
  const out = fs.createWriteStream(tmp);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      out.write(value);
      received += value.length;
      status = { ...status, percent: total ? Math.min(99, Math.round((received / total) * 100)) : 0 };
      emit();
    }
  }
  await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
  fs.renameSync(tmp, target);
  status = { ...status, busy: false, percent: 100 };
  emit();
}

function findFileRecursive(dir: string, name: string): string | null {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursive(full, name);
      if (found) return found;
    } else if (entry.name.toLowerCase() === name.toLowerCase()) {
      return full;
    }
  }
  return null;
}

async function extractFfmpeg(zip: string, destDir: string): Promise<void> {
  fs.mkdirSync(destDir, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const p = spawn('tar', ['-xf', zip, '-C', destDir], { windowsHide: true });
    p.on('error', () => {
      // tar.exe is built into Windows 10+; fall back to PowerShell.
      const ps = spawn('powershell', [
        '-NoProfile', '-Command',
        `Expand-Archive -LiteralPath "${zip}" -DestinationPath "${destDir}" -Force`,
      ], { windowsHide: true });
      ps.on('error', reject);
      ps.on('close', (code) => (code === 0 ? resolve() : reject(new Error('展開に失敗しました'))));
    });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`tar 終了コード ${code}`))));
  });
  const found = findFileRecursive(destDir, 'ffmpeg.exe');
  if (!found) throw new Error('zip の中に ffmpeg.exe が見つかりませんでした');
  fs.copyFileSync(found, path.join(userBinDir(), 'ffmpeg.exe'));
}

let running = false;

export async function ensureBinaries(force = false): Promise<BinariesStatus> {
  if (running) return binariesStatus();
  running = true;
  try {
    const dir = userBinDir();

    if (force || !fs.existsSync(path.join(dir, 'yt-dlp.exe'))) {
      await downloadFile(YTDLP_URL, path.join(dir, 'yt-dlp.exe'), 'yt-dlp をダウンロード中');
    }
    status = { ...status, ...binariesReady() };
    emit();

    if (force || !fs.existsSync(path.join(dir, 'ffmpeg.exe'))) {
      const zip = path.join(os.tmpdir(), `tooldeck-ffmpeg-${Date.now()}.zip`);
      const extractDir = path.join(os.tmpdir(), `tooldeck-ffmpeg-${Date.now()}`);
      status = { ...status, busy: true, task: 'FFmpeg をダウンロード中', percent: 0 };
      emit();
      await downloadFile(FFMPEG_URL, zip, 'FFmpeg をダウンロード中');
      status = { ...status, busy: true, task: 'FFmpeg を展開中', percent: 100 };
      emit();
      await extractFfmpeg(zip, extractDir);
      fs.rmSync(zip, { force: true });
      fs.rmSync(extractDir, { recursive: true, force: true });
    }

    status = { ...status, busy: false, task: '', percent: 100, ...binariesReady() };
  } catch (error) {
    status = { ...status, busy: false, error: String(error).slice(0, 300), ...binariesReady() };
  } finally {
    running = false;
    emit();
  }
  return binariesStatus();
}
