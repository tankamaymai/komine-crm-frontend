/**
 * 合祀管理API
 */

import { apiRequest, shouldUseMockData } from './client';
import { ApiResponse, PaginationInfo } from './types';

// ============================================================
// 型定義
// ============================================================

/** 請求ステータス */
export type BillingStatus = 'pending' | 'billed' | 'paid';

/** 埋葬者（簡易版） */
export interface BuriedPersonSummary {
  id: string;
  name: string;
  burialDate: string | null;
  /** 最終納骨者。true の人の burialDate が合祀カウントダウンの起点になる（議事録 2026-07-21 §1） */
  isFinalBurial: boolean;
}

/** 埋葬者（詳細版） */
export interface BuriedPersonDetail {
  id: string;
  name: string;
  nameKana: string | null;
  relationship: string | null;
  deathDate: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'not_answered' | null;
  burialDate: string | null;
  /** 最終納骨者。true の人の burialDate が合祀カウントダウンの起点になる（議事録 2026-07-21 §1） */
  isFinalBurial: boolean;
  notes: string | null;
}

/** 申込者情報 */
export interface ApplicantInfo {
  id: string;
  name: string;
  nameKana: string;
  phone: string;
  email: string | null;
  postalCode: string;
  address: string;
}

/** 合祀一覧アイテム */
export interface CollectiveBurialListItem {
  id: string;
  contractPlotId: string;
  plotNumber: string;
  displayNumber?: string | null;
  areaName: string;
  contractDate: string;
  applicantName: string | null;
  applicantNameKana: string | null;
  burialCapacity: number;
  currentBurialCount: number;
  capacityReachedDate: string | null;
  validityPeriodYears: number;
  billingScheduledDate: string | null;
  billingStatus: BillingStatus;
  billingAmount: number | null;
  notes: string | null;
  buriedPersons: BuriedPersonSummary[];
  createdAt: string;
  updatedAt: string;
}

/** 合祀詳細 */
export interface CollectiveBurialDetail extends Omit<CollectiveBurialListItem, 'buriedPersons'> {
  contractDate: string;
  applicant: ApplicantInfo | null;
  buriedPersons: BuriedPersonDetail[];
}

/** 合祀一覧レスポンス */
export interface CollectiveBurialListResponse {
  items: CollectiveBurialListItem[];
  pagination: PaginationInfo;
}

/** 合祀作成リクエスト */
export interface CreateCollectiveBurialRequest {
  contractPlotId: string;
  burialCapacity: number;
  validityPeriodYears: number;
  billingAmount?: number;
  notes?: string;
}

/** 合祀更新リクエスト */
export interface UpdateCollectiveBurialRequest {
  burialCapacity?: number;
  validityPeriodYears?: number;
  capacityReachedDate?: string | null;
  billingScheduledDate?: string | null;
  billingStatus?: BillingStatus;
  billingAmount?: number | null;
  notes?: string | null;
}

/** 請求ステータス更新リクエスト */
export interface UpdateBillingStatusRequest {
  billingStatus: BillingStatus;
  billingAmount?: number;
}

/** 埋葬人数同期レスポンス */
export interface SyncBurialCountResponse {
  id: string;
  currentBurialCount: number;
  burialCapacity: number;
  capacityReached: boolean;
  capacityReachedDate: string | null;
  billingScheduledDate: string | null;
}

/** 年別統計 */
export interface YearlyStats {
  year: number;
  count: number;
  pendingCount: number;
  billedCount: number;
  paidCount: number;
  /** その年の請求総額（円）。サーバ全件集計（#226） */
  totalAmount?: number;
  /** うち billing_status='paid' の入金済額（円）。サーバ全件集計（#226） */
  paidAmount?: number;
}

/** 検索パラメータ */
export interface CollectiveBurialSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  billingStatus?: BillingStatus;
  year?: number;
  sortBy?: 'billing_scheduled_date' | 'current_burial_count' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// モックデータ
// ============================================================

