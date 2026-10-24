'use client';

import { useEffect, useState } from 'react';
import {
  Billing,
  BillingCategory,
  BillingRecordStatus,
  CreateBillingRequest,
  UpdateBillingRequest,
} from '@komine/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BILLING_CATEGORY_LABELS, BILLING_RECORD_STATUS_LABELS } from '@/lib/api/billings';
import { parseBillingForm, type BillingFormDraft } from '@/lib/validations/billing-form';

export interface BillingFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBillingRequest | UpdateBillingRequest) => Promise<void>;
  /** 編集対象の請求。undefined なら新規作成 */
  editing?: Billing | null;
  /** 区画詳細から開いた場合のプリセット */
  presetContractPlotId?: string;
  presetCustomerId?: string;
  isSubmitting?: boolean;
}

type FormState = BillingFormDraft;

const emptyState = (preset?: { contractPlotId?: string; customerId?: string }): FormState => ({
  contractPlotId: preset?.contractPlotId ?? '',
  customerId: preset?.customerId ?? '',
  category: BillingCategory.UsageFee,
  amount: '0',
  useStartYear: '',
  useEndYear: '',
  targetMonth: '',
  billingYears: '',
  contractDate: '',
  billingDate: '',
  applicationType: '',
  billingType: '',
  status: BillingRecordStatus.Pending,
  terminated: false,
  terminatedDate: '',
  notes: '',
});

const fromBilling = (b: Billing): FormState => ({
  contractPlotId: b.contractPlotId,
  customerId: b.customerId,
  category: b.category,
  amount: String(b.amount),
  useStartYear: b.useStartYear?.toString() ?? '',
  useEndYear: b.useEndYear?.toString() ?? '',
  targetMonth: b.targetMonth?.toString() ?? '',
  billingYears: b.billingYears?.toString() ?? '',
  contractDate: b.contractDate ?? '',
  billingDate: b.billingDate ?? '',
  applicationType: b.applicationType?.toString() ?? '',
  billingType: b.billingType?.toString() ?? '',
  status: b.status,
  terminated: b.terminated,
  terminatedDate: b.terminatedDate ?? '',
  notes: b.notes ?? '',
});

