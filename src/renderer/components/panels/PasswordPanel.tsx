import { useState } from 'react';
import { KeyRound, RefreshCw, Copy, ShieldCheck } from 'lucide-react';
import { SectionTitle, useToast } from '../ui';

const SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  number: '0123456789',
  symbol: '!@#$%^&*()-_=+[]{};:,.?/',
};
const AMBIGUOUS = 'O0Il1|`';

function generate(length: number, opts: Record<keyof typeof SETS | 'noAmbiguous', boolean>) {
  let chars = '';
  (Object.keys(SETS) as (keyof typeof SETS)[]).forEach((k) => { if (opts[k]) chars += SETS[k]; });
  if (opts.noAmbiguous) chars = chars.split('').filter((c) => !AMBIGUOUS.includes(c)).join('');
  if (!chars) return '';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

export default function PasswordPanel() {
  const toast = useToast();
  const [length, setLength] = useState(20);
  const [opts, setOpts] = useState({ upper: true, lower: true, number: true, symbol: true, noAmbiguous: true });
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const make = () => {
    const p = generate(length, opts);
    setValue(p);
    setHistory((h) => [p, ...h].slice(0, 8));
  };

  const poolSize = (Object.keys(SETS) as (keyof typeof SETS)[])
    .filter((k) => opts[k])
    .reduce((n, k) => n + SETS[k].split('').filter((c) => !opts.noAmbiguous || !AMBIGUOUS.includes(c)).length, 0);
  const entropy = Math.round(length * Math.log2(Math.max(2, poolSize)));
  const strength = entropy >= 100 ? { label: '最強', color: 'text-emerald-400', pct: 100 }
    : entropy >= 70 ? { label: '強い', color: 'text-lime-400', pct: 75 }
    : entropy >= 45 ? { label: '普通', color: 'text-amber-400', pct: 50 }
    : { label: '弱い', color: 'text-rose-400', pct: 25 };

  return (
    <div>
      <SectionTitle icon={<KeyRound size={20} />} title="パスワード生成" description="暗号学的に安全な乱数でパスワードを作成。" />
      <div className="grid max-w-4xl gap-5 md:grid-cols-2">
        <div className="card p-5">
          <label className="label">長さ: {length} 文字</label>
          <input type="range" min="6" max="64" value={length} className="w-full accent-[rgb(var(--accent))]" onChange={(e) => setLength(Number(e.target.value))} />
          <div className="mt-5 space-y-2 text-sm">
            {([
              { key: 'upper' as const, label: '大文字 (A-Z)' },
              { key: 'lower' as const, label: '小文字 (a-z)' },
              { key: 'number' as const, label: '数字 (0-9)' },
              { key: 'symbol' as const, label: '記号 (!@#...)' },
              { key: 'noAmbiguous' as const, label: '似た文字を除外 (O/0, I/1)' },
            ]).map((o) => (
              <label key={o.key} className="flex items-center gap-2">
                <input type="checkbox" checked={opts[o.key]} onChange={(e) => setOpts({ ...opts, [o.key]: e.target.checked })} />
                {o.label}
              </label>
            ))}
          </div>
          <button className="btn btn-primary mt-5 w-full" onClick={make}><RefreshCw size={15} /> 生成</button>
        </div>

        <div className="card flex flex-col p-5">
          <label className="label">生成結果</label>
          <div className="flex min-h-[70px] items-center gap-2 rounded-xl border border-line bg-panel/60 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-lg">{value || '—'}</code>
            <button className="btn shrink-0 p-2" disabled={!value} onClick={async () => {
              await navigator.clipboard.writeText(value);
              toast('コピーしました');
            }}><Copy size={16} /></button>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <span className="flex items-center gap-1"><ShieldCheck size={14} /> 強度: <b className={strength.color}>{strength.label}</b></span>
              <span className="text-muted">約 {entropy} bit</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-panel">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${strength.pct}%` }} />
            </div>
          </div>
          {history.length > 0 && (
            <div className="mt-5">
              <label className="label">履歴（このセッションのみ）</label>
              <div className="space-y-1">
                {history.map((p, i) => (
                  <button key={i} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-xs text-muted hover:bg-white/5 hover:text-txt"
                    onClick={async () => { await navigator.clipboard.writeText(p); toast('コピーしました'); }}>
                    <span className="truncate flex-1">{p}</span><Copy size={12} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
