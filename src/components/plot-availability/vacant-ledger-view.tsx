'use client';

/**
 * Excel「空き区画一覧」と同じ項目を画面に出す。
 * 期ごとに、区画の番号と、いま空いている広さ（㎡）。
 */

import { Fragment } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VacantLedgerResponse } from '@/lib/api/plot-inventory';

interface VacantLedgerViewProps {
  ledger: VacantLedgerResponse | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function formatSqm(value: number): string {
  return `${Number(value.toFixed(3))}㎡`;
}

function formatAsOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日時点`;
}

const CELL = 'border border-sumi/30 px-2 py-1';

export default function VacantLedgerView({
  ledger,
  isLoading,
  error,
  onRefresh,
}: VacantLedgerViewProps) {
  if (error) {
    return (
      <div className="p-3 md:p-6">
        <div className="rounded-elegant border border-beni-200 bg-beni-50 p-4 text-sm text-beni-dark">
          {error}
          <button onClick={onRefresh} className="ml-3 underline hover:no-underline">
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !ledger) {
    return (
      <div className="p-3 md:p-6 text-sm text-hai">
        <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
        空き区画を集計中...
      </div>
    );
  }

  if (!ledger) return null;

  return (
    <div className="p-3 md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-mincho text-lg md:text-xl font-bold text-sumi">空き区画の番号</h2>
          <p className="mt-1 text-sm text-sumi">
            {formatAsOf(ledger.asOfDate)}　空き{' '}
            <span className="font-bold tabular-nums">{ledger.total.toLocaleString()}</span> 件
          </p>
          <p className="mt-1 text-xs text-hai">
            Excelの「空き区画一覧」と同じ見方です。左が区画の番号、右がいま空いている広さです。一部だけ売れている区画は、残りの広さだけ出ます。
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-elegant border border-gin bg-white px-3 py-1.5 text-sm text-hai transition-colors hover:text-sumi disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} aria-hidden="true" />
          更新
        </button>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-4">
          {ledger.groups.map((group) => (
            <div key={group.period} className="shrink-0">
              <table className="border-collapse text-sm">
                <thead>
                  <tr>
                    <th
                      colSpan={2}
                      className={cn(CELL, 'bg-kinari py-1.5 text-center font-bold text-sumi whitespace-nowrap')}
                    >
                      {group.period}
                      <span className="ml-2 font-medium text-hai tabular-nums">空き {group.count}</span>
                    </th>
                  </tr>
                  <tr>
                    <th className={cn(CELL, 'bg-kinari/60 font-semibold text-hai w-[8rem]')}>区画番号</th>
                    <th className={cn(CELL, 'bg-kinari/60 font-semibold text-hai w-[5rem]')}>広さ</th>
                  </tr>
                </thead>
                <tbody>
                  {group.count === 0 ? (
                    <tr>
                      <td colSpan={2} className={cn(CELL, 'text-center text-hai')}>
                        空きなし
                      </td>
                    </tr>
                  ) : (
                    group.areas.map((area) => (
                      <Fragment key={`${group.period}-${area.areaName}`}>
                        <tr>
                          <td colSpan={2} className={cn(CELL, 'bg-kinari/40 text-xs font-semibold text-sumi')}>
                            {area.areaName}
                          </td>
                        </tr>
                        {area.plots.map((plot) => (
                          <tr key={plot.id}>
                            <td className={cn(CELL, 'text-sumi whitespace-nowrap')}>{plot.label}</td>
                            <td className={cn(CELL, 'text-right tabular-nums text-sumi')}>
                              {formatSqm(plot.areaSqm)}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
