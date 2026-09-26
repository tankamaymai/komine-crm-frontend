'use client';

import { useRef, useState } from 'react';
import { FitZoomFrame } from './document-preview-zoom';

type Side = 'front' | 'back';
type FontName = 'gothic' | 'mincho';
type WeightName = 'normal' | 'bold';
type DirectionName = 'vertical' | 'horizontal';

interface PostcardPiece {
  id: string;
  textKey: string;
  label: string;
  side: Side;
  locked: boolean;
  font: FontName;
  sizePt: number;
  weight: WeightName;
  direction: DirectionName;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

const PAGE = { widthMm: 100, heightMm: 148 };

/**
 * 日本郵便の郵便番号枠（上端から12mm、右端から8mm。枠の内側を基準）。
 * 官製はがきに最初から印刷されている赤い枠と同じ位置。
 * https://www.post.japanpost.jp/service/search/zipcode/zipmanual/p05.html
 */
const POSTAL_FRAME = {
  topMm: 12,
  rightMm: 8,
  groupWidthMm: 47.7,
  boxWidthMm: 5.7,
  boxHeightMm: 8,
  digitLeftMm: [0, 7, 14, 21.6, 28.4, 35.2, 42.2],
};
const postalGroupLeftMm =
  PAGE.widthMm -
  POSTAL_FRAME.rightMm -
  POSTAL_FRAME.digitLeftMm[6] -
  POSTAL_FRAME.boxWidthMm;

const FONT_STACK: Record<FontName, string> = {
  gothic: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
  mincho: "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif",
};

function defaults(): PostcardPiece[] {
  return [
    { id: 'recipientAddress', textKey: 'recipientAddress', label: '宛先の住所', side: 'front', locked: false, font: 'gothic', sizePt: 12, weight: 'normal', direction: 'vertical', xMm: 78, yMm: 32, widthMm: 16, heightMm: 68 },
    { id: 'recipientName', textKey: 'recipientName', label: '宛先の名前', side: 'front', locked: false, font: 'mincho', sizePt: 16, weight: 'bold', direction: 'vertical', xMm: 39, yMm: 34, widthMm: 22, heightMm: 80 },
    { id: 'senderPostal', textKey: 'senderPostalCode', label: '差出人の郵便番号', side: 'front', locked: true, font: 'gothic', sizePt: 10, weight: 'normal', direction: 'horizontal', xMm: 8, yMm: 108, widthMm: 42, heightMm: 8 },
    { id: 'senderAddress', textKey: 'senderAddress', label: '差出人の住所', side: 'front', locked: false, font: 'gothic', sizePt: 10, weight: 'normal', direction: 'vertical', xMm: 8, yMm: 118, widthMm: 14, heightMm: 24 },
    { id: 'senderName', textKey: 'senderName', label: '差出人の名前', side: 'front', locked: false, font: 'mincho', sizePt: 11, weight: 'bold', direction: 'vertical', xMm: 24, yMm: 118, widthMm: 16, heightMm: 24 },
    { id: 'date', textKey: 'date', label: '日付', side: 'back', locked: false, font: 'gothic', sizePt: 11, weight: 'normal', direction: 'horizontal', xMm: 46, yMm: 8, widthMm: 46, heightMm: 10 },
    { id: 'message', textKey: 'message', label: '文章', side: 'back', locked: false, font: 'mincho', sizePt: 12, weight: 'normal', direction: 'horizontal', xMm: 10, yMm: 24, widthMm: 80, heightMm: 90 },
    { id: 'backSenderName', textKey: 'senderName', label: '末尾の名前', side: 'back', locked: false, font: 'mincho', sizePt: 12, weight: 'bold', direction: 'horizontal', xMm: 40, yMm: 120, widthMm: 52, heightMm: 18 },
  ];
}

function loadPieces(raw: string | undefined): PostcardPiece[] {
  const base = defaults();
  if (!raw) return base;
  try {
    const saved = JSON.parse(raw) as PostcardPiece[];
    if (!Array.isArray(saved)) return base;
    return base.map((piece) => {
      const found = saved.find((item) => item.id === piece.id);
      if (!found || piece.locked) return piece;
      return { ...piece, ...found, id: piece.id, textKey: piece.textKey, side: piece.side, locked: false };
    });
  } catch {
    return base;
  }
}

function todayLabel() {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

function postalDigits(code: string): string[] {
  const digits = code.replace(/\D/g, '');
  return Array.from({ length: 7 }, (_, index) => digits[index] ?? '');
}

function writePostalDigit(code: string, index: number, raw: string) {
  const next = postalDigits(code);
  next[index] = raw.replace(/\D/g, '').slice(-1);
  return next.join('');
}

function postalDigitsHtml(code: string) {
  return postalDigits(code)
    .map((digit, index) => {
      const left = postalGroupLeftMm + POSTAL_FRAME.digitLeftMm[index];
      return `<div style="position:absolute;left:${left}mm;top:${POSTAL_FRAME.topMm}mm;width:${POSTAL_FRAME.boxWidthMm}mm;height:${POSTAL_FRAME.boxHeightMm}mm;line-height:${POSTAL_FRAME.boxHeightMm}mm;text-align:center;font-size:14pt;font-weight:700;font-family:${FONT_STACK.gothic};">${escapeHtml(digit)}</div>`;
    })
    .join('');
}

function PostalCodeFrames({
  code,
  onChange,
}: {
  code: string;
  onChange: (value: string) => void;
}) {
  const digits = postalDigits(code);
  const hyphenLeft =
    postalGroupLeftMm +
    POSTAL_FRAME.digitLeftMm[2] +
    POSTAL_FRAME.boxWidthMm +
    (POSTAL_FRAME.digitLeftMm[3] - POSTAL_FRAME.digitLeftMm[2] - POSTAL_FRAME.boxWidthMm) / 2 -
    1.2;
  return (
    <>
      {digits.map((digit, index) => {
        const left = postalGroupLeftMm + POSTAL_FRAME.digitLeftMm[index];
        const thick = index < 3;
        return (
          <input
            key={index}
            aria-label={`郵便番号 ${index + 1}桁目`}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(event) => onChange(writePostalDigit(code, index, event.target.value))}
            className="absolute bg-transparent p-0 text-center font-bold outline"
            style={{
              left: `${left}mm`,
              top: `${POSTAL_FRAME.topMm}mm`,
              width: `${POSTAL_FRAME.boxWidthMm}mm`,
              height: `${POSTAL_FRAME.boxHeightMm}mm`,
              boxSizing: 'content-box',
              border: 'none',
              outlineStyle: 'solid',
              outlineWidth: thick ? '0.5mm' : '0.3mm',
              outlineColor: '#e23b2f',
              fontSize: '14pt',
              lineHeight: `${POSTAL_FRAME.boxHeightMm}mm`,
              fontFamily: FONT_STACK.gothic,
            }}
          />
        );
      })}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: `${hyphenLeft}mm`,
          top: `${POSTAL_FRAME.topMm + POSTAL_FRAME.boxHeightMm / 2 - 0.3}mm`,
          width: '2.4mm',
          height: '0.5mm',
          background: '#e23b2f',
        }}
      />
    </>
  );
}

