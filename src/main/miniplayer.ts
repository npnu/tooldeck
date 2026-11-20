import path from 'node:path';
import { BrowserWindow, ipcMain } from 'electron';

let mini: BrowserWindow | null = null;

function rendererUrl(): string {
  if (process.env.VITE_DEV_SERVER_URL) return process.env.VITE_DEV_SERVER_URL;
  return `file://${path.join(__dirname, '../renderer/index.html')}`;
}

export function openMiniPlayer() {
  if (mini && !mini.isDestroyed()) {
    mini.show();
    mini.focus();
    return;
  }
  mini = new BrowserWindow({
    width: 380,
    height: 220,
    minWidth: 320,
    minHeight: 160,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    backgroundColor: '#0b0e16',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mini.loadURL(`${rendererUrl()}?mini=1`);
  mini.on('closed', () => {
    mini = null;
  });
}

export function registerMiniplayerIpc(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('miniplayer:open', () => openMiniPlayer());
  ipcMain.on('miniplayer:close', () => mini?.close());
  ipcMain.on('miniplayer:pin', (_event, pinned: boolean) => mini?.setAlwaysOnTop(pinned));
  ipcMain.on('miniplayer:showMain', () => {
    const win = getMainWindow();
    if (!win) return;
    win.show();
    win.focus();
    win.webContents.send('navigate', 'music');
  });
}
