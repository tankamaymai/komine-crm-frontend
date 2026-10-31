'use client';

import { useState } from 'react';
import type { BillingCategory, ListUnpaidBillingsQuery, UnpaidBillingItem } from '@komine/types';
import { BILLING_CATEGORY_LABELS, getUnpaidBillings } from '@/lib/api/billings';
import { settleRemaining } from '@/lib/api/payments';
import { downloadCashierExcel } from '@/lib/billing-lists-excel';
import { useHasPermission } from '@/hooks';
import PageHeader from '@/components/page-header';

export function todayJstYear(): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date())
  );
}

export function todayJstDateString(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const ALREADY_PAID_MESSAGE = 'すでに入金されています。もう一度探してください';
const REMAINING_CHANGED_MESSAGE = '残額が変わっています。もう一度探してください';
const SEARCH_FAILED_MESSAGE = '探せませんでした。もう一度試してください';
const SAVE_FAILED_MESSAGE =
  '保存できませんでした。入金も次の日も残っていません。もう一度押してください';
const PROMISE_SAVED_MESSAGE = '次に払う日を残しました';
const NEED_AMOUNT = '今回の金額を書いてください';
const NEED_POSITIVE = '今回の金額は1円以上にしてください';
const AMOUNT_TOO_HIGH = '残っている金額までにしてください';
const NEED_NEXT = '次に払う日を書いてください';
const NEED_DATE = 'もらった日を書いてください';
const FUTURE_DATE =
  'もらった日は今日以前にしてください。これからの日は次に払う日に書いてください';

const PAGE_CLOSE_MESSAGES = new Set([
  ALREADY_PAID_MESSAGE,
  REMAINING_CHANGED_MESSAGE,
  SAVE_FAILED_MESSAGE,
]);

function plotLabel(item: UnpaidBillingItem): string {
  return item.displayNumber ?? item.plotNumber ?? '';
}

/** 空・小数・マイナスは受け取れない。0 は受け取る */
export function parseYen(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
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
  const [paymentDate, setPaymentDate] = useState(todayJstDateString());
  const [amountInput, setAmountInput] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isExcelDownloading, setIsExcelDownloading] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);

  const yen = parseYen(amountInput);
  const showPaidDate = selected !== null && yen !== null && yen >= 1;
  const showNextDate =
    selected !== null &&
    selected.category === 'management_fee' &&
    yen !== null &&
    yen < selected.remainingAmount;

  const openItem = (item: UnpaidBillingItem) => {
    setSelected(item);
    setPaymentDate(todayJstDateString());
    setAmountInput(String(item.remainingAmount));
    setNextDate('');
    setFormError(null);
  };

  const closeItem = () => {
    setSelected(null);
    setFormError(null);
  };

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
    const amount = parseYen(amountInput);
    if (amount === null) {
      setFormError(NEED_AMOUNT);
      return;
    }
    const isManagement = target.category === 'management_fee';
    if (!isManagement && amount < 1) {
      setFormError(NEED_POSITIVE);
      return;
    }
    if (amount > target.remainingAmount) {
      setFormError(AMOUNT_TOO_HIGH);
      return;
    }
    if (isManagement && amount < target.remainingAmount && nextDate === '') {
      setFormError(NEED_NEXT);
      return;
    }
    if (amount >= 1 && paymentDate === '') {
      setFormError(NEED_DATE);
      return;
    }
    if (amount >= 1 && paymentDate > todayJstDateString()) {
      setFormError(FUTURE_DATE);
      return;
    }

    try {
      const res = await settleRemaining({
        billingId: target.billingId,
        paymentAmount: amount,
        paymentDate: amount >= 1 ? paymentDate : undefined,
        nextPaymentDate:
          isManagement && amount < target.remainingAmount ? nextDate : undefined,
        seenRemaining: target.remainingAmount,
      });
      if (res.success) {
        const remaining = res.data.remainingAmount;
        setItems((prev) =>
          remaining < 1
            ? prev.filter((item) => item.billingId !== target.billingId)
            : prev.map((item) =>
                item.billingId === target.billingId ? { ...item, remainingAmount: remaining } : item
              )
        );
        setSelected(null);
        setFormError(null);
        setMessage(amount === 0 ? PROMISE_SAVED_MESSAGE : null);
        return;
      }
      const errorMessage = res.error.message || SAVE_FAILED_MESSAGE;
      if (PAGE_CLOSE_MESSAGES.has(errorMessage)) {
        setSelected(null);
        setMessage(errorMessage);
        return;
      }
      setFormError(errorMessage);
    } catch {
      setSelected(null);
      setMessage(SAVE_FAILED_MESSAGE);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-shiro">
      <PageHeader
        title="窓口入金"
        subtitle="名前や区画番号から未払いを探して、もらった日と金額を入れる"
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
            <button
              type="button"
              onClick={() => {
                setExcelError(null);
                setIsExcelDownloading(true);
                void downloadCashierExcel(items)
                  .catch(() => setExcelError('Excelの作成に失敗しました'))
                  .finally(() => setIsExcelDownloading(false));
              }}
              disabled={isExcelDownloading || items.length === 0}
              className="inline-flex items-center justify-center border border-matsu text-matsu hover:bg-matsu-50 rounded-elegant px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isExcelDownloading ? '作成中...' : 'エクセルで落とす'}
            </button>
          </form>
          {excelError && <p className="mt-3 text-sm text-beni">{excelError}</p>}
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
                      onClick={() => openItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openItem(item);
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cashier-settle-title"
            className="w-full max-w-md bg-white border border-gin rounded-elegant-lg shadow-elegant-sm p-4"
          >
            <h2 id="cashier-settle-title" className="text-base font-semibold text-sumi mb-1">
              窓口入金の確認
            </h2>
            <p className="text-sm text-hai mb-4">
              {selected.contractorName ?? ''} / {plotLabel(selected)} / 残額{' '}
              {selected.remainingAmount.toLocaleString('ja-JP')}円
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="cashier-amount" className="block text-sm text-hai mb-1">
                  今回の金額
                </label>
                <input
                  id="cashier-amount"
                  type="number"
                  min={0}
                  step={1}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gin rounded-elegant text-sm text-sumi bg-white focus:outline-none focus:ring-2 focus:ring-matsu"
                />
              </div>
              {showPaidDate && (
                <div>
                  <label htmlFor="cashier-paid-on" className="block text-sm text-hai mb-1">
                    もらった日
                  </label>
                  <input
                    id="cashier-paid-on"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gin rounded-elegant text-sm text-sumi bg-white focus:outline-none focus:ring-2 focus:ring-matsu"
                  />
                </div>
              )}
              {showNextDate && (
                <div>
                  <label htmlFor="cashier-next" className="block text-sm text-hai mb-1">
                    次に払う日
                  </label>
                  <input
                    id="cashier-next"
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gin rounded-elegant text-sm text-sumi bg-white focus:outline-none focus:ring-2 focus:ring-matsu"
                  />
                </div>
              )}
            </div>
            {formError && <p className="mt-3 text-sm text-beni">{formError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeItem}
                className="border border-gin text-sumi hover:bg-kinari rounded-elegant px-4 py-2 text-sm"
              >
                閉じる
              </button>
              {canSettle && (
                <button
                  type="button"
                  onClick={() => {
                    void handleSettle();
                  }}
                  className="bg-matsu text-white hover:bg-matsu-dark rounded-elegant px-4 py-2 text-sm font-medium"
                >
                  入れる
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
