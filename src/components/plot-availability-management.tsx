'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ClipboardList, Check, X, BarChart3, Hash, Layers, PieChart, Grid3X3, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { CreateVacantPlotDialog } from '@/components/create-vacant-plot-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import {
  PlotPeriod,
  PLOT_SIZE,
  LOW_STOCK_THRESHOLD,
  getAvailabilityStatus,
  AVAILABILITY_STATUS_LABELS,
} from '@/types/plot-constants';
import PageHeader from '@/components/page-header';
import { LegacyAwareValue, LegacyValueNote } from '@/components/legacy-aware-value';
import { isLegacyPlotNumber, isLegacyAreaName } from '@/lib/legacy-plot-display';
import {
  usePlotInventorySummary,
  usePlotInventoryPeriods,
  usePlotInventorySections,
  usePlotInventoryAreas,
} from '@/hooks/usePlotInventory';

type ViewMode = 'all' | 'available' | 'soldout' | 'usage-rate' | 'remaining';
type DisplayMode = 'section' | 'area'; // 区画別 or 面積別
type SelectedPeriod = PlotPeriod | 'all';
type SortKey = 'period' | 'section' | 'totalCount' | 'usedCount' | 'remainingCount' | 'usageRate';
type AreaSortKey = 'period' | 'areaSqm' | 'totalCount' | 'usedCount' | 'remainingCount' | 'remainingAreaSqm' | 'plotType';
type SortOrder = 'asc' | 'desc';

const menuItems = [
  { key: 'all', label: '全区画表示', icon: ClipboardList, description: '全ての区画を一覧表示' },
  { key: 'available', label: '空き区画のみ', icon: Check, description: '残数のある区画' },
  { key: 'soldout', label: '完売区画', icon: X, description: '残数0の区画' },
  { key: 'usage-rate', label: '使用率順', icon: BarChart3, description: '使用率でソート' },
  { key: 'remaining', label: '残数順', icon: Hash, description: '残数でソート' },
];

