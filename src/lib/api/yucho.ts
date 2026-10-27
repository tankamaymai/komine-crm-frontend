/**
 * ゆうちょ連携API
 *
 * バックエンドの /api/v1/yucho/billing と /api/v1/yucho/export を呼び出し、
 * 管理料の請求対象データの取得とCSV出力を提供する。
 * 合祀に料金はないため、引き落としには含めない。
 */

import { apiGet, apiPost, API_CONFIG, fetchWithTokenRefresh } from './client';
import { ApiResponse } from './types';

// ============================================================
// 型定義 (バックエンド src/validations/yuchoValidation.ts と整合)
// ============================================================

export type YuchoCategory = 'management' | 'collective' | 'all';
export type YuchoStatus = 'unbilled' | 'billed' | 'paid' | 'all';

export interface YuchoBillingInfo {
  bankName: string | null;
  branchName: string | null;
  accountType: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  /** ゆうちょ記号（5桁・"1"+店番3桁+預金種目1桁）。CSVと同じ正準ソース（backend#367） */
  yuchoSymbol: string | null;
  /** ゆうちょ番号（口座番号）。CSVと同じ正準ソース（backend#367） */
  yuchoNumber: string | null;
}

export interface YuchoBillingItem {
  category: 'management' | 'collective';
  sourceId: string;
  contractPlotId: string;
  plotNumber: string;
  displayNumber?: string | null;
  areaName: string;
  contractDate: string;
  customerId: string | null;
  customerName: string | null;
  customerNameKana: string | null;
  billingAmount: number;
  billingStatus: string;
  scheduledDate: string | null;
  billingMonth: number | null;
  billingInfo: YuchoBillingInfo | null;
  payerCode?: string | null;
  payerCode1?: string | null;
  payerCode2?: string | null;
  accountKana?: string | null;
  exportable?: boolean;
  excludeReason?: string | null;
}

export interface YuchoBillingSummary {
  /** 請求対象の総件数（口座未登録を含む） */
  totalCount: number;
  /** 請求対象の総額（口座未登録を含む） */
  totalAmount: number;
  /** 実際にCSV（振替ファイル）へ出力される件数（口座登録あり・金額>0） */
  exportableCount: number;
  /** 実際にCSVへ出力される金額の合計 */
  exportableAmount: number;
  /** 口座未登録のため振替ファイルから除外される件数（請求漏れ検知用） */
  excludedNoAccountCount: number;
  byCategory: {
    management: { count: number; amount: number };
    collective: { count: number; amount: number };
  };
}

export interface YuchoBillingResponse {
  period: { year: number; month: number | null };
  items: YuchoBillingItem[];
  summary: YuchoBillingSummary;
  exportSettings?: {
    zenginReady: boolean;
    missing: string[];
  };
}

export interface YuchoBillingParams {
  year: number;
  month?: number;
  category?: YuchoCategory;
  status?: YuchoStatus;
}

export type YuchoExportKind = 'payer_master' | 'debit' | 'zengin';

export interface YuchoExportParams extends YuchoBillingParams {
  kind: YuchoExportKind;
  transferDay?: number;
  transferMonth?: number;
}

// ============================================================
// API 呼び出し
// ============================================================

/**
 * 請求対象データ取得
 * GET /api/v1/yucho/billing
 */
export async function getYuchoBilling(
  params: YuchoBillingParams,
): Promise<ApiResponse<YuchoBillingResponse>> {
  const query: Record<string, string | number | undefined> = {
    year: params.year,
    month: params.month,
    category: params.category,
    status: params.status,
  };
  return apiGet<YuchoBillingResponse>('/yucho/billing', query);
}

/**
 * 公式ファイル出力
 * GET /api/v1/yucho/export
 *
 * apiRequest() は JSON 前提なので、CSV は直接 fetch でダウンロードする。
 * トークンリフレッシュは fetchWithTokenRefresh で共有クライアントと同じ挙動にする（#256）。
 */
export async function exportYuchoCsv(params: YuchoExportParams): Promise<Blob> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const response = await fetchWithTokenRefresh(
    `${API_CONFIG.baseUrl}/yucho/export?${searchParams.toString()}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    let message = `CSV出力に失敗しました (HTTP ${response.status})`;
    try {
      const data = await response.json();
      if (data?.error?.message) message = data.error.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.blob();
}

// ============================================================
// 引き落とし結果ファイルの取り込み
// ============================================================

/**
 * will_record: 引き落とせた。入金を付ける / already_paid: もう入金済み /
 * no_billing: その年の請求が無い / amount_mismatch: 残りより多い /
 * failed: 引き落とせなかった / unmatched: 台帳に見つからない
 */
export type YuchoResultRowStatus =
  | 'will_record'
  | 'already_paid'
  | 'no_billing'
  | 'amount_mismatch'
  | 'failed'
  | 'unmatched';

export interface YuchoResultPlanRow {
  lineNo: number;
  resultCode: string;
  resultLabel: string;
  amount: number;
  kana: string;
  status: YuchoResultRowStatus;
  contractPlotId: string | null;
  billingId: string | null;
  plotNumber: string | null;
  displayNumber: string | null;
  areaName: string | null;
  customerName: string | null;
  remainingAmount: number | null;
}

export interface YuchoResultPlan {
  year: number;
  month: number;
  transferDate: string;
  monthMismatch: boolean;
  rows: YuchoResultPlanRow[];
  summary: Record<YuchoResultRowStatus, { count: number; amount: number }>;
}

export interface YuchoResultApplyResult {
  plan: YuchoResultPlan;
  recordedCount: number;
  recordedAmount: number;
  notedFailedCount: number;
  /** 確認のあとに入金済みになっていた等で、付けなかった件数 */
  skippedCount: number;
}

export interface YuchoResultImportParams {
  year: number;
  month: number;
  fileBase64: string;
  /** 入金を付ける行の範囲（ファイル内の順番、両端を含む）。apply だけ */
  lineFrom?: number;
  lineTo?: number;
}

/** ファイルの中身を base64 にする（大きなファイルでも引数の上限を超えないよう少しずつ） */
export async function fileToBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * 結果ファイルを台帳に突き合わせて見せる（書き込まない）
 * POST /api/v1/yucho/result/preview
 */
export function previewYuchoResult(
  params: YuchoResultImportParams,
): Promise<ApiResponse<YuchoResultPlan>> {
  return apiPost<YuchoResultPlan>('/yucho/result/preview', params);
}

/**
 * 引き落とせた分に入金を付ける
 * POST /api/v1/yucho/result/apply
 */
export function applyYuchoResult(
  params: YuchoResultImportParams,
): Promise<ApiResponse<YuchoResultApplyResult>> {
  return apiPost<YuchoResultApplyResult>('/yucho/result/apply', params, 60_000);
}

/**
 * Blob をブラウザでダウンロードさせる
 */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
