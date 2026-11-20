import { useEffect, useState } from 'react';
import { Music2, Play, PictureInPicture2, ExternalLink, ClipboardPaste, AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import { SectionTitle, useToast } from '../ui';
import { toSpotifyEmbed, embedHeight, embedKind } from '../../lib/spotify';

export default function MusicPanel() {
  const toast = useToast();
  const [savedUrl, setSavedUrl] = useState('');
  const [input, setInput] = useState('');
  const [embed, setEmbed] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.settings().then((s) => {
      setSavedUrl(s.musicUrl);
      setInput(s.musicUrl);
      setEmbed(toSpotifyEmbed(s.musicUrl) ?? '');
    });
  }, []);

  const play = async () => {
    const url = toSpotifyEmbed(input);
    if (!url) {
      setError('Spotify のトラック・アルバム・プレイリスト URL を入力してください');
      return;
    }
    setError('');
    setEmbed(url);
    await api.setSettings({ musicUrl: input.trim() });
    setSavedUrl(input.trim());
  };

  return (
    <div>
      <SectionTitle
        icon={<Music2 size={20} />}
        title="音楽"
        description="Spotify のリンクを貼って再生。ミニプレイヤーも開けます。"
        right={
          <button className="btn btn-primary" onClick={() => api.miniplayer.open()}>
            <PictureInPicture2 size={15} /> ミニプレイヤー
          </button>
        }
      />

      <div className="card mb-5 p-5">
        <label className="label">Spotify の URL</label>
        <div className="flex gap-2">
          <input className="input" placeholder="https://open.spotify.com/track/..." value={input}
            onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && play()} />
          <button className="btn" title="クリップボードから貼り付け" onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text) { setInput(text); toast('貼り付けました', 'info'); }
            } catch {
              toast('読み取りに失敗しました', 'error');
            }
          }}><ClipboardPaste size={15} /></button>
          <button className="btn btn-primary px-5" onClick={play}><Play size={15} /> 再生</button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-400"><AlertTriangle size={14} /> {error}</div>
        )}
        <p className="mt-3 text-[11px] text-muted">
          トラック / アルバム / プレイリスト / アーティスト / ポッドキャストのリンクに対応。Spotify のサイトで再生されるため、再生にはインターネット接続が必要です。
        </p>
      </div>

      {embed ? (
        <div className="card overflow-hidden p-3">
          <iframe
            key={embed}
            title="Spotify player"
            src={embed}
            width="100%"
            height={embedHeight(embedKind(embed))}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="rounded-xl"
          />
          <div className="mt-3 flex items-center gap-2">
            <button className="btn" onClick={() => api.miniplayer.open()}><PictureInPicture2 size={14} /> ミニで開く</button>
            {savedUrl && <button className="btn" onClick={() => api.openPath(savedUrl)}><ExternalLink size={14} /> Spotify で開く</button>}
          </div>
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center gap-3 py-20 text-center text-muted">
          <Music2 size={36} className="opacity-40" />
          <div className="font-medium text-txt/80">再生する曲を選んでください</div>
          <div className="max-w-sm text-xs">Spotify で「共有 → リンクをコピー」して、上の入力欄に貼り付けてください。</div>
        </div>
      )}
    </div>
  );
}
