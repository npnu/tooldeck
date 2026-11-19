import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

interface Rect { x: number; y: number; w: number; h: number }

export default function ScreenshotOverlay() {
  const contentRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        const sources = await api.screenshot.sources();
        const source = sources.find((s) => s.id.startsWith('screen:')) ?? sources[0];
        if (!source) throw new Error('画面ソースが見つかりません');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id,
            },
          } as unknown as MediaTrackConstraints,
        });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const canvas = contentRef.current!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0);
        setReady(true);
      } catch (e) {
        setError(String(e));
      }
    })();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') api.screenshot.done(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !ready) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (rect && rect.w > 1 && rect.h > 1) {
      ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w, rect.h);
      ctx.fillStyle = 'rgba(129, 140, 248, 0.9)';
      ctx.font = '12px Segoe UI';
      ctx.fillText(`${Math.round(rect.w)} × ${Math.round(rect.h)}`, rect.x, rect.y - 6);
    }
  }, [rect, ready]);

  const pos = (e: React.MouseEvent) => ({ x: e.clientX, y: e.clientY });

  const finish = (end: { x: number; y: number }) => {
    const start = startRef.current;
    startRef.current = null;
    const content = contentRef.current;
    if (!start || !content) return api.screenshot.done(null);
    const scaleX = content.width / window.innerWidth;
    const scaleY = content.height / window.innerHeight;
    const x = Math.max(0, Math.min(start.x, end.x));
    const y = Math.max(0, Math.min(start.y, end.y));
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    if (w < 4 || h < 4) return api.screenshot.done(null);
    const crop = document.createElement('canvas');
    crop.width = Math.round(w * scaleX);
    crop.height = Math.round(h * scaleY);
    crop.getContext('2d')!.drawImage(
      content,
      Math.round(x * scaleX), Math.round(y * scaleY), crop.width, crop.height,
      0, 0, crop.width, crop.height,
    );
    api.screenshot.done(crop.toDataURL('image/png'));
  };

  return (
    <div className="h-screen w-screen cursor-crosshair overflow-hidden bg-black">
      <canvas ref={contentRef} className="absolute inset-0 h-full w-full object-fill" />
      <canvas ref={overlayRef} className="absolute inset-0 h-full w-full"
        onMouseDown={(e) => {
          startRef.current = pos(e);
          setRect({ ...pos(e), w: 0, h: 0 });
        }}
        onMouseMove={(e) => {
          if (!startRef.current) return;
          const s = startRef.current;
          const p = pos(e);
          setRect({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
        }}
        onMouseUp={(e) => finish(pos(e))}
      />
      <video ref={videoRef} className="hidden" muted playsInline />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/80">
          {error ? `キャプチャ開始に失敗: ${error}` : '画面を準備中...'}
        </div>
      )}
      {ready && !rect && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-5 py-2 text-xs text-white/90">
          ドラッグして範囲を選択・ESC でキャンセル
        </div>
      )}
    </div>
  );
}
