/**
 * 区画在庫管理API
 */

import { apiGet, shouldUseMockData } from './client';
import { ApiResponse } from './types';
import { PlotPeriod } from '@/types/plot-constants';
import {
  getAllPlotInventory,
  calculateInventorySummary,
  calculateAllPeriodSummaries,
  getPlotInventoryByPeriod,
  PlotInventoryItem,
  InventorySummary as MockInventorySummary,
  PeriodSummary as MockPeriodSummary,
} from '../mock-data/plot-inventory';
import {
  getAllPlotsByArea,
  getPlotsByAreaForPeriod,
  PlotByAreaItem,
} from '../mock-data/plot-inventory-by-area';

// ==================== 型定義 ====================

export type PlotStatus = 'available' | 'partially_sold' | 'sold_out';
export type SectionSortKey = 'period' | 'section' | 'totalCount' | 'usedCount' | 'remainingCount' | 'usageRate';
export type AreaSortKey = 'period' | 'areaSqm' | 'totalCount' | 'usedCount' | 'remainingCount' | 'remainingAreaSqm' | 'plotType';
export type SortOrder = 'asc' | 'desc';

export interface InventorySummary {
  totalCount: number;
  usedCount: number;
  remainingCount: number;
  usageRate: number;
  totalAreaSqm: number;
  remainingAreaSqm: number;
  lastUpdated: string;
}

export interface PeriodSummary {
  period: PlotPeriod;
  totalCount: number;
  usedCount: number;
  remainingCount: number;
  usageRate: number;
}

export interface SectionInventoryItem {
  period: string;
  section: string;
  totalCount: number;
  usedCount: number;
  remainingCount: number;
  usageRate: number;
  category?: string;
}

export interface AreaInventoryItem {
  period: string;
  areaSqm: number;
  totalCount: number;
  usedCount: number;
  remainingCount: number;
  remainingAreaSqm: number;
  plotType: string;
}

export interface InventoryPeriodsResponse {
  periods: PeriodSummary[];
}

