import { useEffect, useState } from 'react';
import { Music2, Pin, PinOff, X, Maximize2, Play } from 'lucide-react';
import { api } from '../api';
import { toSpotifyEmbed } from '../lib/spotify';

export default function MiniPlayer() {
  const [input, setInput] = useState('');
  const [embed, setEmbed] = useState('');
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    api.settings().then((s) => {
      setInput(s.musicUrl);
      setEmbed(toSpotifyEmbed(s.musicUrl) ?? '');
    });
  }, []);

  const play = async () => {
    const url = toSpotifyEmbed(input);
    if (!url) return;
    setEmbed(url);
    await api.setSettings({ musicUrl: input.trim() });
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-panel text-txt">
      <div className="drag flex h-8 shrink-0 items-center gap-2 border-b border-line/60 bg-surface/60 px-2">
        <Music2 size={14} className="text-accent" />
        <span className="flex-1 text-xs font-semibold">Spotify ミニプレイヤー</span>
        <button className="no-drag rounded p-1 text-muted hover:text-txt" title="メイン画面で開く" onClick={() => api.miniplayer.showMain()}>
          <Maximize2 size={13} />
        </button>
        <button className="no-drag rounded p-1 text-muted hover:text-txt" title={pinned ? '最前面を解除' : '最前面に固定'} onClick={() => {
          const next = !pinned;
          setPinned(next);
          api.miniplayer.pin(next);
        }}>
          {pinned ? <Pin size={13} /> : <PinOff size={13} />}
        </button>
        <button className="no-drag rounded p-1 text-muted hover:text-rose-400" title="閉じる" onClick={() => api.miniplayer.close()}>
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 p-2">
        {embed ? (
          <iframe key={embed} title="Spotify mini player" src={embed} width="100%" height="152"
            frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="rounded-lg" />
        ) : (
          <div className="flex h-full items-center gap-2">
            <input className="input text-xs" placeholder="Spotify URL を貼り付け" value={input}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && play()} />
            <button className="btn btn-primary px-3" onClick={play}><Play size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
