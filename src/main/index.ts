import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { registerIpc, rebindHotkeys, applyStartup } from './ipc';
import { ensureBinaries } from './binaries';
import { startClipboardWatcher, stopClipboardWatcher } from './clipboard';
import { store } from './store';

const DEV_URL = 'http://localhost:5173';

/* ---- Generate a small in-code tray/window icon (no external asset needed) ---- */
const crcTable: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const name = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

function createIcon(): Electron.NativeImage {
  const size = 32;
  const rowBytes = size * 4 + 1;
  const raw = Buffer.alloc(rowBytes * size);
  for (let y = 0; y < size; y++) {
    const row = y * rowBytes;
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4;
      const barTop = y >= 7 && y <= 11 && x >= 6 && x <= 25;
      const barStem = x >= 14 && x <= 17 && y >= 7 && y <= 25;
      const white = barTop || barStem;
      raw[i] = white ? 255 : 99;
      raw[i + 1] = white ? 255 : 102;
      raw[i + 2] = white ? 255 : 241;
      raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  return nativeImage.createFromBuffer(png);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let loadFailed = false;

function getMainWindow() {
  return mainWindow;
}

function rendererUrl() {
  return app.isPackaged ? `file://${path.join(__dirname, '../renderer/index.html')}` : DEV_URL;
}

function createWindow() {
  const icon = createIcon();
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    backgroundColor: '#0b0e16',
    icon,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(rendererUrl());
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    loadFailed = true;
    console.error('[did-fail-load]', errorCode, errorDescription, validatedURL);
  });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (!app.isPackaged && level >= 2) console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    loadFailed = false;
  });
}

function createTray() {
  const icon = createIcon();
  tray = new Tray(icon);
  tray.setToolTip('ToolDeck');
  const buildMenu = () =>
    Menu.buildFromTemplate([
      { label: 'ToolDeck を開く', click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        } },
      { type: 'separator' },
      { label: 'クリップボード', click: () => showPanel('clipboard') },
      { label: 'ダウンロード', click: () => showPanel('download') },
      { label: 'スクリーンショット', click: () => {
          mainWindow?.show();
          mainWindow?.webContents.send('screenshot:request');
        } },
      { type: 'separator' },
      { label: '設定', click: () => showPanel('settings') },
      { label: 'クリップボード監視: ' + (store.get('settings').clipboardEnabled ? 'ON' : 'OFF'), click: () => {
          const s = store.get('settings');
          s.clipboardEnabled = !s.clipboardEnabled;
          store.set('settings', s);
          tray?.setContextMenu(buildMenu());
        } },
      { type: 'separator' },
      { label: '終了', click: () => {
          isQuitting = true;
          app.exit(0);
        } },
    ]);
  tray.setContextMenu(buildMenu());
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function showPanel(id: string) {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('navigate', id);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
    // A previous instance may have been left with a failed/blank page.
    if (loadFailed) mainWindow.reload();
  });

  app.whenReady().then(() => {
    if (!app.isPackaged) process.env.VITE_DEV_SERVER_URL = DEV_URL;
    createWindow();
    createTray();
    registerIpc(getMainWindow);
    if (store.get('settings').autoSetupBinaries) {
      setTimeout(() => { ensureBinaries().catch(() => undefined); }, 1200);
    }
    applyStartup(store.get('settings').launchAtStartup);
    rebindHotkeys(getMainWindow);
    startClipboardWatcher((item) => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send('clipboard:update', item);
    });

    ipcMain.on('renderer:ready', () => {
      mainWindow?.webContents.send('navigate', 'clipboard');
    });

    if (app.isPackaged) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf8'));
        const publish = pkg.build?.publish;
        const owner = typeof publish === 'object' ? publish.owner : '';
        const repo = typeof publish === 'object' ? publish.repo : '';
        if (owner && repo && !String(owner).includes('YOUR_')) {
          const { autoUpdater } = require('electron-updater');
          autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
        }
      } catch {
        /* updater disabled until publish repo is configured */
      }
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else mainWindow?.show();
    });
  });

  // Tray-resident app: subscribing prevents the default quit-on-all-windows-closed.
  app.on('window-all-closed', () => {
    /* stay in tray */
  });

  app.on('will-quit', () => {
    stopClipboardWatcher();
    globalShortcut.unregisterAll();
  });
}
