import { render, screen } from '@testing-library/react';
import { PlotTable } from '@/components/plot-registry/PlotTable';
import { ContractStatus, PaymentStatus, type PlotListItem } from '@komine/types';

function makePlot(overrides: Partial<PlotListItem> = {}): PlotListItem {
  return {
    id: 'p1',
    plotNumber: 'A-1',
    displayNumber: 'A-1',
    areaName: '第1期',
    customerName: '山田太郎',
    customerNameKana: 'ヤマダタロウ',
    paymentStatus: PaymentStatus.Paid,
    contractDate: '2020-04-01',
    agentName: '山田石材',
    permitNumber: '許可-2020-001',
    buriedPersonNames: [],
    roles: [],
    managementFee: '5000',
    managementFeeBillingType: null,
    managementFeeBillingYears: null,
    ...overrides,
  } as unknown as PlotListItem;
}

function renderTable(plots: PlotListItem[]) {
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
      showBuriedPersons={false}
      onPlotSelect={() => {}}
      startIndex={0}
      emptyState={<div>empty</div>}
      fontSize="md"
      fontWeight="medium"
    />
  );
}

describe('台帳一覧の列構成（先方指摘）', () => {
  it('取扱と基地を出し、管理料は契約者の左、入金は出さない', () => {
    renderTable([
      makePlot({
        areaName: 'A',
        displayNumber: '1、2、3',
        agentName: '小嶺',
        baseName: '自由',
      } as Partial<PlotListItem>),
    ]);

    const headers = screen.getAllByRole('columnheader').map((text) => text.textContent ?? '');
    const plotIndex = headers.findIndex((text) => text.includes('区画'));
    const agentIndex = headers.findIndex((text) => text.includes('取扱'));
    const baseIndex = headers.findIndex((text) => text.includes('基地'));
    const feeIndex = headers.findIndex((text) => text.includes('管理料'));
    const nameIndex = headers.findIndex((text) => text.includes('契約者'));

    expect(agentIndex).toBe(plotIndex + 1);
    expect(baseIndex).toBe(agentIndex + 1);
    expect(feeIndex).toBe(baseIndex + 1);
    expect(nameIndex).toBe(feeIndex + 1);
    const notesIndex = headers.findIndex((text) => text.includes('備考'));
    expect(notesIndex).toBe(nameIndex + 1);
    expect(screen.queryByRole('columnheader', { name: /入金/ })).not.toBeInTheDocument();
    expect(screen.getByText('A-1,2,3')).toBeInTheDocument();
    expect(screen.getByText('小嶺')).toBeInTheDocument();
    expect(screen.getByText('自由')).toBeInTheDocument();
  });

  it('一覧の見出しに契約日と許可番号を出さない', () => {
    renderTable([makePlot()]);

    expect(screen.queryByRole('columnheader', { name: '契約日' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '許可番号' })).not.toBeInTheDocument();
    expect(screen.queryByText('許可-2020-001')).not.toBeInTheDocument();
  });

  it('管理料列に永代・年数を出す', () => {
    renderTable([
      makePlot({
        managementFeeBillingType: 'PERPETUAL',
        managementFeeBillingYears: '0',
        managementFee: '0',
      }),
    ]);

    expect(screen.getByText('永代')).toBeInTheDocument();
  });

  it('管理料列に10年を出す', () => {
    renderTable([
      makePlot({
        id: 'p2',
        managementFeeBillingType: 'PRESENT',
        managementFeeBillingYears: '10',
        managementFee: '82800',
      }),
    ]);

    expect(screen.getByText('10年')).toBeInTheDocument();
  });

  it('セルに縦の罫線クラスが付く', () => {
    renderTable([makePlot({ customerName: '山田太郎' })]);

    const nameCell = screen.getByText('山田太郎').closest('td');
    expect(nameCell?.className).toContain('border-r');
  });

  it('一番左に利用中／空きを出し、空きは行の色が変わる', () => {
    renderTable([
      makePlot({ id: 'in-use', customerName: '山田太郎', contractStatus: ContractStatus.Active }),
      makePlot({
        id: 'vacant',
        plotNumber: 'A-2',
        displayNumber: 'A-2',
        customerName: null,
        paymentStatus: PaymentStatus.Unpaid,
        contractStatus: ContractStatus.Vacant,
      }),
    ]);

    const headers = screen.getAllByRole('columnheader').map((el) => el.textContent);
    expect(headers[0]).toContain('利用');
    expect(headers[1]).toContain('期');
    expect(headers[2]).toContain('区画');

    const inUseRow = screen.getByText('山田太郎').closest('tr');
    const vacantRow = screen.getByRole('link', { name: '第1期-A-2 の詳細を開く' });

    expect(inUseRow).toHaveTextContent('利用中');
    expect(vacantRow).toHaveTextContent('空き');
    expect(vacantRow.className).toContain('bg-hai-50');
    expect(inUseRow?.className).not.toContain('bg-hai-50');
  });
});