export interface InventorySectionsResponse {
  items: SectionInventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryAreasResponse {
  items: AreaInventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventorySectionsParams {
  period?: PlotPeriod;
  status?: PlotStatus;
  search?: string;
  sortBy?: SectionSortKey;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
}

export interface InventoryAreasParams {
  period?: PlotPeriod;
  search?: string;
  sortBy?: AreaSortKey;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
}

// ==================== モックデータ変換 ====================

function convertToInventorySummary(mock: MockInventorySummary): InventorySummary {
  // モックデータから面積を概算（1区画 = 3.6㎡）
  const PLOT_SIZE = 3.6;
  return {
    totalCount: mock.totalCount,
    usedCount: mock.usedCount,
    remainingCount: mock.remainingCount,
    usageRate: mock.usageRate,
    totalAreaSqm: mock.totalCount * PLOT_SIZE,
    remainingAreaSqm: mock.remainingCount * PLOT_SIZE,
    lastUpdated: mock.lastUpdated,
  };
}

function convertToPeriodSummary(mock: MockPeriodSummary): PeriodSummary {
  return {
    period: mock.period,
    totalCount: mock.totalCount,
    usedCount: mock.usedCount,
    remainingCount: mock.remainingCount,
    usageRate: mock.usageRate,
  };
}

function convertToSectionInventoryItem(mock: PlotInventoryItem): SectionInventoryItem {
  const usageRate = mock.totalCount > 0
    ? Math.round((mock.usedCount / mock.totalCount) * 100 * 10) / 10
    : 0;
  return {
    period: mock.period,
    section: mock.section,
    totalCount: mock.totalCount,
    usedCount: mock.usedCount,
    remainingCount: mock.remainingCount,
    usageRate,
    category: mock.category,
  };
}

function convertToAreaInventoryItem(mock: PlotByAreaItem): AreaInventoryItem {
  return {
    period: mock.period,
    areaSqm: mock.areaSqm,
    totalCount: mock.totalCount,
    usedCount: mock.usedCount,
    remainingCount: mock.remainingCount,
    remainingAreaSqm: mock.remainingAreaSqm,
    plotType: mock.plotType,
  };
}

// ソート関数
function sortSectionItems(
  items: SectionInventoryItem[],
  sortBy: SectionSortKey,
  sortOrder: SortOrder
): SectionInventoryItem[] {
  return [...items].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'period':
        comparison = a.period.localeCompare(b.period);
        break;
      case 'section':
        comparison = a.section.localeCompare(b.section);
        break;
      case 'totalCount':
        comparison = a.totalCount - b.totalCount;
        break;
      case 'usedCount':
        comparison = a.usedCount - b.usedCount;
        break;
      case 'remainingCount':
        comparison = a.remainingCount - b.remainingCount;
        break;
      case 'usageRate':
        comparison = a.usageRate - b.usageRate;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

function sortAreaItems(
  items: AreaInventoryItem[],
  sortBy: AreaSortKey,
  sortOrder: SortOrder
): AreaInventoryItem[] {
  return [...items].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'period':
        comparison = a.period.localeCompare(b.period);
        break;
      case 'areaSqm':
        comparison = a.areaSqm - b.areaSqm;
        break;
      case 'totalCount':
        comparison = a.totalCount - b.totalCount;
        break;
      case 'usedCount':
        comparison = a.usedCount - b.usedCount;
        break;
      case 'remainingCount':
        comparison = a.remainingCount - b.remainingCount;
        break;
      case 'remainingAreaSqm':
        comparison = a.remainingAreaSqm - b.remainingAreaSqm;
        break;
      case 'plotType':
        comparison = a.plotType.localeCompare(b.plotType);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

// ==================== API関数 ====================

/**
 * 在庫全体サマリーを取得
 */
export async function getInventorySummary(): Promise<ApiResponse<InventorySummary>> {
  if (shouldUseMockData()) {
    const mock = calculateInventorySummary();
    return {
      success: true,
      data: convertToInventorySummary(mock),
    };
  }

  return apiGet<InventorySummary>('/plots/inventory/summary');
}

/**
 * 期別サマリーを取得
 */
export async function getInventoryPeriods(
  period?: PlotPeriod
): Promise<ApiResponse<InventoryPeriodsResponse>> {
  if (shouldUseMockData()) {
    let periods = calculateAllPeriodSummaries();
    if (period) {
      periods = periods.filter(p => p.period === period);
    }
    return {
      success: true,
      data: {
        periods: periods.map(convertToPeriodSummary),
      },
    };
  }

  const params: Record<string, string | undefined> = {};
  if (period) params.period = period;

  return apiGet<InventoryPeriodsResponse>('/plots/inventory/periods', params);
}

/**
 * セクション別集計を取得
 */
export async function getInventorySections(
  params: InventorySectionsParams = {}
): Promise<ApiResponse<InventorySectionsResponse>> {
  const {
    period,
    status,
    search,
    sortBy = 'period',
    sortOrder = 'asc',
    page = 1,
    limit = 100,
  } = params;

  if (shouldUseMockData()) {
    // モックデータを取得
    let items: SectionInventoryItem[];
    if (period) {
      items = getPlotInventoryByPeriod(period).map(convertToSectionInventoryItem);
    } else {
      items = getAllPlotInventory().map(convertToSectionInventoryItem);
    }

    // ステータスフィルタ（モックでは簡易的に残数で判定）
    if (status === 'available') {
      items = items.filter(i => i.remainingCount > 0);
    } else if (status === 'sold_out') {
      items = items.filter(i => i.remainingCount === 0);
    }

    // 検索フィルタ
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(i =>
        i.period.toLowerCase().includes(searchLower) ||
        i.section.toLowerCase().includes(searchLower) ||
        (i.category && i.category.toLowerCase().includes(searchLower))
      );
    }

    // ソート
    items = sortSectionItems(items, sortBy, sortOrder);

    // ページネーション
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      success: true,
      data: {
        items: paginatedItems,
        pagination: { page, limit, total, totalPages },
      },
    };
  }

  const queryParams: Record<string, string | number | undefined> = {
    page,
    limit,
    sortBy,
    sortOrder,
  };
  if (period) queryParams.period = period;
  if (status) queryParams.status = status;
  if (search) queryParams.search = search;

  return apiGet<InventorySectionsResponse>('/plots/inventory/sections', queryParams);
}

/**
 * 面積別集計を取得
 */
export async function getInventoryAreas(
  params: InventoryAreasParams = {}
): Promise<ApiResponse<InventoryAreasResponse>> {
  const {
    period,
    search,
    sortBy = 'period',
    sortOrder = 'asc',
    page = 1,
    limit = 100,
  } = params;

  if (shouldUseMockData()) {
    // モックデータを取得
    let items: AreaInventoryItem[];
    if (period) {
      items = getPlotsByAreaForPeriod(period).map(convertToAreaInventoryItem);
    } else {
      items = getAllPlotsByArea().map(convertToAreaInventoryItem);
    }

    // 検索フィルタ
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(i =>
        i.period.toLowerCase().includes(searchLower) ||
        i.plotType.toLowerCase().includes(searchLower) ||
        i.areaSqm.toString().includes(searchLower)
      );
    }

    // ソート
    items = sortAreaItems(items, sortBy, sortOrder);

    // ページネーション
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      success: true,
      data: {
        items: paginatedItems,
        pagination: { page, limit, total, totalPages },
      },
    };
  }

