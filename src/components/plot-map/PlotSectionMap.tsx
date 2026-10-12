'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PLOT_MAPS } from '@/lib/plot-maps/catalog';
import { overlayLayoutWithPlots } from '@/lib/plot-maps/overlay';
import {
  canDropAt,
  layoutSignature,
  moveCell,
  placeCells,
  toPositions,
} from '@/lib/plot-maps/positions';
import type {
  PlotMapCellPosition,
  PlotMapCellView,
  PlotMapId,
  PlotMapOverlayPlot,
  PlotMapPlacedCell,
  PlotMapStatus,
} from '@/lib/plot-maps/types';
import { PlotMapLegend } from './PlotMapLegend';
import { PlotMapPanel } from './PlotMapPanel';

const CELL_STYLE: Record<PlotMapStatus, string> = {
  vacant: 'bg-matsu-50 border-matsu text-matsu-dark font-semibold',
  reserved: 'bg-kohaku-50 border-kohaku text-kohaku-dark',
  contracted: 'bg-white border-gin text-sumi',
  unsellable: 'bg-yellow-100 border-yellow-400 text-hai',
};

/** これ未満しか動かさずに離したときはクリック扱い */
const DRAG_THRESHOLD_PX = 4;

const NO_POSITIONS: PlotMapCellPosition[] = [];

type CellOrigin = Pick<PlotMapPlacedCell, 'originRow' | 'originCol'>;
type CellSpot = Pick<PlotMapPlacedCell, 'row' | 'col'>;
type SaveStatus = 'idle' | 'saved' | 'error';

interface DragState {
  origin: CellOrigin;
  plotLabel: string;
  status: PlotMapStatus;
  x: number;
  y: number;
  target: CellSpot | null;
  valid: boolean;
}

interface PlotSectionMapProps {
  mapId: PlotMapId;
  plots: PlotMapOverlayPlot[];
  positions?: PlotMapCellPosition[];
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave?: (positions: PlotMapCellPosition[]) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
}

const originKey = (cell: CellOrigin) => `${cell.originRow}-${cell.originCol}`;

function spotAt(x: number, y: number): CellSpot | null {
  if (typeof document.elementFromPoint !== 'function') return null;
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-spot-row]');
  if (!element) return null;
  return { row: Number(element.dataset.spotRow), col: Number(element.dataset.spotCol) };
}

