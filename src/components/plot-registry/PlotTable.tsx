import type { CSSProperties, ReactNode } from 'react';
import { PlotListItem, PaymentStatus } from '@komine/types';
import { cn, truncateAddressToCity } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  isColumnExpanded,
  type ColumnWidths,
  type ResizableColumnKey,
} from '@/lib/plots-column-widths';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANTS } from './constants';
import { formatPhoneNumber, formatDate } from '@/lib/format';
import { LegacyAwareValue } from '@/components/legacy-aware-value';
import { formatContractDate, formatMoneyString, getRowBgColor, getSearchHitReason } from './utils';
import { ColumnResizer } from './ColumnResizer';
import { SortIndicator } from './SortIndicator';
import type { SortKey, SortOrder } from './types';

interface PlotTableProps {
  plots: PlotListItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  sortKey: SortKey;
  sortOrder: SortOrder;
  onSort: (key: SortKey) => void;
  columnWidths: ColumnWidths;
  onColumnResizeStart: (key: ResizableColumnKey, startX: number, startWidth: number) => void;
  showBuriedPersons: boolean;
  selectedPlotId?: string;
  onPlotSelect: (plot: PlotListItem) => void;
  onPlotHover?: (plot: PlotListItem) => void;
  startIndex: number;
  emptyState: ReactNode;
  /** 検索語。氏名以外でヒットした行にヒット理由バッジを出すために使用（#162） */
  searchQuery?: string;
}

