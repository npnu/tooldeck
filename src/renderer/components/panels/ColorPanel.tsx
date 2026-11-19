import { useState } from 'react';
import { Palette, Copy, Pipette } from 'lucide-react';
import { SectionTitle, useToast } from '../ui';

function hexToRgb(hex: string) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function shades(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return [0.9, 0.75, 0.6, 0.45, 0.3, 0.15, 0, -0.15, -0.3, -0.45].map((k) =>
    k >= 0 ? rgbToHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k)
      : rgbToHex(r * (1 + k), g * (1 + k), b * (1 + k)),
  );
}

export default function ColorPanel() {
  const toast = useToast();
  const [hex, setHex] = useState('#6366f1');
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const luminance = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${value} をコピーしました`);
    } catch {
      toast('コピーに失敗しました', 'error');
    }
  };

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-panel/60 px-3 py-2.5">
      <span className="w-16 text-xs text-muted">{label}</span>
      <code className="flex-1 font-mono text-sm">{value}</code>
      <button className="text-muted hover:text-accent" onClick={() => copy(value)}><Copy size={14} /></button>
    </div>
  );

  return (
    <div>
      <SectionTitle icon={<Palette size={20} />} title="カラー" description="カラーコードの変換とパレット生成。" />
      <div className="grid max-w-4xl gap-5 md:grid-cols-2">
        <div className="card p-5">
          <div className="h-40 rounded-2xl border border-line transition-colors" style={{ backgroundColor: hex }} />
          <div className="mt-4 flex items-center gap-3">
            <label className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-line" title="カラーピッカー">
              <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
              <Pipette size={18} />
            </label>
            <input className="input font-mono text-lg" value={hex} onChange={(e) => setHex(e.target.value)} />
          </div>
          <div className="mt-4 space-y-2">
            <Row label="RGB" value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} />
            <Row label="HSL" value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} />
            <Row label="RGBA" value={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`} />
          </div>
          <div className="mt-4 flex gap-2">
            {['#ffffff', '#000000'].map((c) => (
              <div key={c} className="flex h-14 flex-1 items-center justify-center rounded-xl border border-line text-sm font-medium"
                style={{ backgroundColor: c, color: c === '#ffffff' ? '#000' : '#fff' }}>
                {c === (luminance > 128 ? '#ffffff' : '#000000') ? '推奨' : ''}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">文字色のコントラスト目安</p>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">色調パレット</h2>
          <div className="space-y-2">
            {shades(hex).map((c, i) => (
              <button key={i} className="flex h-9 w-full items-center justify-between rounded-lg border border-line/60 px-3 font-mono text-xs transition hover:scale-[1.02]"
                style={{ backgroundColor: c, color: i < 5 ? (luminance > 150 ? '#111' : '#fff') : (luminance > 150 ? '#fff' : '#111') }}
                onClick={() => copy(c)}>
                <span>{c}</span><Copy size={13} className="opacity-60" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
