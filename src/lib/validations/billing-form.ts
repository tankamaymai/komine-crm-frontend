/**
 * 請求フォームの入力を、共通の1枚（@komine/types）で確かめる。
 * 画面独自のルールは持たない。
 */

import {
  BillingCategory,
  BillingRecordStatus,
  createBillingSchema,
  updateBillingSchema,
  type CreateBillingInput,
  type UpdateBillingInput,
} from '@komine/types';

export interface BillingFormDraft {
  contractPlotId: string;
  customerId: string;
  category: BillingCategory;
  amount: string;
  useStartYear: string;
  useEndYear: string;
  targetMonth: string;
  billingYears: string;
  contractDate: string;
  billingDate: string;
  applicationType: string;
  billingType: string;
  status: BillingRecordStatus;
  terminated: boolean;
  terminatedDate: string;
  notes: string;
}

export type BillingFormResult =
  | { ok: true; data: CreateBillingInput | UpdateBillingInput }
  | { ok: false; message: string };

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** 空は null。整数以外（1.5 など）はそのまま渡して、共通ルールに止めてもらう。 */
function optionalNumber(value: string): number | null | string {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) ? asNumber : trimmed;
}

function requiredAmount(value: string): number | undefined | string {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) ? asNumber : trimmed;
}

export function parseBillingForm(draft: BillingFormDraft, mode: 'create' | 'update'): BillingFormResult {
  const common = {
    category: draft.category,
    amount: requiredAmount(draft.amount),
    useStartYear: optionalNumber(draft.useStartYear),
    useEndYear: optionalNumber(draft.useEndYear),
    targetMonth: optionalNumber(draft.targetMonth),
    billingYears: optionalNumber(draft.billingYears),
    contractDate: blankToNull(draft.contractDate),
    billingDate: blankToNull(draft.billingDate),
    applicationType: optionalNumber(draft.applicationType),
    billingType: optionalNumber(draft.billingType),
    status: draft.status,
    notes: blankToNull(draft.notes),
  };

  const parsed =
    mode === 'create'
      ? createBillingSchema.safeParse({
          contractPlotId: draft.contractPlotId.trim(),
          customerId: draft.customerId.trim(),
          ...common,
        })
      : updateBillingSchema.safeParse({
          ...common,
          terminated: draft.terminated,
          terminatedDate: blankToNull(draft.terminatedDate),
        });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? '入力を確認してください' };
  }
  return { ok: true, data: parsed.data };
}
