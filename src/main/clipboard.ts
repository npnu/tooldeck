import { clipboard, nativeImage } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { store, imagesDir } from './store';
import type { ClipboardItem, ClipboardKind, Snippet } from '../shared/types';

let lastHash = '';
let timer: NodeJS.Timeout | null = null;
let notifier: ((item: ClipboardItem) => void) | null = null;

function hash(parts: string[]): string {
  return crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex');
}

function readFileNameW(): string[] | null {
  try {
    const buf = clipboard.readBuffer('FileNameW');
    if (!buf || buf.length === 0) return null;
    const text = buf.toString('utf16le');
    const paths = text.split('\0').filter(Boolean);
    return paths.length ? paths : null;
  } catch {
    return null;
  }
}

function detect(): { kind: ClipboardKind; content: string; hash: string; preview: string } | null {
  const files = readFileNameW();
  if (files) {
    return {
      kind: 'file',
      content: files.join('\n'),
      hash: hash(['file', files.join('\n')]),
      preview: files.map((f) => path.basename(f)).join(', '),
    };
  }

  const image = clipboard.readImage();
  if (image && !image.isEmpty()) {
    const png = image.toPNG();
    const h = hash(['image', png.toString('base64')]);
    const file = path.join(imagesDir(), `${h.slice(0, 24)}.png`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, png);
    return {
      kind: 'image',
      content: file,
      hash: h,
      preview: `画像 (${Math.round(png.length / 1024)} KB)`,
    };
  }

  const text = clipboard.readText().trim();
  if (text) {
    return {
      kind: 'text',
      content: text.slice(0, 200_000),
      hash: hash(['text', text]),
      preview: text.replace(/\s+/g, ' ').slice(0, 140),
    };
  }
  return null;
}

function poll() {
  const settings = store.get('settings');
  if (!settings.clipboardEnabled) return;
  const found = detect();
  if (!found || found.hash === lastHash) return;
  lastHash = found.hash;

  const items = store.get('clipboard') as ClipboardItem[];
  if (items.some((i) => i.hash === found.hash)) {
    // Move existing item to top instead of duplicating.
    const existing = items.find((i) => i.hash === found.hash)!;
    store.set('clipboard', [existing, ...items.filter((i) => i.id !== existing.id)]);
    notifier?.(existing);
    return;
  }

  const item: ClipboardItem = {
    id: crypto.randomUUID(),
    kind: found.kind,
    content: found.content,
    preview: found.preview,
    hash: found.hash,
    pinned: false,
    createdAt: Date.now(),
  };
  const next = [item, ...items].filter((i) => i.pinned || i.id !== item.id);
  const limit = settings.clipboardLimit;
  const trimmed = next.slice(0, Math.max(20, limit));
  store.set('clipboard', trimmed);
  notifier?.(item);
}

export function startClipboardWatcher(onUpdate: (item: ClipboardItem) => void) {
  notifier = onUpdate;
  try {
    lastHash = hash(['text', clipboard.readText().trim()]);
  } catch {
    lastHash = '';
  }
  if (!timer) timer = setInterval(poll, 500);
}

export function stopClipboardWatcher() {
  if (timer) clearInterval(timer);
  timer = null;
  notifier = null;
}

export function listClipboard(): ClipboardItem[] {
  return store.get('clipboard') as ClipboardItem[];
}

export function setPinned(id: string, pinned: boolean): ClipboardItem[] {
  const next = (store.get('clipboard') as ClipboardItem[]).map((i) =>
    i.id === id ? { ...i, pinned } : i,
  );
  store.set('clipboard', next);
  return next;
}

export function removeClipboardItem(id: string): ClipboardItem[] {
  const next = (store.get('clipboard') as ClipboardItem[]).filter((i) => i.id !== id);
  store.set('clipboard', next);
  return next;
}

export function clearClipboard(): ClipboardItem[] {
  const kept = (store.get('clipboard') as ClipboardItem[]).filter((i) => i.pinned);
  store.set('clipboard', kept);
  return kept;
}

export function pasteClipboardItem(id: string): boolean {
  const item = (store.get('clipboard') as ClipboardItem[]).find((i) => i.id === id);
  if (!item) return false;
  try {
    if (item.kind === 'image' && fs.existsSync(item.content)) {
      clipboard.writeImage(nativeImage.createFromPath(item.content));
    } else if (item.kind === 'file') {
      const paths = item.content.split('\n').filter(Boolean);
      clipboard.clear();
      const buffer = Buffer.from(paths.join('\0') + '\0', 'utf16le');
      clipboard.writeBuffer('FileNameW', buffer);
      clipboard.writeText(paths.join('\n'));
    } else {
      clipboard.writeText(item.content);
    }
    lastHash = item.hash;
    return true;
  } catch {
    return false;
  }
}

export function readClipboardImage(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/* ---- Snippets ---- */

export function listSnippets(): Snippet[] {
  return store.get('snippets') as Snippet[];
}

export function addSnippet(title: string, content: string): Snippet[] {
  const next = [
    { id: crypto.randomUUID(), title, content, createdAt: Date.now() },
    ...(store.get('snippets') as Snippet[]),
  ];
  store.set('snippets', next);
  return next;
}

export function removeSnippet(id: string): Snippet[] {
  const next = (store.get('snippets') as Snippet[]).filter((s) => s.id !== id);
  store.set('snippets', next);
  return next;
}

export function pasteSnippet(id: string): boolean {
  const snippet = (store.get('snippets') as Snippet[]).find((s) => s.id === id);
  if (!snippet) return false;
  clipboard.writeText(snippet.content);
  lastHash = hash(['text', snippet.content.trim()]);
  return true;
}
