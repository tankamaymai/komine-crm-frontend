import { fireEvent, render, screen, within } from '@testing-library/react';
import { PlotTable } from '@/components/plot-registry/PlotTable';
import type { PlotListItem } from '@komine/types';

/**
 * #299 回帰防止: 台帳一覧「埋葬者を含む」ON時、埋葬者は氏名セル内のラベル付き
 * テキストではなく、独立した「埋葬者」カラム（<td>）で描画されること。
 *
 * 旧 plot-list-table.tsx では氏名セル内に `埋葬者: ◯◯` を折返し表示し、
 * 親 td の whitespace-nowrap と行高が衝突してラベルと内容が重なっていた（#299）。
 * 現行 plot-registry/PlotTable は埋葬者を別カラム化したため、この衝突は構造的に
 * 起き得ない。本テストはその「別カラム描画」を固定し、氏名セル内へ埋葬者ラベルを
 * 戻すリグレッションを検知する。
 */
function makePlot(overrides: Partial<PlotListItem>): PlotListItem {
  return {
    id: 'p1',
    plotNumber: 'A-1',
    displayNumber: 'A-1',
    areaName: '第1期',
    customerName: '山田太郎',
    customerNameKana: 'ヤマダタロウ',
    paymentStatus: 'paid',
    contractDate: null,
    buriedPersonNames: [],
    roles: [],
    ...overrides,
  } as unknown as PlotListItem;
}

function renderTable(plots: PlotListItem[], showBuriedPersons: boolean) {
  return render(
    <PlotTable
      plots={plots}
      isLoading={false}
      error={null}
      onRetry={() => {}}
      sortKey="plotNumber"
      sortOrder="asc"
      onSort={() => {}}
      columnWidths={{}}
      onColumnResizeStart={() => {}}
      showBuriedPersons={showBuriedPersons}
      onPlotSelect={() => {}}
      startIndex={0}
      emptyState={<div>empty</div>}
      fontSize="md"
      fontWeight="medium"
    />
  );
}

describe('台帳一覧の埋葬者表示 (#299)', () => {
  it('「埋葬者を含む」ON時、埋葬者カラムのヘッダーと氏名を別セルで描画する', () => {
    renderTable(
      [makePlot({ buriedPersonNames: ['故人一郎', '故人花子'] })],
      true
    );

    // 専用の「埋葬者」カラムヘッダーが存在する
    expect(screen.getByText('埋葬者')).toBeInTheDocument();

    // 埋葬者は1人ずつ独立した行・独立セルに出る（カンマ連結で1セルに詰めない）
    for (const name of ['故人一郎', '故人花子']) {
      const cell = screen.getByText(name);
      expect(cell.closest('td')).not.toBeNull();
    }
    expect(screen.queryByText('故人一郎, 故人花子')).not.toBeInTheDocument();
    // 旧実装のような氏名セル内ラベルは存在しない
    expect(screen.queryByText('埋葬者:')).not.toBeInTheDocument();
  });

  it('埋葬者氏名は契約者名セルとは別セルに描画される（重なりの原因を作らない）', () => {
    renderTable(
      [makePlot({ customerName: '山田太郎', buriedPersonNames: ['故人一郎'] })],
      true
    );

    const customerNameCell = screen.getByText('山田太郎').closest('td');
    expect(customerNameCell).not.toBeNull();
    // 契約者名セルの中に埋葬者氏名が混在していない
    expect(within(customerNameCell as HTMLElement).queryByText('故人一郎')).toBeNull();
  });

  it('「埋葬者を含む」OFF時は埋葬者カラム自体を描画しない', () => {
    renderTable(
      [makePlot({ buriedPersonNames: ['故人一郎'] })],
      false
    );

    expect(screen.queryByText('埋葬者')).not.toBeInTheDocument();
    expect(screen.queryByText('故人一郎')).not.toBeInTheDocument();
  });

  // 旧システム（ソフタス）の区画一覧と同じ「埋葬者を1人1行で並べる」表示。
  // 議事録 2026-07-21 §3「同一区画の複数埋葬者も一目で把握できるUI」への対応。
  describe('埋葬者の行展開', () => {
    const rows = () => screen.getAllByRole('link');

    it('埋葬者N人の区画はN行に展開される', () => {
      renderTable([makePlot({ buriedPersonNames: ['故人一郎', '故人花子', '故人次郎'] })], true);
      expect(rows()).toHaveLength(3);
    });

    it('契約者情報は先頭行だけに出し、2行目以降は積み上げ表示にする', () => {
      renderTable(
        [
          makePlot({
            customerName: '山田太郎',
            displayNumber: 'A-56',
            buriedPersonNames: ['故人一郎', '故人花子'],
          }),
        ],
        true
      );

      const [lead, stacked] = rows();
      // 先頭行: 契約者名と区画Noが出る
      expect(within(lead).getByText('山田太郎')).toBeInTheDocument();
      expect(within(lead).getByText('A-56')).toBeInTheDocument();
      expect(within(lead).getByText('故人一郎')).toBeInTheDocument();
      // 積み上げ行: 契約者名・区画Noは繰り返さず、埋葬者だけが出る
      expect(within(stacked).queryByText('山田太郎')).toBeNull();
      expect(within(stacked).queryByText('A-56')).toBeNull();
      expect(within(stacked).getByText('故人花子')).toBeInTheDocument();
    });

    it('埋葬者0人の区画も1行残す（契約者名で探すときに消えないため）', () => {
      renderTable(
        [makePlot({ customerName: '山田太郎', buriedPersonNames: [] })],
        true
      );

      const all = rows();
      expect(all).toHaveLength(1);
      expect(within(all[0]).getByText('山田太郎')).toBeInTheDocument();
    });

    it('展開OFFなら区画ごとに1行のまま', () => {
      renderTable([makePlot({ buriedPersonNames: ['故人一郎', '故人花子'] })], false);
      expect(rows()).toHaveLength(1);
    });

    it('積み上げ行もクリックで同じ区画詳細へ遷移する', () => {
      const onPlotSelect = jest.fn();
      const plot = makePlot({ buriedPersonNames: ['故人一郎', '故人花子'] });
      render(
        <PlotTable
          plots={[plot]}
          isLoading={false}
          error={null}
          onRetry={() => {}}
          sortKey="plotNumber"
          sortOrder="asc"
          onSort={() => {}}
          columnWidths={{}}
          onColumnResizeStart={() => {}}
          showBuriedPersons
          onPlotSelect={onPlotSelect}
          startIndex={0}
          emptyState={<div>empty</div>}
          fontSize="md"
          fontWeight="medium"
        />
      );

      fireEvent.click(screen.getAllByRole('link')[1]);
      expect(onPlotSelect).toHaveBeenCalledWith(plot);
    });

    it('積み上げ行の aria-label に埋葬者名を含める（読み上げで行を区別できるように）', () => {
      renderTable(
        [makePlot({ displayNumber: 'A-56', buriedPersonNames: ['故人一郎', '故人花子'] })],
        true
      );

      expect(
        screen.getByLabelText('A-56 の詳細を開く（埋葬者: 故人花子）')
      ).toBeInTheDocument();
    });
  });
});
