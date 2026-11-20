export type ClipboardKind = 'text' | 'image' | 'file';

export interface ClipboardItem {
  id: string;
  kind: ClipboardKind;
  /** text: text body / image: png data URL / file: newline separated paths */
  content: string;
  preview: string;
  hash: string;
  pinned: boolean;
  createdAt: number;
}

export interface Snippet {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export type DownloadStatus = 'queued' | 'downloading' | 'done' | 'error' | 'cancelled';

export interface DownloadOptions {
  url: string;
  mode: 'video' | 'audio' | 'best';
  quality: string;
  subtitles: boolean;
  playlist: boolean;
  filenameTemplate: string;
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  status: DownloadStatus;
  progress: number;
  speed: string;
  eta: string;
  size: string;
  outputPath: string;
  error: string;
  createdAt: number;
  options?: DownloadOptions;
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

export interface BinariesStatus {
  ytDlp: boolean;
  ffmpeg: boolean;
  busy: boolean;
  task: string;
  percent: number;
  error: string;
  ytDlpPath: string;
  ffmpegPath: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export type Theme = 'dark' | 'light' | 'glass' | 'midnight' | 'sakura';

export interface Settings {
  theme: Theme;
  accent: string;
  downloadDir: string;
  musicUrl: string;
  autoSetupBinaries: boolean;
  clipboardLimit: number;
  clipboardEnabled: boolean;
  downloadHotkey: string;
  clipboardHotkey: string;
  screenshotHotkey: string;
  launchAtStartup: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: '#6366f1',
  downloadDir: '',
  musicUrl: '',
  autoSetupBinaries: true,
  clipboardLimit: 200,
  clipboardEnabled: true,
  downloadHotkey: 'CommandOrControl+Shift+D',
  clipboardHotkey: 'CommandOrControl+Shift+V',
  screenshotHotkey: 'CommandOrControl+Shift+X',
  launchAtStartup: false,
};

export interface Panel {
  id: string;
  label: string;
}

export const PANELS: Panel[] = [
  { id: 'clipboard', label: 'クリップボード' },
  { id: 'download', label: 'ダウンロード' },
  { id: 'screenshot', label: 'スクリーンショット' },
  { id: 'text', label: 'テキストツール' },
  { id: 'file', label: 'ファイルツール' },
  { id: 'qr', label: 'QRコード' },
  { id: 'password', label: 'パスワード' },
  { id: 'color', label: 'カラー' },
  { id: 'notes', label: 'メモ' },
  { id: 'music', label: '音楽' },
  { id: 'settings', label: '設定' },
];
