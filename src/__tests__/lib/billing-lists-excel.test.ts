import { BillingCategory, type UnpaidBillingItem } from '@komine/types';
import { cashierSheetRows, uncollectedSheetRows } from '@/lib/billing-lists-excel';

const item: UnpaidBillingItem = {
  billingId: 'b-1',
  contractPlotId: 'p-1',
  customerId: 'c-1',
  contractorName: '田中花子',
  buriedPersonName: '田中一郎',
  plotNumber: 'A-1',
  displayNumber: '東-1',
  category: BillingCategory.ManagementFee,
  year: 2026,
  remainingAmount: 5000,
  nextPaymentDate: '2026-12-01',
};

describe('入金の数字のエクセル行', () => {
  it('未収金一覧は契約者・区画・年・残額・次の日', () => {
    expect(uncollectedSheetRows([item])).toEqual([
      ['田中花子', '東-1', 2026, 5000, '2026/12/01'],
    ]);
  });

  it('次の日が無いときは空欄', () => {
    expect(uncollectedSheetRows([{ ...item, nextPaymentDate: null }])[0][4]).toBe('');
  });

  it('窓口入金は名前・故人・区画・種類・年・残額', () => {
    expect(cashierSheetRows([item])).toEqual([
      ['田中花子', '田中一郎', '東-1', '管理料', 2026, 5000],
    ]);
  });
});
