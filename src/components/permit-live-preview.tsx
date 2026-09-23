'use client';

/**
 * 許可証 / 封筒書 / 封筒大テンプレートのライブプレビュー。
 * `pages` で渡されたページ定義（@komine/types と同一）に沿って背景画像と入力欄を表示する。
 */

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PermitField, PermitPage } from '@komine/types';
import { PERMIT_CERTIFICATE_PAGES } from '@komine/types';

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
}: {
  field: PermitField;
  page: PermitPage;
  value: string;
  onChange: (value: string) => void;
  scalePxPerPt: number;
}) {
  const scale = scalePxPerPt;
  const widthPx = (field.widthPt ?? 100) * scale;
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
    const widthPt = field.widthPt ?? 100;
    if (field.align === 'center') {
      leftPx = (field.x - widthPt / 2) * scale;
    } else if (field.align === 'right') {
      leftPx = (field.x - widthPt) * scale;
    } else {
      leftPx = field.x * scale;
    }
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
  const showFieldLabel = !isPostalDigit;

  const inputClassName = isPostalDigit
    ? 'block bg-transparent border border-transparent rounded-[1px] px-0 outline-none focus:bg-white/40 focus:border-matsu/50 focus:border-dashed font-mincho text-sumi text-center placeholder:text-hai/40'
    : 'block bg-white/70 border border-dashed border-matsu/40 rounded-[2px] px-1 outline-none focus:bg-ai/5 focus:border-ai focus:border-solid focus:ring-2 focus:ring-ai/20 font-mincho text-sumi placeholder:text-hai/60';

  if (field.direction === 'vertical') {
    return (
      <div style={commonStyle}>
        <span
          className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-sans text-matsu-dark bg-white px-1 rounded border border-gin whitespace-nowrap"
          aria-hidden
        >
          {field.label}
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={1}
          className={cn(inputClassName, 'h-full w-full resize-none overflow-hidden font-mincho')}
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
      {showFieldLabel && (
        <span
          className="pointer-events-none absolute -top-4 left-0 text-[10px] font-sans text-matsu-dark bg-white px-1 rounded border border-gin whitespace-nowrap"
          aria-hidden
        >
          {field.label}
        </span>
      )}
      <input
        type="text"
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
        {page.fields.map((field) => (
          <PermitFieldOverlay
            key={`${field.pageIndex}-${field.id}`}
            field={field}
            page={page}
            value={templateData[field.id] || ''}
            onChange={(v) => onTemplateDataChange(field.id, v)}
            scalePxPerPt={scalePxPerPt}
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
        背景はテンプレート画像です。入力欄の位置に PDF 出力でも文字が印字されます。
      </p>

      <div className="rounded-lg border border-gin bg-shiro p-3 max-h-[min(82vh,60rem)] overflow-auto">
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
