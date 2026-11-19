import { contextBridge, ipcRenderer, desktopCapturer } from 'electron';
import type {
  BinariesStatus,
  ClipboardItem,
  DownloadItem,
  DownloadOptions,
  Note,
  Settings,
  Snippet,
} from '../shared/types';

type Listener<T> = (payload: T) => void;

function on<T>(channel: string, listener: Listener<T>) {
  const handler = (_event: Electron.IpcRendererEvent, payload: T) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api = {
  version: () => ipcRenderer.invoke('app:version') as Promise<string>,
  settings: () => ipcRenderer.invoke('app:settings') as Promise<Settings>,
  setSettings: (patch: Partial<Settings>) => ipcRenderer.invoke('app:setSettings', patch) as Promise<Settings>,
  binaries: () => ipcRenderer.invoke('app:binaries') as Promise<BinariesStatus>,
  ensureBinaries: (force: boolean = false) => ipcRenderer.invoke('binaries:ensure', force) as Promise<BinariesStatus>,
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  close: () => ipcRenderer.invoke('app:close'),
  quit: () => ipcRenderer.invoke('app:quit'),
  openPath: (target: string) => ipcRenderer.invoke('app:openPath', target) as Promise<string>,
  showItem: (target: string) => ipcRenderer.invoke('app:showItem', target),

  saveDialog: (name: string) => ipcRenderer.invoke('dialog:save', name) as Promise<string | null>,
  directoryDialog: () => ipcRenderer.invoke('dialog:directory') as Promise<string | null>,
  writeFile: (filePath: string, dataUrl: string) => ipcRenderer.invoke('fs:write', filePath, dataUrl) as Promise<{ ok: boolean; error?: string }>,
  listDir: (dir: string) => ipcRenderer.invoke('fs:listDir', dir) as Promise<{ name: string; path: string }[]>,
  rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath) as Promise<{ ok: boolean; error?: string }>,

  clipboard: {
    list: () => ipcRenderer.invoke('clipboard:list') as Promise<ClipboardItem[]>,
    pin: (id: string, pinned: boolean) => ipcRenderer.invoke('clipboard:pin', id, pinned) as Promise<ClipboardItem[]>,
    remove: (id: string) => ipcRenderer.invoke('clipboard:delete', id) as Promise<ClipboardItem[]>,
    clear: () => ipcRenderer.invoke('clipboard:clear') as Promise<ClipboardItem[]>,
    paste: (id: string) => ipcRenderer.invoke('clipboard:paste', id) as Promise<boolean>,
    image: (filePath: string) => ipcRenderer.invoke('clipboard:image', filePath) as Promise<string | null>,
  },
  snippets: {
    list: () => ipcRenderer.invoke('snippets:list') as Promise<Snippet[]>,
    add: (title: string, content: string) => ipcRenderer.invoke('snippets:add', title, content) as Promise<Snippet[]>,
    remove: (id: string) => ipcRenderer.invoke('snippets:delete', id) as Promise<Snippet[]>,
    paste: (id: string) => ipcRenderer.invoke('snippets:paste', id) as Promise<boolean>,
  },
  downloads: {
    list: () => ipcRenderer.invoke('downloads:list') as Promise<DownloadItem[]>,
    start: (options: DownloadOptions) => ipcRenderer.invoke('downloads:start', options) as Promise<DownloadItem>,
    cancel: (id: string) => ipcRenderer.invoke('downloads:cancel', id),
    remove: (id: string) => ipcRenderer.invoke('downloads:remove', id),
    clearFinished: () => ipcRenderer.invoke('downloads:clearFinished'),
  },
  notes: {
    list: () => ipcRenderer.invoke('notes:list') as Promise<Note[]>,
    save: (notes: Note[]) => ipcRenderer.invoke('notes:save', notes) as Promise<Note[]>,
  },
  screenshot: {
    open: () => ipcRenderer.invoke('screenshot:open'),
    sources: async () => {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 320, height: 180 } });
      return sources.map((s) => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
    },
    done: (dataUrl: string | null) => ipcRenderer.send('screenshot:done', dataUrl),
  },
  events: {
    onClipboardUpdate: (cb: Listener<ClipboardItem>) => on('clipboard:update', cb),
    onDownloadUpdate: (cb: Listener<DownloadItem[]>) => on('download:update', cb),
    onBinariesProgress: (cb: Listener<BinariesStatus>) => on('binaries:progress', cb),
    onNavigate: (cb: Listener<string>) => on('navigate', cb),
    onScreenshotCaptured: (cb: Listener<{ dataURL: string; filePath: string }>) => on('screenshot:captured', cb),
    onScreenshotRequest: (cb: Listener<void>) => on('screenshot:request', cb),
  },
  ready: () => ipcRenderer.send('renderer:ready'),
};

contextBridge.exposeInMainWorld('api', api);
export type Api = typeof api;