export function PlotSectionMap({
  mapId,
  plots,
  positions = NO_POSITIONS,
  isLoading,
  isSaving,
  error,
  onClose,
  onSave,
  onDirtyChange,
}: PlotSectionMapProps) {
  const definition = PLOT_MAPS[mapId];
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<{
    base: PlotMapPlacedCell[];
    cells: PlotMapPlacedCell[];
  } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);

  const savedCells = useMemo(
    () => (definition ? placeCells(definition, positions) : []),
    [definition, positions]
  );
  const draft = draftState && draftState.base === savedCells ? draftState.cells : savedCells;
  const updateDraft = (cells: PlotMapPlacedCell[]) => {
    setDraftState({ base: savedCells, cells });
    setSaveStatus('idle');
  };

  const draftSignature = layoutSignature(draft);
  const isDirty = draftSignature !== layoutSignature(savedCells);
  const canEdit = !!onSave && !isLoading && !isSaving;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const cells = useMemo(
    () => (definition ? overlayLayoutWithPlots(draft, definition.sectionKeys, plots) : []),
    [definition, draft, plots]
  );
  const cellByPos = useMemo(() => {
    const map = new Map<string, PlotMapCellView>();
    for (const cell of cells) {
      map.set(`${cell.row}-${cell.col}`, cell);
    }
    return map;
  }, [cells]);

  const selected =
    (selectedOrigin && cells.find((cell) => originKey(cell) === selectedOrigin)) || null;
  const cellRem = definition && (definition.rows > 40 || definition.columns > 28) ? 2.15 : 3.25;

  if (!definition) {
    return null;
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (event.button !== 0 || !container || drag) return;
    suppressClickRef.current = false;
    const startX = event.clientX;
    const startY = event.clientY;
    const cellElement = (event.target as HTMLElement).closest<HTMLElement>('[data-origin-row]');

    let onMove: (e: PointerEvent) => void;
    let onEnd: (e: PointerEvent) => void;

    if (cellElement) {
      if (!canEdit) return;
      const origin: CellOrigin = {
        originRow: Number(cellElement.dataset.originRow),
        originCol: Number(cellElement.dataset.originCol),
      };
      const cell = cells.find((c) => originKey(c) === originKey(origin));
      if (!cell) return;
      let dragging = false;
      onMove = (e) => {
        if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD_PX) {
          return;
        }
        dragging = true;
        const target = spotAt(e.clientX, e.clientY);
        setDrag({
          origin,
          plotLabel: cell.plotLabel,
          status: cell.status,
          x: e.clientX,
          y: e.clientY,
          target,
          valid: !!target && canDropAt(draft, definition, origin, target),
        });
      };
      onEnd = (e) => {
        if (!dragging) return;
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
        const target = e.type === 'pointerup' ? spotAt(e.clientX, e.clientY) : null;
        if (target && canDropAt(draft, definition, origin, target)) {
          updateDraft(moveCell(draft, origin, target));
          setSelectedOrigin(originKey(origin));
        }
        setDrag(null);
      };
    } else {
      event.preventDefault();
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;
      onMove = (e) => {
        container.scrollLeft = scrollLeft - (e.clientX - startX);
        container.scrollTop = scrollTop - (e.clientY - startY);
      };
      onEnd = () => undefined;
    }

    const finish = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      onEnd(e);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  };

  const handleSave = async () => {
    if (!onSave || !isDirty) return;
    const ok = await onSave(toPositions(draft));
    setSaveStatus(ok ? 'saved' : 'error');
  };

  const handleReset = () => {
    updateDraft(placeCells(definition, []));
  };

  let statusMessage: { text: string; className: string } | null = null;
  if (saveStatus === 'error' && isDirty) {
    statusMessage = { text: '保存できませんでした。もう一度押してください', className: 'text-beni' };
  } else if (isDirty) {
    statusMessage = { text: '保存していない移動があります', className: 'text-kohaku-dark' };
  } else if (saveStatus === 'saved') {
    statusMessage = { text: '保存しました', className: 'text-matsu' };
  }

  return (
    <section
      id="plot-section-map"
      className="mt-4 rounded-elegant-lg border border-matsu-200 bg-white p-3 md:p-4 shadow-elegant"
      aria-label={`${definition.title} 区画図`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-mincho text-lg font-semibold text-sumi">{definition.title} 区画図</h3>
          <p className="mt-1 text-xs text-hai">緑が空き、黄が売却不可です。</p>
          <p className="mt-0.5 text-xs text-hai">
            空白をつかむと見る場所を動かせます。番号のマスをつかんで空いているマスに置くと、場所を移せます。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          {onSave && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!canEdit || draftSignature === ''}
              >
                元の並びに戻す
              </Button>
              <Button
                type="button"
                variant="matsu"
                size="sm"
                onClick={() => void handleSave()}
                disabled={!canEdit || !isDirty}
              >
                {isSaving ? '保存中…' : '修正を保存'}
              </Button>
            </>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            地図を閉じる
          </Button>
        </div>
      </div>

      {statusMessage && (
        <p role="status" className={cn('mt-2 text-sm font-medium', statusMessage.className)}>
          {statusMessage.text}
        </p>
      )}

      <PlotMapLegend className="mt-3" />

      {error && <p className="mt-3 text-sm text-beni">{error}</p>}
      {isLoading && <p className="mt-3 text-sm text-hai">契約データを読み込み中…</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          className="max-h-[70vh] cursor-grab select-none overflow-auto pb-2 active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <div
            className="grid w-max gap-1"
            style={{ gridTemplateColumns: `repeat(${definition.columns}, minmax(${cellRem}rem, ${cellRem}rem))` }}
          >
            {Array.from({ length: definition.rows * definition.columns }, (_, index) => {
              const row = Math.floor(index / definition.columns);
              const col = index % definition.columns;
              const cell = cellByPos.get(`${row}-${col}`);
              const isTarget = drag?.target?.row === row && drag?.target?.col === col;
              if (!cell) {
                return (
                  <div
                    key={`empty-${row}-${col}`}
                    data-spot-row={row}
                    data-spot-col={col}
                    style={{ height: `${cellRem}rem`, width: `${cellRem}rem` }}
                    className={cn(
                      'rounded-sm',
                      drag && 'border border-dashed border-gin/60',
                      isTarget && drag?.valid && 'border-2 border-solid border-ai bg-ai/10'
                    )}
                  />
                );
              }
              const key = originKey(cell);
              return (
                <MapCellButton
                  key={key}
                  cell={cell}
                  selected={selectedOrigin === key}
                  dragging={!!drag && originKey(drag.origin) === key}
                  blocked={isTarget && !drag?.valid}
                  movable={canEdit}
                  sizeRem={cellRem}
                  onSelect={() => {
                    if (suppressClickRef.current) return;
                    setSelectedOrigin(key);
                  }}
                />
              );
            })}
          </div>
        </div>
        <PlotMapPanel cell={selected} />
      </div>

      {drag && (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none fixed z-50 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border font-mono text-[10px] shadow-elegant',
            CELL_STYLE[drag.status]
          )}
          style={{
            left: drag.x,
            top: drag.y,
            height: `${cellRem}rem`,
            width: `${cellRem}rem`,
          }}
        >
          {drag.plotLabel}
        </div>
      )}
    </section>
  );
}

function MapCellButton({
  cell,
  selected,
  dragging,
  blocked,
  movable,
  sizeRem,
  onSelect,
}: {
  cell: PlotMapCellView;
  selected: boolean;
  dragging: boolean;
  blocked: boolean;
  movable: boolean;
  sizeRem: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${cell.plotLabel}番 ${cell.displayLabel}`}
      data-origin-row={cell.originRow}
      data-origin-col={cell.originCol}
      data-spot-row={cell.row}
      data-spot-col={cell.col}
      style={{ height: `${sizeRem}rem`, width: `${sizeRem}rem` }}
      className={cn(
        'flex flex-col items-center justify-center rounded-sm border px-0.5 text-center transition-shadow',
        CELL_STYLE[cell.status],
        movable ? 'cursor-grab' : 'cursor-pointer',
        selected && 'ring-2 ring-ai ring-offset-1',
        dragging && 'opacity-40',
        blocked && 'ring-2 ring-beni ring-offset-1'
      )}
    >
      <span className="font-mono text-[10px] leading-none">{cell.plotLabel}</span>
      <span className="mt-0.5 max-w-full truncate text-[10px] leading-tight">{cell.displayLabel}</span>
    </button>
  );
}
