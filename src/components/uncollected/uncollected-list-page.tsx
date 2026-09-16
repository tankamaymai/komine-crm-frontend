'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ListUncollectedBillingsQuery, UnpaidBillingItem } from '@komine/types';
import { getUncollectedBillings } from '@/lib/api/billings';
import PageHeader from '@/components/page-header';

const SEARCH_FAILED_MESSAGE = '探せませんでした。もう一度試してください';
const EMPTY_MESSAGE = '未払いの請求はありません';

function plotLabel(item: UnpaidBillingItem): string {
  return item.displayNumber ?? item.plotNumber ?? '';
}

function toQuery(qValue: string, yearValue: string, page: number): ListUncollectedBillingsQuery {
  const trimmed = qValue.trim();
  const yearTrimmed = yearValue.trim();
  const query: ListUncollectedBillingsQuery = { page };
  if (trimmed !== '') query.q = trimmed;
  if (yearTrimmed !== '') query.year = Number(yearTrimmed);
  return query;
}

export default function UncollectedListPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [yearInput, setYearInput] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<UnpaidBillingItem[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runSearch = useCallback(async (pageToLoad: number, qValue: string, yearValue: string) => {
    setMessage(null);
    setIsLoading(true);
    try {
      const res = await getUncollectedBillings(toQuery(qValue, yearValue, pageToLoad));
      if (res.success) {
        setItems(res.data.items);
        setTotalCount(res.data.pagination.totalCount);
        setTotalPages(res.data.pagination.totalPages);
        setPage(pageToLoad);
        if (res.data.items.length === 0) {
          setMessage(EMPTY_MESSAGE);
        }
      } else {
        setItems([]);
        setTotalCount(null);
        setTotalPages(0);
        setMessage(SEARCH_FAILED_MESSAGE);
      }
    } catch {
      setItems([]);
      setTotalCount(null);
      setTotalPages(0);
      setMessage(SEARCH_FAILED_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(1, '', '');
  }, [runSearch]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-shiro">
      <PageHeader
        title="未収金一覧"
        subtitle="護持費で、まだ払っていない請求を一覧する"
        theme="ai"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-3 md:mx-6 mt-4 mb-4 bg-white border border-gin rounded-elegant-lg shadow-elegant-sm p-3 md:p-4">
          <form
            className="flex flex-col md:flex-row gap-3 items-stretch md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch(1, q, yearInput);
            }}
          >
            <div className="flex-1 min-w-0">
              <label htmlFor="uncollected-q" className="block text-sm text-hai mb-1">
                名前・区画番号
              </label>
              <input
                id="uncollected-q"
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-3 py-2 border border-gin rounded-elegant text-sm text-sumi bg-white focus:outline-none focus:ring-2 focus:ring-matsu"
              />
            </div>
            <div>
              <label htmlFor="uncollected-year" className="block text-sm text-hai mb-1">
                年
              </label>
              <input
                id="uncollected-year"
                type="number"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="w-full md:w-28 px-3 py-2 border border-gin rounded-elegant text-sm text-sumi bg-white focus:outline-none focus:ring-2 focus:ring-matsu"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center bg-matsu text-white hover:bg-matsu-dark rounded-elegant px-4 py-2 shadow-elegant-sm text-sm font-medium"
            >
              探す
            </button>
          </form>
        </div>

        {message && (
          <div className="mx-3 md:mx-6 mb-4 p-4 bg-kinari border border-gin text-sumi rounded-elegant-lg text-sm">
            {message}
          </div>
        )}

        <div className="mx-3 md:mx-6 mb-6 bg-white border border-gin rounded-elegant-lg shadow-elegant-sm overflow-hidden">
          {totalCount !== null && (
            <div className="px-4 py-3 border-b border-gin text-sm text-sumi">{totalCount}件</div>
          )}
          {isLoading ? (
            <div className="p-12 text-center text-hai">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matsu mx-auto mb-4" />
              <p className="text-sm">読み込み中...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12" aria-hidden="true" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-kinari border-b border-gin">
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-semibold text-sumi">契約者</th>
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-semibold text-sumi">区画</th>
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-semibold text-sumi">年</th>
                    <th className="px-2 md:px-4 py-3 text-right text-sm font-semibold text-sumi">残額</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.billingId}
                      tabIndex={0}
                      onClick={() => router.push(`/plots/${item.contractPlotId}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(`/plots/${item.contractPlotId}`);
                        }
                      }}
                      className="border-b border-gin last:border-b-0 hover:bg-kinari cursor-pointer"
                    >
                      <td className="px-2 md:px-4 py-3 text-sm text-sumi">{item.contractorName ?? ''}</td>
                      <td className="px-2 md:px-4 py-3 text-sm text-sumi">{plotLabel(item)}</td>
                      <td className="px-2 md:px-4 py-3 text-sm text-sumi">{item.year ?? ''}</td>
                      <td className="px-2 md:px-4 py-3 text-sm text-sumi text-right">
                        {item.remainingAmount.toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gin bg-kinari">
              <p className="text-sm text-hai">
                {page} / {totalPages} ページ
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void runSearch(Math.max(1, page - 1), q, yearInput)}
                  disabled={page <= 1}
                  className="border border-gin text-sumi hover:bg-white rounded-elegant px-3 py-1 text-sm disabled:opacity-50"
                >
                  前へ
                </button>
                <button
                  type="button"
                  onClick={() => void runSearch(Math.min(totalPages, page + 1), q, yearInput)}
                  disabled={page >= totalPages}
                  className="border border-gin text-sumi hover:bg-white rounded-elegant px-3 py-1 text-sm disabled:opacity-50"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
