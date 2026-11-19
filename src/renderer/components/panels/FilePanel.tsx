import { useState } from 'react';
import { Files, Image as ImageIcon, FileText, Replace, Loader2, FolderOpen, Play } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { api } from '../../api';
import { SectionTitle, useToast } from '../ui';

type Tab = 'image' | 'pdf' | 'rename';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export default function FilePanel() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('image');
  const [busy, setBusy] = useState(false);

  // image
  const [images, setImages] = useState<File[]>([]);
  const [format, setFormat] = useState('image/jpeg');
  const [quality, setQuality] = useState(0.9);
  const [scale, setScale] = useState(1);
  // pdf
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [range, setRange] = useState('1-');
  // rename
  const [dir, setDir] = useState('');
  const [entries, setEntries] = useState<{ name: string; path: string }[]>([]);
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [numbering, setNumbering] = useState(false);

  const renamePreview = (name: string, index: number) => {
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let next = find ? base.split(find).join(replace) : base;
    if (numbering) next = `${next}_${String(index + 1).padStart(2, '0')}`;
    return `${prefix}${next}${suffix}${ext}`;
  };

  const convertImages = async () => {
    if (!images.length) return toast('画像を選択してください', 'error');
    setBusy(true);
    try {
      const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
      const outDir = images.length > 1 ? await api.directoryDialog() : null;
      for (const [i, file] of images.entries()) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, quality));
        if (!blob) throw new Error('変換に失敗しました');
        const dataUrl = await blobToDataUrl(blob);
        const base = file.name.replace(/\.[^.]+$/, '');
        const target = images.length === 1
          ? await api.saveDialog(`${base}.${ext}`)
          : outDir ? `${outDir}\\${base}.${ext}` : null;
        if (!target) break;
        const res = await api.writeFile(target, dataUrl);
        if (!res.ok) toast(res.error ?? '保存に失敗しました', 'error');
        if (images.length === 1) break;
      }
      toast('画像を変換しました');
    } catch (e) {
      toast(`変換に失敗: ${String(e).slice(0, 90)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const mergePdfs = async () => {
    if (pdfs.length < 2) return toast('PDFを2つ以上選択してください', 'error');
    setBusy(true);
    try {
      const doc = await PDFDocument.create();
      for (const pdf of pdfs) {
        const src = await PDFDocument.load(await pdf.arrayBuffer());
        const pages = await doc.copyPages(src, src.getPageIndices());
        pages.forEach((p) => doc.addPage(p));
      }
      const bytes = await doc.save();
      const target = await api.saveDialog('merged.pdf');
      if (target) {
        const dataUrl = await blobToDataUrl(new Blob([bytes], { type: 'application/pdf' }));
        await api.writeFile(target, dataUrl);
        toast('PDFを結合しました');
      }
    } catch (e) {
      toast(`結合に失敗: ${String(e).slice(0, 90)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const splitPdf = async () => {
    const pdf = pdfs[0];
    if (!pdf) return toast('PDFを選択してください', 'error');
    setBusy(true);
    try {
      const src = await PDFDocument.load(await pdf.arrayBuffer());
      const total = src.getPageCount();
      const indices: number[] = [];
      for (const part of range.split(',')) {
        const [a, b] = part.trim().split('-').map((x) => x.trim());
        if (!a) continue;
        const from = Math.max(1, Number(a));
        const to = b ? Math.min(total, Number(b)) : b === '' ? total : from;
        for (let p = from; p <= to; p++) if (p <= total) indices.push(p - 1);
      }
      const doc = await PDFDocument.create();
      const pages = await doc.copyPages(src, indices);
      pages.forEach((p) => doc.addPage(p));
      const bytes = await doc.save();
      const target = await api.saveDialog('extracted.pdf');
      if (target) {
        const dataUrl = await blobToDataUrl(new Blob([bytes], { type: 'application/pdf' }));
        await api.writeFile(target, dataUrl);
        toast(`${indices.length}ページを抽出しました`);
      }
    } catch (e) {
      toast(`抽出に失敗: ${String(e).slice(0, 90)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SectionTitle icon={<Files size={20} />} title="ファイルツール" description="画像変換・PDF操作・一括リネーム。" />
      <div className="mb-5 flex gap-2">
        {([
          { id: 'image' as const, label: '画像変換', icon: <ImageIcon size={15} /> },
          { id: 'pdf' as const, label: 'PDF', icon: <FileText size={15} /> },
          { id: 'rename' as const, label: '一括リネーム', icon: <Replace size={15} /> },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`btn ${tab === t.id ? 'btn-primary' : ''}`}>{t.icon} {t.label}</button>
        ))}
      </div>

      {busy && <div className="mb-4 flex items-center gap-2 text-sm text-accent"><Loader2 size={15} className="animate-spin" /> 処理中...</div>}

      {tab === 'image' && (
        <div className="card max-w-3xl p-5">
          <label className="label">画像を選択（複数可）</label>
          <input type="file" accept="image/*" multiple className="input" onChange={(e) => setImages(Array.from(e.target.files ?? []))} />
          {images.length > 0 && <p className="mt-2 text-xs text-muted">{images.length} ファイル選択中</p>}
          <div className="mt-5 grid grid-cols-3 gap-4">
            <div><label className="label">形式</label>
              <select className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option>
              </select>
            </div>
            <div><label className="label">画質 ({(quality * 100).toFixed(0)}%)</label>
              <input type="range" min="0.1" max="1" step="0.05" value={quality} className="w-full accent-[rgb(var(--accent))]" onChange={(e) => setQuality(Number(e.target.value))} />
            </div>
            <div><label className="label">サイズ</label>
              <select className="input" value={scale} onChange={(e) => setScale(Number(e.target.value))}>
                <option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option><option value="0.25">25%</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary mt-5" onClick={convertImages} disabled={busy}><Play size={15} /> 変換して保存</button>
          <p className="mt-3 text-[11px] text-muted">複数ファイルの場合は保存先フォルダーを選択します。単体の場合は保存ダイアログが開きます。</p>
        </div>
      )}

      {tab === 'pdf' && (
        <div className="grid max-w-4xl gap-5 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileText size={16} className="text-accent" /> 結合</h2>
            <input type="file" accept="application/pdf" multiple className="input" onChange={(e) => setPdfs(Array.from(e.target.files ?? []))} />
            <p className="mt-2 text-xs text-muted">{pdfs.length} ファイル（順番どおりに結合）</p>
            <button className="btn btn-primary mt-4" onClick={mergePdfs} disabled={busy}><Play size={15} /> 結合する</button>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileText size={16} className="text-accent" /> 分割・抽出</h2>
            <input type="file" accept="application/pdf" className="input" onChange={(e) => setPdfs(Array.from(e.target.files ?? []))} />
            <label className="label mt-4">ページ指定（例: 1-3,5,8-）</label>
            <input className="input" value={range} onChange={(e) => setRange(e.target.value)} />
            <button className="btn btn-primary mt-4" onClick={splitPdf} disabled={busy}><Play size={15} /> 抽出する</button>
          </div>
        </div>
      )}

      {tab === 'rename' && (
        <div className="card max-w-4xl p-5">
          <button className="btn" onClick={async () => {
            const d = await api.directoryDialog();
            if (!d) return;
            setDir(d);
            setEntries(await api.listDir(d));
          }}><FolderOpen size={15} /> フォルダーを選択</button>
          {dir && <p className="mt-2 truncate text-xs text-muted">{dir} — {entries.length} ファイル</p>}
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div><label className="label">置換する文字</label><input className="input" value={find} onChange={(e) => setFind(e.target.value)} /></div>
            <div><label className="label">置換後</label><input className="input" value={replace} onChange={(e) => setReplace(e.target.value)} /></div>
            <div><label className="label">接頭辞</label><input className="input" value={prefix} onChange={(e) => setPrefix(e.target.value)} /></div>
            <div><label className="label">接尾辞</label><input className="input" value={suffix} onChange={(e) => setSuffix(e.target.value)} /></div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={numbering} onChange={(e) => setNumbering(e.target.checked)} /> 連番を付ける (_01, _02...)</label>
          {entries.length > 0 && (
            <div className="mt-5 max-h-64 overflow-y-auto rounded-xl border border-line">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface text-muted"><tr><th className="p-2">元の名前</th><th className="p-2">変更後</th></tr></thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.path} className="border-t border-line/50"><td className="p-2 text-muted">{e.name}</td><td className="p-2 text-accent">{renamePreview(e.name, i)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="btn btn-primary mt-4" disabled={!entries.length} onClick={async () => {
            let ok = 0;
            for (const [i, e] of entries.entries()) {
              const target = `${dir}\\${renamePreview(e.name, i)}`;
              if (target === e.path) { ok++; continue; }
              const res = await api.rename(e.path, target);
              if (res.ok) ok++;
            }
            setEntries(await api.listDir(dir));
            toast(`${ok} 件をリネームしました`);
          }}><Play size={15} /> 実行</button>
        </div>
      )}
    </div>
  );
}
