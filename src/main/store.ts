import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { DEFAULT_SETTINGS, type Settings } from '../shared/types';

interface DbShape {
  settings: Settings;
  clipboard: unknown[];
  snippets: unknown[];
  downloads: unknown[];
  notes: unknown[];
}

const defaults = (): DbShape => ({
  settings: { ...DEFAULT_SETTINGS },
  clipboard: [],
  snippets: [],
  downloads: [],
  notes: [],
});

/** Tiny JSON-file database. No native modules, no ESM/CJS issues. */
class JsonStore {
  private file: string;
  private data: DbShape;

  constructor() {
    const dir = app.getPath('userData');
    fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, 'tooldeck-data.json');
    this.data = defaults();
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(this.file)) return;
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<DbShape>;
      const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) };
      // Migrate the old screenshot shortcut for existing installs.
      if (settings.screenshotHotkey === 'CommandOrControl+Shift+S') {
        settings.screenshotHotkey = 'CommandOrControl+Shift+X';
      }
      this.data = {
        settings,
        clipboard: Array.isArray(parsed.clipboard) ? parsed.clipboard : [],
        snippets: Array.isArray(parsed.snippets) ? parsed.snippets : [],
        downloads: Array.isArray(parsed.downloads) ? parsed.downloads : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      };
    } catch {
      this.data = defaults();
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
  }

  get<K extends keyof DbShape>(key: K): DbShape[K] {
    return this.data[key];
  }

  set<K extends keyof DbShape>(key: K, value: DbShape[K]) {
    this.data[key] = value;
    this.save();
  }
}

export const store = new JsonStore();

export function imagesDir(): string {
  const dir = path.join(app.getPath('userData'), 'clipboard-images');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