// 台帳（plots.ts の mockPlots）と同一区画・同一契約者を指すよう整合させる（#176）。
// contractPlotId は mockPlots の id と一致させ、合祀一覧 → 台帳詳細への遷移が解決し、
// plotNumber / 契約者名が両画面で一致するようにする。
const mockCollectiveBurials: CollectiveBurialListItem[] = [
  {
    id: 'cb-001',
    contractPlotId: 'mock-plot-1', // 台帳: A-001 / 田中太郎
    plotNumber: 'A-001',
    areaName: '第1期',
    contractDate: '2020-04-01',
    applicantName: '田中太郎',
    applicantNameKana: 'タナカタロウ',
    burialCapacity: 10,
    currentBurialCount: 3,
    capacityReachedDate: null,
    validityPeriodYears: 33,
    billingScheduledDate: '2053-04-01',
    billingStatus: 'pending',
    billingAmount: 300000,
    notes: null,
    buriedPersons: [
      { id: 'bp-001', name: '田中一郎', burialDate: '2020-05-10', isFinalBurial: false },
      { id: 'bp-002', name: '田中梅', burialDate: '2022-08-20', isFinalBurial: true },
    ],
    createdAt: '2020-04-01T09:00:00Z',
    updatedAt: '2024-06-20T14:30:00Z',
  },
  {
    id: 'cb-002',
    contractPlotId: 'mock-plot-2', // 台帳: B-015 / 鈴木花子
    plotNumber: 'B-015',
    areaName: '第2期',
    contractDate: '2022-08-15',
    applicantName: '鈴木花子',
    applicantNameKana: 'スズキハナコ',
    burialCapacity: 8,
    currentBurialCount: 8,
    capacityReachedDate: '2024-02-20',
    validityPeriodYears: 13,
    billingScheduledDate: '2037-02-20',
    billingStatus: 'billed',
    billingAmount: 250000,
    notes: '上限到達済み',
    buriedPersons: [
      { id: 'bp-003', name: '鈴木次郎', burialDate: '2022-09-10', isFinalBurial: false },
      { id: 'bp-004', name: '鈴木美智子', burialDate: '2024-02-20', isFinalBurial: false },
    ],
    createdAt: '2022-08-15T10:00:00Z',
    updatedAt: '2024-02-20T16:00:00Z',
  },
];

const mockYearlyStats: YearlyStats[] = [
  { year: 2027, count: 5, pendingCount: 2, billedCount: 2, paidCount: 1, totalAmount: 250000, paidAmount: 50000 },
  { year: 2029, count: 8, pendingCount: 6, billedCount: 1, paidCount: 1, totalAmount: 400000, paidAmount: 50000 },
  { year: 2034, count: 12, pendingCount: 10, billedCount: 2, paidCount: 0, totalAmount: 600000, paidAmount: 0 },
  { year: 2036, count: 15, pendingCount: 15, billedCount: 0, paidCount: 0, totalAmount: 750000, paidAmount: 0 },
];

// ============================================================
// API関数
// ============================================================

/**
 * 合祀一覧取得
 */
export async function getCollectiveBurialList(
  params?: CollectiveBurialSearchParams
): Promise<ApiResponse<CollectiveBurialListResponse>> {
  if (shouldUseMockData()) {
    // モックデータのフィルタリング
    let filtered = [...mockCollectiveBurials];

    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.plotNumber.toLowerCase().includes(searchLower) ||
          item.applicantName?.toLowerCase().includes(searchLower) ||
          item.applicantNameKana?.toLowerCase().includes(searchLower)
      );
    }

    if (params?.billingStatus) {
      filtered = filtered.filter((item) => item.billingStatus === params.billingStatus);
    }

    if (params?.year) {
      filtered = filtered.filter((item) => {
        if (!item.billingScheduledDate) return false;
        return new Date(item.billingScheduledDate).getFullYear() === params.year;
      });
    }

    // ソート
    const sortBy = params?.sortBy || 'billing_scheduled_date';
    const sortOrder = params?.sortOrder || 'asc';
    filtered.sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortBy) {
        case 'billing_scheduled_date':
          aVal = a.billingScheduledDate || '';
          bVal = b.billingScheduledDate || '';
          break;
        case 'current_burial_count':
          aVal = a.currentBurialCount;
          bVal = b.currentBurialCount;
          break;
        case 'created_at':
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
      }

      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // ページネーション
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const start = (page - 1) * limit;
    const paginatedItems = filtered.slice(start, start + limit);

    return {
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          page,
          limit,
          totalCount: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      },
    };
  }

  // リアルAPI呼び出し
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.search) queryParams.append('search', params.search);
  if (params?.billingStatus) queryParams.append('billingStatus', params.billingStatus);
  if (params?.year) queryParams.append('year', String(params.year));
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const queryString = queryParams.toString();
  const url = `/collective-burials${queryString ? `?${queryString}` : ''}`;

  return apiRequest<CollectiveBurialListResponse>(url);
}

/**
 * 合祀詳細取得
 */
