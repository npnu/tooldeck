import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { app, BrowserWindow } from 'electron';

const RELEASES_API = 'https://api.github.com/repos/npnu/tooldeck/releases/latest';
const ASSET_NAME = 'tooldeck.exe';
const TEMP_UPDATE = path.join(os.tmpdir(), 'tooldeck-update.exe');

interface ReleaseInfo {
  tagName: string;
  version: string;
  url: string;
  size: number;
  available: boolean;
}

export interface UpdateStatus {
  checking: boolean;
  downloading: boolean;
  percent: number;
  current: string;
  latest: string;
  available: boolean;
  url: string;
  error: string;
}

let status: UpdateStatus = {
  checking: false,
  downloading: false,
  percent: 0,
  current: app.getVersion(),
  latest: '',
  available: false,
  url: '',
  error: '',
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function emit() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('update:status', { ...status, current: app.getVersion() });
  }
}

function apiUrl(): string {
  return process.env.TOOLDECK_UPDATE_URL || RELEASES_API;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => Number(x) || 0);
  const pb = b.split('.').map((x) => Number(x) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

export async function checkForUpdate(): Promise<ReleaseInfo> {
  const response = await fetch(apiUrl(), {
    headers: { 'User-Agent': 'ToolDeck', Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json() as {
    tag_name?: string;
    assets?: { name?: string; browser_download_url?: string; size?: number }[];
  };
  const version = String(data.tag_name ?? '').replace(/^v/i, '');
  const asset = data.assets?.find((a) => String(a.name ?? '').toLowerCase() === ASSET_NAME);
  if (!version || !asset?.browser_download_url) throw new Error('リリース情報が不正です');
  return {
    tagName: data.tag_name ?? version,
    version,
    url: asset.browser_download_url,
    size: Number(asset.size ?? 0),
    available: compareVersions(version, app.getVersion()) > 0,
  };
}

export async function refreshStatus() {
  status = { ...status, checking: true, error: '' };
  emit();
  try {
    const info = await checkForUpdate();
    status = {
      ...status,
      checking: false,
      latest: info.version,
      available: info.available,
      url: info.url,
    };
  } catch (error) {
    status = { ...status, checking: false, error: String(error).slice(0, 200) };
  }
  emit();
  return status;
}

export function updateStatus() {
  return { ...status, current: app.getVersion() };
}

export async function downloadUpdate(url: string): Promise<string> {
  status = { ...status, downloading: true, percent: 0, error: '' };
  emit();
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'ToolDeck' } });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    const total = Number(response.headers.get('content-length') ?? 0);
    let received = 0;
    const reader = response.body.getReader();
    const out = fs.createWriteStream(TEMP_UPDATE);
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
    status = { ...status, downloading: false, percent: 100 };
    emit();
    return TEMP_UPDATE;
  } catch (error) {
    status = { ...status, downloading: false, error: String(error).slice(0, 200) };
    emit();
    throw error;
  }
}

export function installUpdate() {
  const target = process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
  const parentPid = process.pid;
  spawn(TEMP_UPDATE, ['--update-replace', target, String(parentPid)], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();
  app.exit(0);
}

/** Runs in the newly downloaded exe: waits for the old process, replaces it, relaunches. */
export async function runReplaceMode() {
  const args = process.argv;
  const index = args.indexOf('--update-replace');
  const target = args[index + 1];
  const pid = Number(args[index + 2]);
  if (!target || !pid) {
    app.exit(1);
    return;
  }

  const started = Date.now();
  while (Date.now() - started < 90_000) {
    try {
      process.kill(pid, 0);
      await sleep(200);
    } catch {
      break;
    }
  }
  await sleep(500);
  try {
    // Portable builds extract themselves; copy the original portable file, not the extracted exe.
    const source = process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
    fs.copyFileSync(source, target);
    spawn(target, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } finally {
    app.exit(0);
  }
}
