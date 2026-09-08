/**
 * 入金 (Payment) API
 *
 * バックエンド `/api/v1/payments` への CRUD クライアント。
 * billing_id は nullable（孤児入金に対応）。
 */

import {
  Payment,
  PaymentDetailResponse,
  PaymentsListResponse,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  ListPaymentsQuery,
  DeletePaymentResponse,
  SettleRemainingRequest,
} from '@komine/types';
import { apiDelete, apiGet, apiPost, apiPut } from './client';
import { ApiResponse } from './types';

const BASE = '/payments';

const queryToParams = (
  q?: ListPaymentsQuery
): Record<string, string | number | undefined> | undefined => {
  if (!q) return undefined;
  return {
    page: q.page,
    limit: q.limit,
    billingId: q.billingId,
    customerId: q.customerId,
    contractPlotId: q.contractPlotId,
    paymentDateFrom: q.paymentDateFrom,
    paymentDateTo: q.paymentDateTo,
    orphan: q.orphan === undefined ? undefined : String(q.orphan),
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
  };
};

export function getPayments(
  query?: ListPaymentsQuery
): Promise<ApiResponse<PaymentsListResponse>> {
  return apiGet<PaymentsListResponse>(BASE, queryToParams(query));
}

export function getPaymentById(id: string): Promise<ApiResponse<PaymentDetailResponse>> {
  return apiGet<PaymentDetailResponse>(`${BASE}/${id}`);
}

export function createPayment(data: CreatePaymentRequest): Promise<ApiResponse<Payment>> {
  return apiPost<Payment>(BASE, data);
}

export function updatePayment(
  id: string,
  data: UpdatePaymentRequest
): Promise<ApiResponse<Payment>> {
  return apiPut<Payment>(`${BASE}/${id}`, data);
}

export function deletePayment(id: string): Promise<ApiResponse<DeletePaymentResponse>> {
  return apiDelete<DeletePaymentResponse>(`${BASE}/${id}`);
}

/** 窓口入金: 未払い残額を今日の日付で入れる */
export function settleRemaining(
  data: SettleRemainingRequest
): Promise<ApiResponse<Payment>> {
  return apiPost<Payment>(`${BASE}/settle-remaining`, data);
}
