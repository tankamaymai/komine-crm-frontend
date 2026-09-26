'use client';

/**
 * Excel「今年度販売区画数」「年別販売区画数」と同じ項目を画面に出す。
 * 会計年度は6月はじまり（5月決算）。種類別は1月はじまりの暦年。
 */

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SalesLedgerResponse } from '@/lib/api/plot-inventory';

interface SalesLedgerViewProps {
  ledger: SalesLedgerResponse | null;
  isLoading: boolean;
  error: string | null;
  agent: string;
  onAgentChange: (agent: string) => void;
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

export default function SalesLedgerView({
  ledger,
  isLoading,
  error,
  agent,
  onAgentChange,
  onRefresh,
}: SalesLedgerViewProps) {
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
        販売数を集計中...
      </div>
    );
  }

  if (!ledger) return null;

  const nothingMatched = ledger.agentFilter && ledger.fiscalYears.every((year) => year.total === 0)
    && ledger.typeSales.every((year) => year.totalCount === 0);

  return (
    <div className="p-3 md:p-6 space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-mincho text-lg md:text-xl font-bold text-sumi">売れた区画の数</h2>
          <p className="mt-1 text-xs text-hai">
            {formatAsOf(ledger.asOfDate)}
            。月ごとの件数と、種類ごとの件数・広さです。会計の年は6月からはじまり、翌年5月で終わります。
            Excelの販売数は石の大友さんの分だけでしたが、今の契約データには取扱の名前が入っていないので、最初は全体の数を出します。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-hai">
            取扱
            <input
              value={agent}
              onChange={(event) => onAgentChange(event.target.value)}
              placeholder="大友"
              aria-label="取扱の名前で絞る"
              className="h-8 w-28 rounded-elegant border border-gin bg-white px-2 text-sm text-sumi"
            />
          </label>
          <button
            type="button"
            onClick={() => onAgentChange(agent.trim() ? '' : '大友')}
            className="rounded-elegant border border-gin bg-white px-3 py-1.5 text-sm text-hai hover:text-sumi cursor-pointer"
          >
            {agent.trim() ? 'すべての取扱' : '大友だけ'}
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-elegant border border-gin bg-white px-3 py-1.5 text-sm text-hai transition-colors hover:text-sumi disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} aria-hidden="true" />
            更新
          </button>
        </div>
      </div>

      {nothingMatched && (
        <p className="rounded-elegant border border-kohaku-200 bg-kohaku-50 p-3 text-sm text-sumi">
          取扱の名前に「{ledger.agentFilter}」が入っている契約がありません。
          {ledger.agentNames.length > 0
            ? ` データにある取扱は ${ledger.agentNames.join('、')} です。`
            : ' 取扱の名前が入っている契約もありません。「すべての取扱」にすると全体の数が見えます。'}
        </p>
      )}

      <section>
        <h3 className="mb-2 font-mincho text-base font-bold text-sumi">月ごとに売れた数</h3>
        <p className="mb-3 text-xs text-hai">
          「売れた数」はその月の件数、「そこまで」は6月からの合計です。今年と去年を並べています。
        </p>
        <div className="overflow-x-auto">
          <div className="flex items-start gap-4">
            {ledger.fiscalYears.map((year) => (
              <table key={year.fiscalYear} className="shrink-0 border-collapse text-sm">
                <thead>
                  <tr>
                    <th colSpan={3} className={cn(CELL, 'bg-kinari py-1.5 text-center font-bold text-sumi')}>
                      {year.fiscalYear}年度（{year.fiscalYear}年6月〜{year.fiscalYear + 1}年5月）
                    </th>
                  </tr>
                  <tr>
                    <th className={cn(CELL, 'bg-kinari/60 font-semibold text-hai')}>月</th>
                    <th className={cn(CELL, 'bg-kinari/60 font-semibold text-hai')}>売れた数</th>
                    <th className={cn(CELL, 'bg-kinari/60 font-semibold text-hai')}>そこまで</th>
                  </tr>
                </thead>
                <tbody>
                  {year.months.map((month) => (
                    <tr key={month.month}>
                      <td className={cn(CELL, 'text-center text-sumi')}>{month.month}月</td>
                      <td className={cn(CELL, 'text-right tabular-nums text-sumi')}>{month.count}</td>
                      <td className={cn(CELL, 'text-right tabular-nums text-sumi')}>{month.cumulative}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className={cn(CELL, 'text-center text-sumi')}>合計</td>
                    <td className={cn(CELL, 'text-right tabular-nums text-sumi')}>{year.total}</td>
                    <td className={cn(CELL, 'bg-[#9DB2BF]/40 text-right tabular-nums text-sumi')}>{year.total}</td>
                  </tr>
                </tbody>
              </table>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-mincho text-base font-bold text-sumi">種類ごとに売れた数</h3>
        <p className="mb-3 text-xs text-hai">
          樹林・想・るり庵のように、区画の種類ごとの件数と広さです。こちらは1月からはじまる年です。
        </p>
        <div className="overflow-x-auto">
          <div className="flex items-start gap-4">
            {ledger.typeSales.map((year) => (
              <table key={year.year} className="shrink-0 border-collapse text-sm">
                <thead>
                  <tr>
                    <th colSpan={4} className={cn(CELL, 'bg-kinari py-1.5 text-center font-bold text-sumi')}>
                      {year.year}年　合計 {year.totalCount}件 / {formatSqm(year.totalAreaSqm)}
                    </th>
                  </tr>
                  <tr>
                    <th className={cn(CELL, 'bg-kinari/60 font-semibold text-hai')}>月</th>
                    <th className={cn(CELL, 'bg-kinari/60 font-semibold text-hai')}>区画</th>
                    <th className={cn(CELL, 'bg-kinari/60 font-semibold text-hai')}>数量</th>
                    <th className={cn(CELL, 'bg-kinari/60 font-semibold text-hai')}>広さ</th>
                  </tr>
                </thead>
                <tbody>
                  {year.months.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={cn(CELL, 'text-center text-hai')}>
                        この年の販売はありません
                      </td>
                    </tr>
                  ) : (
                    year.months.map((month) =>
                      month.rows.map((row, index) => (
                        <tr key={`${year.year}-${month.month}-${row.areaName}`}>
                          <td className={cn(CELL, 'text-center text-sumi')}>
                            {index === 0 ? `${month.month}月` : ''}
                          </td>
                          <td className={cn(CELL, 'text-sumi whitespace-nowrap')}>{row.areaName}</td>
                          <td className={cn(CELL, 'text-right tabular-nums text-sumi')}>{row.count}</td>
                          <td className={cn(CELL, 'text-right tabular-nums text-sumi')}>{formatSqm(row.areaSqm)}</td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
