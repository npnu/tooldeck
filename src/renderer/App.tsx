import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from './api';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './components/ui';
import type { Settings } from '../shared/types';

import ClipboardPanel from './components/panels/ClipboardPanel';
import DownloadPanel from './components/panels/DownloadPanel';
import ScreenshotPanel from './components/panels/ScreenshotPanel';
import TextPanel from './components/panels/TextPanel';
import FilePanel from './components/panels/FilePanel';
import QrPanel from './components/panels/QrPanel';
import PasswordPanel from './components/panels/PasswordPanel';
import ColorPanel from './components/panels/ColorPanel';
import NotesPanel from './components/panels/NotesPanel';
import MusicPanel from './components/panels/MusicPanel';
import SettingsPanel from './components/panels/SettingsPanel';

const PANEL_COMPONENTS: Record<string, React.ComponentType> = {
  clipboard: ClipboardPanel,
  download: DownloadPanel,
  screenshot: ScreenshotPanel,
  text: TextPanel,
  file: FilePanel,
  qr: QrPanel,
  password: PasswordPanel,
  color: ColorPanel,
  notes: NotesPanel,
  music: MusicPanel,
  settings: SettingsPanel,
};

function applyThemeClasses(theme: string) {
  const root = document.documentElement;
  ['dark', 'light', 'glass', 'midnight', 'sakura'].forEach((t) => {
    root.classList.toggle(`theme-${t}`, theme === t);
  });
}

function hexToRgbTriplet(hex: string) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return '99 102 241';
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export default function App() {
  const [active, setActive] = useState('clipboard');
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    api.settings().then((s) => {
      setSettings(s);
      applyThemeClasses(s.theme);
      document.documentElement.style.setProperty('--accent', hexToRgbTriplet(s.accent));
    });
    const unsubs = [
      api.events.onNavigate((panel) => setActive(panel)),
      api.events.onScreenshotRequest(() => {
        setActive('screenshot');
        api.screenshot.open();
      }),
      api.events.onSettingsUpdated((s) => {
        setSettings(s);
        applyThemeClasses(s.theme);
        document.documentElement.style.setProperty('--accent', hexToRgbTriplet(s.accent));
      }),
    ];
    api.ready();
    return () => unsubs.forEach((u) => u());
  }, []);

  const Panel = PANEL_COMPONENTS[active] ?? ClipboardPanel;

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-panel text-txt">
        <TitleBar />
        <div className="flex min-h-0 flex-1">
          <Sidebar active={active} onChange={setActive} />
          <main className="relative min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="absolute inset-0 overflow-y-auto p-7"
              >
                <Panel />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
