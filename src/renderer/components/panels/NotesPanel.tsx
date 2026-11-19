import { useEffect, useState } from 'react';
import { StickyNote, Plus, Trash2, FileText } from 'lucide-react';
import { api } from '../../api';
import { SectionTitle, useToast } from '../ui';
import type { Note } from '../../../shared/types';

export default function NotesPanel() {
  const toast = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    api.notes.list().then((list) => {
      setNotes(list);
      if (list.length) setSelected((s) => s ?? list[0].id);
    });
  }, []);

  const save = async (next: Note[]) => {
    setNotes(next);
    await api.notes.save(next);
  };

  const add = async () => {
    const note: Note = { id: crypto.randomUUID(), title: '新しいメモ', content: '', updatedAt: Date.now() };
    await save([note, ...notes]);
    setSelected(note.id);
    toast('メモを追加しました');
  };

  const current = notes.find((n) => n.id === selected);

  return (
    <div>
      <SectionTitle
        icon={<StickyNote size={20} />}
        title="メモ"
        description="ちょっとしたメモをアプリ内に保存。"
        right={<button className="btn btn-primary" onClick={add}><Plus size={15} /> 新規メモ</button>}
      />
      <div className="grid gap-5 md:grid-cols-[260px_1fr]">
        <div className="card max-h-[560px] overflow-y-auto p-2">
          {notes.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">メモはまだありません</div>
          ) : notes.map((n) => (
            <button key={n.id} onClick={() => setSelected(n.id)}
              className={`mb-1 flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition ${selected === n.id ? 'bg-accent/15 text-accent' : 'hover:bg-white/5'}`}>
              <FileText size={15} className="mt-0.5 shrink-0 opacity-70" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{n.title || '(無題)'}</div>
                <div className="truncate text-[11px] text-muted">{n.content.replace(/\s+/g, ' ').slice(0, 40) || '空のメモ'}</div>
              </div>
            </button>
          ))}
        </div>
        {current ? (
          <div className="card flex flex-col p-5">
            <div className="flex items-center gap-3">
              <input className="input flex-1 text-lg font-semibold" value={current.title}
                onChange={(e) => save(notes.map((n) => n.id === current.id ? { ...n, title: e.target.value, updatedAt: Date.now() } : n))} />
              <button className="btn text-rose-400" onClick={async () => {
                await save(notes.filter((n) => n.id !== current.id));
                setSelected(null);
                toast('メモを削除しました', 'info');
              }}><Trash2 size={15} /></button>
            </div>
            <textarea className="input mt-4 min-h-[380px] flex-1 resize-none leading-relaxed"
              placeholder="ここに書き込んでください..."
              value={current.content}
              onChange={(e) => save(notes.map((n) => n.id === current.id ? { ...n, content: e.target.value, updatedAt: Date.now() } : n))} />
            <div className="mt-2 text-right text-[11px] text-muted">
              最終更新: {new Date(current.updatedAt).toLocaleString('ja-JP')}
            </div>
          </div>
        ) : (
          <div className="card flex items-center justify-center text-sm text-muted">左からメモを選択するか、新規作成してください</div>
        )}
      </div>
    </div>
  );
}