export async function getCollectiveBurialById(
  id: string
): Promise<ApiResponse<CollectiveBurialDetail>> {
  if (shouldUseMockData()) {
    const item = mockCollectiveBurials.find((cb) => cb.id === id);
    if (!item) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '合祀情報が見つかりません',
          details: [],
        },
      };
    }

    const detail: CollectiveBurialDetail = {
      ...item,
      contractDate: item.contractDate,
      applicant: item.applicantName
        ? {
          id: 'cust-001',
          name: item.applicantName,
          nameKana: item.applicantNameKana || '',
          phone: '090-1234-5678',
          email: 'example@example.com',
          postalCode: '803-0841',
          address: '福岡県北九州市小倉北区清水2-12-15',
        }
        : null,
      buriedPersons: item.buriedPersons.map((bp) => ({
        ...bp,
        nameKana: null,
        relationship: null,
        deathDate: null,
        age: null,
        gender: null,
        notes: null,
      })),
    };

    return { success: true, data: detail };
  }

  return apiRequest<CollectiveBurialDetail>(`/collective-burials/${id}`);
}

/**
 * 合祀作成
 */
export async function createCollectiveBurial(
  data: CreateCollectiveBurialRequest
): Promise<ApiResponse<CollectiveBurialListItem>> {
  if (shouldUseMockData()) {
    const newItem: CollectiveBurialListItem = {
      id: `cb-${Date.now()}`,
      contractPlotId: data.contractPlotId,
      plotNumber: 'NEW-001',
      areaName: '新規',
      contractDate: new Date().toISOString().split('T')[0],
      applicantName: null,
      applicantNameKana: null,
      burialCapacity: data.burialCapacity,
      currentBurialCount: 0,
      capacityReachedDate: null,
      validityPeriodYears: data.validityPeriodYears,
      billingScheduledDate: null,
      billingStatus: 'pending',
      billingAmount: data.billingAmount || null,
      notes: data.notes || null,
      buriedPersons: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCollectiveBurials.unshift(newItem);
    return { success: true, data: newItem };
  }

  return apiRequest<CollectiveBurialListItem>('/collective-burials', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 合祀更新
 */
export async function updateCollectiveBurial(
  id: string,
  data: UpdateCollectiveBurialRequest
): Promise<ApiResponse<CollectiveBurialListItem>> {
  if (shouldUseMockData()) {
    const index = mockCollectiveBurials.findIndex((cb) => cb.id === id);
    if (index === -1) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '合祀情報が見つかりません',
          details: [],
        },
      };
    }

    const updated = {
      ...mockCollectiveBurials[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockCollectiveBurials[index] = updated;
    return { success: true, data: updated };
  }

  return apiRequest<CollectiveBurialListItem>(`/collective-burials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 請求ステータス更新
 */
export async function updateBillingStatus(
  id: string,
  data: UpdateBillingStatusRequest
): Promise<ApiResponse<{ id: string; billingStatus: BillingStatus; billingAmount: number | null; updatedAt: string }>> {
  if (shouldUseMockData()) {
    const index = mockCollectiveBurials.findIndex((cb) => cb.id === id);
    if (index === -1) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '合祀情報が見つかりません',
          details: [],
        },
      };
    }

    mockCollectiveBurials[index].billingStatus = data.billingStatus;
    if (data.billingAmount !== undefined) {
      mockCollectiveBurials[index].billingAmount = data.billingAmount;
    }
    mockCollectiveBurials[index].updatedAt = new Date().toISOString();

    return {
      success: true,
      data: {
        id,
        billingStatus: data.billingStatus,
        billingAmount: mockCollectiveBurials[index].billingAmount,
        updatedAt: mockCollectiveBurials[index].updatedAt,
      },
    };
  }

  return apiRequest(`/collective-burials/${id}/billing-status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 埋葬人数同期
 */
export async function syncBurialCount(
  id: string
): Promise<ApiResponse<SyncBurialCountResponse>> {
  if (shouldUseMockData()) {
    const item = mockCollectiveBurials.find((cb) => cb.id === id);
    if (!item) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '合祀情報が見つかりません',
          details: [],
        },
      };
    }

    return {
      success: true,
      data: {
        id: item.id,
        currentBurialCount: item.currentBurialCount,
        burialCapacity: item.burialCapacity,
        capacityReached: item.currentBurialCount >= item.burialCapacity,
        capacityReachedDate: item.capacityReachedDate,
        billingScheduledDate: item.billingScheduledDate,
      },
    };
  }

  return apiRequest<SyncBurialCountResponse>(`/collective-burials/${id}/sync-count`, {
    method: 'POST',
  });
}

/**
 * 合祀削除
 */
export async function deleteCollectiveBurial(
  id: string
): Promise<ApiResponse<{ message: string }>> {
  if (shouldUseMockData()) {
    const index = mockCollectiveBurials.findIndex((cb) => cb.id === id);
    if (index === -1) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '合祀情報が見つかりません',
          details: [],
        },
      };
    }

    mockCollectiveBurials.splice(index, 1);
    return { success: true, data: { message: '合祀情報を削除しました' } };
  }

  return apiRequest<{ message: string }>(`/collective-burials/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 年別統計取得
 */
export async function getCollectiveBurialStatsByYear(): Promise<ApiResponse<YearlyStats[]>> {
  if (shouldUseMockData()) {
    return { success: true, data: mockYearlyStats };
  }

  return apiRequest<YearlyStats[]>('/collective-burials/stats/by-year');
}

/** 一斉に解約する月。お盆は8月13日、10月は10月1日 */
export type CollectiveBurialReleaseTiming = 'obon' | 'october';

export async function getCollectiveBurialSettings(): Promise<
  ApiResponse<{ releaseTiming: CollectiveBurialReleaseTiming }>
> {
  if (shouldUseMockData()) {
    return { success: true, data: { releaseTiming: 'october' } };
  }
  return apiRequest<{ releaseTiming: CollectiveBurialReleaseTiming }>('/collective-burials/settings');
}

export async function updateCollectiveBurialSettings(
  releaseTiming: CollectiveBurialReleaseTiming,
): Promise<ApiResponse<{ releaseTiming: CollectiveBurialReleaseTiming; shifted: number }>> {
  if (shouldUseMockData()) {
    return { success: true, data: { releaseTiming, shifted: 0 } };
  }
  return apiRequest<{ releaseTiming: CollectiveBurialReleaseTiming; shifted: number }>(
    '/collective-burials/settings',
    { method: 'PUT', body: JSON.stringify({ releaseTiming }) },
  );
}

/** 今年の合祀日を過ぎた人を解約する。今年より前は対象にしない */
export async function releaseDueCollectiveBurials(): Promise<ApiResponse<{ released: number }>> {
  if (shouldUseMockData()) {
    return { success: true, data: { released: 0 } };
  }
  return apiRequest<{ released: number }>('/collective-burials/release-due', { method: 'POST' });
}

// ============================================================
// ラベル定義
// ============================================================

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  pending: '請求前',
  billed: '請求済',
  paid: '支払済',
};

export const BILLING_STATUS_COLORS: Record<BillingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  billed: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
};

// ============================================================
// notes統合用ヘルパー（法要情報・書類情報をnotesに格納）
// ============================================================

/** 法要情報（notes内に格納） */
export interface CeremonyInfo {
  date?: string;
  officiant?: string;
  religion?: string;
  participants?: number;
  location?: string;
  memo?: string;
}

/** 書類情報（notes内に格納） */
export interface DocumentInfo {
  type: 'permit' | 'certificate' | 'agreement' | 'other';
  name: string;
  issuedDate?: string;
  memo?: string;
}

/** notes内の構造化データ */
export interface NotesData {
  /** 合祀種別 */
  burialType?: 'family' | 'relative' | 'other';
  /** 特別な要望 */
  specialRequests?: string;
  /** 法要情報 */
  ceremonies?: CeremonyInfo[];
  /** 書類情報 */
  documents?: DocumentInfo[];
  /** 自由記述備考 */
  freeText?: string;
}

/**
 * 構造化データをnotes文字列に変換
 */
export function serializeNotesData(data: NotesData): string {
  const sections: string[] = [];

  // 合祀種別
  if (data.burialType) {
    const typeLabels: Record<string, string> = {
      family: '家族合祀',
      relative: '親族合祀',
      other: 'その他',
    };
    sections.push(`【合祀種別】${typeLabels[data.burialType] || data.burialType}`);
  }

  // 特別な要望
  if (data.specialRequests) {
    sections.push(`【特別な要望】\n${data.specialRequests}`);
  }

  // 法要情報
  if (data.ceremonies && data.ceremonies.length > 0) {
    const ceremonyLines = data.ceremonies.map((c, i) => {
      const parts: string[] = [`法要${i + 1}:`];
      if (c.date) parts.push(`日付=${c.date}`);
      if (c.officiant) parts.push(`導師=${c.officiant}`);
      if (c.religion) parts.push(`宗派=${c.religion}`);
      if (c.participants) parts.push(`参列者=${c.participants}名`);
      if (c.location) parts.push(`場所=${c.location}`);
      if (c.memo) parts.push(`備考=${c.memo}`);
      return parts.join(' ');
    });
    sections.push(`【法要情報】\n${ceremonyLines.join('\n')}`);
  }

  // 書類情報
  if (data.documents && data.documents.length > 0) {
    const typeLabels: Record<string, string> = {
      permit: '改葬許可証',
      certificate: '証明書',
      agreement: '同意書',
      other: 'その他',
    };
    const docLines = data.documents.map((d, i) => {
      const parts: string[] = [`書類${i + 1}:`];
      parts.push(`種別=${typeLabels[d.type] || d.type}`);
      parts.push(`名称=${d.name}`);
      if (d.issuedDate) parts.push(`発行日=${d.issuedDate}`);
      if (d.memo) parts.push(`備考=${d.memo}`);
      return parts.join(' ');
    });
    sections.push(`【書類情報】\n${docLines.join('\n')}`);
  }

  // 自由記述
  if (data.freeText) {
    sections.push(`【備考】\n${data.freeText}`);
  }

  return sections.join('\n\n');
}

/**
 * notes文字列から構造化データを解析
 */
export function parseNotesData(notes: string | null): NotesData {
  if (!notes) return {};

  const result: NotesData = {};

  // 合祀種別
  const burialTypeMatch = notes.match(/【合祀種別】(.+)/);
  if (burialTypeMatch) {
    const typeMap: Record<string, 'family' | 'relative' | 'other'> = {
      '家族合祀': 'family',
      '親族合祀': 'relative',
      'その他': 'other',
    };
    result.burialType = typeMap[burialTypeMatch[1].trim()] || 'other';
  }

  // 特別な要望
  const specialMatch = notes.match(/【特別な要望】\n?([\s\S]*?)(?=【|$)/);
  if (specialMatch) {
    result.specialRequests = specialMatch[1].trim();
  }

  // 法要情報
  const ceremonyMatch = notes.match(/【法要情報】\n?([\s\S]*?)(?=【|$)/);
  if (ceremonyMatch) {
    const ceremonies: CeremonyInfo[] = [];
    const lines = ceremonyMatch[1].trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('法要')) {
        const ceremony: CeremonyInfo = {};
        const dateMatch = line.match(/日付=([^\s]+)/);
        if (dateMatch) ceremony.date = dateMatch[1];
        const officiantMatch = line.match(/導師=([^\s]+)/);
        if (officiantMatch) ceremony.officiant = officiantMatch[1];
        const religionMatch = line.match(/宗派=([^\s]+)/);
        if (religionMatch) ceremony.religion = religionMatch[1];
        const participantsMatch = line.match(/参列者=(\d+)名/);
        if (participantsMatch) ceremony.participants = parseInt(participantsMatch[1]);
        const locationMatch = line.match(/場所=([^\s]+)/);
        if (locationMatch) ceremony.location = locationMatch[1];
        const memoMatch = line.match(/備考=(.+)$/);
        if (memoMatch) ceremony.memo = memoMatch[1];
        ceremonies.push(ceremony);
      }
    }
    if (ceremonies.length > 0) result.ceremonies = ceremonies;
  }

  // 書類情報
  const docMatch = notes.match(/【書類情報】\n?([\s\S]*?)(?=【|$)/);
  if (docMatch) {
    const documents: DocumentInfo[] = [];
    const typeMap: Record<string, 'permit' | 'certificate' | 'agreement' | 'other'> = {
      '改葬許可証': 'permit',
      '証明書': 'certificate',
      '同意書': 'agreement',
      'その他': 'other',
    };
    const lines = docMatch[1].trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('書類')) {
        const typeMatch = line.match(/種別=([^\s]+)/);
        const nameMatch = line.match(/名称=([^\s]+)/);
        if (nameMatch) {
          const doc: DocumentInfo = {
            type: typeMatch ? (typeMap[typeMatch[1]] || 'other') : 'other',
            name: nameMatch[1],
          };
          const issuedMatch = line.match(/発行日=([^\s]+)/);
          if (issuedMatch) doc.issuedDate = issuedMatch[1];
          const memoMatch = line.match(/備考=(.+)$/);
          if (memoMatch) doc.memo = memoMatch[1];
          documents.push(doc);
        }
      }
    }
    if (documents.length > 0) result.documents = documents;
  }

  // 備考（自由記述）
  const freeTextMatch = notes.match(/【備考】\n?([\s\S]*?)(?=【|$)/);
  if (freeTextMatch) {
    result.freeText = freeTextMatch[1].trim();
  }

  return result;
}
