'use client';

import { useEffect, useRef, useState } from 'react';

/** 画面に収まる大きさを 100% として、一段階ずつ変える。大きくは、元の読みやすい大きさまで戻せる */
const ZOOM_LEVELS = [0.75, 1, 1.5, 2, 3, 4] as const;

/**
 * 書類の紙を、今見えている画面の中に収めて表示する。
 * 100% がその大きさ。小さく・大きくで、その前後に変えられる。
 */
/** 選んだ紙の実寸。文字がはみ出すときは、1枚の中に収まるまで小さくする */
export function PaperPage({
  widthMm,
  heightMm,
  children,
}: {
  widthMm: number;
  heightMm: number;
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const frame = frameRef.current;
    const inner = innerRef.current;
    if (!frame || !inner) return;
    const measure = () => {
      const contentHeight = inner.scrollHeight;
      if (contentHeight < 8 || frame.clientHeight < 8) return;
      const next = Math.min(1, frame.clientHeight / contentHeight);
      setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [widthMm, heightMm]);

  return (
    <div
      ref={frameRef}
      className="overflow-hidden bg-white shadow-sm"
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
    >
      <div
        ref={innerRef}
        style={{
          width: '100%',
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function FitZoomFrame({
  children,
  fitMode = 'screen',
}: {
  children: React.ReactNode;
  /** screen は画面の高さに収める。width は横幅に合わせ、縦はスクロールして文字を入れる */
  fitMode?: 'screen' | 'width';
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [fit, setFit] = useState(1);

  useEffect(() => {
    const measure = () => {
      const paper = paperRef.current;
      const host = hostRef.current;
      if (!paper || !host) return;
      const w = paper.offsetWidth;
      const h = paper.offsetHeight;
      if (w < 8 || h < 8) return;
      const top = paper.getBoundingClientRect().top;
      const availH = Math.max(200, window.innerHeight - top - 16);
      const availW = Math.max(160, host.clientWidth);
      const nextFit =
        fitMode === 'width'
          ? Math.min(availW / w, 1)
          : Math.min(availW / w, availH / h, 1);
      setNatural((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      setFit((prev) => (Math.abs(prev - nextFit) < 0.01 ? prev : nextFit));
    };
    measure();
    const frame = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [fitMode]);

  const zoom = ZOOM_LEVELS[zoomIndex] ?? 1;
  const scale = (fit > 0 ? fit : 1) * zoom;
  const ready = natural.w > 0 && natural.h > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1 text-xs text-hai">
        <button
          type="button"
          className="rounded border border-gin bg-white px-2 py-1 text-sumi disabled:opacity-40"
          onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
          disabled={zoomIndex <= 0}
        >
          小さく
        </button>
        <span className="min-w-[3rem] text-center tabular-nums text-sumi">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="rounded border border-gin bg-white px-2 py-1 text-sumi disabled:opacity-40"
          onClick={() =>
            setZoomIndex((index) => Math.min(ZOOM_LEVELS.length - 1, index + 1))
          }
          disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
        >
          大きく
        </button>
        {zoom !== 1 && (
          <button
            type="button"
            className="rounded border border-gin bg-white px-2 py-1 text-sumi"
            onClick={() => setZoomIndex(1)}
          >
            画面に合わせる
          </button>
        )}
      </div>
      <div ref={hostRef} className="flex w-full min-w-0 justify-center">
        <div
          className="relative mx-auto"
          style={
            ready
              ? { width: natural.w * scale, height: natural.h * scale }
              : undefined
          }
        >
          <div
            ref={paperRef}
            style={
              ready
                ? {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }
                : undefined
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
