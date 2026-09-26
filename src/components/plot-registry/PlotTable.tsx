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
import {
  PLOT_FONT_SIZE_PX,
  PLOT_FONT_WEIGHT_NUM,
  type PlotFontSize,
  type PlotFontWeight,
} from '@/lib/plots-display-settings';
import { formatPhoneNumber, formatDate } from '@/lib/format';
import { LegacyAwareValue } from '@/components/legacy-aware-value';
import {
  buildPlotDisplayRows,
  formatManagementFeeTerm,
  formatMoneyString,
  getOccupancyLabel,
  getRowBgColor,
  getSearchHitReason,
  isVacantPlot,
  plotPeriod,
} from './utils';
import { OCCUPANCY_BADGE_CLASS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANTS } from './constants';
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
  fontSize: PlotFontSize;
  fontWeight: PlotFontWeight;
}

const cellBorder = 'border-r border-gin/80';
const headBorder = 'border-r border-white/30';
const headClass = 'relative px-2 py-3 text-left font-bold text-white whitespace-nowrap';

function columnCount(showBuriedPersons: boolean): number {
  return showBuriedPersons ? 14 : 13;
}

function ManagementFeeCell({ plot }: { plot: PlotListItem }) {
  const term = formatManagementFeeTerm(plot.managementFeeBillingType, plot.managementFeeBillingYears);
  const amount = formatMoneyString(plot.managementFee);
  const hideAmount = !amount || amount === '-' || (Boolean(term) && amount === '0円');
  if (!term && hideAmount) {
    return <span className="text-hai">-</span>;
  }
  return (
    <div className="leading-tight">
      {term && <div>{term}</div>}
      {!hideAmount && <div className={term ? 'text-[0.9em] text-hai' : undefined}>{amount}</div>}
    </div>
  );
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
  fontSize,
  fontWeight,
}: PlotTableProps) {
  const colStyle = (key: ResizableColumnKey): CSSProperties | undefined => {
    const width = columnWidths[key];
    return typeof width === 'number' ? { width } : undefined;
  };
  const cellWrapClass = (key: ResizableColumnKey, base: string) =>
    cn(base, isColumnExpanded(columnWidths, key) ? 'whitespace-normal break-words align-top' : 'truncate');

  const tableStyle: CSSProperties = {
    fontSize: `${PLOT_FONT_SIZE_PX[fontSize]}px`,
    fontWeight: PLOT_FONT_WEIGHT_NUM[fontWeight],
  };

  return (
    <div className="hidden md:block bg-white rounded-elegant-lg border border-gin shadow-elegant overflow-hidden flex-1 min-w-0">
      <div className="overflow-auto h-full">
        <table
          data-testid="plot-table"
          className="w-full border-collapse table-fixed"
          style={tableStyle}
        >
          {/* 利用 / 期 / エリア / 区画No / 取扱 / 契約者 / 住所 / 電話 / 備考(flex) / [埋葬者] / 入金 / 管理料 / 次請求 */}
          <colgroup>
            <col className="w-[64px]" />
            <col className="w-[96px]" />
            <col className="w-[72px]" style={colStyle('areaName')} />
            <col className="w-[80px]" style={colStyle('plotNumber')} />
            <col className="w-[72px]" style={colStyle('agent')} />
            <col className="w-[110px]" style={colStyle('customerName')} />
            <col className="hidden md:table-column w-[90px]" style={colStyle('address')} />
            <col className="hidden lg:table-column w-[100px]" style={colStyle('phone')} />
            <col className="hidden md:table-column" style={colStyle('notes')} />
            {showBuriedPersons && (
              <col className="hidden lg:table-column w-[90px]" style={colStyle('buriedPersons')} />
            )}
            <col className="w-[60px]" />
            <col className="hidden sm:table-column w-[88px]" />
            <col className="hidden md:table-column w-[82px]" />
            <col className="w-[40px]" />
          </colgroup>
          <thead className="bg-gradient-matsu sticky top-0 z-10">
            <tr>
              <th className={cn(headClass, headBorder)}>
                <span>利用</span>
              </th>
              <th className={cn(headClass, headBorder)}>
                <span>期</span>
              </th>
              <th className={cn(headClass, headBorder)}>
                <span>エリア</span>
                <ColumnResizer columnKey="areaName" onResizeStart={onColumnResizeStart} />
              </th>
              <th
                className={cn(
                  headClass,
                  'cursor-pointer transition-colors duration-fast ease-elegant hover:bg-matsu-light',
                  headBorder,
                  sortKey === 'plotNumber' && 'bg-matsu-dark'
                )}
                onClick={() => onSort('plotNumber')}
              >
                <div className="flex items-center">
                  <span>区画No</span>
                  <SortIndicator columnKey="plotNumber" sortKey={sortKey} sortOrder={sortOrder} />
                </div>
                <ColumnResizer columnKey="plotNumber" onResizeStart={onColumnResizeStart} />
              </th>
              <th className={cn(headClass, headBorder)}>
                <span>取扱</span>
                <ColumnResizer columnKey="agent" onResizeStart={onColumnResizeStart} />
              </th>
              <th
                className={cn(
                  headClass,
                  'cursor-pointer transition-colors duration-fast ease-elegant hover:bg-matsu-light',
                  headBorder,
                  sortKey === 'customerName' && 'bg-matsu-dark'
                )}
                onClick={() => onSort('customerName')}
              >
                <div className="flex items-center">
                  <span>契約者</span>
                  <SortIndicator columnKey="customerName" sortKey={sortKey} sortOrder={sortOrder} />
                </div>
                <ColumnResizer columnKey="customerName" onResizeStart={onColumnResizeStart} />
              </th>
              <th className={cn(headClass, 'hidden md:table-cell', headBorder)}>
                <span>住所</span>
                <ColumnResizer columnKey="address" onResizeStart={onColumnResizeStart} />
              </th>
              <th className={cn(headClass, 'hidden lg:table-cell', headBorder)}>
                <span>電話</span>
                <ColumnResizer columnKey="phone" onResizeStart={onColumnResizeStart} />
              </th>
              <th className={cn(headClass, 'hidden md:table-cell', headBorder)}>
                <span>備考</span>
                <ColumnResizer columnKey="notes" onResizeStart={onColumnResizeStart} />
              </th>
              {showBuriedPersons && (
                <th className={cn(headClass, 'hidden lg:table-cell', headBorder)}>
                  <span>埋葬者</span>
                  <ColumnResizer columnKey="buriedPersons" onResizeStart={onColumnResizeStart} />
                </th>
              )}
              <th
                className={cn(
                  'px-2 py-3 text-center font-bold text-white whitespace-nowrap cursor-pointer transition-colors duration-fast ease-elegant',
                  'hover:bg-matsu-light',
                  headBorder,
                  sortKey === 'paymentStatus' && 'bg-matsu-dark'
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
                  'px-2 py-3 text-center font-bold text-white whitespace-nowrap cursor-pointer transition-colors duration-fast ease-elegant hidden sm:table-cell',
                  'hover:bg-matsu-light',
                  headBorder,
                  sortKey === 'managementFee' && 'bg-matsu-dark'
                )}
                onClick={() => onSort('managementFee')}
                title="旧システムの管理料区分（永代・10年など）と金額。クリックで並べ替え"
              >
                <div className="flex items-center justify-center">
                  <span>管理料</span>
                </div>
              </th>
              <th
                className={cn('px-2 py-3 text-left font-bold text-white whitespace-nowrap hidden md:table-cell', headBorder)}
                title="次回請求予定の年月（管理料の終納請求年月の翌月）。終納請求年月が未登録の区画は「-」"
              >
                <span>次請求</span>
              </th>
              <th className="px-2 py-3 text-center font-bold text-white">
                <span className="sr-only">詳細</span>
              </th>
            </tr>
          </thead>

          <tbody className="bg-white">
            {isLoading ? (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: columnCount(showBuriedPersons) }).map((_, j) => (
                      <td key={j} className={cn('px-2 py-3.5', cellBorder)}>
                        <Skeleton className="h-4 w-14" />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ) : error ? (
              <tr>
                <td colSpan={columnCount(showBuriedPersons)} className="px-4 py-12 text-center text-beni">
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
              buildPlotDisplayRows(plots, startIndex, showBuriedPersons).map((row) => {
                const { plot, buriedPersonName, buriedIndex, isPlotLead, plotAbsoluteIndex } = row;
                const paymentStatus = plot.paymentStatus as PaymentStatus;
                const hitReason = getSearchHitReason(plot, searchQuery);
                const vacant = isVacantPlot(plot);
                const occupancyLabel = getOccupancyLabel(plot);

                return (
                  <tr
                    key={`${plot.id}-${buriedIndex}`}
                    className={cn(
                      'group cursor-pointer transition-colors duration-fast ease-elegant',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-matsu',
                      vacant ? 'hover:bg-gin/80 focus-visible:bg-gin/80' : 'hover:bg-matsu-50 focus-visible:bg-matsu-50',
                      getRowBgColor(plot, plotAbsoluteIndex),
                      selectedPlotId === plot.id && 'bg-ai-50',
                      !isPlotLead && 'border-t-0'
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
                    aria-label={
                      buriedPersonName
                        ? `${plot.displayNumber || plot.plotNumber} の詳細を開く（埋葬者: ${buriedPersonName}）`
                        : `${plot.displayNumber || plot.plotNumber} の詳細を開く`
                    }
                  >
                    <td className={cn('px-2 py-3 text-center', cellBorder)}>
                      {isPlotLead && (
                        <span
                          className={cn(
                            'inline-block rounded border px-1.5 py-0.5 text-[11px] font-bold leading-tight',
                            vacant ? OCCUPANCY_BADGE_CLASS.vacant : OCCUPANCY_BADGE_CLASS.inUse
                          )}
                        >
                          {occupancyLabel}
                        </span>
                      )}
                    </td>
                    <td
                      className={cn('px-2 py-3 text-hai truncate', cellBorder)}
                      title={isPlotLead ? plotPeriod(plot) || undefined : undefined}
                    >
                      {isPlotLead ? plotPeriod(plot) || '-' : ''}
                    </td>
                    <td
                      className={cellWrapClass('areaName', cn('px-2 py-3 text-hai', cellBorder))}
                      title={isPlotLead ? plot.areaName || undefined : undefined}
                    >
                      {isPlotLead && <LegacyAwareValue value={plot.areaName} kind="areaName" />}
                    </td>
                    <td
                      className={cellWrapClass(
                        'plotNumber',
                        cn('px-2 py-3 font-mono text-matsu underline-offset-2 group-hover:underline', cellBorder)
                      )}
                      title={plot.displayNumber || plot.plotNumber}
                    >
                      {isPlotLead ? (
                        <LegacyAwareValue value={plot.displayNumber || plot.plotNumber} kind="plotNumber" />
                      ) : (
                        <span className="text-hai" aria-hidden="true">
                          ↳
                        </span>
                      )}
                    </td>
                    <td
                      className={cellWrapClass('agent', cn('px-2 py-3 text-hai', cellBorder))}
                      title={isPlotLead ? plot.agentName || undefined : undefined}
                    >
                      {isPlotLead ? plot.agentName || '-' : ''}
                    </td>
                    <td className={cn('px-2 py-3 align-top', cellBorder)}>
                      <div className={isColumnExpanded(columnWidths, 'customerName') ? '' : 'truncate'}>
                        <div
                          className={cellWrapClass('customerName', 'text-sumi')}
                          title={plot.customerName || undefined}
                        >
                          {isPlotLead ? plot.customerName || '-' : ''}
                        </div>
                        <div
                          className={cellWrapClass('customerName', 'text-[0.85em] text-hai')}
                          title={plot.customerNameKana || undefined}
                        >
                          {isPlotLead ? plot.customerNameKana || '' : ''}
                        </div>
                        {isPlotLead && hitReason && (
                          <span
                            className="mt-0.5 inline-block rounded bg-ai-50 text-ai-700 border border-ai-200 px-1 py-px text-[10px] font-medium leading-tight"
                            title={`「${searchQuery}」は契約者名以外で一致しました`}
                          >
                            {hitReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={cellWrapClass('address', cn('px-2 py-3 text-hai hidden md:table-cell', cellBorder))}
                      title={isPlotLead ? plot.customerAddress || undefined : undefined}
                    >
                      {!isPlotLead
                        ? ''
                        : isColumnExpanded(columnWidths, 'address')
                          ? (plot.customerAddress || '-')
                          : truncateAddressToCity(plot.customerAddress)}
                    </td>
                    <td
                      className={cellWrapClass(
                        'phone',
                        cn('px-2 py-3 text-hai hidden lg:table-cell tabular-nums', cellBorder)
                      )}
                      title={isPlotLead ? plot.customerPhoneNumber || undefined : undefined}
                    >
                      {isPlotLead ? formatPhoneNumber(plot.customerPhoneNumber) || '-' : ''}
                    </td>
                    <td className={cn('px-2 py-3 text-hai hidden md:table-cell align-top', cellBorder)}>
                      {isPlotLead && (
                        <div
                          className={isColumnExpanded(columnWidths, 'notes') ? 'whitespace-normal break-words' : 'line-clamp-2 break-all'}
                          title={[plot.contractNotes, plot.customerNotes].filter(Boolean).join(' / ')}
                        >
                          {[plot.contractNotes, plot.customerNotes].filter(Boolean).join(' / ') || '-'}
                        </div>
                      )}
                    </td>
                    {showBuriedPersons && (
                      <td
                        className={cellWrapClass(
                          'buriedPersons',
                          cn('px-2 py-3 text-sumi hidden lg:table-cell', cellBorder)
                        )}
                        title={buriedPersonName || undefined}
                      >
                        {buriedPersonName || '-'}
                      </td>
                    )}
                    <td className={cn('px-2 py-3 text-center', cellBorder)}>
                      {!isPlotLead ? null : paymentStatus ? (
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
                    <td className={cn('px-2 py-3 text-hai text-center hidden sm:table-cell', cellBorder)}>
                      {isPlotLead ? <ManagementFeeCell plot={plot} /> : ''}
                    </td>
                    <td
                      className={cn('px-2 py-3 text-hai truncate tabular-nums hidden md:table-cell', cellBorder)}
                      title={!isPlotLead || formatDate(plot.nextBillingDate) === '-' ? undefined : formatDate(plot.nextBillingDate)}
                    >
                      {isPlotLead ? formatDate(plot.nextBillingDate) : ''}
                    </td>
                    <td className="px-2 py-3 text-center text-hai">
                      <svg className="w-4 h-4 inline-block transition-colors group-hover:text-matsu" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columnCount(showBuriedPersons)} className="px-4 md:px-6 py-6">
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
