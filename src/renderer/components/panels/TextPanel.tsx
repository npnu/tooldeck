import { useState } from 'react';
import { Type, Copy, Braces, Hash, ArrowRightLeft, CaseUpper, CaseLower, Code2 } from 'lucide-react';
import { SectionTitle, useToast } from '../ui';
import { md5, sha } from '../../lib/hash';

const toHalf = (s: string) => s.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');
const toFull = (s: string) => s.replace(/[!-~]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0)).replace(/ /g, '　');
const decodeEntities = (s: string) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');

export default function TextPanel() {
  const toast = useToast();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const run = async (fn: (s: string) => string | Promise<string>) => {
    try {
      setOutput(await fn(input));
    } catch (e) {
      toast(`変換に失敗しました: ${String(e).slice(0, 80)}`, 'error');
    }
  };

  const actions = [
    { label: '全角 → 半角', icon: <ArrowRightLeft size={14} />, fn: (s: string) => toHalf(s) },
    { label: '半角 → 全角', icon: <ArrowRightLeft size={14} />, fn: (s: string) => toFull(s) },
    { label: '大文字', icon: <CaseUpper size={14} />, fn: (s: string) => s.toUpperCase() },
    { label: '小文字', icon: <CaseLower size={14} />, fn: (s: string) => s.toLowerCase() },
    { label: '単語頭を大文字', icon: <CaseUpper size={14} />, fn: (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase()) },
    { label: 'JSON 整形', icon: <Braces size={14} />, fn: (s: string) => JSON.stringify(JSON.parse(s), null, 2) },
    { label: 'HTML タグ除去', icon: <Code2 size={14} />, fn: (s: string) => decodeEntities(s.replace(/<[^>]*>/g, '')) },
    { label: 'URL デコード', icon: <ArrowRightLeft size={14} />, fn: (s: string) => decodeURIComponent(s) },
    { label: 'URL エンコード', icon: <ArrowRightLeft size={14} />, fn: (s: string) => encodeURIComponent(s) },
    { label: '改行 → カンマ', icon: <ArrowRightLeft size={14} />, fn: (s: string) => s.split(/\r?\n/).filter(Boolean).join(', ') },
    { label: '重複行を除去', icon: <ArrowRightLeft size={14} />, fn: (s: string) => Array.from(new Set(s.split(/\r?\n/))).join('\n') },
    { label: 'MD5', icon: <Hash size={14} />, fn: (s: string) => md5(s) },
    { label: 'SHA-1', icon: <Hash size={14} />, fn: (s: string) => sha(s, 'SHA-1') },
    { label: 'SHA-256', icon: <Hash size={14} />, fn: (s: string) => sha(s, 'SHA-256') },
    { label: 'SHA-512', icon: <Hash size={14} />, fn: (s: string) => sha(s, 'SHA-512') },
  ];

  return (
    <div>
      <SectionTitle icon={<Type size={20} />} title="テキストツール" description="変換・整形・ハッシュ計算をまとめて。" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-4">
          <label className="label">入力</label>
          <textarea className="input h-[320px] resize-none font-mono text-sm" value={input}
            onChange={(e) => setInput(e.target.value)} placeholder="ここにテキストを入力..." />
          <div className="mt-2 flex gap-4 text-[11px] text-muted">
            <span>{input.length} 文字</span>
            <span>{input.split('\n').length} 行</span>
          </div>
        </div>
        <div className="card flex flex-col p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">出力</label>
            <button className="btn px-3 py-1 text-xs" disabled={!output} onClick={async () => {
              await navigator.clipboard.writeText(output);
              toast('結果をコピーしました');
            }}><Copy size={13} /> コピー</button>
          </div>
          <textarea className="input h-[320px] flex-1 resize-none font-mono text-sm" value={output} readOnly placeholder="変換結果がここに表示されます" />
        </div>
      </div>
      <div className="card mt-5 p-5">
        <h2 className="mb-3 text-sm font-semibold text-muted">操作</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {actions.map((a) => (
            <button key={a.label} className="btn justify-start text-xs" onClick={() => run(a.fn)}>
              <span className="text-accent">{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