/** 区画一覧テーブル（タブレット・PC: md 以上）。 */
export function PlotTable({
  plots,
  isLoading,
  error,
  onRetry,
  sortKey,
  sortOrder,
  onSort,
  columnWidths,
  onColumnResizeStart,
  showBuriedPersons,
  selectedPlotId,
  onPlotSelect,
  onPlotHover,
  startIndex,
  emptyState,
  searchQuery,
}: PlotTableProps) {
  // <col> へ適用する幅。未設定列は Tailwind の既定幅クラスにフォールバック。
  const colStyle = (key: ResizableColumnKey): CSSProperties | undefined => {
    const width = columnWidths[key];
    return typeof width === 'number' ? { width } : undefined;
  };
  // 展開（全文表示）中の列向けセルクラス。狭い列は truncate を維持。
  const cellWrapClass = (key: ResizableColumnKey, base: string) =>
    cn(base, isColumnExpanded(columnWidths, key) ? 'whitespace-normal break-words align-top' : 'truncate');

  return (
    <div className="hidden md:block bg-white rounded-elegant-lg border border-gin shadow-elegant overflow-hidden flex-1 min-w-0">
      <div className="overflow-auto h-full">
        <table className="w-full divide-y divide-gin text-sm table-fixed">
          {/* エリア / 区画No / 契約者 / 住所 / 電話 / 取扱 / 許可番号 / 備考(flex) / [埋葬者] / 契約日 / 入金 / 管理料 / 次請求 */}
          <colgroup>
            <col className="w-[52px]" style={colStyle('areaName')} />
            <col className="w-[68px]" style={colStyle('plotNumber')} />
            <col className="w-[110px]" style={colStyle('customerName')} />
            <col className="hidden md:table-column w-[90px]" style={colStyle('address')} />
            <col className="hidden lg:table-column w-[100px]" style={colStyle('phone')} />
            <col className="hidden lg:table-column w-[72px]" style={colStyle('agent')} />
            <col className="hidden lg:table-column w-[96px]" style={colStyle('permitNumber')} />
            <col className="hidden md:table-column" style={colStyle('notes')} />
            {showBuriedPersons && (
              <col className="hidden lg:table-column w-[90px]" style={colStyle('buriedPersons')} />
            )}
            <col className="hidden sm:table-column w-[64px]" />
            <col className="w-[60px]" />
            <col className="hidden sm:table-column w-[72px]" />
            <col className="hidden md:table-column w-[82px]" />
            <col className="w-[40px]" />
          </colgroup>
          <thead className="bg-gradient-matsu sticky top-0 z-10">
            <tr>
              {/* エリア（区）を先頭に。区画Noと合わせて「2区-12番」の順で読める（システム確認 項目①） */}
              {/* エリア/電話はサーバーソート未対応のためソート不可の見出しにする（#224） */}
              <th className="relative px-2 py-2 text-left text-xs font-bold text-white">
                <span>エリア</span>
                <ColumnResizer columnKey="areaName" onResizeStart={onColumnResizeStart} />
              </th>
              <th
                className={cn(
                  "relative px-2 py-2 text-left text-xs font-bold text-white cursor-pointer transition-all duration-200",
                  "hover:bg-matsu-light",
                  sortKey === 'plotNumber' && "bg-matsu-dark"
                )}
                onClick={() => onSort('plotNumber')}
              >
                <div className="flex items-center">
                  <span>区画No</span>
                  <SortIndicator columnKey="plotNumber" sortKey={sortKey} sortOrder={sortOrder} />
                </div>
                <ColumnResizer columnKey="plotNumber" onResizeStart={onColumnResizeStart} />
              </th>
              <th
                className={cn(
                  "relative px-2 py-2 text-left text-xs font-bold text-white cursor-pointer transition-all duration-200",
                  "hover:bg-matsu-light",
                  sortKey === 'customerName' && "bg-matsu-dark"
                )}
                onClick={() => onSort('customerName')}
              >
                <div className="flex items-center">
                  <span>契約者</span>
                  <SortIndicator columnKey="customerName" sortKey={sortKey} sortOrder={sortOrder} />
                </div>
                <ColumnResizer columnKey="customerName" onResizeStart={onColumnResizeStart} />
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-bold text-white hidden md:table-cell">
                <span>住所</span>
                <ColumnResizer columnKey="address" onResizeStart={onColumnResizeStart} />
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-bold text-white hidden lg:table-cell">
                <span>電話</span>
                <ColumnResizer columnKey="phone" onResizeStart={onColumnResizeStart} />
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-bold text-white hidden lg:table-cell">
                <span>取扱</span>
                <ColumnResizer columnKey="agent" onResizeStart={onColumnResizeStart} />
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-bold text-white hidden lg:table-cell">
                <span>許可番号</span>
                <ColumnResizer columnKey="permitNumber" onResizeStart={onColumnResizeStart} />
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-bold text-white hidden md:table-cell">
                <span>備考</span>
                <ColumnResizer columnKey="notes" onResizeStart={onColumnResizeStart} />
              </th>
              {showBuriedPersons && (
                <th className="relative px-2 py-2 text-left text-xs font-bold text-white hidden lg:table-cell">
                  <span>埋葬者</span>
                  <ColumnResizer columnKey="buriedPersons" onResizeStart={onColumnResizeStart} />
                </th>
              )}
              <th
                className={cn(
                  "px-2 py-2 text-center text-xs font-bold text-white cursor-pointer transition-all duration-200 hidden sm:table-cell",
                  "hover:bg-matsu-light",
                  sortKey === 'contractDate' && "bg-matsu-dark"
                )}
                onClick={() => onSort('contractDate')}
              >
                <div className="flex items-center justify-center">
                  <span>契約日</span>
                </div>
              </th>
              {/* 入金/管理料/次請求の意味をツールチップで説明（システム確認 項目③） */}
              <th
                className={cn(
                  "px-2 py-2 text-center text-xs font-bold text-white cursor-pointer transition-all duration-200",
                  "hover:bg-matsu-light",
                  sortKey === 'paymentStatus' && "bg-matsu-dark"
                )}
                onClick={() => onSort('paymentStatus')}
                title="使用料・管理料の入金状況（入金済・未入金・一部入金・滞納）。未入金は黄色、滞納は赤色の行で表示されます。クリックで並べ替え"
              >
                <div className="flex items-center justify-center">
                  <span>入金</span>
                </div>
              </th>
              <th
                className={cn(
                  "px-2 py-2 text-center text-xs font-bold text-white cursor-pointer transition-all duration-200 hidden sm:table-cell",
                  "hover:bg-matsu-light",
                  sortKey === 'managementFee' && "bg-matsu-dark"
                )}
                onClick={() => onSort('managementFee')}
                title="登録されている管理料の金額。クリックで並べ替え"
              >
                <div className="flex items-center justify-center">
                  <span>管理料</span>
                </div>
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-bold text-white hidden md:table-cell"
                title="次回請求予定の年月（管理料の終納請求年月の翌月）。終納請求年月が未登録の区画は「-」"
              >
                <span>次請求</span>
              </th>
              {/* 詳細遷移アフォーダンス列 (#163) */}
              <th className="px-2 py-2 text-center text-xs font-bold text-white">
                <span className="sr-only">詳細</span>
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gin">
            {isLoading ? (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-14" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-10" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-14" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-full" /></td>
                    {showBuriedPersons && <td className="px-2 py-2.5"><Skeleton className="h-4 w-16" /></td>}
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-14" /></td>
                    <td className="px-2 py-2.5"><Skeleton className="h-4 w-12" /></td>
                  </tr>
                ))}
              </>
            ) : error ? (
              <tr>
                <td colSpan={showBuriedPersons ? 14 : 13} className="px-4 py-12 text-center text-beni">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-beni mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-base font-medium">{error}</p>
                    <button
                      onClick={onRetry}
                      className="mt-2 text-sm text-matsu underline hover:no-underline"
                    >
                      再読み込み
                    </button>
                  </div>
                </td>
              </tr>
            ) : plots.length > 0 ? (
              plots.map((plot, index) => {
                const absoluteIndex = startIndex + index;
                const paymentStatus = plot.paymentStatus as PaymentStatus;
                const hitReason = getSearchHitReason(plot, searchQuery);

                return (
                  <tr
                    key={plot.id}
                    className={cn(
                      'group cursor-pointer transition-all duration-200',
                      'hover:bg-matsu-50 focus-visible:outline-none focus-visible:bg-matsu-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-matsu',
                      // 選択行は藍(ai)の左ボーダーで強調し、緑のホバーと区別 (#190)
                      selectedPlotId === plot.id && 'bg-ai-50 border-l-4 border-ai',
                      getRowBgColor(plot, absoluteIndex)
                    )}
                    onClick={() => onPlotSelect(plot)}
                    onMouseEnter={() => onPlotHover?.(plot)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onPlotSelect(plot);
                      }
                    }}
                    aria-label={`${plot.displayNumber || plot.plotNumber} の詳細を開く`}
                  >
                    {/* エリア（区画名）。legacy-* / "1-29" 等の未正規化値は「整備中」ミュート表示にする #166 */}
                    <td className={cellWrapClass('areaName', 'px-2 py-2 text-xs text-hai')} title={plot.areaName || undefined}>
                      <LegacyAwareValue value={plot.areaName} kind="areaName" />
                    </td>
                    {/* 表示用区画番号（grave_name_cd 由来）を優先。未設定時は plotNumber に
                        フォールバックし、legacy-* 等の未正規化値は「整備中」ミュート表示にする #158/#164 */}
                    <td className={cellWrapClass('plotNumber', 'px-2 py-2 font-mono text-matsu font-medium text-xs underline-offset-2 group-hover:underline')} title={plot.displayNumber || plot.plotNumber}>
                      <LegacyAwareValue value={plot.displayNumber || plot.plotNumber} kind="plotNumber" />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className={isColumnExpanded(columnWidths, 'customerName') ? '' : 'truncate'}>
                        <div className={cellWrapClass('customerName', 'font-medium text-sumi text-sm')} title={plot.customerName || undefined}>
                          {plot.customerName || '-'}
                        </div>
                        <div className={cellWrapClass('customerName', 'text-xs text-hai')} title={plot.customerNameKana || undefined}>
                          {plot.customerNameKana || ''}
                        </div>
                        {hitReason && (
                          <span
                            className="mt-0.5 inline-block rounded bg-ai-50 text-ai-700 border border-ai-200 px-1 py-px text-[10px] font-medium leading-tight"
                            title={`「${searchQuery}」は契約者名以外で一致しました`}
                          >
                            {hitReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={cellWrapClass('address', 'px-2 py-2 text-xs text-hai hidden md:table-cell')} title={plot.customerAddress || undefined}>
                      {isColumnExpanded(columnWidths, 'address')
                        ? (plot.customerAddress || '-')
                        : truncateAddressToCity(plot.customerAddress)}
                    </td>
                    <td className={cellWrapClass('phone', 'px-2 py-2 text-xs text-hai hidden lg:table-cell tabular-nums')} title={plot.customerPhoneNumber || undefined}>
                      {formatPhoneNumber(plot.customerPhoneNumber) || '-'}
                    </td>
                    <td className={cellWrapClass('agent', 'px-2 py-2 text-xs text-hai hidden lg:table-cell')} title={plot.agentName || undefined}>
                      {plot.agentName || '-'}
                    </td>
                    <td className={cellWrapClass('permitNumber', 'px-2 py-2 text-xs text-hai tabular-nums hidden lg:table-cell')} title={plot.permitNumber || undefined}>
                      {plot.permitNumber || '-'}
                    </td>
                    <td className="px-2 py-2 text-xs text-hai hidden md:table-cell align-top">
                      <div
                        className={isColumnExpanded(columnWidths, 'notes') ? 'whitespace-normal break-words' : 'line-clamp-2 break-all'}
                        title={[plot.contractNotes, plot.customerNotes].filter(Boolean).join(' / ')}
                      >
                        {[plot.contractNotes, plot.customerNotes].filter(Boolean).join(' / ') || '-'}
                      </div>
                    </td>
                    {showBuriedPersons && (
                      <td className={cellWrapClass('buriedPersons', 'px-2 py-2 text-xs text-hai hidden lg:table-cell')} title={plot.buriedPersonNames?.join(', ') || undefined}>
                        {plot.buriedPersonNames && plot.buriedPersonNames.length > 0 ? plot.buriedPersonNames.join(', ') : '-'}
                      </td>
                    )}
                    <td className="px-2 py-2 text-xs text-hai text-center hidden sm:table-cell">
                      {formatContractDate(plot.contractDate)}
                    </td>
                    <td className="px-2 py-2 text-xs text-center">
                      {paymentStatus ? (
                        <StatusBadge
                          variant={PAYMENT_STATUS_VARIANTS[paymentStatus]}
                          size="sm"
                          withSymbol
                        >
                          {PAYMENT_STATUS_LABELS[paymentStatus]}
                        </StatusBadge>
                      ) : (
                        <span className="text-hai">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-hai text-center hidden sm:table-cell">
                      {formatMoneyString(plot.managementFee)}
                    </td>
                    <td className="px-2 py-2 text-xs text-hai truncate tabular-nums hidden md:table-cell" title={formatDate(plot.nextBillingDate) === '-' ? undefined : formatDate(plot.nextBillingDate)}>
                      {formatDate(plot.nextBillingDate)}
                    </td>
                    {/* 詳細を開くシェブロン (#163)。行全体クリックでも遷移する */}
                    <td className="px-2 py-2 text-center text-hai">
                      <svg className="w-4 h-4 inline-block transition-colors group-hover:text-matsu" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={showBuriedPersons ? 14 : 13} className="px-4 md:px-6 py-6">
                  {emptyState}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
