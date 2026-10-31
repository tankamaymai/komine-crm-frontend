/**
 * 未収金一覧と窓口入金の表を、画面と同じ列で Excel にする。
 */
import type { UnpaidBillingItem } from '@komine/types';
import { BILLING_CATEGORY_LABELS } from '@/lib/api/billings';
import { downloadTables } from '@/components/plot-availability/inventory-excel';

function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function plotLabel(item: UnpaidBillingItem): string {
  return item.displayNumber ?? item.plotNumber ?? '';
}

function promiseDate(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return '';
  return `${match[1]}/${match[2]}/${match[3]}`;
}

export function uncollectedSheetRows(items: UnpaidBillingItem[]) {
  return items.map((item) => [
    item.contractorName ?? '',
    plotLabel(item),
    item.year ?? '',
    item.remainingAmount,
    promiseDate(item.nextPaymentDate),
  ]);
}

export function cashierSheetRows(items: UnpaidBillingItem[]) {
  return items.map((item) => [
    item.contractorName ?? '',
    item.buriedPersonName ?? '',
    plotLabel(item),
    BILLING_CATEGORY_LABELS[item.category],
    item.year ?? '',
    item.remainingAmount,
  ]);
}

export function downloadUncollectedExcel(items: UnpaidBillingItem[]): Promise<void> {
  return downloadTables(`未収金一覧_${todayStamp()}.xlsx`, [{
    name: '未収金一覧',
    headers: ['契約者', '区画', '年', '残額', '次に払う日'],
    rows: uncollectedSheetRows(items),
  }]);
}

export function downloadCashierExcel(items: UnpaidBillingItem[]): Promise<void> {
  return downloadTables(`窓口入金_${todayStamp()}.xlsx`, [{
    name: '窓口入金',
    headers: ['名前', '故人', '区画', '種類', '年', '残額'],
    rows: cashierSheetRows(items),
  }]);
}
