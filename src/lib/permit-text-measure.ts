'use client';

import { useEffect, useState } from 'react';
import { Noto_Sans_JP } from 'next/font/google';

/** 許可証・封筒のPDFに刷る書体と同じもの。プレビューの文字もこれで見せる */
export const permitPrintFont = Noto_Sans_JP({
  weight: ['400', '700'],
  preload: false,
  display: 'swap',
});

let measureCanvas: HTMLCanvasElement | null = null;

/** 刷ったときの文字の幅（pt） */
export function measureTextPt(text: string, fontSizePt: number, bold = false): number {
  if (!text || typeof document === 'undefined') return 0;
  measureCanvas ??= document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return Array.from(text).length * fontSizePt;
  ctx.font = `${bold ? 700 : 400} ${fontSizePt}px ${permitPrintFont.style.fontFamily}`;
  return ctx.measureText(text).width;
}

/**
 * 書体を読み込み終えるたびに増える数。幅を測り直すきっかけに使う。
 * 0 のあいだは画面がまだブラウザで開いていないので、幅を測らない。
 */
export function useFontsReadyVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) {
      setVersion(1);
      return;
    }
    let alive = true;
    const bump = () => {
      if (alive) setVersion((v) => v + 1);
    };
    void fonts.ready.then(bump);
    fonts.addEventListener('loadingdone', bump);
    return () => {
      alive = false;
      fonts.removeEventListener('loadingdone', bump);
    };
  }, []);
  return version;
}
