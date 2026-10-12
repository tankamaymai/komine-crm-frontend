import {
  canDropAt,
  layoutSignature,
  moveCell,
  placeCells,
  toPositions,
} from '@/lib/plot-maps/positions';
import type { PlotMapDefinition } from '@/lib/plot-maps/types';

const definition: PlotMapDefinition = {
  id: 'test',
  period: '第1期',
  title: 'テスト区',
  sectionKeys: ['T'],
  columns: 4,
  rows: 3,
  cells: [
    { row: 0, col: 0, plotLabel: '1' },
    { row: 0, col: 1, plotLabel: '2' },
    { row: 1, col: 0, plotLabel: '2' },
    { row: 2, col: 3, plotLabel: '9', unsellable: true },
  ],
};

const at = (row: number, col: number) => ({ row, col });

describe('placeCells', () => {
  it('記録がなければ元の並びのまま', () => {
    const cells = placeCells(definition, []);
    expect(cells.map((c) => [c.plotLabel, c.row, c.col])).toEqual([
      ['1', 0, 0],
      ['2', 0, 1],
      ['2', 1, 0],
      ['9', 2, 3],
    ]);
    expect(cells[1]).toMatchObject({ originRow: 0, originCol: 1 });
  });

  it('同じ番号のマスでも、元の行・列で区別して動かす', () => {
    const cells = placeCells(definition, [
      { originRow: 1, originCol: 0, plotLabel: '2', row: 2, col: 0 },
    ]);
    expect(cells.find((c) => c.originRow === 0 && c.originCol === 1)).toMatchObject({
      row: 0,
      col: 1,
    });
    expect(cells.find((c) => c.originRow === 1 && c.originCol === 0)).toMatchObject({
      row: 2,
      col: 0,
    });
  });

  it('売却不可の印もマスと一緒に動く', () => {
    const cells = placeCells(definition, [
      { originRow: 2, originCol: 3, plotLabel: '9', row: 2, col: 2 },
    ]);
    expect(cells.find((c) => c.plotLabel === '9')).toMatchObject({
      row: 2,
      col: 2,
      unsellable: true,
    });
  });

  it('番号が違う記録・区画図の外・動いていないマスと重なる記録は使わない', () => {
    const cells = placeCells(definition, [
      { originRow: 0, originCol: 0, plotLabel: '999', row: 2, col: 0 },
      { originRow: 0, originCol: 1, plotLabel: '2', row: 9, col: 9 },
      { originRow: 1, originCol: 0, plotLabel: '2', row: 2, col: 3 },
    ]);
    expect(cells.map((c) => [c.row, c.col])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [2, 3],
    ]);
  });

  it('二つの記録が同じ場所を指したら、両方とも元の場所に出す', () => {
    const cells = placeCells(definition, [
      { originRow: 0, originCol: 0, plotLabel: '1', row: 1, col: 2 },
      { originRow: 0, originCol: 1, plotLabel: '2', row: 1, col: 2 },
    ]);
    expect(cells.slice(0, 2).map((c) => [c.row, c.col])).toEqual([
      [0, 0],
      [0, 1],
    ]);
  });

  it('移動先が空いた元の場所でも、そこに戻ったマスとは重ならない', () => {
    const cells = placeCells(definition, [
      { originRow: 0, originCol: 0, plotLabel: '1', row: 1, col: 3 },
      { originRow: 0, originCol: 1, plotLabel: '2', row: 0, col: 0 },
      { originRow: 2, originCol: 3, plotLabel: '9', row: 1, col: 3 },
    ]);
    const keys = cells.map((c) => `${c.row}-${c.col}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('canDropAt / moveCell', () => {
  const cells = placeCells(definition, []);
  const origin = { originRow: 0, originCol: 0 };

  it('空白マスには置ける', () => {
    expect(canDropAt(cells, definition, origin, at(2, 0))).toBe(true);
  });

  it('番号があるマス・同じ場所・区画図の外には置けない', () => {
    expect(canDropAt(cells, definition, origin, at(0, 1))).toBe(false);
    expect(canDropAt(cells, definition, origin, at(0, 0))).toBe(false);
    expect(canDropAt(cells, definition, origin, at(3, 0))).toBe(false);
    expect(canDropAt(cells, definition, origin, at(0, -1))).toBe(false);
  });

  it('動かしたマスだけ場所が変わる', () => {
    const moved = moveCell(cells, origin, at(2, 0));
    expect(moved[0]).toMatchObject({ plotLabel: '1', row: 2, col: 0, originRow: 0, originCol: 0 });
    expect(moved.slice(1)).toEqual(cells.slice(1));
    expect(cells[0]).toMatchObject({ row: 0, col: 0 });
  });
});

describe('toPositions / layoutSignature', () => {
  it('元の場所と違うマスだけを記録にする', () => {
    const moved = moveCell(placeCells(definition, []), { originRow: 1, originCol: 0 }, at(2, 1));
    expect(toPositions(moved)).toEqual([
      { originRow: 1, originCol: 0, plotLabel: '2', row: 2, col: 1 },
    ]);
  });

  it('元の場所に戻せば記録は空', () => {
    const base = placeCells(definition, []);
    const back = moveCell(moveCell(base, { originRow: 0, originCol: 0 }, at(2, 0)), { originRow: 0, originCol: 0 }, at(0, 0));
    expect(toPositions(back)).toEqual([]);
    expect(layoutSignature(back)).toBe(layoutSignature(base));
  });

  it('場所が違えば signature も違う', () => {
    const base = placeCells(definition, []);
    const moved = moveCell(base, { originRow: 0, originCol: 0 }, at(2, 0));
    expect(layoutSignature(moved)).not.toBe(layoutSignature(base));
  });
});
