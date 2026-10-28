'use client';

/**
 * 許可証 / 封筒書 / 封筒大テンプレートのライブプレビュー。
 * `pages` で渡されたページ定義（@komine/types と同一）に沿って背景画像と入力欄を表示する。
 */

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PermitField, PermitPage } from '@komine/types';
import { PERMIT_CERTIFICATE_PAGES } from '@komine/types';
import {
  PERMIT_CERTIFICATE_FIELD_ROOM,
  overflowsRoom,
  textSpanPt,
  type PermitFieldRoom,
} from '@/lib/permit-field-room';
import {
  measureTextPt,
  permitPrintFont,
  useFontsReadyVersion,
} from '@/lib/permit-text-measure';
import { FitZoomFrame } from './document-preview-zoom';

const CERTIFICATE_BASE_FILE = PERMIT_CERTIFICATE_PAGES[0]?.baseFile;

/** 入力欄の枠の太さと内側の余白（px）。文字の書き出しを刷る位置にそろえるために足し引きする */
const INPUT_EDGE_PX = 3;

/** 横書きの欄の枠（pt）。使える範囲を基本にし、文字がそれより長ければ文字の長さまで伸ばす */
function horizontalBoxPt(
  field: PermitField,
  room: PermitFieldRoom | undefined,
  textWidthPt: number
): { left: number; right: number } {
  const align = field.align ?? 'left';
  let base: { left: number; right: number };
  if (room) {
    if (align === 'center') {
      const half = Math.min(
        room.left !== undefined ? field.x - room.left : Infinity,
        room.right - field.x
      );
      base = { left: field.x - half, right: field.x + half };
    } else if (align === 'right') {
      base = { left: room.left ?? field.x - (field.widthPt ?? 100), right: field.x };
    } else {
      base = { left: field.x, right: room.right };
    }
  } else {
    base = textSpanPt(field, field.widthPt ?? 100);
  }
  const text = textSpanPt(field, textWidthPt);
  return { left: Math.min(base.left, text.left), right: Math.max(base.right, text.right) };
}

interface PermitLivePreviewProps {
  /** 省略時は許可証（1ページ） */
  pages?: readonly PermitPage[];
  templateData: Record<string, string>;
  onTemplateDataChange: (key: string, value: string) => void;
}

