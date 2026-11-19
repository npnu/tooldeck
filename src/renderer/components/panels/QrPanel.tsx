import { useState } from 'react';
import { QrCode, ScanLine, Copy, Save, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { api } from '../../api';
import { SectionTitle, useToast } from '../ui';

export default function QrPanel() {
  const toast = useToast();
  const [tab, setTab] = useState<'generate' | 'read'>('generate');
  const [text, setText] = useState('');
  const [size, setSize] = useState(320);
  const [qr, setQr] = useState('');
  const [result, setResult] = useState('');

  const generate = async () => {
    if (!text.trim()) return toast('内容を入力してください', 'error');
    try {
      setQr(await QRCode.toDataURL(text, { width: size, margin: 2, color: { dark: '#10131f', light: '#ffffff' } }));
    } catch (e) {
      toast(`生成に失敗: ${String(e).slice(0, 80)}`, 'error');
    }
  };

  const read = async (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const decoded = jsQR(data.data, data.width, data.height);
    setResult(decoded ? decoded.data : 'QRコードを検出できませんでした');
    toast(decoded ? '読み取りました' : '検出できませんでした', decoded ? 'success' : 'error');
  };

  return (
    <div>
      <SectionTitle icon={<QrCode size={20} />} title="QRコード" description="作成と読み取り。カメラ画像もOK。" />
      <div className="mb-5 flex gap-2">
        <button className={`btn ${tab === 'generate' ? 'btn-primary' : ''}`} onClick={() => setTab('generate')}><QrCode size={15} /> 生成</button>
        <button className={`btn ${tab === 'read' ? 'btn-primary' : ''}`} onClick={() => setTab('read')}><ScanLine size={15} /> 読み取り</button>
      </div>

      {tab === 'generate' ? (
        <div className="grid max-w-4xl gap-5 md:grid-cols-[1fr_360px]">
          <div className="card p-5">
            <label className="label">内容（URL・テキストなど）</label>
            <textarea className="input h-32 resize-none" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://example.com" />
            <label className="label mt-4">サイズ: {size}px</label>
            <input type="range" min="160" max="640" step="20" value={size} className="w-full accent-[rgb(var(--accent))]" onChange={(e) => setSize(Number(e.target.value))} />
            <div className="mt-5 flex gap-2">
              <button className="btn btn-primary" onClick={generate}><QrCode size={15} /> 生成</button>
              <button className="btn" disabled={!qr} onClick={async () => {
                await navigator.clipboard.writeText(text);
                toast('内容をコピーしました');
              }}><Copy size={15} /> 内容をコピー</button>
              <button className="btn" disabled={!qr} onClick={async () => {
                const file = await api.saveDialog('qrcode.png');
                if (file) {
                  const res = await api.writeFile(file, qr);
                  toast(res.ok ? '保存しました' : '保存に失敗しました', res.ok ? 'success' : 'error');
                }
              }}><Save size={15} /> 保存</button>
            </div>
          </div>
          <div className="card flex min-h-[300px] items-center justify-center bg-white p-5">
            {qr ? <img src={qr} alt="QR code" style={{ width: size > 400 ? 360 : size }} /> : <span className="text-sm text-gray-400">ここにQRコードが表示されます</span>}
          </div>
        </div>
      ) : (
        <div className="card max-w-3xl p-5">
          <label className="label">QRコードの画像を選択</label>
          <input type="file" accept="image/*" className="input" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) read(f);
          }} />
          <div className="mt-5 rounded-xl border border-line bg-panel/60 p-4">
            <label className="label">読み取り結果</label>
            <div className="break-all text-sm">{result || '—'}</div>
          </div>
          {result && result !== 'QRコードを検出できませんでした' && (
            <div className="mt-4 flex gap-2">
              <button className="btn" onClick={async () => {
                await navigator.clipboard.writeText(result);
                toast('コピーしました');
              }}><Copy size={15} /> コピー</button>
              {/^https?:\/\//.test(result) && (
                <button className="btn" onClick={() => api.openPath(result)}><ExternalLink size={15} /> ブラウザで開く</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
