import { useEffect, useState } from 'react';
import { Scissors, ScanText, Copy, Save, Loader2, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { api } from '../../api';
import { SectionTitle, useToast } from '../ui';

export default function ScreenshotPanel() {
  const toast = useToast();
  const [capture, setCapture] = useState<{ dataURL: string; filePath: string } | null>(null);
  const [lang, setLang] = useState('jpn');
  const [text, setText] = useState('');
  const [ocrRunning, setOcrRunning] = useState(false);

  useEffect(() => {
    const off = api.events.onScreenshotCaptured((c) => {
      setCapture(c);
      setText('');
      toast('スクリーンショットを保存しました');
    });
    return off;
  }, [toast]);

  const runOcr = async () => {
    if (!capture || ocrRunning) return;
    setOcrRunning(true);
    try {
      const worker = await createWorker(lang);
      const { data } = await worker.recognize(capture.dataURL);
      await worker.terminate();
      setText(data.text);
      toast('文字を抽出しました');
    } catch (e) {
      toast(`OCRに失敗しました: ${String(e).slice(0, 80)}`, 'error');
    } finally {
      setOcrRunning(false);
    }
  };

  const copyText = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast('テキストをコピーしました');
    } catch {
      toast('コピーに失敗しました', 'error');
    }
  };

  return (
    <div>
      <SectionTitle
        icon={<Scissors size={20} />}
        title="スクリーンショット"
        description="範囲をドラッグして捕捉。OCRで画像から文字を取り出せます。"
        right={
          <button className="btn btn-primary" onClick={() => api.screenshot.open()}>
            <Scissors size={15} /> 範囲をキャプチャ
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card flex min-h-[320px] items-center justify-center overflow-hidden p-4">
          {capture ? (
            <img src={capture.dataURL} className="max-h-[460px] w-auto rounded-xl border border-line shadow-lg" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center text-muted">
              <ImageIcon size={38} className="opacity-40" />
              <div className="font-medium text-txt/80">まだキャプチャがありません</div>
              <div className="text-xs">「範囲をキャプチャ」を押して画面をドラッグしてください。<br />Ctrl+Shift+S でも起動できます。</div>
            </div>
          )}
        </div>

        <div className="card flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><ScanText size={17} className="text-accent" /> OCR テキスト</h2>
            <div className="flex items-center gap-2">
              <select className="input w-auto py-1 text-xs" value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="jpn">日本語</option>
                <option value="eng">English</option>
              </select>
              <button className="btn px-3 py-1.5 text-xs" onClick={runOcr} disabled={!capture || ocrRunning}>
                {ocrRunning ? <Loader2 size={14} className="animate-spin" /> : <ScanText size={14} />} 抽出
              </button>
            </div>
          </div>
          <textarea
            className="input min-h-[240px] flex-1 resize-none font-mono text-xs leading-relaxed"
            placeholder="ここに抽出結果が表示されます"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button className="btn flex-1" onClick={copyText} disabled={!text}><Copy size={14} /> コピー</button>
            <button className="btn flex-1" disabled={!capture} onClick={async () => {
              const file = await api.saveDialog('screenshot.png');
              if (!file || !capture) return;
              const res = await api.writeFile(file, capture.dataURL);
              toast(res.ok ? '保存しました' : '保存に失敗しました', res.ok ? 'success' : 'error');
            }}><Save size={14} /> 別名保存</button>
            <button className="btn" disabled={!capture} title="保存先を開く" onClick={() => capture && api.showItem(capture.filePath)}><ExternalLink size={14} /></button>
          </div>
          <p className="mt-3 text-[11px] text-muted">※ 初回OCRは言語データのダウンロードに数秒かかります（要インターネット）。</p>
        </div>
      </div>
    </div>
  );
}
