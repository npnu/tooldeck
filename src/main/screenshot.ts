import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BrowserWindow, screen, ipcMain, app, desktopCapturer } from 'electron';
import { store } from './store';

let overlay: BrowserWindow | null = null;
let requester: BrowserWindow | null = null;
let pendingImage: string | null = null;

function rendererUrl(): string {
  if (process.env.VITE_DEV_SERVER_URL) return process.env.VITE_DEV_SERVER_URL;
  return `file://${path.join(__dirname, '../renderer/index.html')}`;
}

export function registerScreenshotIpc() {
  ipcMain.on('screenshot:done', (_event, dataURL: string | null) => {
    if (!overlay || overlay.isDestroyed()) return;
    overlay.close();
    overlay = null;
    if (!dataURL || !requester || requester.isDestroyed()) return;

    const settings = store.get('settings');
    const dir = path.join(
      settings.downloadDir || path.join(app.getPath('downloads'), 'ToolDeck'),
      'screenshots',
    );
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `screenshot_${Date.now()}_${crypto.randomUUID().slice(0, 6)}.png`);
    try {
      fs.writeFileSync(file, Buffer.from(dataURL.split(',')[1] ?? '', 'base64'));
      requester.webContents.send('screenshot:captured', { dataURL, filePath: file });
    } catch (error) {
      requester.webContents.send('screenshot:error', String(error));
    }
  });

  ipcMain.on('screenshot:mounted', () => {
    if (overlay && pendingImage) overlay.webContents.send('screenshot:init', pendingImage);
  });

  ipcMain.on('screenshot:ready', () => {
    if (!overlay || overlay.isDestroyed()) return;
    overlay.show();
    overlay.focus();
  });
}

export async function openScreenshotOverlay(from: BrowserWindow) {
  if (overlay && !overlay.isDestroyed()) {
    overlay.focus();
    return;
  }
  requester = from;
  const display = screen.getPrimaryDisplay();
  const bounds = display.bounds;
  const scale = display.scaleFactor || 1;

  // Capture before the overlay window exists so it cannot appear in the image.
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(bounds.width * scale),
      height: Math.round(bounds.height * scale),
    },
  });
  if (!sources.length) {
    from.webContents.send('screenshot:error', '画面ソースが見つかりません');
    return;
  }
  const imageData = sources[0].thumbnail.toDataURL();
  pendingImage = imageData;

  overlay = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreen: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  overlay.on('closed', () => {
    overlay = null;
    requester?.webContents.send('screenshot:cancelled');
  });
  overlay.loadURL(`${rendererUrl()}?overlay=1`);
}
