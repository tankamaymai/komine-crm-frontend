/**
 * 区画図: マスをクリックすると要約が出る
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { PlotSectionMap } from '@/components/plot-map/PlotSectionMap';
import type { PlotMapCellPosition, PlotMapOverlayPlot } from '@/lib/plot-maps/types';

const plots: PlotMapOverlayPlot[] = [
  {
    id: 'pp-97',
    plotNumber: '1-97',
    displayNumber: '1-97',
    areaName: '1',
    areaSqm: 1,
    overlayStatus: 'vacant',
    contractorName: null,
    reservationDate: null,
    contractPlotId: null,
  },
  {
    id: 'pp-90',
    plotNumber: '1-90',
    displayNumber: '1-90',
    areaName: '1',
    areaSqm: 1,
    overlayStatus: 'contracted',
    contractorName: '柴田',
    reservationDate: null,
    contractPlotId: 'cp-90',
  },
];

describe('PlotSectionMap', () => {
  it('2期1区の地図タイトルと凡例を出す', () => {
    render(<PlotSectionMap mapId="2-1" plots={plots} onClose={() => undefined} />);

    expect(screen.getByRole('region', { name: '第2期 1区 区画図' })).toBeInTheDocument();
    expect(screen.getByText('地図を閉じる')).toBeInTheDocument();
    expect(screen.getByText('売却不可')).toBeInTheDocument();
  });

  it('空きマスをクリックすると右パネルに区画番号と空きが出る', async () => {
    const user = userEvent.setup();
    render(<PlotSectionMap mapId="2-1" plots={plots} onClose={() => undefined} />);

    await user.click(screen.getByRole('button', { name: '97番 空き' }));

    expect(screen.getByText('97番')).toBeInTheDocument();
    expect(screen.getByText('新規登録へ')).toBeInTheDocument();
  });

  it('契約済みマスから台帳へ進める', async () => {
    const user = userEvent.setup();
    render(<PlotSectionMap mapId="2-1" plots={plots} onClose={() => undefined} />);

    await user.click(screen.getByRole('button', { name: '90番 柴田' }));

    expect(screen.getByRole('link', { name: '台帳を開く' })).toHaveAttribute('href', '/plots/cp-90');
  });
});

describe('PlotSectionMap のマス移動', () => {
  const originalElementFromPoint = document.elementFromPoint;

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint;
  });

  function emptySpot(container: HTMLElement): HTMLElement {
    const spot = container.querySelector<HTMLElement>('[data-spot-row]:not([data-origin-row])');
    if (!spot) throw new Error('空白マスが見つからない');
    return spot;
  }

  function dragTo(cell: HTMLElement, target: HTMLElement) {
    document.elementFromPoint = jest.fn(() => target);
    fireEvent(cell, new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0 }));
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 30, clientY: 30 }));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup', { clientX: 30, clientY: 30 }));
    });
  }

  function Harness({
    onSave,
    onDirtyChange,
  }: {
    onSave: (positions: PlotMapCellPosition[]) => Promise<boolean>;
    onDirtyChange: (dirty: boolean) => void;
  }) {
    const [positions, setPositions] = React.useState<PlotMapCellPosition[]>([]);
    return (
      <PlotSectionMap
        mapId="2-1"
        plots={plots}
        positions={positions}
        onClose={() => undefined}
        onSave={async (next) => {
          const ok = await onSave(next);
          if (ok) setPositions(next);
          return ok;
        }}
        onDirtyChange={onDirtyChange}
      />
    );
  }

  function renderEditable(onSave = jest.fn().mockResolvedValue(true), onDirtyChange = jest.fn()) {
    const view = render(<Harness onSave={onSave} onDirtyChange={onDirtyChange} />);
    return { ...view, onSave, onDirtyChange };
  }

  it('動かす前は保存も元に戻すも押せない', () => {
    renderEditable();
    expect(screen.getByRole('button', { name: '修正を保存' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '元の並びに戻す' })).toBeDisabled();
  });

  it('マスを空白マスに置くと移り、保存すると移動だけを送る', async () => {
    const user = userEvent.setup();
    const { container, onSave, onDirtyChange } = renderEditable();
    const cell = screen.getByRole('button', { name: '97番 空き' });
    const originRow = Number(cell.dataset.originRow);
    const originCol = Number(cell.dataset.originCol);
    const target = emptySpot(container);
    const row = Number(target.dataset.spotRow);
    const col = Number(target.dataset.spotCol);

    dragTo(cell, target);

    const moved = screen.getByRole('button', { name: '97番 空き' });
    expect(moved.dataset.spotRow).toBe(String(row));
    expect(moved.dataset.spotCol).toBe(String(col));
    expect(screen.getByText('保存していない移動があります')).toBeInTheDocument();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole('button', { name: '修正を保存' }));

    expect(onSave).toHaveBeenCalledWith([{ originRow, originCol, plotLabel: '97', row, col }]);
    expect(await screen.findByText('保存しました')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '97番 空き' }).dataset.spotRow).toBe(String(row));
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('番号があるマスには置けない', () => {
    renderEditable();
    const cell = screen.getByRole('button', { name: '97番 空き' });
    const other = screen.getByRole('button', { name: '90番 柴田' });
    const before = [cell.dataset.spotRow, cell.dataset.spotCol];

    dragTo(cell, other);

    const after = screen.getByRole('button', { name: '97番 空き' });
    expect([after.dataset.spotRow, after.dataset.spotCol]).toEqual(before);
    expect(screen.queryByText('保存していない移動があります')).not.toBeInTheDocument();
  });

  it('元の並びに戻すと、保存済みの移動も画面上で元に戻る', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(true);
    const probe = render(
      <PlotSectionMap mapId="2-1" plots={plots} onClose={() => undefined} onSave={onSave} />
    );
    const cell = screen.getByRole('button', { name: '97番 空き' });
    const origin = {
      originRow: Number(cell.dataset.originRow),
      originCol: Number(cell.dataset.originCol),
    };
    const target = emptySpot(probe.container);
    const saved = [
      {
        ...origin,
        plotLabel: '97',
        row: Number(target.dataset.spotRow),
        col: Number(target.dataset.spotCol),
      },
    ];
    probe.unmount();

    render(
      <PlotSectionMap
        mapId="2-1"
        plots={plots}
        positions={saved}
        onClose={() => undefined}
        onSave={onSave}
      />
    );
    expect(screen.getByRole('button', { name: '97番 空き' }).dataset.spotRow).toBe(
      String(saved[0].row)
    );

    await user.click(screen.getByRole('button', { name: '元の並びに戻す' }));

    expect(screen.getByRole('button', { name: '97番 空き' }).dataset.spotRow).toBe(
      String(origin.originRow)
    );
    expect(screen.getByText('保存していない移動があります')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '修正を保存' }));
    expect(onSave).toHaveBeenCalledWith([]);
  });

  it('保存に失敗したら、移動を残したまま知らせる', async () => {
    const user = userEvent.setup();
    const { container } = renderEditable(jest.fn().mockResolvedValue(false));
    const cell = screen.getByRole('button', { name: '97番 空き' });
    const target = emptySpot(container);

    dragTo(cell, target);
    await user.click(screen.getByRole('button', { name: '修正を保存' }));

    expect(
      await screen.findByText('保存できませんでした。もう一度押してください')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '97番 空き' }).dataset.spotRow).toBe(
      target.dataset.spotRow
    );
  });

  it('読み込み中は動かせない', () => {
    const { container } = render(
      <PlotSectionMap
        mapId="2-1"
        plots={plots}
        isLoading
        onClose={() => undefined}
        onSave={jest.fn()}
      />
    );
    const cell = screen.getByRole('button', { name: '97番 空き' });
    const before = cell.dataset.spotRow;

    dragTo(cell, emptySpot(container));

    expect(screen.getByRole('button', { name: '97番 空き' }).dataset.spotRow).toBe(before);
  });
});
