'use client';

/**
 * 合祀一覧コンポーネント
 * Prisma CollectiveBurialモデルに準拠
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useCollectiveBurialList,
  useCollectiveBurialStats,
} from '@/hooks/useCollectiveBurials';
import {
  CollectiveBurialListItem,
  CollectiveBurialReleaseTiming,
  getCollectiveBurialSettings,
  updateCollectiveBurialSettings,
  releaseDueCollectiveBurials,
} from '@/lib/api';
import {
  calculateElapsedYears,
  calculateScheduledCollectiveBurialDate,
  findFinalBurialDate,
  resolveCountdownBaseDate,
} from '@/lib/collective-burial-rules';
import PageHeader from '@/components/page-header';
import { LegacyAwareValue } from '@/components/legacy-aware-value';

interface CollectiveBurialListViewProps {
  onBack?: () => void;
  onSelectRecord?: (record: CollectiveBurialListItem) => void;
}

export default function CollectiveBurialListView({
  onBack,
  onSelectRecord,
}: CollectiveBurialListViewProps) {
  // フィルター状態
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [releaseTiming, setReleaseTiming] = useState<CollectiveBurialReleaseTiming>('october');
  const [releaseMessage, setReleaseMessage] = useState<string | null>(null);
  const releaseChecked = useRef(false);

  // API呼び出し
  const { items, pagination, isLoading, error, search, refresh } = useCollectiveBurialList();

  useEffect(() => {
    if (releaseChecked.current) return;
    releaseChecked.current = true;
    void (async () => {
      const setting = await getCollectiveBurialSettings();
      if (setting.success && setting.data) {
        setReleaseTiming(setting.data.releaseTiming);
      }
      const released = await releaseDueCollectiveBurials();
      if (released.success && (released.data?.released ?? 0) > 0) {
        setReleaseMessage(`${released.data?.released}件の契約を解約して、区画を空にしました。`);
        refresh();
      }
    })();
  }, [refresh]);

  const changeReleaseTiming = async (next: CollectiveBurialReleaseTiming) => {
    setReleaseTiming(next);
    const result = await updateCollectiveBurialSettings(next);
    if (result.success) {
      const label = next === 'obon' ? 'お盆（8月13日）' : '10月1日';
      setReleaseMessage(`一斉に解約する日を${label}にしました。`);
      refresh();
    }
  };
  const { data: yearlyStats } = useCollectiveBurialStats();

  // 現在年（毎レンダー取得。日付ハードコードしない）
  const currentYear = new Date().getFullYear();

  // 検索ヒット件数（全件）と、フィルタ適用中かどうか（#174 / #175 / #187）
  const totalHits = pagination?.totalCount ?? 0;
  const hasActiveFilter = searchQuery !== '' || selectedYear !== 'all';

  // 年の選択肢を生成
  const availableYears = useMemo(() => {
    if (!yearlyStats) return [];
    return yearlyStats.map(s => s.year).sort((a, b) => a - b);
  }, [yearlyStats]);

  // 検索実行
  const handleSearch = () => {
    search({
      search: searchQuery || undefined,
      year: selectedYear === 'all' ? undefined : selectedYear,
    });
  };

  // フィルターリセット
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedYear('all');
    search({});
  };

  // 年別グループ化
  const groupedByYear = useMemo(() => {
    if (selectedYear !== 'all') {
      return [{
        year: selectedYear,
        items: items,
        totalCount: items.length,
      }];
    }

    const groups = new Map<number, CollectiveBurialListItem[]>();
    items.forEach(item => {
      if (!item.billingScheduledDate) return;
      const year = new Date(item.billingScheduledDate).getFullYear();
      if (!groups.has(year)) {
        groups.set(year, []);
      }
      groups.get(year)!.push(item);
    });

    // 請求予定日がないものは別グループに
    const noDateItems = items.filter(item => !item.billingScheduledDate);
    if (noDateItems.length > 0) {
      groups.set(0, noDateItems);
    }

    return Array.from(groups.entries())
      .map(([year, groupItems]) => ({
        year,
        items: groupItems,
        totalCount: groupItems.length,
      }))
      .sort((a, b) => {
        // 今年のグループを最上部に固定
        if (a.year === currentYear) return -1;
        if (b.year === currentYear) return 1;
        return a.year - b.year;
      });
  }, [items, selectedYear, currentYear]);

  // 日付フォーマット
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="合祀管理"
        subtitle="合祀する人と、合祀する年"
        theme="cha"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
      />

      {/* スクロール領域（凡例・フィルター・メインコンテンツ全てスクロール） */}
      <div className="flex-1 overflow-auto bg-gradient-warm">
        {/* 凡例 + アクションボタン */}
        <div className="flex items-center px-3 md:px-6 py-2 md:py-3 border-b border-gin bg-kinari">
          <div className="flex-1 flex flex-wrap items-center gap-2 md:gap-3 text-sm">
            <span className="text-xs text-hai">合祀年「*」= 合祀の年がまだ決まっていないため、埋葬した日に年数を足した見込みの年です</span>
            <span className="text-xs text-hai">／ 区画番号クリックで台帳詳細へ</span>
          </div>
          <div className="flex-shrink-0 flex items-center space-x-2">
            <Button onClick={resetFilters} variant="outline" size="sm" className="h-8 text-xs">
              リセット
            </Button>
            {onBack && (
              <Button onClick={onBack} variant="outline" size="sm" className="h-8 text-xs">
                戻る
              </Button>
            )}
          </div>
        </div>

        <div className="px-3 md:px-6 py-3 border-b border-gin bg-white">
          <p className="text-sm font-medium text-sumi">一斉に解約する日</p>
          <p className="mt-1 text-xs text-hai">
            合祀の年になった人は、選んだ日を過ぎてこの画面を開くと、契約が解約されて区画が空きます。最初は10月1日です。今年より前の人は、ここでは自動では空にしません。
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={releaseTiming === 'obon' ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => void changeReleaseTiming('obon')}
            >
              お盆（8月13日）
            </Button>
            <Button
              type="button"
              size="sm"
              variant={releaseTiming === 'october' ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => void changeReleaseTiming('october')}
            >
              10月1日
            </Button>
          </div>
          {releaseMessage && <p className="mt-2 text-xs text-sumi">{releaseMessage}</p>}
        </div>

        {/* フィルターエリア */}
        <div className="bg-white border-b border-gin px-3 md:px-6 py-3 md:py-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            {/* 検索キーワード */}
            <div>
              <Label className="text-xs md:text-sm font-medium text-sumi mb-1 block">検索</Label>
              <Input
                type="text"
                placeholder="区画番号・氏名で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="h-9"
              />
            </div>

            {/* 合祀する年 */}
            <div>
              <Label className="text-xs md:text-sm font-medium text-sumi mb-1 block">合祀する年</Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(v === 'all' ? 'all' : parseInt(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての年</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={String(year)}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 検索ボタン */}
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} variant="cha" className="flex-1 h-9">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                検索
              </Button>
              <Button onClick={refresh} variant="outline" size="sm" className="h-9 hidden sm:flex">
                再読み込み
              </Button>
            </div>
          </div>

          {/* 検索結果サマリー */}
          <div className="mt-2 md:mt-4 flex items-center justify-between pt-2 md:pt-4 border-t border-gin">
            <p className="text-sm text-hai">
              検索結果: <span className="font-bold text-cha text-lg">{totalHits}</span> 件
            </p>
            <Button onClick={refresh} variant="outline" size="sm" className="sm:hidden h-8 text-xs">
              再読み込み
            </Button>
          </div>

          {/* 適用中の条件（検索語・請求状況・請求年は AND で絞り込まれる。#187） */}
          {hasActiveFilter && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-hai">適用中:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cha-50 text-cha-800 border border-cha-200 rounded-full font-medium">
                  検索「{searchQuery}」
                </span>
              )}
              {selectedYear !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cha-50 text-cha-800 border border-cha-200 rounded-full font-medium">
                  合祀する年: {selectedYear}年
                </span>
              )}
              <button
                type="button"
                onClick={resetFilters}
                className="text-cha underline underline-offset-2 hover:text-cha-700"
              >
                条件をクリア
              </button>
            </div>
          )}
        </div>

        {/* メインコンテンツ */}
        <div className="p-3 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cha"></div>
              <span className="ml-3 text-hai">読み込み中...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-red-50 rounded-elegant-lg border border-red-200">
              <p className="text-red-600">{error}</p>
              <Button onClick={refresh} variant="outline" className="mt-4">
                再試行
              </Button>
            </div>
          ) : groupedByYear.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                </svg>
              }
              title="該当する合祀データが見つかりませんでした"
              description={
                hasActiveFilter
                  ? '検索語か、合祀する年の条件を緩めて再検索してください。'
                  : 'まだ合祀者が登録されていません。台帳の区画編集→「埋葬情報」タブの「合祀対象区画」から登録できます。'
              }
              action={
                hasActiveFilter ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedYear('all');
                      search({});
                    }}
                  >
                    条件をクリア
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-8">
              {groupedByYear.map(group => {
                const isCurrentYear = group.year === currentYear;
                return (
                  <div
                    key={group.year}
                    className={`bg-white rounded-elegant-lg shadow-elegant overflow-hidden ${isCurrentYear ? 'border-2 border-matsu-300 ring-2 ring-matsu-100' : 'border border-gin'
                      }`}
                  >
                    {/* 年ヘッダー */}
                    <div
                      className={`px-3 md:px-6 py-3 md:py-4 relative overflow-hidden ${isCurrentYear ? 'bg-gradient-matsu' : 'bg-gradient-cha'
                        }`}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="relative flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isCurrentYear && (
                            <span className="bg-white/25 text-white px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                              今年
                            </span>
                          )}
                          <h3 className="font-mincho text-xl font-semibold text-white tracking-wide truncate">
                            {group.year === 0 ? '合祀の年が未設定' : `${group.year}年の合祀`}
                          </h3>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm whitespace-nowrap ${isCurrentYear ? 'bg-white text-matsu-700' : 'bg-white text-cha'
                          }`}>
                          {group.totalCount} 件
                        </span>
                      </div>
                      {group.year === 0 && (
                        <p className="relative mt-1.5 text-xs text-white/85">
                          合祀の年がまだ決まっていない人です。合祀年の「*」は、埋葬した日に年数を足した見込みです。
                        </p>
                      )}
                    </div>

                    {/* テーブル */}
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed">
                        <thead className="bg-kinari border-b border-gin">
                          <tr>
                            <th className="text-left px-2 md:px-4 py-3 text-sm font-semibold text-sumi" style={{ width: '140px' }}>契約者名</th>
                            <th className="text-left px-2 md:px-4 py-3 text-sm font-semibold text-sumi hidden sm:table-cell" style={{ width: '80px' }}>区画</th>
                            <th className="text-left px-2 md:px-4 py-3 text-sm font-semibold text-sumi" style={{ width: '100px' }}>区画番号</th>
                            <th className="text-center px-2 md:px-4 py-3 text-sm font-semibold text-sumi hidden md:table-cell" style={{ width: '80px' }}>契約年</th>
                            <th className="text-center px-2 md:px-4 py-3 text-sm font-semibold text-sumi hidden md:table-cell" style={{ width: '100px' }}>納骨日</th>
                            <th className="text-center px-2 md:px-4 py-3 text-sm font-semibold text-sumi hidden md:table-cell" style={{ width: '80px' }}>経過年数</th>
                            <th className="text-center px-2 md:px-4 py-3 text-sm font-semibold text-sumi hidden lg:table-cell" style={{ width: '80px' }}>合祀年</th>
                            <th className="text-center px-2 md:px-4 py-3 text-sm font-semibold text-sumi hidden lg:table-cell" style={{ width: '80px' }}>埋葬上限</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gin">
                          {group.items.map((record) => {
                            // 最新の納骨日を取得
                            const latestBurialDate = record.buriedPersons
                              .map(bp => bp.burialDate)
                              .filter((d): d is string => d !== null)
                              .sort()
                              .at(-1) || null;

                            // 経過年数（最新埋葬日から今日まで）
                            const elapsedYears = calculateElapsedYears(latestBurialDate);

                            // 合祀年: billingScheduledDate 優先、無ければ
                            // 「最終納骨者の埋葬日 or 契約日」+ validityPeriodYears で client-side fallback 計算。
                            // 起点は backend の resolveCountdownBaseDate と揃える（議事録 2026-07-21 §1）
                            const fallbackScheduled = calculateScheduledCollectiveBurialDate(
                              resolveCountdownBaseDate(
                                record.contractDate,
                                findFinalBurialDate(record.buriedPersons),
                              ),
                              record.validityPeriodYears,
                            );
                            const scheduledDate = record.billingScheduledDate
                              ? new Date(record.billingScheduledDate)
                              : fallbackScheduled;
                            const collectiveBurialYear = scheduledDate
                              ? scheduledDate.getFullYear()
                              : null;
                            const isFallbackScheduled = !record.billingScheduledDate && scheduledDate !== null;

                            // 契約年
                            const contractYear = record.contractDate
                              ? new Date(record.contractDate).getFullYear()
                              : null;

                            return (
                              <tr
                                key={record.id}
                                className="cursor-pointer transition-all duration-200 hover:bg-cha-50"
                                onClick={() => onSelectRecord?.(record)}
                              >
                                <td className="px-2 md:px-4 py-3">
                                  <div className="font-medium text-sumi truncate">{record.applicantName || '-'}</div>
                                  {record.applicantNameKana && (
                                    <div className="text-xs text-hai truncate">{record.applicantNameKana}</div>
                                  )}
                                </td>
                                <td className="px-2 md:px-4 py-3 text-sm text-hai hidden sm:table-cell">
                                  {record.areaName}
                                </td>
                                <td className="px-2 md:px-4 py-3">
                                  {/* 区画番号クリックで台帳詳細へ（行クリックの合祀詳細とは分離）#188 */}
                                  <Link
                                    href={`/plots/${record.contractPlotId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-semibold text-matsu hover:text-matsu-700 hover:underline underline-offset-2"
                                    title="台帳詳細を開く"
                                  >
                                    {/* displayNumber 優先・legacy-* 等は「整備中」ミュート表示 #283 */}
                                    <LegacyAwareValue value={record.displayNumber || record.plotNumber} kind="plotNumber" />
                                  </Link>
                                </td>
                                <td className="px-2 md:px-4 py-3 text-center text-sm text-sumi hidden md:table-cell">
                                  {contractYear ? `${contractYear}年` : '-'}
                                </td>
                                <td className="px-2 md:px-4 py-3 text-center text-sm text-hai hidden md:table-cell">
                                  {formatDate(latestBurialDate)}
                                </td>
                                <td className="px-2 md:px-4 py-3 text-center text-sm text-sumi hidden md:table-cell">
                                  {elapsedYears !== null ? `${elapsedYears}年` : '-'}
                                </td>
                                <td className="px-2 md:px-4 py-3 text-center text-sm text-sumi hidden lg:table-cell">
                                  {collectiveBurialYear ? (
                                    <span
                                      className={isFallbackScheduled ? 'text-hai italic' : ''}
                                      title={
                                        isFallbackScheduled
                                          ? '請求予定日が未設定のため、埋葬日＋有効年数で自動計算した見込み年（「*」）。請求予定日を設定すると確定値が優先されます。'
                                          : '請求予定日（確定値）から算出した合祀年'
                                      }
                                    >
                                      {collectiveBurialYear}年
                                      {isFallbackScheduled && (
                                        <span className="ml-0.5 text-xs">*</span>
                                      )}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-2 md:px-4 py-3 text-center text-sm text-sumi hidden lg:table-cell">
                                  {record.burialCapacity}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター統計 */}
        {yearlyStats && yearlyStats.length > 0 && (
          <div className="bg-white border-t border-gin px-3 md:px-6 py-3 md:py-4">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <span className="text-sm text-hai font-medium">年別統計（全件）:</span>
              {hasActiveFilter && (
                <span className="text-xs text-hai">※ 検索条件は未適用・全期間の合計です</span>
              )}
              {yearlyStats.slice(0, 5).map(stat => (
                <span key={stat.year} className="text-xs md:text-sm bg-kinari px-2 md:px-3 py-1 rounded-full border border-gin">
                  <span className="font-semibold text-sumi">{stat.year}年</span>
                  <span className="text-hai ml-1">{stat.count}件</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
