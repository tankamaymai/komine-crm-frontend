import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VacantLedgerView from '@/components/plot-availability/vacant-ledger-view';
import SalesLedgerView from '@/components/plot-availability/sales-ledger-view';

const noop = () => {};

describe('空き区画一覧', () => {
  it('期ごとに区画番号と広さを出す', () => {
    render(
      <VacantLedgerView
        isLoading={false}
        error={null}
        onRefresh={noop}
        ledger={{
          asOfDate: '2026-09-27T00:00:00.000Z',
          total: 1,
          groups: [
            {
              period: '第1期',
              count: 1,
              areas: [
                {
                  areaName: 'A',
                  plots: [{ id: '1', label: 'A-36', areaSqm: 3.6 }],
                },
              ],
            },
          ],
        }}
      />
    );

    expect(screen.getByText('空き区画の番号')).toBeInTheDocument();
    expect(screen.getByText('区画番号')).toBeInTheDocument();
    expect(screen.getByText('広さ')).toBeInTheDocument();
    expect(screen.getByText('A-36')).toBeInTheDocument();
    expect(screen.getByText('3.6㎡')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});

describe('販売数', () => {
  it('月ごとの売れた数と、種類ごとの数量・広さを出す', () => {
    render(
      <SalesLedgerView
        isLoading={false}
        error={null}
        agent="大友"
        onAgentChange={noop}
        onRefresh={noop}
        ledger={{
          asOfDate: '2026-09-27T00:00:00.000Z',
          agentFilter: '大友',
          agentNames: ['石の大友'],
          fiscalYears: [
            {
              fiscalYear: 2026,
              total: 2,
              months: [
                { month: 6, count: 2, cumulative: 2 },
                { month: 7, count: 0, cumulative: 2 },
                { month: 8, count: 0, cumulative: 2 },
                { month: 9, count: 0, cumulative: 2 },
                { month: 10, count: 0, cumulative: 2 },
                { month: 11, count: 0, cumulative: 2 },
                { month: 12, count: 0, cumulative: 2 },
                { month: 1, count: 0, cumulative: 2 },
                { month: 2, count: 0, cumulative: 2 },
                { month: 3, count: 0, cumulative: 2 },
                { month: 4, count: 0, cumulative: 2 },
                { month: 5, count: 0, cumulative: 2 },
              ],
            },
          ],
          typeSales: [
            {
              year: 2026,
              totalCount: 2,
              totalAreaSqm: 1.2,
              months: [
                {
                  month: 1,
                  rows: [{ areaName: '樹林', count: 2, areaSqm: 1.2 }],
                },
              ],
            },
          ],
        }}
      />
    );

    expect(screen.getByText('売れた区画の数')).toBeInTheDocument();
    expect(screen.getByText('売れた数')).toBeInTheDocument();
    expect(screen.getByText('そこまで')).toBeInTheDocument();
    expect(screen.getByText('2026年度（2026年6月〜2027年5月）')).toBeInTheDocument();
    expect(screen.getByText('樹林')).toBeInTheDocument();
    expect(screen.getByText('1.2㎡')).toBeInTheDocument();
    expect(screen.getByLabelText('取扱の名前で絞る')).toHaveValue('大友');
  });
});