function PermitFieldOverlay({
  field,
  page,
  value,
  onChange,
  scalePxPerPt,
  room,
  textWidthPt,
  overflow,
}: {
  field: PermitField;
  page: PermitPage;
  value: string;
  onChange: (value: string) => void;
  scalePxPerPt: number;
  room: PermitFieldRoom | undefined;
  textWidthPt: number;
  overflow: boolean;
}) {
  const scale = scalePxPerPt;
  let widthPx = (field.widthPt ?? 100) * scale;
  const heightPx = (field.heightPt ?? field.fontSize * 1.5) * scale;
  const fontPx = field.fontSize * scale;

  let leftPx: number;
  let topPx: number;

  if (field.direction === 'vertical') {
    leftPx = (field.x - (field.widthPt ?? 24) / 2) * scale;
    topPx = (page.heightPt - field.y) * scale;
  } else if (field.direction === 'rotated') {
    leftPx = field.x * scale;
    topPx = (page.heightPt - field.y) * scale;
  } else {
    const box = horizontalBoxPt(field, room, textWidthPt);
    leftPx = box.left * scale - INPUT_EDGE_PX;
    widthPx = (box.right - box.left) * scale + INPUT_EDGE_PX * 2;
    topPx = (page.heightPt - field.y - field.fontSize) * scale;
  }

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${leftPx}px`,
    top: `${topPx}px`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    fontSize: `${fontPx}px`,
    fontWeight: field.bold ? 700 : 400,
    lineHeight:
      field.direction === 'vertical'
        ? `${(field.lineHeight ?? field.fontSize * 1.3) * scale}px`
        : `${heightPx}px`,
    textAlign:
      field.direction === 'horizontal' ? (field.align ?? 'left') : 'center',
  };

  const isPostalDigit = field.hint === '1';

  const inputClassName = cn(
    permitPrintFont.className,
    isPostalDigit
      ? 'block bg-transparent border border-transparent rounded-[1px] px-0 outline-none focus:bg-white/40 focus:border-matsu/50 focus:border-dashed text-sumi text-center placeholder:text-hai/40'
      : 'block bg-white/60 border border-dashed border-matsu/40 rounded-[2px] px-[2px] outline-none focus:bg-ai/5 focus:border-ai focus:border-solid focus:ring-2 focus:ring-ai/20 text-sumi placeholder:text-hai/60',
    overflow &&
      'border-solid border-beni bg-beni-50 ring-2 ring-beni-300 focus:border-beni focus:bg-beni-50 focus:ring-beni-300 focus-visible:!outline-beni'
  );

  if (field.direction === 'vertical') {
    return (
      <div style={commonStyle}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={1}
          title={field.label}
          className={cn(inputClassName, 'h-full w-full resize-none overflow-hidden')}
          style={{
            fontSize: `${fontPx}px`,
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            lineHeight: `${(field.lineHeight ?? field.fontSize * 1.3) * scale}px`,
          }}
          aria-label={field.label}
        />
      </div>
    );
  }

  if (field.direction === 'rotated') {
    return (
      <div style={{ ...commonStyle, transform: 'rotate(-90deg)', transformOrigin: '0 0' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(inputClassName, 'w-full h-full')}
          style={{ fontSize: `${fontPx}px` }}
          aria-label={field.label}
        />
      </div>
    );
  }

  return (
    <div style={commonStyle}>
      <input
        type="text"
        title={field.label}
        data-overflow={overflow ? 'true' : 'false'}
        inputMode={field.hint === '1' ? 'numeric' : undefined}
        maxLength={field.hint === '1' ? 1 : undefined}
        value={value}
        onChange={(e) => {
          const next =
            field.hint === '1'
              ? e.target.value.replace(/\D/g, '').slice(-1)
              : e.target.value;
          onChange(next);
        }}
        placeholder={field.placeholder}
        className={cn(inputClassName, 'w-full h-full')}
        style={{ fontSize: `${fontPx}px`, textAlign: field.align ?? 'left' }}
        aria-label={field.label}
      />
    </div>
  );
}

function PermitPagePreview({
  page,
  templateData,
  onTemplateDataChange,
}: {
  page: PermitPage;
  templateData: Record<string, string>;
  onTemplateDataChange: (key: string, value: string) => void;
}) {
  const MAX_WIDTH_PX = 720;
  const scalePxPerPt = Math.min(MAX_WIDTH_PX / page.widthPt, 1.667);
  const renderWidth = page.widthPt * scalePxPerPt;
  const renderHeight = page.heightPt * scalePxPerPt;

  // 書体を読み込み終えたら描き直し、幅を測り直す
  const canMeasure = useFontsReadyVersion() > 0;
  const rooms =
    page.baseFile === CERTIFICATE_BASE_FILE ? PERMIT_CERTIFICATE_FIELD_ROOM : undefined;
  const fieldStates = page.fields.map((field) => {
    const value = templateData[field.id] || '';
    const isHorizontal = (field.direction ?? 'horizontal') === 'horizontal';
    const textWidthPt =
      canMeasure && isHorizontal ? measureTextPt(value, field.fontSize, field.bold) : 0;
    const room = rooms?.[field.id];
    const overflow = !!room && !!value && overflowsRoom(field, textWidthPt, room);
    return { field, value, textWidthPt, room, overflow };
  });
  const overflowLabels = fieldStates.filter((s) => s.overflow).map((s) => s.field.label);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-hai">
        <span className="font-mincho text-sumi font-semibold text-sm">
          {page.label}
        </span>
        <span>
          {page.widthPt.toFixed(0)} × {page.heightPt.toFixed(0)} pt
        </span>
      </div>
      {overflowLabels.length > 0 && (
        <div
          role="alert"
          className="rounded border border-beni-200 bg-beni-50 px-3 py-2 text-xs leading-relaxed text-beni-dark"
        >
          <p className="font-semibold">
            はみ出している欄があります：{overflowLabels.join('、')}
          </p>
          <p>
            赤い欄は、刷ると台紙の線や「殿」「号」などの字にかかります。文字を減らすか、住所なら2列目に分けてください。
          </p>
        </div>
      )}
      <FitZoomFrame>
      <div
        className="relative mx-auto bg-white border border-gin shadow-elegant-sm rounded overflow-hidden"
        style={{ width: `${renderWidth}px`, height: `${renderHeight}px` }}
      >
        {page.previewPng.endsWith('.svg') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.previewPng}
            alt={`${page.label} テンプレート`}
            className="pointer-events-none select-none absolute inset-0 h-full w-full object-fill"
            draggable={false}
          />
        ) : (
          <Image
            src={page.previewPng}
            alt={`${page.label} テンプレート`}
            fill
            sizes={`${renderWidth}px`}
            priority={page.pageIndex === 0}
            unoptimized
            className="pointer-events-none select-none"
          />
        )}
        {fieldStates.map(({ field, value, textWidthPt, room, overflow }) => (
          <PermitFieldOverlay
            key={`${field.pageIndex}-${field.id}`}
            field={field}
            page={page}
            value={value}
            onChange={(v) => onTemplateDataChange(field.id, v)}
            scalePxPerPt={scalePxPerPt}
            room={room}
            textWidthPt={textWidthPt}
            overflow={overflow}
          />
        ))}
        {page.fields.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-white/80 px-3 py-1 text-xs text-hai border border-gin rounded">
              このページには入力欄はありません
            </span>
          </div>
        )}
      </div>
      </FitZoomFrame>
    </div>
  );
}

export function PermitLivePreview({
  pages: pagesProp,
  templateData,
  onTemplateDataChange,
}: PermitLivePreviewProps) {
  const pages = pagesProp ?? PERMIT_CERTIFICATE_PAGES;
  const enabledPages = useMemo(() => pages.filter((p) => p.enabled), [pages]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activePage = enabledPages[activeIndex] ?? enabledPages[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 border-b border-gin pb-1">
        {enabledPages.map((p, i) => {
          const isActive = i === activeIndex;
          const hasFields = p.fields.length > 0;
          return (
            <button
              key={p.pageIndex}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-t-md border-b-2 transition-colors',
                isActive
                  ? 'border-matsu text-matsu-dark font-semibold bg-kinari-50'
                  : 'border-transparent text-hai hover:text-sumi hover:bg-shiro',
                !hasFields && !isActive && 'opacity-60'
              )}
            >
              {p.label}
              {hasFields && (
                <span className="ml-1 text-[9px] text-matsu">
                  ({p.fields.length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-hai leading-relaxed">
        背景は台紙の絵です。入れた文字は、刷るときと同じ書体・大きさ・位置で出ます。
      </p>

      <div className="rounded-lg border border-gin bg-shiro p-3">
        {activePage && (
          <PermitPagePreview
            page={activePage}
            templateData={templateData}
            onTemplateDataChange={onTemplateDataChange}
          />
        )}
      </div>
    </div>
  );
}
