'use client';

/**
 * 区画在庫管理フック
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PlotPeriod } from '@/types/plot-constants';
import {
  getInventorySummary,
  getInventoryPeriods,
  getInventorySections,
  getInventoryAreas,
  getInventoryMonthlyReport,
  getVacantLedger,
  getSalesLedger,
  InventorySummary,
  PeriodSummary,
  SectionInventoryItem,
  AreaInventoryItem,
  InventorySectionsParams,
  InventoryAreasParams,
  PlotStatus,
  SectionSortKey,
  AreaSortKey,
  SortOrder,
  MonthlyReportResponse,
  VacantLedgerResponse,
  SalesLedgerResponse,
} from '@/lib/api/plot-inventory';

// ==================== 型定義 ====================

export interface UsePlotInventoryOptions {
  autoFetch?: boolean;
}

export interface UsePlotInventorySummaryResult {
  summary: InventorySummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export interface UsePlotInventoryPeriodsResult {
  periods: PeriodSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export interface UsePlotInventorySectionsResult {
  items: SectionInventoryItem[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  params: InventorySectionsParams;
  setParams: (params: Partial<InventorySectionsParams>) => void;
  setPage: (page: number) => void;
  setSort: (sortBy: SectionSortKey, sortOrder?: SortOrder) => void;
  setSearch: (search: string) => void;
  setPeriod: (period: PlotPeriod | undefined) => void;
  setStatus: (status: PlotStatus | undefined) => void;
  refresh: () => void;
}

export interface UsePlotInventoryAreasResult {
  items: AreaInventoryItem[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  params: InventoryAreasParams;
  setParams: (params: Partial<InventoryAreasParams>) => void;
  setPage: (page: number) => void;
  setSort: (sortBy: AreaSortKey, sortOrder?: SortOrder) => void;
  setSearch: (search: string) => void;
  setPeriod: (period: PlotPeriod | undefined) => void;
  refresh: () => void;
}

// ==================== フック実装 ====================

/**
 * 在庫全体サマリーを取得するフック
 */
export function usePlotInventorySummary(
  options: UsePlotInventoryOptions = {}
): UsePlotInventorySummaryResult {
  const { autoFetch = true } = options;
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 世代カウンタ: 先発の遅いレスポンスによる上書きを防ぐ（#231）
  const genRef = useRef(0);

  const fetchSummary = useCallback(async () => {
    const myGen = ++genRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await getInventorySummary();
      if (myGen !== genRef.current) return;
      if (response.success) {
        setSummary(response.data);
      } else {
        setError(response.error?.message || 'サマリーの取得に失敗しました');
      }
    } catch {
      if (myGen !== genRef.current) return;
      setError('ネットワークエラーが発生しました');
    } finally {
      if (myGen === genRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchSummary();
    }
  }, [autoFetch, fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refresh: fetchSummary,
  };
}

/**
 * 期別サマリーを取得するフック
 */
export function usePlotInventoryPeriods(
  period?: PlotPeriod,
  options: UsePlotInventoryOptions = {}
): UsePlotInventoryPeriodsResult {
  const { autoFetch = true } = options;
  const [periods, setPeriods] = useState<PeriodSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 世代カウンタ: 期切替の連続操作時の上書きを防ぐ（#231）
  const genRef = useRef(0);

  const fetchPeriods = useCallback(async () => {
    const myGen = ++genRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await getInventoryPeriods(period);
      if (myGen !== genRef.current) return;
      if (response.success) {
        setPeriods(response.data.periods);
      } else {
        setError(response.error?.message || '期別サマリーの取得に失敗しました');
      }
    } catch {
      if (myGen !== genRef.current) return;
      setError('ネットワークエラーが発生しました');
    } finally {
      if (myGen === genRef.current) {
        setIsLoading(false);
      }
    }
  }, [period]);

  useEffect(() => {
    if (autoFetch) {
      fetchPeriods();
    }
  }, [autoFetch, fetchPeriods]);

  return {
    periods,
    isLoading,
    error,
    refresh: fetchPeriods,
  };
}

/**
 * セクション別集計を取得するフック
 */