export function PostcardDocumentEditor({
  templateData,
  onTemplateDataChange,
  selectedId,
  onSelect,
}: {
  templateData: Record<string, string>;
  onTemplateDataChange: (key: string, value: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [side, setSide] = useState<Side>('front');
  const paperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const pieces = loadPieces(templateData.postcardLayout);
  const visible = pieces.filter((piece) => piece.side === side);

  const writePieces = (next: PostcardPiece[]) => {
    onTemplateDataChange('postcardLayout', JSON.stringify(next));
  };

  const move = (id: string, xMm: number, yMm: number) => {
    writePieces(
      pieces.map((piece) => {
        if (piece.id !== id || piece.locked) return piece;
        return {
          ...piece,
          xMm: Math.min(Math.max(0, xMm), PAGE.widthMm - piece.widthMm),
          yMm: Math.min(Math.max(0, yMm), PAGE.heightMm - piece.heightMm),
        };
      })
    );
  };

  const print = (which: 'front' | 'back' | 'both') => {
    const win = window.open('', '_blank');
    if (!win) return;
    const sides: Side[] = which === 'both' ? ['front', 'back'] : [which];
    const sheets = sides
      .map((sheet) => {
        const html = [
          sheet === 'front' ? postalDigitsHtml(templateData.recipientPostalCode || '') : '',
          ...pieces
          .filter((piece) => piece.side === sheet)
          .map((piece) => {
            const text = displayText(piece, templateData);
            return `<div style="position:absolute;left:${piece.xMm}mm;top:${piece.yMm}mm;width:${piece.widthMm}mm;height:${piece.heightMm}mm;font-size:${piece.sizePt}pt;font-weight:${piece.weight === 'bold' ? 700 : 400};font-family:${FONT_STACK[piece.font]};writing-mode:${piece.direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb'};display:flex;align-items:center;justify-content:center;text-align:center;white-space:pre-wrap;overflow:hidden;">${escapeHtml(text)}</div>`;
          }),
        ].join('');
        return `<section class="sheet">${html}</section>`;
      })
      .join('');
    win.document.write(`<!DOCTYPE html><html><head><title>はがき</title><style>
      @page { size: 100mm 148mm; margin: 0; }
      body { margin: 0; }
      .hint { font-family: sans-serif; padding: 12px; }
      .sheet { position: relative; width: 100mm; height: 148mm; page-break-after: always; }
      @media print { .hint { display: none; } }
    </style></head><body><p class="hint">用紙ははがき。拡大縮小は「そのまま」にしてください。郵便番号の数字だけを刷るので、はがきについている枠の中に入ります。表と裏のときは、1枚目のあとにはがきを裏返してください。</p>${sheets}</body></html>`);
    win.document.close();
    win.focus();
    window.setTimeout(() => win.print(), 200);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1" role="tablist" aria-label="はがきの面">
        {(['front', 'back'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setSide(item);
              onSelect(null);
            }}
            className={
              side === item
                ? 'rounded-md bg-matsu px-4 py-2 text-sm text-white'
                : 'rounded-md border border-gin bg-white px-4 py-2 text-sm text-sumi'
            }
          >
            {item === 'front' ? '表（宛名）' : '裏（文章）'}
          </button>
        ))}
      </div>
      <FitZoomFrame>
        <div
          ref={paperRef}
          className="relative bg-white shadow"
          style={{ width: '100mm', height: '148mm' }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            const paper = paperRef.current;
            if (!drag || !paper) return;
            const rect = paper.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const xMm = drag.origX + ((event.clientX - drag.startX) * PAGE.widthMm) / rect.width;
            const yMm = drag.origY + ((event.clientY - drag.startY) * PAGE.heightMm) / rect.height;
            move(drag.id, xMm, yMm);
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
        >
          {side === 'front' && (
            <PostalCodeFrames
              code={templateData.recipientPostalCode || ''}
              onChange={(value) => onTemplateDataChange('recipientPostalCode', value)}
            />
          )}
          {visible.map((piece) => (
            <Piece
              key={piece.id}
              piece={piece}
              text={displayText(piece, templateData)}
              selected={selectedId === piece.id}
              onSelect={() => onSelect(piece.locked ? null : piece.id)}
              onText={(value) => onTemplateDataChange(piece.textKey, value)}
              onDragStart={(event) => {
                if (piece.locked) return;
                dragRef.current = {
                  id: piece.id,
                  startX: event.clientX,
                  startY: event.clientY,
                  origX: piece.xMm,
                  origY: piece.yMm,
                };
                onSelect(piece.id);
              }}
            />
          ))}
        </div>
      </FitZoomFrame>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-md border border-gin bg-white px-3 py-2 text-sm" onClick={() => print('front')}>
          表だけ印刷
        </button>
        <button type="button" className="rounded-md border border-gin bg-white px-3 py-2 text-sm" onClick={() => print('back')}>
          裏だけ印刷
        </button>
        <button type="button" className="rounded-md bg-matsu px-3 py-2 text-sm text-white" onClick={() => print('both')}>
          表と裏を印刷
        </button>
      </div>
    </div>
  );
}

export function selectedPostcardPiece(
  templateData: Record<string, string>,
  selectedId: string | null
): PostcardPiece | null {
  if (!selectedId) return null;
  return loadPieces(templateData.postcardLayout).find((piece) => piece.id === selectedId) ?? null;
}

export function updatePostcardPiece(
  templateData: Record<string, string>,
  id: string,
  patch: Partial<PostcardPiece>
) {
  const next = loadPieces(templateData.postcardLayout).map((piece) =>
    piece.id === id && !piece.locked ? { ...piece, ...patch, id: piece.id, locked: false } : piece
  );
  return JSON.stringify(next);
}

function displayText(piece: PostcardPiece, data: Record<string, string>) {
  const raw = data[piece.textKey] || '';
  if (piece.id === 'date' && !raw.trim()) return todayLabel();
  if (piece.id === 'recipientName' && data.showHonorific !== '0' && raw.trim()) return `${raw.trim()} 様`;
  if (piece.id.endsWith('Postal') && raw) return `〒${raw}`;
  return raw;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function Piece({
  piece,
  text,
  selected,
  onSelect,
  onText,
  onDragStart,
}: {
  piece: PostcardPiece;
  text: string;
  selected: boolean;
  onSelect: () => void;
  onText: (value: string) => void;
  onDragStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const nameOnly = piece.id === 'recipientName' ? text.replace(/\s*様\s*$/u, '') : text;
  return (
    <div
      className="absolute overflow-hidden"
        style={{
          left: `${piece.xMm}mm`,
          top: `${piece.yMm}mm`,
          width: `${piece.widthMm}mm`,
          height: `${piece.heightMm}mm`,
          fontFamily: FONT_STACK[piece.font],
          fontSize: `${piece.sizePt}pt`,
          fontWeight: piece.weight === 'bold' ? 700 : 400,
          writingMode: piece.direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          outline: selected ? '2px solid #2f6f4e' : piece.locked ? 'none' : '1px dashed rgba(0,0,0,0.25)',
        }}
      onPointerDown={onSelect}
    >
      {piece.locked ? (
        <div className="px-1">{text || '郵便番号'}</div>
      ) : (
        <>
          <button
            type="button"
            aria-label={`${piece.label}を動かす`}
            className="absolute left-0 top-0 z-10 h-[4mm] w-full cursor-grab border-0 bg-black/10 p-0"
            onPointerDown={onDragStart}
          />
          <textarea
            aria-label={piece.label}
            rows={piece.direction === 'vertical' ? Math.max(1, nameOnly.length || 4) : 2}
            className="resize-none border-0 bg-transparent p-0 text-center outline-none"
            style={{
              font: 'inherit',
              writingMode: 'inherit',
              textAlign: 'center',
              width: piece.direction === 'vertical' ? '1.4em' : '100%',
              height: piece.direction === 'vertical' ? 'auto' : '1.4em',
            }}
            value={nameOnly}
            placeholder={piece.label}
            onChange={(event) => onText(event.target.value)}
          />
        </>
      )}
    </div>
  );
}