  const queryParams: Record<string, string | number | undefined> = {
    page,
    limit,
    sortBy,
    sortOrder,
  };
  if (period) queryParams.period = period;
  if (search) queryParams.search = search;

  return apiGet<InventoryAreasResponse>('/plots/inventory/areas', queryParams);
}

// ==================== 月次報告（区画残数）帳票 ====================

/**
 * 月次報告帳票の1行。業務が税理士へ提出している Excel の「区」行に対応する。
 */
export interface MonthlyReportRow {
  label: string;
  totalCount: number;
  usedCount: number;
  remainingCount: number;
}

export interface MonthlyReportBlock {
  period: string;
  /** 帳票の見出し表記（「第　1　期」のように全角スペース入り） */
  title: string;
  rows: MonthlyReportRow[];
  total: MonthlyReportRow;
}

export interface MonthlyReportSummary {
  totalCount: number;
  usedCount: number;
  remainingCount: number;
  soldThisFiscalYear: number;
  cumulativeSoldCount: number;
  /** 年度表記。2026 は 2026年6月〜2027年5月（5月決算） */
  fiscalYear: number;
}

export interface MonthlyReportResponse {
  /** 集計を実行した時刻。過去月の再現は行わない */
  asOfDate: string;
  blocks: MonthlyReportBlock[];
  /** 帳票のレイアウトに載らない区画。0件なら null */
  otherBlock: MonthlyReportBlock | null;
  summary: MonthlyReportSummary;
}

export interface MonthlyReportParams {
  /** レイアウト外の区画を「その他」ブロックとして含めるか（既定 true） */
  includeOther?: boolean;
}

/**
 * 月次報告（区画残数）帳票データを取得
 *
 * 画面表示と Excel ダウンロードがこの同じレスポンスを使うので、両者の数字はズレない。
 */
export async function getInventoryMonthlyReport(
  params: MonthlyReportParams = {}
): Promise<ApiResponse<MonthlyReportResponse>> {
  const queryParams: Record<string, string | undefined> = {};
  if (params.includeOther === false) queryParams.includeOther = 'false';

  return apiGet<MonthlyReportResponse>('/plots/inventory/monthly-report', queryParams);
}

// ==================== 空き区画一覧・販売数（Excelの残り2種類） ====================

/** 空き区画1件。番号と、いま空いている広さ。 */
export interface VacantLedgerPlot {
  id: string;
  label: string;
  areaSqm: number;
}

export interface VacantLedgerArea {
  areaName: string;
  plots: VacantLedgerPlot[];
}

export interface VacantLedgerGroup {
  period: string;
  areas: VacantLedgerArea[];
  count: number;
}

export interface VacantLedgerResponse {
  asOfDate: string;
  total: number;
  groups: VacantLedgerGroup[];
}

export interface SalesMonthCount {
  month: number;
  count: number;
  cumulative: number;
}

export interface FiscalYearSales {
  fiscalYear: number;
  months: SalesMonthCount[];
  total: number;
}

export interface TypeSalesRow {
  areaName: string;
  count: number;
  areaSqm: number;
}

export interface TypeSalesMonth {
  month: number;
  rows: TypeSalesRow[];
}

export interface CalendarYearTypeSales {
  year: number;
  months: TypeSalesMonth[];
  totalCount: number;
  totalAreaSqm: number;
}

export interface SalesLedgerResponse {
  asOfDate: string;
  agentFilter: string | null;
  agentNames: string[];
  fiscalYears: FiscalYearSales[];
  typeSales: CalendarYearTypeSales[];
}

/** Excel「空き区画一覧」と同じ項目（番号と㎡）を期ごとに取得する。 */
export async function getVacantLedger(): Promise<ApiResponse<VacantLedgerResponse>> {
  return apiGet<VacantLedgerResponse>('/plots/inventory/vacant-ledger');
}

/** Excel「今年度販売区画数」「年別販売区画数」と同じ項目を取得する。 */
export async function getSalesLedger(agent?: string): Promise<ApiResponse<SalesLedgerResponse>> {
  const query: Record<string, string | undefined> = {};
  const needle = agent?.trim();
  if (needle) query.agent = needle;
  return apiGet<SalesLedgerResponse>('/plots/inventory/sales-ledger', query);
}