export function usePlotInventorySections(
  initialParams: InventorySectionsParams = {},
  options: UsePlotInventoryOptions = {}
): UsePlotInventorySectionsResult {
  const { autoFetch = true } = options;
  const [items, setItems] = useState<SectionInventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParamsState] = useState<InventorySectionsParams>({
    page: 1,
    limit: 100,
    sortBy: 'period',
    sortOrder: 'asc',
    ...initialParams,
  });

  // 世代カウンタ: 検索（キーストロークごとにフェッチ）・期切替・ソートの
  // 連続操作時に古い結果での上書きを防ぐ（#231）
  const genRef = useRef(0);

  const fetchSections = useCallback(async () => {
    const myGen = ++genRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await getInventorySections(params);
      if (myGen !== genRef.current) return;
      if (response.success) {
        setItems(response.data.items);
        setTotal(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        setError(response.error?.message || 'セクション別集計の取得に失敗しました');
      }
    } catch {
      if (myGen !== genRef.current) return;
      setError('ネットワークエラーが発生しました');
    } finally {
      if (myGen === genRef.current) {
        setIsLoading(false);
      }
    }
  }, [params]);

  useEffect(() => {
    if (autoFetch) {
      fetchSections();
    }
  }, [autoFetch, fetchSections]);

  const setParams = useCallback((newParams: Partial<InventorySectionsParams>) => {
    setParamsState(prev => ({ ...prev, ...newParams }));
  }, []);

  const setPage = useCallback((page: number) => {
    setParams({ page });
  }, [setParams]);

  const setSort = useCallback((sortBy: SectionSortKey, sortOrder?: SortOrder) => {
    setParams({
      sortBy,
      sortOrder: sortOrder || (params.sortBy === sortBy && params.sortOrder === 'asc' ? 'desc' : 'asc'),
      page: 1,
    });
  }, [params.sortBy, params.sortOrder, setParams]);

  const setSearch = useCallback((search: string) => {
    setParams({ search: search || undefined, page: 1 });
  }, [setParams]);

  const setPeriod = useCallback((period: PlotPeriod | undefined) => {
    setParams({ period, page: 1 });
  }, [setParams]);

  const setStatus = useCallback((status: PlotStatus | undefined) => {
    setParams({ status, page: 1 });
  }, [setParams]);

  return {
    items,
    total,
    page: params.page || 1,
    totalPages,
    isLoading,
    error,
    params,
    setParams,
    setPage,
    setSort,
    setSearch,
    setPeriod,
    setStatus,
    refresh: fetchSections,
  };
}

/**
 * 面積別集計を取得するフック
 */
export function usePlotInventoryAreas(
  initialParams: InventoryAreasParams = {},
  options: UsePlotInventoryOptions = {}
): UsePlotInventoryAreasResult {
  const { autoFetch = true } = options;
  const [items, setItems] = useState<AreaInventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParamsState] = useState<InventoryAreasParams>({
    page: 1,
    limit: 100,
    sortBy: 'period',
    sortOrder: 'asc',
    ...initialParams,
  });

  // 世代カウンタ: 検索・期切替・ソートの連続操作時の上書きを防ぐ（#231）
  const genRef = useRef(0);

  const fetchAreas = useCallback(async () => {
    const myGen = ++genRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await getInventoryAreas(params);
      if (myGen !== genRef.current) return;
      if (response.success) {
        setItems(response.data.items);
        setTotal(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        setError(response.error?.message || '面積別集計の取得に失敗しました');
      }
    } catch {
      if (myGen !== genRef.current) return;
      setError('ネットワークエラーが発生しました');
    } finally {
      if (myGen === genRef.current) {
        setIsLoading(false);
      }
    }
  }, [params]);

  useEffect(() => {
    if (autoFetch) {
      fetchAreas();
    }
  }, [autoFetch, fetchAreas]);

  const setParams = useCallback((newParams: Partial<InventoryAreasParams>) => {
    setParamsState(prev => ({ ...prev, ...newParams }));
  }, []);

  const setPage = useCallback((page: number) => {
    setParams({ page });
  }, [setParams]);

  const setSort = useCallback((sortBy: AreaSortKey, sortOrder?: SortOrder) => {
    setParams({
      sortBy,
      sortOrder: sortOrder || (params.sortBy === sortBy && params.sortOrder === 'asc' ? 'desc' : 'asc'),
      page: 1,
    });
  }, [params.sortBy, params.sortOrder, setParams]);

  const setSearch = useCallback((search: string) => {
    setParams({ search: search || undefined, page: 1 });
  }, [setParams]);

  const setPeriod = useCallback((period: PlotPeriod | undefined) => {
    setParams({ period, page: 1 });
  }, [setParams]);

  return {
    items,
    total,
    page: params.page || 1,
    totalPages,
    isLoading,
    error,
    params,
    setParams,
    setPage,
    setSort,
    setSearch,
    setPeriod,
    refresh: fetchAreas,
  };
}