export default function PlotAvailabilityManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('section'); // 区画別 or 面積別
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod>('all');
  const [sortKey, setSortKey] = useState<SortKey>('period');
  const [areaSortKey, setAreaSortKey] = useState<AreaSortKey>('period');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isKpiExpanded, setIsKpiExpanded] = useState(false);
  const [isPeriodCardsExpanded, setIsPeriodCardsExpanded] = useState(true);

  // API Hooks
  const { summary: inventorySummary, isLoading: isSummaryLoading, refresh: refreshSummary } = usePlotInventorySummary();
  const { periods: periodSummaries, isLoading: isPeriodsLoading, refresh: refreshPeriods } = usePlotInventoryPeriods();
  const sectionsHook = usePlotInventorySections();
  const areasHook = usePlotInventoryAreas();

  // 空き区画の先行登録（システム確認 項目⑦）。閲覧のみ（viewer）には出さない
  const { user } = useAuth();
  const canRegisterVacant = !!user && ['operator', 'manager', 'admin'].includes(user.role);
  const [isVacantDialogOpen, setIsVacantDialogOpen] = useState(false);
  const handleVacantCreated = () => {
    refreshSummary();
    refreshPeriods();
    sectionsHook.refresh();
    areasHook.refresh();
  };

  // useCallback 済みで安定した setter 群を取り出す。フックの戻り値オブジェクト自体は
  // 毎レンダー新しい参照になるため、effect の依存にはこの安定 setter を使う。
  const { setPeriod: setSectionsPeriod, setStatus: setSectionsStatus, setSearch: setSectionsSearch } =
    sectionsHook;
  const { setPeriod: setAreasPeriod, setSearch: setAreasSearch } = areasHook;

  // 期の変更をセクション・面積フックに反映
  useEffect(() => {
    if (selectedPeriod === 'all') {
      setSectionsPeriod(undefined);
      setAreasPeriod(undefined);
    } else {
      setSectionsPeriod(selectedPeriod);
      setAreasPeriod(selectedPeriod);
    }
  }, [selectedPeriod, setSectionsPeriod, setAreasPeriod]);

  // 表示モード変更時のステータスフィルタ
  useEffect(() => {
    if (viewMode === 'available') {
      setSectionsStatus('available');
    } else if (viewMode === 'soldout') {
      setSectionsStatus('sold_out');
    } else {
      setSectionsStatus(undefined);
    }
  }, [viewMode, setSectionsStatus]);

  // 検索クエリの反映
  // デバウンス: 入力が params に直結しており 1 キーストロークごとに
  // sections/areas の 2 本フェッチが走るため、300ms 待ってから反映（#231）
  useEffect(() => {
    const timer = setTimeout(() => {
      setSectionsSearch(searchQuery);
      setAreasSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setSectionsSearch, setAreasSearch]);

  // ソートの反映
  // setSort は params.sortBy/sortOrder の変化で再生成されるため依存に含めない。
  // 常に明示的な引数で呼ぶので stale closure にはならず、sortKey/sortOrder の変化時のみ
  // 実行すれば十分（含めると同一ソートで余分な再フェッチが発生する）。
  useEffect(() => {
    sectionsHook.setSort(sortKey, sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortOrder]);

  // 面積別ソートの反映（setSort を依存に含めない理由は上記と同じ）
  useEffect(() => {
    areasHook.setSort(areaSortKey, sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaSortKey, sortOrder]);

  // 全体サマリー（デフォルト値付き）
  const summary = inventorySummary ?? {
    totalCount: 0,
    usedCount: 0,
    remainingCount: 0,
    usageRate: 0,
    totalAreaSqm: 0,
    remainingAreaSqm: 0,
    lastUpdated: '',
  };

  // 表示データ
  const displayData = sectionsHook.items;
  const displayAreaData = areasHook.items;

  // 平米数計算（APIから取得したサマリーを使用）
  const areaStats = {
    totalArea: summary.totalAreaSqm,
    usedArea: summary.totalAreaSqm - summary.remainingAreaSqm,
    remainingArea: summary.remainingAreaSqm,
  };

  // ローディング状態
  const isLoading = isSummaryLoading || isPeriodsLoading || sectionsHook.isLoading || areasHook.isLoading;

  // ロード中は確定前の 0 を表示せず "--" を出す（初回ロードの 0件フラッシュ防止 #172）
  const stat = (value: number, suffix = ''): string =>
    isLoading ? '--' : `${value.toLocaleString()}${suffix}`;

  // 使用率に応じた色を取得
  const getUsageRateColor = (usageRate: number) => {
    if (usageRate >= 95) return 'bg-beni-50 text-beni-dark';
    if (usageRate >= 80) return 'bg-kohaku-50 text-kohaku-dark';
    if (usageRate >= 60) return 'bg-cha-50 text-cha-dark';
    return 'bg-matsu-50 text-matsu-dark';
  };

  // 残数に応じた色を取得
  const getRemainingColor = (remaining: number, total: number) => {
    const rate = (remaining / total) * 100;
    if (rate <= 5) return 'text-beni font-bold';
    if (rate <= 15) return 'text-kohaku font-semibold';
    if (rate <= 30) return 'text-cha';
    return 'text-matsu';
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleAreaSort = (key: AreaSortKey) => {
    if (areaSortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setAreaSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="区画残数管理"
        subtitle="区画の在庫状況・使用率"
        theme="kohaku"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        }
      />

      <div className="flex-1 overflow-auto bg-gradient-warm">

        {/* ツールバー */}
        <div className="bg-white border-b border-gin p-3 md:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4">
          {/* 表示形式切替（区画別/面積別） */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-hai whitespace-nowrap">表示形式</span>
            <div className="flex gap-1 p-1 bg-kinari rounded-elegant border border-gin">
              <button
                onClick={() => setDisplayMode('section')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                  displayMode === 'section'
                    ? 'bg-ai text-white shadow-elegant'
                    : 'text-hai hover:text-sumi hover:bg-white'
                )}
              >
                区画別
              </button>
              <button
                onClick={() => setDisplayMode('area')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                  displayMode === 'area'
                    ? 'bg-ai text-white shadow-elegant'
                    : 'text-hai hover:text-sumi hover:bg-white'
                )}
              >
                面積別
              </button>
            </div>
          </div>

          {/* フィルター（viewMode） */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-hai whitespace-nowrap">絞り込み</span>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="h-9 w-[200px] md:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {menuItems.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    <span className="flex items-center gap-2">
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
                      {item.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 期フィルタバッジ（選択中のみ表示、期別カードで期選択） */}
          {selectedPeriod !== 'all' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-hai whitespace-nowrap">期</span>
              <button
                onClick={() => setSelectedPeriod('all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-elegant bg-ai-50 text-ai border border-ai-200 text-sm font-medium hover:bg-ai-100 transition-colors"
              >
                {selectedPeriod}
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 空き区画の先行登録（旧システムの「区画を先ず作る」運用。項目⑦） */}
          {canRegisterVacant && (
            <div className="sm:ml-auto">
              <Button size="sm" onClick={() => setIsVacantDialogOpen(true)} className="cursor-pointer">
                <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                空き区画を登録
              </Button>
            </div>
          )}
        </div>

        {/* メインコンテンツ */}
        <div className="p-3 md:p-6 relative">
          {/* ローディングオーバーレイ */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-ai border-t-transparent rounded-full animate-spin"></div>
                <span className="mt-2 text-sm text-hai">読み込み中...</span>
              </div>
            </div>
          )}

          {/* 全体サマリー — 常時コンパクト表示 + 折りたたみで詳細カード */}
          <div className="bg-white border border-gin rounded-elegant-lg mb-4 shadow-elegant-sm overflow-hidden">
            {/* コンパクトサマリー（常時表示） */}
            <button
              type="button"
              onClick={() => setIsKpiExpanded((v) => !v)}
              aria-expanded={isKpiExpanded}
              aria-label="区画数・面積・半区画換算の内訳を開閉"
              title="区画数・面積（㎡）・半区画換算の内訳を開閉します"
              className="w-full p-3 flex items-center gap-2 hover:bg-kinari/40 transition-colors"
            >
              <div className="flex-1 flex items-center justify-between gap-2 text-center">
                <div className="flex-1 min-w-0">
                  <div className="text-lg md:text-xl font-bold text-matsu tabular-nums">{stat(summary.totalCount)}</div>
                  <div className="text-[10px] md:text-xs text-hai">総数</div>
                </div>
                <div className="w-px h-8 bg-gin" />
                <div className="flex-1 min-w-0">
                  <div className="text-lg md:text-xl font-bold text-ai tabular-nums">{stat(summary.usedCount)}</div>
                  <div className="text-[10px] md:text-xs text-hai">使用</div>
                </div>
                <div className="w-px h-8 bg-gin" />
                <div className="flex-1 min-w-0">
                  <div className="text-lg md:text-xl font-bold text-kohaku tabular-nums">{stat(summary.remainingCount)}</div>
                  <div className="text-[10px] md:text-xs text-hai">残</div>
                </div>
                <div className="w-px h-8 bg-gin" />
                <div className="flex-1 min-w-0">
                  <div className="text-lg md:text-xl font-bold text-cha tabular-nums">{stat(summary.usageRate, '%')}</div>
                  <div className="text-[10px] md:text-xs text-hai">使用率</div>
                </div>
                <div className="w-px h-8 bg-gin hidden sm:block" />
                <div
                  className="flex-1 min-w-0 hidden sm:block"
                  title="残区画 × 2（3.6㎡区画を1.8㎡で2分割した場合の販売可能数の最大値）"
                >
                  <div className="text-lg md:text-xl font-bold text-sumi tabular-nums">{stat(summary.remainingCount * 2)}</div>
                  <div className="text-[10px] md:text-xs text-hai">半区画（残×2）</div>
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 text-xs text-hai whitespace-nowrap">
                <span className="hidden sm:inline">{isKpiExpanded ? '内訳を閉じる' : '内訳を表示'}</span>
                {isKpiExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {/* 詳細KPIカード（展開時のみ） */}
            {isKpiExpanded && (
              <div className="border-t border-gin p-3 md:p-4 grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
                <StatCard
                  label="総区画数"
                  value={summary.totalCount.toLocaleString()}
                  description={`${areaStats.totalArea.toLocaleString()}㎡`}
                  icon={<Layers className="w-4 h-4" />}
                  theme="matsu"
                />
                <StatCard
                  label="使用済区画数"
                  value={summary.usedCount.toLocaleString()}
                  description={`${areaStats.usedArea.toLocaleString()}㎡`}
                  icon={<Check className="w-4 h-4" />}
                  theme="ai"
                />
                <StatCard
                  label="残区画数"
                  value={summary.remainingCount.toLocaleString()}
                  description={`${areaStats.remainingArea.toLocaleString()}㎡`}
                  icon={<Hash className="w-4 h-4" />}
                  theme="kohaku"
                />
                <StatCard
                  label="使用率"
                  value={summary.usageRate}
                  unit="%"
                  icon={<PieChart className="w-4 h-4" />}
                  theme="cha"
                  description={
                    <span className="block w-full bg-cha-50 rounded-full h-1.5 mt-1">
                      <span
                        className="block bg-cha h-1.5 rounded-full transition-all duration-500"
                        // バー幅のみクランプ（テキストは生値を出し 100% 超の異常に気付けるようにする）#232
                        style={{ width: `${Math.min(summary.usageRate, 100)}%` }}
                      />
                    </span>
                  }
                />
                <StatCard
                  label="半区画換算"
                  value={(summary.remainingCount * 2).toLocaleString()}
                  description={`1.8㎡ × ${(summary.remainingCount * 2).toLocaleString()}`}
                  icon={<Grid3X3 className="w-4 h-4" />}
                  theme="sumi"
                />
              </div>
            )}
          </div>

          {/* 期別サマリーカード — 折りたたみ可能（クリックで期選択） */}
          <div className="mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-hai">期別サマリー {selectedPeriod !== 'all' && <span className="ml-1 text-ai">（{selectedPeriod}を選択中）</span>}</span>
              <button
                type="button"
                onClick={() => setIsPeriodCardsExpanded((v) => !v)}
                aria-expanded={isPeriodCardsExpanded}
                className="inline-flex items-center gap-1 text-xs text-hai hover:text-sumi transition-colors"
              >
                {isPeriodCardsExpanded ? '折りたたむ' : '展開'}
                {isPeriodCardsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
            {isPeriodCardsExpanded && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
                {periodSummaries.map((ps) => {
                  const periodColors: Record<string, { light: string }> = {
                    '第1期': { light: 'matsu' },
                    '第2期': { light: 'ai' },
                    '第3期': { light: 'cha' },
                    '第3期樹林部': { light: 'cha' },
                    '第4期': { light: 'kohaku' },
                  };
                  const colors = periodColors[ps.period] ?? { light: 'hai' };

                  return (
                    <button
                      key={ps.period}
                      onClick={() => setSelectedPeriod(selectedPeriod === ps.period ? 'all' : ps.period)}
                      className={cn(
                        'bg-white border rounded-elegant p-2.5 md:p-3 text-left transition-all duration-200 hover:shadow-elegant',
                        selectedPeriod === ps.period
                          ? `border-${colors.light} ring-2 ring-${colors.light}-100 shadow-elegant`
                          : 'border-gin hover:border-hai'
                      )}
                    >
                      <div className="flex justify-between items-center mb-1.5 md:mb-2">
                        <span className={cn('text-xs md:text-sm font-bold font-mincho truncate', `text-${colors.light}`)}>
                          {ps.period}
                        </span>
                        <span className={cn(
                          'text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-medium tabular-nums shrink-0 ml-1',
                          getUsageRateColor(ps.usageRate)
                        )}>
                          {ps.usageRate}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[11px] md:text-xs">
                        <div>
                          <div className="text-hai">総</div>
                          <div className="font-semibold text-sumi tabular-nums">{ps.totalCount}</div>
                        </div>
                        <div>
                          <div className="text-hai">使用</div>
                          <div className="font-semibold text-matsu tabular-nums">{ps.usedCount}</div>
                        </div>
                        <div>
                          <div className="text-hai">残</div>
                          <div className={cn('font-semibold tabular-nums', getRemainingColor(ps.remainingCount, ps.totalCount))}>
                            {ps.remainingCount}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 検索バー */}
          <div className="bg-white rounded-elegant-lg shadow-elegant p-4 mb-4 border border-gin">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={displayMode === 'section' ? "区画名・期で検索…" : "面積・タイプで検索…"}
                className="flex-1 sm:max-w-md"
              />
              <Button
                onClick={() => setSearchQuery('')}
                variant="outline"
                size="default"
              >
                クリア
              </Button>
              <div className="flex-1" />
              <span className="text-sm text-hai">
                表示件数: <span className="font-semibold text-sumi">{displayMode === 'section' ? displayData.length : displayAreaData.length}</span>件
                {selectedPeriod !== 'all' && <span className="ml-2 text-ai">({selectedPeriod})</span>}
                {displayMode === 'area' && <span className="ml-2 text-cha">[面積別]</span>}
              </span>
            </div>
          </div>

          {/* データテーブル */}
          <div className="bg-white rounded-elegant-lg shadow-elegant overflow-hidden border border-gin">
            <div className="overflow-x-auto">
              {displayMode === 'section' ? (
                /* 区画別テーブル */
                <table className="w-full">
                  <thead className="bg-kinari border-b border-gin">
                    <tr>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors",
                          sortKey === 'period' && "bg-cha-50"
                        )}
                        onClick={() => handleSort('period')}
                      >
                        <div className="flex items-center">
                          期
                          {sortKey === 'period' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors",
                          sortKey === 'section' && "bg-cha-50"
                        )}
                        onClick={() => handleSort('section')}
                      >
                        <div className="flex items-center">
                          区画
                          {sortKey === 'section' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors",
                          sortKey === 'totalCount' && "bg-cha-50"
                        )}
                        onClick={() => handleSort('totalCount')}
                      >
                        <div className="flex items-center justify-end">
                          総数
                          {sortKey === 'totalCount' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors hidden sm:table-cell",
                          sortKey === 'usedCount' && "bg-cha-50"
                        )}
                        onClick={() => handleSort('usedCount')}
                      >
                        <div className="flex items-center justify-end">
                          使用数
                          {sortKey === 'usedCount' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors",
                          sortKey === 'remainingCount' && "bg-cha-50"
                        )}
                        onClick={() => handleSort('remainingCount')}
                      >
                        <div className="flex items-center justify-end">
                          残
                          {sortKey === 'remainingCount' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-center text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors hidden md:table-cell",
                          sortKey === 'usageRate' && "bg-cha-50"
                        )}
                        onClick={() => handleSort('usageRate')}
                      >
                        <div className="flex items-center justify-center">
                          使用率
                          {sortKey === 'usageRate' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs md:text-sm font-bold text-sumi hidden sm:table-cell">
                        状況
                      </th>
                      <th className="px-2 md:px-4 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-sumi hidden lg:table-cell">
                        面積（㎡）
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gin">
                    {displayData.map((item, index) => {
                      // APIから直接usageRateを取得（フォールバック計算も維持）
                      const usageRate = item.usageRate ?? (item.totalCount > 0
                        ? Math.round((item.usedCount / item.totalCount) * 100 * 10) / 10
                        : 0);
                      const remainingArea = item.remainingCount * PLOT_SIZE.FULL;
                      const periodColors: Record<string, string> = {
                        '第1期': 'bg-matsu-50 text-matsu',
                        '第2期': 'bg-ai-50 text-ai',
                        '第3期': 'bg-cha-50 text-cha',
                        '第3期樹林部': 'bg-cha-50 text-cha',
                        '第4期': 'bg-kohaku-50 text-kohaku',
                      };

                      return (
                        <tr
                          key={`${item.period}-${item.section}`}
                          className={cn(
                            "hover:bg-kinari transition-colors",
                            index % 2 === 0 ? 'bg-white' : 'bg-shiro'
                          )}
                        >
                          <td className="px-2 md:px-4 py-2 md:py-3 text-sm">
                            <span className={cn(
                              "px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-medium",
                              periodColors[item.period as keyof typeof periodColors]
                            )}>
                              <LegacyAwareValue value={item.period} kind="areaName" emptyText="-" />
                            </span>
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-sumi">
                            <LegacyAwareValue value={item.section} kind="plotNumber" emptyText="-" />
                            {item.category && (
                              <span className="ml-1 md:ml-2 text-xs text-hai font-normal">({item.category})</span>
                            )}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-right text-hai">
                            {item.totalCount}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-right text-matsu font-medium hidden sm:table-cell">
                            {item.usedCount}
                          </td>
                          <td className={cn(
                            "px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-right",
                            getRemainingColor(item.remainingCount, item.totalCount)
                          )}>
                            {item.remainingCount}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-sm text-center hidden md:table-cell">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-16 bg-kinari rounded-full h-2 border border-gin">
                                <div
                                  className={cn(
                                    "h-2 rounded-full transition-all duration-300",
                                    usageRate >= 95 ? 'bg-beni' :
                                      usageRate >= 80 ? 'bg-kohaku' :
                                        usageRate >= 60 ? 'bg-cha' :
                                          'bg-matsu'
                                  )}
                                  // バー幅のみクランプ（在庫計算バグ #209 で 100% 超が届く）#232
                                  style={{ width: `${Math.min(usageRate, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-hai w-12">{usageRate}%</span>
                            </div>
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-sm text-center hidden sm:table-cell">
                            {(() => {
                              const status = getAvailabilityStatus(item.remainingCount);
                              const styles: Record<typeof status, string> = {
                                sold_out: 'bg-beni-50 text-beni',
                                low_stock: 'bg-kohaku-50 text-kohaku',
                                available: 'bg-matsu-50 text-matsu',
                              };
                              return (
                                <span
                                  className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[status])}
                                  title={`残${item.remainingCount}区画（${AVAILABILITY_STATUS_LABELS[status]}）— 状況は残数で判定（使用率とは別軸）`}
                                >
                                  {AVAILABILITY_STATUS_LABELS[status]}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-sm text-right text-hai hidden lg:table-cell">
                            {remainingArea.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* 合計行 */}
                  <tfoot className="bg-kinari font-bold border-t-2 border-gin">
                    <tr>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-sumi" colSpan={2}>
                        合計 {selectedPeriod !== 'all' ? `(${selectedPeriod})` : ''}
                      </td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-right text-sumi">
                        {displayData.reduce((sum, item) => sum + item.totalCount, 0)}
                      </td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-right text-matsu hidden sm:table-cell">
                        {displayData.reduce((sum, item) => sum + item.usedCount, 0)}
                      </td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-right text-kohaku">
                        {displayData.reduce((sum, item) => sum + item.remainingCount, 0)}
                      </td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-center text-sumi hidden md:table-cell">
                        {displayData.length > 0 ? (
                          Math.round(
                            (displayData.reduce((sum, item) => sum + item.usedCount, 0) /
                              displayData.reduce((sum, item) => sum + item.totalCount, 0)) * 100 * 10
                          ) / 10
                        ) : 0}%
                      </td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-sm text-center hidden sm:table-cell">-</td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-sm text-right text-hai hidden lg:table-cell">
                        {(displayData.reduce((sum, item) => sum + item.remainingCount, 0) * PLOT_SIZE.FULL).toFixed(1)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                /* 面積別テーブル */
                <table className="w-full">
                  <thead className="bg-kinari border-b border-gin">
                    <tr>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors",
                          areaSortKey === 'period' && "bg-cha-50"
                        )}
                        onClick={() => handleAreaSort('period')}
                      >
                        <div className="flex items-center">
                          期
                          {areaSortKey === 'period' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors",
                          areaSortKey === 'areaSqm' && "bg-cha-50"
                        )}
                        onClick={() => handleAreaSort('areaSqm')}
                      >
                        <div className="flex items-center justify-end">
                          面積
                          {areaSortKey === 'areaSqm' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors",
                          areaSortKey === 'totalCount' && "bg-cha-50"
                        )}
                        onClick={() => handleAreaSort('totalCount')}
                      >
                        <div className="flex items-center justify-end">
                          総数
                          {areaSortKey === 'totalCount' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors hidden sm:table-cell",
                          areaSortKey === 'usedCount' && "bg-cha-50"
                        )}
                        onClick={() => handleAreaSort('usedCount')}
                      >
                        <div className="flex items-center justify-end">
                          使用数
                          {areaSortKey === 'usedCount' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors",
                          areaSortKey === 'remainingCount' && "bg-cha-50"
                        )}
                        onClick={() => handleAreaSort('remainingCount')}
                      >
                        <div className="flex items-center justify-end">
                          残
                          {areaSortKey === 'remainingCount' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors hidden md:table-cell",
                          areaSortKey === 'remainingAreaSqm' && "bg-cha-50"
                        )}
                        onClick={() => handleAreaSort('remainingAreaSqm')}
                      >
                        <div className="flex items-center justify-end">
                          残㎡
                          {areaSortKey === 'remainingAreaSqm' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className={cn(
                          "px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-sumi cursor-pointer hover:bg-cha-50 transition-colors hidden md:table-cell",
                          areaSortKey === 'plotType' && "bg-cha-50"
                        )}
                        onClick={() => handleAreaSort('plotType')}
                      >
                        <div className="flex items-center">
                          タイプ
                          {areaSortKey === 'plotType' && (
                            <span className="ml-1 text-cha">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs md:text-sm font-bold text-sumi hidden sm:table-cell">
                        状況
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gin">
                    {displayAreaData.map((item, index) => {
                      const periodColors: Record<string, string> = {
                        '第1期': 'bg-matsu-50 text-matsu',
                        '第2期': 'bg-ai-50 text-ai',
                        '第3期': 'bg-cha-50 text-cha',
                        '第3期樹林部': 'bg-cha-50 text-cha',
                        '第4期': 'bg-kohaku-50 text-kohaku',
                      };

                      return (
                        <tr
                          key={`${item.period}-${item.areaSqm}-${item.plotType}-${index}`}
                          className={cn(
                            "hover:bg-kinari transition-colors",
                            index % 2 === 0 ? 'bg-white' : 'bg-shiro'
                          )}
                        >
                          <td className="px-2 md:px-4 py-2 md:py-3 text-sm">
                            <span className={cn(
                              "px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-medium",
                              periodColors[item.period as keyof typeof periodColors]
                            )}>
                              {item.period}
                            </span>
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-right font-semibold text-sumi">
                            {item.areaSqm}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-right text-hai">
                            {item.totalCount}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-right text-matsu font-medium hidden sm:table-cell">
                            {item.usedCount}
                          </td>
                          <td className={cn(
                            "px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-right",
                            getRemainingColor(item.remainingCount, item.totalCount)
                          )}>
                            {item.remainingCount}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-right text-ai font-medium hidden md:table-cell">
                            {item.remainingAreaSqm}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-hai hidden md:table-cell">
                            {item.plotType}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-sm text-center hidden sm:table-cell">
                            {(() => {
                              const status = getAvailabilityStatus(item.remainingCount);
                              const styles: Record<typeof status, string> = {
                                sold_out: 'bg-beni-50 text-beni',
                                low_stock: 'bg-kohaku-50 text-kohaku',
                                available: 'bg-matsu-50 text-matsu',
                              };
                              return (
                                <span
                                  className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[status])}
                                  title={`残${item.remainingCount}区画（${AVAILABILITY_STATUS_LABELS[status]}）— 状況は残数で判定（使用率とは別軸）`}
                                >
                                  {AVAILABILITY_STATUS_LABELS[status]}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* 合計行 */}
                  <tfoot className="bg-kinari font-bold border-t-2 border-gin">
                    <tr>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-sumi" colSpan={2}>
                        合計 {selectedPeriod !== 'all' ? `(${selectedPeriod})` : ''}
                      </td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-right text-sumi">
                        {displayAreaData.reduce((sum, item) => sum + item.totalCount, 0)}
                      </td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-right text-matsu hidden sm:table-cell">
                        {displayAreaData.reduce((sum, item) => sum + item.usedCount, 0)}
                      </td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-right text-kohaku">
                        {displayAreaData.reduce((sum, item) => sum + item.remainingCount, 0)}
                      </td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-right text-ai hidden md:table-cell">
                        {displayAreaData.reduce((sum, item) => sum + item.remainingAreaSqm, 0).toFixed(1)}
                      </td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-sm hidden md:table-cell">-</td>
                      <td className="px-2 md:px-4 py-3 md:py-4 text-sm text-center hidden sm:table-cell">-</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {(displayMode === 'section' ? displayData.length : displayAreaData.length) === 0 && (
              <div className="text-center py-16 text-hai">
                <svg className="w-16 h-16 mx-auto mb-4 text-gin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                該当する区画がありません
              </div>
            )}
          </div>

          {/* フッター情報（凡例）— 状況（残数）と使用率（%）は別軸である点を明示（#183） */}
          <div className="mt-5 text-sm text-hai bg-white rounded-elegant-lg p-4 border border-gin space-y-3">
            {/* レガシー移行値が含まれる場合の注記（#182）*/}
            {(displayData.some((it) => isLegacyPlotNumber(it.section) || isLegacyAreaName(it.period)) ||
              displayAreaData.some((it) => isLegacyAreaName(it.period))) && (
              <LegacyValueNote className="border-b border-gin pb-2" />
            )}
            {/* 状況バッジの判定基準（残数の絶対値）*/}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-xs font-semibold text-sumi shrink-0">状況（残数で判定）</span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-matsu-50 text-matsu rounded-full text-xs font-medium">空有</span>
                  残{LOW_STOCK_THRESHOLD + 1}区画以上
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-kohaku-50 text-kohaku rounded-full text-xs font-medium">残少</span>
                  残1〜{LOW_STOCK_THRESHOLD}区画
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-beni-50 text-beni rounded-full text-xs font-medium">完売</span>
                  残0区画
                </span>
              </div>
            </div>

            {/* 使用率バーの色帯（パーセント）*/}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-xs font-semibold text-sumi shrink-0">使用率バー（%）</span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-matsu rounded mr-2" /> 60%未満
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-cha rounded mr-2" /> 60-80%
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-kohaku rounded mr-2" /> 80-95%
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-beni rounded mr-2" /> 95%以上
                </span>
              </div>
            </div>

            <p className="text-xs text-hai border-t border-gin pt-2">
              ※「状況」は残数（区画の絶対数）で判定し、使用率バーの色帯（%）とは別の基準です。
              使用率が高くても残数が多ければ「空有」になります。
            </p>
            <p className="text-xs text-hai">
              ※ 1区画 = {PLOT_SIZE.FULL}㎡、半区画 = {PLOT_SIZE.HALF}㎡。
              上部サマリーの「半区画」は <span className="font-medium text-sumi">残区画 × 2</span>
              （3.6㎡区画を1.8㎡で2分割した場合に販売できる最大数）です。
            </p>
          </div>
        </div>
      </div>

      {/* 空き区画の先行登録ダイアログ（項目⑦） */}
      <CreateVacantPlotDialog
        isOpen={isVacantDialogOpen}
        onClose={() => setIsVacantDialogOpen(false)}
        onCreated={handleVacantCreated}
      />
    </div>
  );
}