export function BillingFormDialog({
  open,
  onClose,
  onSubmit,
  editing,
  presetContractPlotId,
  presetCustomerId,
  isSubmitting = false,
}: BillingFormDialogProps) {
  const [state, setState] = useState<FormState>(() =>
    editing
      ? fromBilling(editing)
      : emptyState({ contractPlotId: presetContractPlotId, customerId: presetCustomerId })
  );
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    if (open) {
      setState(
        editing
          ? fromBilling(editing)
          : emptyState({ contractPlotId: presetContractPlotId, customerId: presetCustomerId })
      );
      setFormError('');
    }
  }, [open, editing, presetContractPlotId, presetCustomerId]);

  if (!open) return null;

  const isEdit = Boolean(editing);

  const handleSubmit = async () => {
    const parsed = parseBillingForm(state, isEdit ? 'update' : 'create');
    if (!parsed.ok) {
      setFormError(parsed.message);
      return;
    }
    setFormError('');

    try {
      await onSubmit(parsed.data);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '保存に失敗しました');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-elegant-lg shadow-elegant-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-matsu-50 to-kinari px-6 py-4 border-b border-gin">
          <h3 className="font-mincho text-lg font-semibold text-sumi">
            {isEdit ? '請求編集' : '請求登録'}
          </h3>
          <p className="text-sm text-hai mt-0.5">
            {isEdit ? '請求情報を編集します' : '新しい請求を登録します'}
          </p>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {formError && (
            <div className="mb-4 p-3 bg-beni-50 border border-beni-200 text-beni text-sm rounded-elegant">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {!isEdit && (
              <>
                <div>
                  <Label className="block mb-1.5 text-sm font-medium text-sumi">
                    契約区画 ID <span className="text-beni">*</span>
                  </Label>
                  <Input
                    value={state.contractPlotId}
                    onChange={(e) => setState({ ...state, contractPlotId: e.target.value })}
                    placeholder="UUID"
                    disabled={Boolean(presetContractPlotId)}
                    className="border-gin focus:ring-matsu focus:border-matsu font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="block mb-1.5 text-sm font-medium text-sumi">
                    顧客 ID <span className="text-beni">*</span>
                  </Label>
                  <Input
                    value={state.customerId}
                    onChange={(e) => setState({ ...state, customerId: e.target.value })}
                    placeholder="UUID"
                    disabled={Boolean(presetCustomerId)}
                    className="border-gin focus:ring-matsu focus:border-matsu font-mono text-xs"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="block mb-1.5 text-sm font-medium text-sumi">
                  料金区分 <span className="text-beni">*</span>
                </Label>
                <select
                  value={state.category}
                  onChange={(e) =>
                    setState({ ...state, category: e.target.value as BillingCategory })
                  }
                  className="w-full px-3 py-2 border border-gin rounded-elegant bg-white text-sumi focus:outline-none focus:ring-2 focus:ring-matsu"
                >
                  {(Object.values(BillingCategory) as BillingCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {BILLING_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="block mb-1.5 text-sm font-medium text-sumi">
                  金額（円） <span className="text-beni">*</span>
                </Label>
                <Input
                  type="number"
                  value={state.amount}
                  onChange={(e) => setState({ ...state, amount: e.target.value })}
                  className="border-gin focus:ring-matsu focus:border-matsu tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="block mb-1.5 text-sm font-medium text-sumi">契約日</Label>
                <Input
                  type="date"
                  value={state.contractDate}
                  onChange={(e) => setState({ ...state, contractDate: e.target.value })}
                  className="border-gin focus:ring-matsu focus:border-matsu"
                />
              </div>
              <div>
                <Label className="block mb-1.5 text-sm font-medium text-sumi">請求日</Label>
                <Input
                  type="date"
                  value={state.billingDate}
                  onChange={(e) => setState({ ...state, billingDate: e.target.value })}
                  className="border-gin focus:ring-matsu focus:border-matsu"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="block mb-1.5 text-sm font-medium text-sumi">使用開始年</Label>
                <Input
                  type="number"
                  value={state.useStartYear}
                  onChange={(e) => setState({ ...state, useStartYear: e.target.value })}
                  placeholder="2026"
                  className="border-gin focus:ring-matsu focus:border-matsu tabular-nums"
                />
              </div>
              <div>
                <Label className="block mb-1.5 text-sm font-medium text-sumi">使用終了年</Label>
                <Input
                  type="number"
                  value={state.useEndYear}
                  onChange={(e) => setState({ ...state, useEndYear: e.target.value })}
                  placeholder="2030"
                  className="border-gin focus:ring-matsu focus:border-matsu tabular-nums"
                />
              </div>
              <div>
                <Label className="block mb-1.5 text-sm font-medium text-sumi">対象月</Label>
                <Input
                  type="number"
                  value={state.targetMonth}
                  onChange={(e) => setState({ ...state, targetMonth: e.target.value })}
                  placeholder="1〜12"
                  className="border-gin focus:ring-matsu focus:border-matsu tabular-nums"
                />
              </div>
              <div>
                <Label className="block mb-1.5 text-sm font-medium text-sumi">請求年数</Label>
                <Input
                  type="number"
                  value={state.billingYears}
                  onChange={(e) => setState({ ...state, billingYears: e.target.value })}
                  placeholder="一括分"
                  className="border-gin focus:ring-matsu focus:border-matsu tabular-nums"
                />
              </div>
            </div>

            <div>
              <Label className="block mb-1.5 text-sm font-medium text-sumi">ステータス</Label>
              <select
                value={state.status}
                onChange={(e) =>
                  setState({ ...state, status: e.target.value as BillingRecordStatus })
                }
                className="w-full px-3 py-2 border border-gin rounded-elegant bg-white text-sumi focus:outline-none focus:ring-2 focus:ring-matsu"
              >
                {(Object.values(BillingRecordStatus) as BillingRecordStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {BILLING_RECORD_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {isEdit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="flex items-center gap-2">
                  <input
                    id="terminated"
                    type="checkbox"
                    checked={state.terminated}
                    onChange={(e) => setState({ ...state, terminated: e.target.checked })}
                    className="w-4 h-4 text-matsu border-gin rounded focus:ring-matsu"
                  />
                  <Label htmlFor="terminated" className="text-sm text-sumi">
                    解約済み
                  </Label>
                </div>
                <div>
                  <Label className="block mb-1.5 text-sm font-medium text-sumi">解約日</Label>
                  <Input
                    type="date"
                    value={state.terminatedDate}
                    onChange={(e) => setState({ ...state, terminatedDate: e.target.value })}
                    className="border-gin focus:ring-matsu focus:border-matsu"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="block mb-1.5 text-sm font-medium text-sumi">備考</Label>
              <textarea
                value={state.notes}
                onChange={(e) => setState({ ...state, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gin rounded-elegant bg-white text-sumi focus:outline-none focus:ring-2 focus:ring-matsu"
                placeholder="備考があれば記入"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gin bg-kinari">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="border border-gin text-sumi hover:bg-white rounded-elegant px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-matsu text-white hover:bg-matsu-dark rounded-elegant px-4 py-2 shadow-elegant-sm text-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? '保存中...' : isEdit ? '更新' : '登録'}
          </button>
        </div>
      </div>
    </div>
  );
}
