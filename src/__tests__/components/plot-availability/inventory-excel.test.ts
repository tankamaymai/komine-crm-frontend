import {
  areaSheetRows,
  salesMonthRows,
  vacantSheetRows,
} from '@/components/plot-availability/inventory-excel';
import type { SalesLedgerResponse, VacantLedgerResponse } from '@/lib/api/plot-inventory';

describe('区画残数のエクセル行', () => {
  it('面積別は画面の列順で、状況の言葉を付ける', () => {
    expect(areaSheetRows([{
      period: '第1期',
      areaSqm: 3.6,
      totalCount: 10,
      usedCount: 10,
      remainingCount: 0,
      remainingAreaSqm: 0,
      plotType: '自由',
    }])).toEqual([['第1期', 3.6, 10, 10, 0, 0, '自由', '完売']]);
  });

  it('空き一覧は期・区画・番号・広さの行になる', () => {
    const ledger: VacantLedgerResponse = {
      asOfDate: '2026-10-31',
      total: 1,
      groups: [{
        period: '第4期',
        count: 1,
        areas: [{
          areaName: '凛B',
          plots: [{ id: 'p1', label: '1-10', areaSqm: 0.013 }],
        }],
      }],
    };
    expect(vacantSheetRows(ledger)).toEqual([['第4期', '凛B', '1-10', 0.013]]);
  });

  it('販売数の月ごとは年度と合計行を残す', () => {
    const ledger = {
      fiscalYears: [{
        fiscalYear: 2026,
        total: 2,
        months: [{ month: 6, count: 2, cumulative: 2 }],
      }],
    } as SalesLedgerResponse;
    expect(salesMonthRows(ledger)).toEqual([
      ['2026年度', '6月', 2, 2],
      ['2026年度', '合計', 2, 2],
    ]);
  });
});
