import { ipcMain, dialog, app, shell, BrowserWindow, globalShortcut, clipboard, nativeImage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { store } from './store';
import {
  listClipboard,
  setPinned,
  removeClipboardItem,
  clearClipboard,
  pasteClipboardItem,
  readClipboardImage,
  listSnippets,
  addSnippet,
  removeSnippet,
  pasteSnippet,
} from './clipboard';
import {
  listDownloads,
  startDownload,
  cancelDownload,
  removeDownload,
  clearFinishedDownloads,
} from './downloader';
import { binariesStatus, ensureBinaries, ytDlpPath, ffmpegPath } from './binaries';
import { openScreenshotOverlay, registerScreenshotIpc } from './screenshot';
import { registerMiniplayerIpc } from './miniplayer';
import { refreshStatus, updateStatus, downloadUpdate, installUpdate } from './selfupdate';
import type { DownloadOptions, Note, Settings } from '../shared/types';

export function registerIpc(getMainWindow: () => BrowserWindow | null) {
  registerScreenshotIpc();
  registerMiniplayerIpc(getMainWindow);

  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:settings', () => store.get('settings'));
  ipcMain.handle('app:setSettings', (_e, patch: Partial<Settings>) => {
    const next = { ...store.get('settings'), ...patch };
    store.set('settings', next);
    applyStartup(next.launchAtStartup);
    rebindHotkeys(getMainWindow);
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('settings:updated', next);
    }
    return next;
  });
  ipcMain.handle('update:status', () => updateStatus());
  ipcMain.handle('update:check', () => refreshStatus());
  ipcMain.handle('update:download', () => downloadUpdate(updateStatus().url));
  ipcMain.handle('update:install', () => installUpdate());

  ipcMain.handle('app:binaries', () => binariesStatus());
  ipcMain.handle('binaries:status', () => binariesStatus());
  ipcMain.handle('binaries:ensure', (_e, force: boolean = false) => ensureBinaries(force));
  ipcMain.handle('app:minimize', () => getMainWindow()?.minimize());
  ipcMain.handle('app:maximize', () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle('app:close', () => getMainWindow()?.hide());
  ipcMain.handle('app:quit', () => app.exit(0));
  ipcMain.handle('app:openPath', (_e, target: string) => shell.openPath(target));
  ipcMain.handle('app:showItem', (_e, target: string) => shell.showItemInFolder(target));

  ipcMain.handle('dialog:save', async (_e, defaultName: string) => {
    const win = getMainWindow();
    const res = win
      ? await dialog.showSaveDialog(win, { defaultPath: defaultName })
      : await dialog.showSaveDialog({ defaultPath: defaultName });
    return res.canceled ? null : res.filePath;
  });
  ipcMain.handle('dialog:directory', async () => {
    const win = getMainWindow();
    const res = win ? await dialog.showOpenDialog(win, { properties: ['openDirectory'] }) : await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return res.canceled ? null : res.filePaths[0];
  });
  ipcMain.handle('fs:write', async (_e, filePath: string, dataUrl: string) => {
    try {
      const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, Buffer.from(base64, 'base64'));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  });
  ipcMain.handle('fs:listDir', async (_e, dir: string) => {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile())
        .map((e) => ({ name: e.name, path: path.join(dir, e.name) }));
    } catch (error) {
      return [];
    }
  });
  ipcMain.handle('fs:rename', async (_e, oldPath: string, newPath: string) => {
    try {
      await fs.promises.rename(oldPath, newPath);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  });

  ipcMain.handle('clipboard:list', () => listClipboard());
  ipcMain.handle('clipboard:pin', (_e, id: string, pinned: boolean) => setPinned(id, pinned));
  ipcMain.handle('clipboard:delete', (_e, id: string) => removeClipboardItem(id));
  ipcMain.handle('clipboard:clear', () => clearClipboard());
  ipcMain.handle('clipboard:paste', (_e, id: string) => pasteClipboardItem(id));
  ipcMain.handle('clipboard:image', (_e, filePath: string) => readClipboardImage(filePath));
  ipcMain.handle('clipboard:writeImage', (_e, dataUrl: string) => {
    try {
      const image = nativeImage.createFromDataURL(dataUrl);
      if (image.isEmpty()) return false;
      clipboard.writeImage(image);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('snippets:list', () => listSnippets());
  ipcMain.handle('snippets:add', (_e, title: string, content: string) => addSnippet(title, content));
  ipcMain.handle('snippets:delete', (_e, id: string) => removeSnippet(id));
  ipcMain.handle('snippets:paste', (_e, id: string) => pasteSnippet(id));

  ipcMain.handle('downloads:list', () => listDownloads());
  ipcMain.handle('downloads:start', (_e, options: DownloadOptions) => startDownload(options));
  ipcMain.handle('downloads:cancel', (_e, id: string) => cancelDownload(id));
  ipcMain.handle('downloads:remove', (_e, id: string) => removeDownload(id));
  ipcMain.handle('downloads:clearFinished', () => clearFinishedDownloads());
  ipcMain.handle('downloads:openFolder', () => {
    const settings = store.get('settings');
    const dir = settings.downloadDir || path.join(app.getPath('downloads'), 'ToolDeck');
    fs.mkdirSync(dir, { recursive: true });
    return shell.openPath(dir);
  });

  ipcMain.handle('notes:list', () => store.get('notes'));
  ipcMain.handle('notes:save', (_e, notes: Note[]) => {
    store.set('notes', notes);
    return notes;
  });

  ipcMain.handle('screenshot:open', () => {
    const win = getMainWindow();
    if (win) openScreenshotOverlay(win);
  });
}

export function applyStartup(enabled: boolean) {
  try {
    app.setLoginItemSettings({ openAtLogin: enabled });
  } catch {
    /* ignored on unsupported platforms */
  }
}

function rebindHotkeys(getMainWindow: () => BrowserWindow | null) {
  globalShortcut.unregisterAll();
  const s = store.get('settings');
  const win = getMainWindow();
  globalShortcut.register(s.clipboardHotkey, () => {
    win?.show();
    win?.focus();
    win?.webContents.send('navigate', 'clipboard');
    win?.webContents.send('hotkey:clipboard');
  });
  globalShortcut.register(s.downloadHotkey, () => {
    win?.show();
    win?.focus();
    win?.webContents.send('navigate', 'download');
  });
  globalShortcut.register(s.screenshotHotkey, () => {
    if (win) openScreenshotOverlay(win);
  });
}

export { rebindHotkeys };