/**
 * 月次報告（区画残数）帳票を取得するフック
 */
export interface UsePlotInventoryMonthlyReportResult {
  report: MonthlyReportResponse | null;
  isLoading: boolean;
  error: string | null;
  includeOther: boolean;
  setIncludeOther: (includeOther: boolean) => void;
  refresh: () => void;
}

export function usePlotInventoryMonthlyReport(
  options: UsePlotInventoryOptions = {}
): UsePlotInventoryMonthlyReportResult {
  const { autoFetch = true } = options;
  const [report, setReport] = useState<MonthlyReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeOther, setIncludeOther] = useState(true);
  // 世代カウンタ: 先発の遅いレスポンスによる上書きを防ぐ（#231）
  const genRef = useRef(0);

  const fetchReport = useCallback(async () => {
    const myGen = ++genRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await getInventoryMonthlyReport({ includeOther });
      if (myGen !== genRef.current) return;
      if (response.success) {
        setReport(response.data);
      } else {
        setError(response.error?.message || '月次報告データの取得に失敗しました');
      }
    } catch {
      if (myGen !== genRef.current) return;
      setError('ネットワークエラーが発生しました');
    } finally {
      if (myGen === genRef.current) {
        setIsLoading(false);
      }
    }
  }, [includeOther]);

  useEffect(() => {
    if (autoFetch) {
      fetchReport();
    }
  }, [autoFetch, fetchReport]);

  return { report, isLoading, error, includeOther, setIncludeOther, refresh: fetchReport };
}

/**
 * 空き区画一覧（番号と㎡）を取得する。開いたときだけ取る。
 */
export function useVacantLedger(options: UsePlotInventoryOptions = {}) {
  const { autoFetch = true } = options;
  const [ledger, setLedger] = useState<VacantLedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);

  const refresh = useCallback(async () => {
    const myGen = ++genRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getVacantLedger();
      if (myGen !== genRef.current) return;
      if (response.success) {
        setLedger(response.data);
      } else {
        setError(response.error?.message || '空き区画一覧の取得に失敗しました');
      }
    } catch {
      if (myGen !== genRef.current) return;
      setError('ネットワークエラーが発生しました');
    } finally {
      if (myGen === genRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) refresh();
  }, [autoFetch, refresh]);

  return { ledger, isLoading, error, refresh };
}

/**
 * 販売数（月ごとの件数と、種類ごとの件数・㎡）を取得する。
 * 取扱の名前で絞れる。今の契約データは取扱が空のことが多いので、最初は全体を出す。
 */
export function useSalesLedger(options: UsePlotInventoryOptions = {}) {
  const { autoFetch = true } = options;
  const [ledger, setLedger] = useState<SalesLedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState('');
  const [appliedAgent, setAppliedAgent] = useState('');
  const genRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedAgent(agent), 300);
    return () => clearTimeout(timer);
  }, [agent]);

  const refresh = useCallback(async () => {
    const myGen = ++genRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getSalesLedger(appliedAgent);
      if (myGen !== genRef.current) return;
      if (response.success) {
        setLedger(response.data);
      } else {
        setError(response.error?.message || '販売数の取得に失敗しました');
      }
    } catch {
      if (myGen !== genRef.current) return;
      setError('ネットワークエラーが発生しました');
    } finally {
      if (myGen === genRef.current) setIsLoading(false);
    }
  }, [appliedAgent]);

  useEffect(() => {
    if (autoFetch) refresh();
  }, [autoFetch, refresh]);

  return { ledger, isLoading, error, agent, setAgent, refresh };
}
