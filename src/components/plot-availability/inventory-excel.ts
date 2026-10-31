/**
 * 区画残数の数字の表を、画面と同じ並びで Excel にする。
 * 月次報告だけは別の帳票レイアウト（monthly-report-excel）を使う。
 */
import type {
  AreaInventoryItem,
  SalesLedgerResponse,
  SectionInventoryItem,
  VacantLedgerResponse,
} from '@/lib/api/plot-inventory';
import {
  AVAILABILITY_STATUS_LABELS,
  getAvailabilityStatus,
  PLOT_SIZE,
} from '@/types/plot-constants';

type Cell = string | number | null;

export interface SheetTable {
  name: string;
  headers: string[];
  rows: Cell[][];
}

function interop<T>(mod: T | { default: T }): T {
  const candidate = (mod as { default?: T }).default;
  return candidate ?? (mod as T);
}

function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function statusLabel(remainingCount: number): string {
  return AVAILABILITY_STATUS_LABELS[getAvailabilityStatus(remainingCount)];
}

export function sectionSheetRows(items: SectionInventoryItem[]): Cell[][] {
  return items.map((item) => {
    const usageRate = item.usageRate ?? (item.totalCount > 0
      ? Math.round((item.usedCount / item.totalCount) * 100 * 10) / 10
      : 0);
    return [
      item.period,
      item.section,
      item.category ?? '',
      item.totalCount,
      item.usedCount,
      item.remainingCount,
      usageRate,
      statusLabel(item.remainingCount),
      Number((item.remainingCount * PLOT_SIZE.FULL).toFixed(1)),
    ];
  });
}

export function areaSheetRows(items: AreaInventoryItem[]): Cell[][] {
  return items.map((item) => [
    item.period,
    item.areaSqm,
    item.totalCount,
    item.usedCount,
    item.remainingCount,
    item.remainingAreaSqm,
    item.plotType,
    statusLabel(item.remainingCount),
  ]);
}

export function vacantSheetRows(ledger: VacantLedgerResponse): Cell[][] {
  const rows: Cell[][] = [];
  for (const group of ledger.groups) {
    for (const area of group.areas) {
      for (const plot of area.plots) {
        rows.push([group.period, area.areaName, plot.label, plot.areaSqm]);
      }
    }
  }
  return rows;
}

export function salesMonthRows(ledger: SalesLedgerResponse): Cell[][] {
  const rows: Cell[][] = [];
  for (const year of ledger.fiscalYears) {
    for (const month of year.months) {
      rows.push([
        `${year.fiscalYear}年度`,
        `${month.month}月`,
        month.count,
        month.cumulative,
      ]);
    }
    rows.push([`${year.fiscalYear}年度`, '合計', year.total, year.total]);
  }
  return rows;
}

export function salesTypeRows(ledger: SalesLedgerResponse): Cell[][] {
  const rows: Cell[][] = [];
  for (const year of ledger.typeSales) {
    for (const month of year.months) {
      for (const row of month.rows) {
        rows.push([`${year.year}年`, `${month.month}月`, row.areaName, row.count, row.areaSqm]);
      }
    }
  }
  return rows;
}

export async function downloadTables(fileName: string, sheets: SheetTable[]): Promise<void> {
  const ExcelJS = interop(await import('exceljs'));
  const { saveAs } = interop(await import('file-saver'));
  const workbook = new ExcelJS.Workbook();
  for (const table of sheets) {
    const sheet = workbook.addWorksheet(table.name);
    sheet.addRow(table.headers);
    sheet.getRow(1).font = { bold: true };
    for (const row of table.rows) sheet.addRow(row);
    table.headers.forEach((_, index) => {
      sheet.getColumn(index + 1).width = 16;
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, fileName);
}

export function downloadSectionExcel(items: SectionInventoryItem[]): Promise<void> {
  return downloadTables(`区画別_${todayStamp()}.xlsx`, [{
    name: '区画別',
    headers: ['期', '区画', '種類', '総数', '使用数', '残', '使用率', '状況', '残の面積（㎡）'],
    rows: sectionSheetRows(items),
  }]);
}

export function downloadAreaExcel(items: AreaInventoryItem[]): Promise<void> {
  return downloadTables(`面積別_${todayStamp()}.xlsx`, [{
    name: '面積別',
    headers: ['期', '面積（㎡）', '総数', '使用数', '残', '残㎡', 'タイプ', '状況'],
    rows: areaSheetRows(items),
  }]);
}

export function downloadVacantExcel(ledger: VacantLedgerResponse): Promise<void> {
  return downloadTables(`空き区画一覧_${todayStamp()}.xlsx`, [{
    name: '空き区画',
    headers: ['期', '区画', '区画番号', '広さ（㎡）'],
    rows: vacantSheetRows(ledger),
  }]);
}

export function downloadSalesExcel(ledger: SalesLedgerResponse): Promise<void> {
  return downloadTables(`販売数_${todayStamp()}.xlsx`, [
    {
      name: '月ごと',
      headers: ['年度', '月', '売れた数', 'そこまで'],
      rows: salesMonthRows(ledger),
    },
    {
      name: '種類ごと',
      headers: ['年', '月', '区画', '数量', '広さ（㎡）'],
      rows: salesTypeRows(ledger),
    },
  ]);
}
