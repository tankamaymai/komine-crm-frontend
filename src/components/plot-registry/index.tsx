'use client';

/**
 * PlotRegistry - 区画台帳一覧コンポーネント
 *
 * サーバーサイド検索・ソート・ページネーション対応
 * @komine/types の PlotListItem を直接使用し、Customer型への変換なし。
 *
 * 状態・データ取得はこの index に集約し、表示は責務別の子コンポーネントに委譲する。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { type PlotListItem } from '@komine/types';
import { getPlots, getGraveClassifications } from '@/lib/api/plots';
import type { PlotSearchParams } from '@/lib/api/plots';
import type { GraveClassificationsResponse } from '@komine/types';
import { Button } from '@/components/ui/button';
import {
  clampColumnWidth,
  loadColumnWidths,
  saveColumnWidths,
  type ColumnWidths,
  type ResizableColumnKey,
} from '@/lib/plots-column-widths';
import {
  DEFAULT_PLOT_DISPLAY_SETTINGS,
  loadPlotDisplaySettings,
  savePlotDisplaySettings,
  type PlotDisplaySettings,
} from '@/lib/plots-display-settings';
import { EmptyState } from '@/components/ui/empty-state';
import PageHeader from '@/components/page-header';
import { AIUEO_TABS, SERVER_SORT_MAP } from './constants';
import { loadSearchHistory, saveSearchHistory } from './utils';
import type { PlotRegistryProps, SortKey, SortOrder } from './types';
import { PlotSearchBar } from './PlotSearchBar';
import { PlotToolbar } from './PlotToolbar';
import { PlotFilters, type OccupancyFilter } from './PlotFilters';
import { PlotAiueoTabs } from './PlotAiueoTabs';
import { PlotCardList } from './PlotCardList';
import { PlotTable } from './PlotTable';
import { PlotPagination } from './PlotPagination';

export default function PlotRegistry({
  onPlotSelect,
  selectedPlotId,
  onNewPlot,
  onPlotHover,
}: PlotRegistryProps) {
  const [activeTab, setActiveTab] = useState('全');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [plots, setPlots] = useState<PlotListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedTabIndex, setFocusedTabIndex] = useState(11);
  const [sortKey, setSortKey] = useState<SortKey>('plotNumber');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // フィルタ
  const [filterOccupancy, setFilterOccupancy] = useState<OccupancyFilter>('in_use');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterAreaName, setFilterAreaName] = useState('');
  const [filterGraveType, setFilterGraveType] = useState<number | undefined>(undefined);
  const [graveClassifications, setGraveClassifications] = useState<GraveClassificationsResponse>({
    graveKinds: [],
    graveKubuns: [],
    graveTypes: [],
    areaNames: [],
  });
  const [showBuriedPersons, setShowBuriedPersons] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isAiueoExpanded, setIsAiueoExpanded] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<PlotDisplaySettings>(DEFAULT_PLOT_DISPLAY_SETTINGS);

  // 検索履歴
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    setSearchHistory(loadSearchHistory());
  }, []);

  // 列幅（issue #146）— localStorage に永続化。SSR ハイドレーション差異を避けるため
  // 初期値は空でマウント後に読み込む。
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({});
  useEffect(() => {
    setColumnWidths(loadColumnWidths());
    setDisplaySettings(loadPlotDisplaySettings());
  }, []);

  // ヘッダー境界のドラッグで列幅を変更し、ドラッグ終了時に保存する
  const handleColumnResizeStart = useCallback(
    (key: ResizableColumnKey, startX: number, startWidth: number) => {
      const handleMove = (e: PointerEvent) => {
        const next = clampColumnWidth(startWidth + (e.clientX - startX));
        setColumnWidths((prev) => ({ ...prev, [key]: next }));
      };
      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setColumnWidths((prev) => {
          saveColumnWidths(prev);
          return prev;
        });
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    []
  );

  const handleResetColumnWidths = useCallback(() => {
    setColumnWidths({});
    saveColumnWidths({});
  }, []);

  const hasCustomColumnWidths = Object.keys(columnWidths).length > 0;

  const handleFontSizeChange = useCallback((fontSize: PlotDisplaySettings['fontSize']) => {
    setDisplaySettings((prev) => {
      const next = { ...prev, fontSize };
      savePlotDisplaySettings(next);
      return next;
    });
  }, []);

  const handleFontWeightChange = useCallback((fontWeight: PlotDisplaySettings['fontWeight']) => {
    setDisplaySettings((prev) => {
      const next = { ...prev, fontWeight };
      savePlotDisplaySettings(next);
      return next;
    });
  }, []);

  // 区画区分 distinct 値（マスタ化されるまでの暫定 select 候補）
  useEffect(() => {
    let cancelled = false;
    getGraveClassifications().then((res) => {
      if (cancelled) return;
      if (res.success) {
        setGraveClassifications(res.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // サーバーサイドページネーション
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 世代カウンタ: 検索・フィルタ・ページャの連続操作時に先発の遅いレスポンスが
  // 後発の結果を上書きするのを防ぐ（リクエスト順序逆転対策 #221/#231）
  const requestSeqRef = useRef(0);

  // サーバーサイドデータ取得
  const fetchPlots = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const params: PlotSearchParams = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // あいう順タブ → カタカナキーに変換してサーバーへ送信
      const tabDef = AIUEO_TABS.find(t => t.key === activeTab);
      if (tabDef?.kataKey) {
        params.nameKanaPrefix = tabDef.kataKey;
      }

      // フィルタ
      if (filterOccupancy !== 'in_use') {
        params.occupancy = filterOccupancy;
      }
      if (filterPeriod) {
        params.period = filterPeriod;
      }
      if (filterAreaName.trim()) {
        params.areaName = filterAreaName.trim();
      }
      if (filterGraveType !== undefined) {
        params.graveType = filterGraveType;
      }

      // サーバー対応ソートキーのみ送信
      const serverSortKey = SERVER_SORT_MAP[sortKey];
      if (serverSortKey) {
        params.sortBy = serverSortKey;
        params.sortOrder = sortOrder;
      }

      const response = await getPlots(params);
      // 最新リクエスト以外の結果は破棄
      if (seq !== requestSeqRef.current) return;
      if (response.success) {
        setPlots(response.data.items);
        setTotalItems(response.data.total);
        setTotalPages(response.data.totalPages);
      } else {
        setError(response.error?.message || 'データの取得に失敗しました');
      }
    } catch {
      if (seq !== requestSeqRef.current) return;
      setError('ネットワークエラーが発生しました');
    } finally {
      // 古いリクエストの finally で isLoading を落とさない
      if (seq === requestSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentPage, itemsPerPage, searchQuery, activeTab, sortKey, sortOrder, filterOccupancy, filterPeriod, filterAreaName, filterGraveType]);

  useEffect(() => {
    fetchPlots();
  }, [fetchPlots]);

  // 検索実行（Enterキーまたは検索ボタンクリック）
  const handleSearch = () => {
    const trimmed = searchInput.trim();
    setSearchQuery(searchInput);
    setCurrentPage(1);
    setIsSearchFocused(false);
    if (trimmed) {
      setActiveTab('全');
      // 履歴に追加（重複排除、最新が先頭）
      setSearchHistory((prev) => {
        const next = [trimmed, ...prev.filter((q) => q !== trimmed)].slice(0, 5);
        saveSearchHistory(next);
        return next;
      });
    }
  };

  const handleUseHistoryItem = (query: string) => {
    setSearchInput(query);
    setSearchQuery(query);
    setCurrentPage(1);
    setActiveTab('全');
    setIsSearchFocused(false);
    setSearchHistory((prev) => {
      const next = [query, ...prev.filter((q) => q !== query)].slice(0, 5);
      saveSearchHistory(next);
      return next;
    });
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    saveSearchHistory([]);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
  };

  // フィルタ変更ハンドラ
  const hasActiveFilters =
    filterOccupancy !== 'in_use' ||
    filterPeriod !== '' ||
    filterAreaName.trim() !== '' ||
    filterGraveType !== undefined;

  const activeFilterCount = [
    filterOccupancy !== 'in_use' ? filterOccupancy : undefined,
    filterPeriod || undefined,
    filterAreaName.trim() || undefined,
    filterGraveType,
  ].filter((v) => v !== undefined && v !== '').length;

  const handleFilterOccupancyChange = (value: string) => {
    setFilterOccupancy(value as OccupancyFilter);
    setCurrentPage(1);
  };

  const handleFilterPeriodChange = (value: string) => {
    setFilterPeriod(value === 'all' ? '' : value);
    setCurrentPage(1);
  };

  const handleFilterAreaNameChange = (value: string) => {
    setFilterAreaName(value === 'all' ? '' : value);
    setCurrentPage(1);
  };

  const handleFilterGraveTypeChange = (value: string) => {
    setFilterGraveType(value === 'all' ? undefined : Number(value));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterOccupancy('in_use');
    setFilterPeriod('');
    setFilterAreaName('');
    setFilterGraveType(undefined);
    setCurrentPage(1);
  };

  // ページネーション表示用
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + plots.length;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  // タブのキーボードナビゲーション
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedTabIndex((index + 1) % AIUEO_TABS.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedTabIndex((index - 1 + AIUEO_TABS.length) % AIUEO_TABS.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabChange(AIUEO_TABS[index].key);
    }
  };

  // 空状態（テーブル・モバイルカードで共用）
  const emptyStateEl = (
    <EmptyState
      container="plain"
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
        </svg>
      }
      title={hasActiveFilters || searchQuery.trim() || activeTab !== '全'
        ? '該当する区画が見つかりませんでした'
        : '区画データがまだありません'}
      description={hasActiveFilters || searchQuery.trim() || activeTab !== '全'
        ? '検索語やフィルターを緩めて再検索してください。'
        : '新規区画を登録するとここに表示されます。'}
      action={(hasActiveFilters || searchQuery.trim() || activeTab !== '全') ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchInput('');
            setSearchQuery('');
            handleClearFilters();
            setActiveTab('全');
          }}
        >
          条件をクリア
        </Button>
      ) : undefined}
    />
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="台帳問い合わせ"
        subtitle="区画情報の検索・閲覧"
        theme="matsu"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
      />

      <div className="flex-1 overflow-auto p-3 md:p-6">
        <PlotSearchBar
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearch={handleSearch}
          isLoading={isLoading}
          isSearchFocused={isSearchFocused}
          onSearchFocus={() => setIsSearchFocused(true)}
          onSearchBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
          searchHistory={searchHistory}
          onUseHistoryItem={handleUseHistoryItem}
          onClearHistory={handleClearHistory}
          onNewPlot={onNewPlot}
        />

        <PlotToolbar
          isFilterExpanded={isFilterExpanded}
          onToggleFilter={() => setIsFilterExpanded((v) => !v)}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          isAiueoExpanded={isAiueoExpanded}
          onToggleAiueo={() => setIsAiueoExpanded((v) => !v)}
          activeTab={activeTab}
          onClearFilters={handleClearFilters}
          hasCustomColumnWidths={hasCustomColumnWidths}
          onResetColumnWidths={handleResetColumnWidths}
          showBuriedPersons={showBuriedPersons}
          onToggleBuriedPersons={setShowBuriedPersons}
          isDisplaySettingsOpen={isDisplaySettingsOpen}
          onToggleDisplaySettings={() => setIsDisplaySettingsOpen((v) => !v)}
          fontSize={displaySettings.fontSize}
          fontWeight={displaySettings.fontWeight}
          onFontSizeChange={handleFontSizeChange}
          onFontWeightChange={handleFontWeightChange}
        />

        {isFilterExpanded && (
          <PlotFilters
            filterOccupancy={filterOccupancy}
            onFilterOccupancyChange={handleFilterOccupancyChange}
            filterPeriod={filterPeriod}
            onFilterPeriodChange={handleFilterPeriodChange}
            filterAreaName={filterAreaName}
            onFilterAreaNameChange={handleFilterAreaNameChange}
            filterGraveType={filterGraveType}
            onFilterGraveTypeChange={handleFilterGraveTypeChange}
            graveClassifications={graveClassifications}
            showBuriedPersons={showBuriedPersons}
            onToggleBuriedPersons={setShowBuriedPersons}
          />
        )}

        {isAiueoExpanded && (
          <PlotAiueoTabs
            activeTab={activeTab}
            focusedTabIndex={focusedTabIndex}
            onTabChange={handleTabChange}
            onTabKeyDown={handleTabKeyDown}
          />
        )}

        {/* 詳細遷移の導線案内 (#163) */}
        {!isLoading && plots.length > 0 && (
          <p className="px-3 md:px-6 pt-2 text-xs text-hai flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            行をクリックすると詳細を開きます
          </p>
        )}

        <PlotCardList
          plots={plots}
          isLoading={isLoading}
          startIndex={startIndex}
          selectedPlotId={selectedPlotId}
          onPlotSelect={onPlotSelect}
          emptyState={emptyStateEl}
          searchQuery={searchQuery}
        />

        <PlotTable
          plots={plots}
          isLoading={isLoading}
          error={error}
          onRetry={fetchPlots}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSort}
          columnWidths={columnWidths}
          onColumnResizeStart={handleColumnResizeStart}
          showBuriedPersons={showBuriedPersons}
          selectedPlotId={selectedPlotId}
          onPlotSelect={onPlotSelect}
          onPlotHover={onPlotHover}
          startIndex={startIndex}
          emptyState={emptyStateEl}
          searchQuery={searchQuery}
          fontSize={displaySettings.fontSize}
          fontWeight={displaySettings.fontWeight}
        />

        <PlotPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          itemsPerPage={itemsPerPage}
          activeTab={activeTab}
          onPrev={goToPrevPage}
          onNext={goToNextPage}
          onGoToPage={goToPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>
    </div>
  );
}
