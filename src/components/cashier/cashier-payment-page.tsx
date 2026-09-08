'use client';

import { useState } from 'react';
import type { BillingCategory, ListUnpaidBillingsQuery, UnpaidBillingItem } from '@komine/types';
import { BILLING_CATEGORY_LABELS, getUnpaidBillings } from '@/lib/api/billings';
import { settleRemaining } from '@/lib/api/payments';
import { useHasPermission } from '@/hooks';
import PageHeader from '@/components/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function todayJstYear(): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date())
  );
}

const ALREADY_PAID_MESSAGE = 'すでに入金されています。もう一度探してください';
const SEARCH_FAILED_MESSAGE = '探せませんでした。もう一度試してください';
const SAVE_FAILED_MESSAGE = '保存できませんでした。もう一度試してください';

function plotLabel(item: UnpaidBillingItem): string {
  return item.displayNumber ?? item.plotNumber ?? '';
}

function confirmMessage(item: UnpaidBillingItem): string {
  const name = item.contractorName ?? '';
  const plot = plotLabel(item);
  const categoryLabel = BILLING_CATEGORY_LABELS[item.category];
  const yearPart = item.year == null ? '' : `${item.year}年の`;
  return `${name} / ${plot} / ${yearPart}${categoryLabel} / ${item.remainingAmount}円 を、今日の日付で入れますか？`;
}

export default function CashierPaymentPage() {
  const canSettle = useHasPermission(['operator', 'manager', 'admin']);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('management_fee');
  const [yearInput, setYearInput] = useState(String(todayJstYear()));
  const [items, setItems] = useState<UnpaidBillingItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<UnpaidBillingItem | null>(null);

  const handleSearch = async () => {
    const trimmed = q.trim();
    setMessage(null);
    if (trimmed === '') {
      setItems([]);
      setMessage('名前か区画番号を書いてください');
      return;
    }

    const query: ListUnpaidBillingsQuery = {
      q: trimmed,
      year: yearInput.trim() === '' ? undefined : Number(yearInput),
      category: category === '' ? undefined : (category as BillingCategory),
    };

    setIsLoading(true);
    try {
      const res = await getUnpaidBillings(query);
      if (res.success) {
        setItems(res.data.items);
        if (res.data.items.length === 0) {
          setMessage('未払いの請求はありません');
        }
      } else {
        setItems([]);
        setMessage(res.error.message || SEARCH_FAILED_MESSAGE);
      }
    } catch {
      setItems([]);
      setMessage(SEARCH_FAILED_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!selected || !canSettle) return;
    const target = selected;
    try {
      const res = await settleRemaining({ billingId: target.billingId });
      if (res.success) {
        setItems((prev) => prev.filter((item) => item.billingId !== target.billingId));
        setSelected(null);
        setMessage(null);
        return;
      }
      setMessage(res.error.message === ALREADY_PAID_MESSAGE ? ALREADY_PAID_MESSAGE : SAVE_FAILED_MESSAGE);
      setSelected(null);
    } catch {
      setMessage(SAVE_FAILED_MESSAGE);
      setSelected(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-shiro">
      <PageHeader
        title="窓口入金"
        subtitle="名前や区画番号から未払いを探して、残額をその場で入れる"
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
              void handleSearch();
            }}
          >
            <div className="flex-1 min-w-0">
              <label htmlFor="cashier-q" className="block text-sm text-hai mb-1">
                名前・区画番号
              </label>
              <input
                id="cashier-q"
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-3 py-2 border border-gin rounded-elegant text-sm text-sumi bg-white focus:outline-none focus:ring-2 focus:ring-matsu"
              />
            </div>
            <div>
              <label htmlFor="cashier-category" className="block text-sm text-hai mb-1">
                種類
              </label>
              <select
                id="cashier-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full md:w-40 px-3 py-2 border border-gin rounded-elegant text-sm text-sumi bg-white focus:outline-none focus:ring-2 focus:ring-matsu"
              >
                <option value="">全部</option>
                {(Object.entries(BILLING_CATEGORY_LABELS) as [BillingCategory, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label htmlFor="cashier-year" className="block text-sm text-hai mb-1">
                年
              </label>
              <input
                id="cashier-year"
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
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-semibold text-sumi">名前</th>
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-semibold text-sumi">故人</th>
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-semibold text-sumi">区画</th>
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-semibold text-sumi">種類</th>
                    <th className="px-2 md:px-4 py-3 text-left text-sm font-semibold text-sumi">年</th>
                    <th className="px-2 md:px-4 py-3 text-right text-sm font-semibold text-sumi">残額</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.billingId}
                      tabIndex={0}
                      onClick={() => setSelected(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelected(item);
                        }
                      }}
                      className="border-b border-gin last:border-b-0 hover:bg-kinari cursor-pointer"
                    >
                      <td className="px-2 md:px-4 py-3 text-sm text-sumi">{item.contractorName ?? ''}</td>
                      <td className="px-2 md:px-4 py-3 text-sm text-sumi">
                        {item.buriedPersonName ?? ''}
                      </td>
                      <td className="px-2 md:px-4 py-3 text-sm text-sumi">{plotLabel(item)}</td>
                      <td className="px-2 md:px-4 py-3 text-sm text-sumi">
                        {BILLING_CATEGORY_LABELS[item.category]}
                      </td>
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
        </div>
      </div>

      <ConfirmDialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="窓口入金の確認"
        description={selected ? confirmMessage(selected) : ''}
        confirmLabel="入れる"
        hideConfirm={!canSettle}
        onConfirm={() => {
          void handleSettle();
        }}
      />
    </div>
  );
}
