'use client';

import { useRef } from 'react';
import { FitZoomFrame, PaperPage } from './document-preview-zoom';
import {
  type FreeformBlock,
} from '@/lib/freeform-templates';
import { paperSizeOf } from '@/lib/paper-sizes';

const FONT_STACK = {
  gothic: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
  mincho: "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif",
} as const;

export function FreeformDocumentEditor({
  blocks,
  selectedId,
  paperSize,
  onSelect,
  onChange,
}: {
  blocks: FreeformBlock[];
  selectedId: string | null;
  paperSize?: string;
  onSelect: (id: string | null) => void;
  onChange: (blocks: FreeformBlock[]) => void;
}) {
  const page = paperSizeOf(paperSize);
  const paperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const update = (id: string, patch: Partial<FreeformBlock>) => {
    onChange(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>, block: FreeformBlock) => {
    event.stopPropagation();
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragRef.current = {
      id: block.id,
      startX: event.clientX,
      startY: event.clientY,
      origX: block.xMm,
      origY: block.yMm,
    };
    onSelect(block.id);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const paper = paperRef.current;
    if (!drag || !paper) return;
    const rect = paper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const xMm = drag.origX + ((event.clientX - drag.startX) * page.widthMm) / rect.width;
    const yMm = drag.origY + ((event.clientY - drag.startY) * page.heightMm) / rect.height;
    const block = blocks.find((item) => item.id === drag.id);
    if (!block) return;
    update(drag.id, {
      xMm: Math.min(Math.max(0, xMm), page.widthMm - block.widthMm),
      yMm: Math.min(Math.max(0, yMm), page.heightMm - block.heightMm),
    });
  };

  return (
    <FitZoomFrame>
      <PaperPage widthMm={page.widthMm} heightMm={page.heightMm}>
      <div
        ref={paperRef}
        className="relative h-full w-full bg-white"
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerDown={() => onSelect(null)}
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            className="absolute"
            style={{
              left: `${block.xMm}mm`,
              top: `${block.yMm}mm`,
              width: `${block.widthMm}mm`,
              height: `${block.heightMm}mm`,
              outline: selectedId === block.id ? '2px solid #2f6f4e' : '1px dashed rgba(0,0,0,0.3)',
              fontFamily: FONT_STACK[block.font],
              fontSize: `${block.sizePt}pt`,
              fontWeight: block.weight === 'bold' ? 700 : 400,
              writingMode: block.direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
            }}
          >
            <button
              type="button"
              aria-label="文字を動かす"
              title="つかんで動かす"
              className="absolute left-0 top-0 z-10 h-[4mm] w-full cursor-grab border-0 bg-black/10 p-0"
              onPointerDown={(event) => onPointerDown(event, block)}
            />
            <textarea
              aria-label="文字"
              className="h-full w-full resize-none border-0 bg-transparent p-1 outline-none"
              style={{ font: 'inherit', writingMode: 'inherit', textOrientation: 'mixed' }}
              value={block.text}
              placeholder="文字を書く"
              onFocus={() => onSelect(block.id)}
              onChange={(event) => update(block.id, { text: event.target.value })}
            />
          </div>
        ))}
      </div>
      </PaperPage>
    </FitZoomFrame>
  );
}
