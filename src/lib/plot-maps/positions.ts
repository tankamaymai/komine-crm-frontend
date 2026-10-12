import type {
  PlotMapCellPosition,
  PlotMapDefinition,
  PlotMapPlacedCell,
} from './types';

type CellOrigin = Pick<PlotMapPlacedCell, 'originRow' | 'originCol'>;
type CellSpot = Pick<PlotMapPlacedCell, 'row' | 'col'>;

const spotKey = (row: number, col: number) => `${row}-${col}`;

function isInside(definition: PlotMapDefinition, spot: CellSpot): boolean {
  return (
    Number.isInteger(spot.row) &&
    Number.isInteger(spot.col) &&
    spot.row >= 0 &&
    spot.col >= 0 &&
    spot.row < definition.rows &&
    spot.col < definition.columns
  );
}

/**
 * 元の並びに保存済みの場所を重ねる。
 * 番号が記録と違う・区画図の外・他のマスと重なる記録は使わず、元の場所に出す。
 */
export function placeCells(
  definition: PlotMapDefinition,
  positions: PlotMapCellPosition[]
): PlotMapPlacedCell[] {
  const base: PlotMapPlacedCell[] = definition.cells.map((cell) => ({
    ...cell,
    originRow: cell.row,
    originCol: cell.col,
  }));
  const byOrigin = new Map(base.map((cell) => [spotKey(cell.row, cell.col), cell]));

  const wanted = new Map<string, CellSpot>();
  for (const position of positions) {
    const originKey = spotKey(position.originRow, position.originCol);
    const cell = byOrigin.get(originKey);
    if (!cell || cell.plotLabel !== position.plotLabel) continue;
    if (!isInside(definition, position)) continue;
    if (wanted.has(originKey)) continue;
    wanted.set(originKey, { row: position.row, col: position.col });
  }

  let changed = true;
  while (changed) {
    changed = false;
    const counts = new Map<string, number>();
    for (const cell of base) {
      const target = wanted.get(spotKey(cell.originRow, cell.originCol)) ?? cell;
      const key = spotKey(target.row, target.col);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [originKey, target] of wanted) {
      if ((counts.get(spotKey(target.row, target.col)) ?? 0) > 1) {
        wanted.delete(originKey);
        changed = true;
      }
    }
  }

  return base.map((cell) => {
    const target = wanted.get(spotKey(cell.originRow, cell.originCol));
    return target ? { ...cell, row: target.row, col: target.col } : cell;
  });
}

const isSameOrigin = (cell: PlotMapPlacedCell, origin: CellOrigin) =>
  cell.originRow === origin.originRow && cell.originCol === origin.originCol;

/** 区画図の中の空白マスにだけ置ける。 */
export function canDropAt(
  cells: PlotMapPlacedCell[],
  definition: PlotMapDefinition,
  origin: CellOrigin,
  target: CellSpot
): boolean {
  if (!isInside(definition, target)) return false;
  if (!cells.some((cell) => isSameOrigin(cell, origin))) return false;
  return !cells.some((cell) => cell.row === target.row && cell.col === target.col);
}

export function moveCell(
  cells: PlotMapPlacedCell[],
  origin: CellOrigin,
  target: CellSpot
): PlotMapPlacedCell[] {
  return cells.map((cell) =>
    isSameOrigin(cell, origin) ? { ...cell, row: target.row, col: target.col } : cell
  );
}

/** 元の場所から動いたマスだけを、保存用の記録にする。 */
export function toPositions(cells: PlotMapPlacedCell[]): PlotMapCellPosition[] {
  return cells
    .filter((cell) => cell.row !== cell.originRow || cell.col !== cell.originCol)
    .map((cell) => ({
      originRow: cell.originRow,
      originCol: cell.originCol,
      plotLabel: cell.plotLabel,
      row: cell.row,
      col: cell.col,
    }))
    .sort((a, b) => a.originRow - b.originRow || a.originCol - b.originCol);
}

export function layoutSignature(cells: PlotMapPlacedCell[]): string {
  return toPositions(cells)
    .map((p) => `${p.originRow},${p.originCol}>${p.row},${p.col}`)
    .join('|');
}
