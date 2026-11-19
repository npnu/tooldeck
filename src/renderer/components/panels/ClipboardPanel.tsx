import { useEffect, useMemo, useState } from 'react';
import {
  Clipboard as ClipboardIcon, Pin, PinOff, Trash2, Copy, Image as ImageIcon,
  FileText, Search, Plus, StickyNote, Eraser,
} from 'lucide-react';
import { api } from '../../api';
import { EmptyState, SectionTitle, useToast } from '../ui';
import type { ClipboardItem, Snippet } from '../../../shared/types';

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'たった今';
  if (s < 3600) return `${Math.floor(s / 60)}分前`;
  if (s < 86400) return `${Math.floor(s / 3600)}時間前`;
  return `${Math.floor(s / 86400)}日前`;
}

function ItemRow({ item, onPaste, onPin, onDelete }: {
  item: ClipboardItem;
  onPaste: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    if (item.kind === 'image') api.clipboard.image(item.content).then(setThumb);
  }, [item]);

  const Icon = item.kind === 'image' ? ImageIcon : item.kind === 'file' ? FileText : Copy;
  return (
    <div className="group card p-3 transition hover:border-accent/50">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          {thumb ? <img src={thumb} className="h-10 w-10 rounded-lg object-cover" /> : <Icon size={18} />}
        </div>
        <button className="min-w-0 flex-1 text-left" onDoubleClick={onPaste} title="ダブルクリックで貼り付け">
          <div className="truncate text-sm">{item.preview || '(空)'}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
            <span className="chip">{item.kind === 'text' ? 'テキスト' : item.kind === 'image' ? '画像' : 'ファイル'}</span>
            <span>{timeAgo(item.createdAt)}</span>
            {item.pinned && <span className="text-accent">📌 固定</span>}
          </div>
        </button>
        <div className="flex shrink-0 items-start gap-1 opacity-60 transition group-hover:opacity-100">
          <button title="貼り付け" onClick={onPaste} className="rounded-lg p-2 text-muted hover:bg-accent/15 hover:text-accent"><Copy size={15} /></button>
          <button title={item.pinned ? '固定解除' : '固定'} onClick={onPin} className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-txt">
            {item.pinned ? <PinOff size={15} /> : <Pin size={15} />}
          </button>
          <button title="削除" onClick={onDelete} className="rounded-lg p-2 text-muted hover:bg-rose-500/15 hover:text-rose-400"><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  );
}

export default function ClipboardPanel() {
  const toast = useToast();
  const [tab, setTab] = useState<'history' | 'snippets'>('history');
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    api.clipboard.list().then(setItems);
    api.snippets.list().then(setSnippets);
    const off = api.events.onClipboardUpdate((item) => setItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)]));
    return off;
  }, []);

  const filtered = useMemo(
    () => items.filter((i) => `${i.preview} ${i.content}`.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  const paste = async (id: string) => {
    const ok = await api.clipboard.paste(id);
    toast(ok ? 'クリップボードにコピーしました' : 'コピーに失敗しました', ok ? 'success' : 'error');
  };

  return (
    <div>
      <SectionTitle
        icon={<ClipboardIcon size={20} />}
        title="クリップボード"
        description="コピーした内容を自動保存。検索・固定・ワンクリック貼り付け。"
        right={
          <button className="btn" onClick={async () => {
            setItems(await api.clipboard.clear());
            toast('固定以外を削除しました', 'info');
          }}>
            <Eraser size={15} /> 履歴を消去
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="flex rounded-xl border border-line bg-surface/60 p-1">
          {(['history', 'snippets'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm transition ${tab === t ? 'bg-accent text-white' : 'text-muted hover:text-txt'}`}>
              {t === 'history' ? `履歴 (${items.length})` : `スニペット (${snippets.length})`}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-64">
          <Search size={15} className="absolute left-3 top-2.5 text-muted" />
          <input className="input pl-9" placeholder="検索..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {tab === 'history' ? (
        filtered.length === 0 ? (
          <EmptyState icon={<ClipboardIcon size={26} />} title="履歴はまだありません" hint="何かをコピーすると、ここに自動で保存されます。" />
        ) : (
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            {filtered.map((item) => (
              <ItemRow key={item.id} item={item}
                onPaste={() => paste(item.id)}
                onPin={async () => setItems(await api.clipboard.pin(item.id, !item.pinned))}
                onDelete={async () => setItems(await api.clipboard.remove(item.id))}
              />
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="card mb-4 p-4">
            <div className="grid grid-cols-[1fr_2fr_auto] items-end gap-3">
              <div><label className="label">名前</label><input className="input" placeholder="例: メール署名" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><label className="label">内容</label><input className="input" placeholder="登録するテキスト" value={content} onChange={(e) => setContent(e.target.value)} /></div>
              <button className="btn btn-primary h-[38px]" onClick={async () => {
                if (!title.trim() || !content.trim()) return toast('名前と内容を入力してください', 'error');
                setSnippets(await api.snippets.add(title.trim(), content.trim()));
                setTitle(''); setContent('');
                toast('スニペットを追加しました');
              }}><Plus size={15} /> 追加</button>
            </div>
          </div>
          {snippets.length === 0 ? (
            <EmptyState icon={<StickyNote size={26} />} title="スニペットはまだありません" hint="よく使う文章を登録しておくと、すぐ貼り付けられます。" />
          ) : (
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {snippets.filter((s) => `${s.title} ${s.content}`.toLowerCase().includes(query.toLowerCase())).map((s) => (
                <div key={s.id} className="card group flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><StickyNote size={16} /></div>
                  <button className="min-w-0 flex-1 text-left" onDoubleClick={async () => {
                    await api.snippets.paste(s.id);
                    toast('貼り付けました');
                  }}>
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    <div className="truncate text-xs text-muted">{s.content}</div>
                  </button>
                  <button className="rounded-lg p-2 text-muted hover:bg-accent/15 hover:text-accent" title="貼り付け" onClick={async () => {
                    await api.snippets.paste(s.id);
                    toast('貼り付けました');
                  }}><Copy size={15} /></button>
                  <button className="rounded-lg p-2 text-muted hover:bg-rose-500/15 hover:text-rose-400" title="削除" onClick={async () => {
                    setSnippets(await api.snippets.remove(s.id));
                  }}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
