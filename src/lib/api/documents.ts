/**
 * 書類管理API
 */

import { DOCUMENT_TEMPLATE_TYPES } from '@komine/types/api';
import type {
  BulkInvoiceTarget,
  BulkInvoiceTargetsQuery,
  BulkInvoiceTargetsResponse,
  GenerateBulkInvoiceRequest,
  GenerateBulkInvoiceResponse,
} from '@komine/types';
import { ApiResponse } from './types';
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  shouldUseMockData,
  API_CONFIG,
  fetchWithTokenRefresh,
} from './client';

// =============================================================================
// 型定義
// =============================================================================

// 書類タイプ
export type DocumentType =
  | 'invoice'
  | 'postcard'
  | 'contract'
  | 'permit'
  | 'envelope_letter'
  | 'envelope_base'
  | 'other';

// 書類ステータス
export type DocumentStatus = 'draft' | 'generated' | 'sent' | 'archived';

// 書類一覧アイテム
export interface DocumentListItem {
  id: string;
  contractPlotId: string | null;
  customerId: string | null;
  type: DocumentType;
  name: string;
  description: string | null;
  status: DocumentStatus;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  templateType: string | null;
  generatedAt: string | null;
  sentAt: string | null;
  createdBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  contractPlot: {
    id: string;
    plotNumber: string;
    displayNumber?: string | null;
    areaName: string;
  } | null;
  customer: {
    id: string;
    name: string;
    nameKana: string;
  } | null;
}

// 書類詳細
export interface DocumentDetail {
  id: string;
  contractPlotId: string | null;
  customerId: string | null;
  type: DocumentType;
  name: string;
  description: string | null;
  status: DocumentStatus;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  templateType: string | null;
  generatedAt: string | null;
  sentAt: string | null;
  createdBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  fileKey: string | null;
  templateData: Record<string, unknown> | null;
  contractPlot: {
    id: string;
    contractAreaSqm: number;
    contractDate: string | null;
    physicalPlot: {
      id: string;
      plotNumber: string;
      displayNumber?: string | null;
      areaName: string;
    };
  } | null;
  customer: {
    id: string;
    name: string;
    nameKana: string;
    postalCode: string;
    address: string;
    phoneNumber: string | null;
    email: string | null;
  } | null;
}

// 書類一覧レスポンス
export interface DocumentListResponse {
  items: DocumentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 書類検索パラメータ
export interface DocumentSearchParams {
  contractPlotId?: string;
  customerId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 書類作成リクエスト
export interface CreateDocumentRequest {
  contractPlotId?: string;
  customerId?: string;
  type: DocumentType;
  name: string;
  description?: string;
  templateType?: string;
  templateData?: Record<string, unknown>;
  notes?: string;
}

// 書類更新リクエスト
export interface UpdateDocumentRequest {
  name?: string;
  description?: string;
  status?: DocumentStatus;
  templateData?: Record<string, unknown>;
  notes?: string;
}

/**
 * 書類が template_data からPDF再生成（=ダウンロード）可能かを判定する。
 *
 * ダウンロードボタンの実処理は `regenerateDocumentPdf`（template_data からの
 * 再生成）。backend の regenerate-pdf は template_type **と** template_data の
 * 両方が無いと NO_TEMPLATE_DATA(400) を返す（documentController.ts）。そのため
 * フロントの表示判定も両方を加味する（#251）。
 *
 * @param templateType    保存済みテンプレート種別（DOCUMENT_TEMPLATE_TYPES）
 * @param hasTemplateData template_data が保存されているか。
 *   - `true`/`false`: 判定に反映する（詳細応答など template_data が取得できる文脈）
 *   - 省略（`undefined`）: template_data の有無が不明な文脈（一覧応答は
 *     template_data を含まない）。後方互換で templateType のみで判定する（#230）。
 */
export function canRegenerateDocument(
  templateType: string | null,
  hasTemplateData?: boolean
): boolean {
  const hasValidType =
    !!templateType &&
    (DOCUMENT_TEMPLATE_TYPES as readonly string[]).includes(templateType);
  if (!hasValidType) return false;
  // template_data の有無が判明している場合のみゲートに使う。
  if (hasTemplateData === false) return false;
  return true;
}

/**
 * オブジェクトURL経由で Blob をブラウザにダウンロードさせる共通処理。
 * （yucho の同名関数とは引数順が異なるため、書類用に別名で定義する）
 */
export function downloadFileBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ダウンロードURLレスポンス
export interface DownloadUrlResponse {
  url: string;
  fileName: string;
  mimeType: string;
  expiresIn: number;
}

// PDF生成リクエスト
export interface GeneratePdfRequest {
  templateType:
    | 'invoice'
    | 'postcard'
    | 'permit'
    | 'envelope-letter'
    | 'envelope-base'
    | 'payment-guide';
  templateData:
    | InvoiceTemplateData
    | PostcardTemplateData
    | PermitTemplateData
    | PaymentGuideTemplateData;
  documentId?: string;
  name?: string;
  contractPlotId?: string;
  customerId?: string;
  /** 許可証を厚紙へ重ね刷りするとき true。台紙の絵は入れない */
  textOnly?: boolean;
}

// お支払い方法のご案内テンプレートデータ
export interface PaymentGuideTemplateData {
  option1?: string;
  option2?: string;
  notice1?: string;
  notice2?: string;
  notice3?: string;
  bank1Name?: string;
  bank1AccountType?: string;
  bank1AccountNumber?: string;
  bank2Name?: string;
  bank2Symbol?: string;
  bank2Number?: string;
  orgName?: string;
  orgNameKana?: string;
  repName?: string;
  repNameKana?: string;
  cemeteryName?: string;
  tel?: string;
  fax?: string;
}

// 許可証テンプレートデータ
export interface PermitTemplateData {
  permitNumber?: string;
  permitType?: string;
  plotNumber?: string;
  area?: string;
  issueYear?: string;
  issueMonth?: string;
  issueDay?: string;
  applicantName?: string;
  registeredAddress?: string;
  registeredAddress2?: string;
  currentAddress?: string;
  currentAddress2?: string;
  recipientPostalCode?: string;
  recipientPostalDigit1?: string;
  recipientPostalDigit2?: string;
  recipientPostalDigit3?: string;
  recipientPostalDigit4?: string;
  recipientPostalDigit5?: string;
  recipientPostalDigit6?: string;
  recipientPostalDigit7?: string;
  recipientAddress?: string;
  recipientAddress2?: string;
  recipientName?: string;
  notes?: string;
}

// 請求書テンプレートデータ
export interface InvoiceTemplateData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerAddress: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

// はがきテンプレートデータ
export interface PostcardTemplateData {
  recipientName: string;
  recipientAddress: string;
  recipientPostalCode: string;
  senderName: string;
  senderAddress: string;
  senderPostalCode: string;
  message: string;
  date: string;
}

// PDF生成レスポンス
export interface GeneratePdfResponse {
  documentId: string;
  pdf: string; // Base64エンコードされたPDF
  mimeType: string;
  fileSize: number;
  /** 再生成APIなどでクライアント保存用に返す場合あり */
  fileName?: string;
}

// =============================================================================
// 定数
// =============================================================================

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: '請求書',
  postcard: 'はがき',
  contract: '契約書',
  permit: '許可証',
  envelope_letter: '封筒書',
  envelope_base: '封筒大',
  other: 'その他',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: '下書き',
  generated: '生成済み',
  sent: '送付済み',
  archived: 'アーカイブ',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'gray',
  generated: 'blue',
  sent: 'green',
  archived: 'slate',
};

// =============================================================================
// モックデータ
// =============================================================================

const MOCK_DOCUMENTS: DocumentDetail[] = [
  {
    id: 'doc-001',
    contractPlotId: 'cp-001',
    customerId: 'cust-001',
    type: 'invoice',
    name: '請求書_2024年1月分',
    description: '2024年1月の管理料請求書',
    status: 'sent',
    fileKey: 'documents/doc-001/invoice.pdf',
    fileName: '請求書_2024年1月分.pdf',
    fileSize: 102400,
    mimeType: 'application/pdf',
    templateType: 'invoice',
    // template_data あり → 実ファイルDL と PDF再生成 の両方が可能
    templateData: {
      invoiceNumber: 'INV-2024-001',
      customerName: '山田太郎',
      total: 12000,
    },
    generatedAt: '2024-01-15T10:00:00Z',
    sentAt: '2024-01-16T09:00:00Z',
    createdBy: '管理者',
    notes: null,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-16T09:00:00Z',
    contractPlot: {
      id: 'cp-001',
      contractAreaSqm: 3.6,
      contractDate: '2020-04-01',
      physicalPlot: {
        id: 'pp-001',
        plotNumber: 'A-56',
        areaName: '第1期',
      },
    },
    customer: {
      id: 'cust-001',
      name: '山田太郎',
      nameKana: 'ヤマダタロウ',
      postalCode: '1234567',
      address: '東京都渋谷区1-2-3',
      phoneNumber: '09012345678',
      email: 'yamada@example.com',
    },
  },
  {
    id: 'doc-002',
    contractPlotId: 'cp-002',
    customerId: 'cust-002',
    type: 'postcard',
    name: '年賀状_2024年',
    description: '2024年年賀状',
    status: 'generated',
    fileKey: 'documents/doc-002/postcard.pdf',
    fileName: '年賀状_2024年.pdf',
    fileSize: 51200,
    mimeType: 'application/pdf',
    templateType: 'postcard',
    // template_data なし → 実ファイルDLのみ可（PDF再生成は #251 で非表示）
    templateData: null,
    generatedAt: '2023-12-20T14:00:00Z',
    sentAt: null,
    createdBy: 'オペレーター',
    notes: '発送予定日: 12/25',
    createdAt: '2023-12-20T13:00:00Z',
    updatedAt: '2023-12-20T14:00:00Z',
    contractPlot: {
      id: 'cp-002',
      contractAreaSqm: 1.8,
      contractDate: '2021-06-15',
      physicalPlot: {
        id: 'pp-002',
        plotNumber: 'B-12',
        areaName: '第2期',
      },
    },
    customer: {
      id: 'cust-002',
      name: '佐藤花子',
      nameKana: 'サトウハナコ',
      postalCode: '9876543',
      address: '大阪府大阪市4-5-6',
      phoneNumber: '08087654321',
      email: 'sato@example.com',
    },
  },
  {
    id: 'doc-003',
    contractPlotId: null,
    customerId: 'cust-003',
    type: 'contract',
    name: '契約書_田中様',
    description: '契約書原本',
    status: 'draft',
    fileKey: null,
    fileName: null,
    fileSize: null,
    mimeType: null,
    templateType: null,
    templateData: null,
    generatedAt: null,
    sentAt: null,
    createdBy: '管理者',
    notes: '作成中',
    createdAt: '2024-01-20T11:00:00Z',
    updatedAt: '2024-01-20T11:00:00Z',
    contractPlot: null,
    customer: {
      id: 'cust-003',
      name: '田中一郎',
      nameKana: 'タナカイチロウ',
      postalCode: '1112222',
      address: '神奈川県横浜市7-8-9',
      phoneNumber: '07011112222',
      email: 'tanaka@example.com',
    },
  },
  {
    // templateType はあるが template_data 未保存・ファイル未添付の書類。
    // backend regeneratePdf は NO_TEMPLATE_DATA(400) になるため、フロントでも
    // 再生成ボタンを出さない（#251）。実ファイルも無いためDL手段なし。
    id: 'doc-004',
    contractPlotId: null,
    customerId: 'cust-004',
    type: 'permit',
    name: '許可証_鈴木様（下書き）',
    description: 'テンプレート種別のみ選択・項目未入力',
    status: 'draft',
    fileKey: null,
    fileName: null,
    fileSize: null,
    mimeType: null,
    templateType: 'permit',
    templateData: null,
    generatedAt: null,
    sentAt: null,
    createdBy: 'オペレーター',
    notes: null,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
    contractPlot: null,
    customer: {
      id: 'cust-004',
      name: '鈴木次郎',
      nameKana: 'スズキジロウ',
      postalCode: '3334444',
      address: '埼玉県さいたま市1-1-1',
      phoneNumber: '08033334444',
      email: 'suzuki@example.com',
    },
  },
];

// =============================================================================
// モック実装
// =============================================================================

async function mockGetDocuments(
  params?: DocumentSearchParams
): Promise<ApiResponse<DocumentListResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  let filtered = [...MOCK_DOCUMENTS];

  // フィルタリング
  if (params?.contractPlotId) {
    filtered = filtered.filter((d) => d.contractPlotId === params.contractPlotId);
  }
  if (params?.customerId) {
    filtered = filtered.filter((d) => d.customerId === params.customerId);
  }
  if (params?.type) {
    filtered = filtered.filter((d) => d.type === params.type);
  }
  if (params?.status) {
    filtered = filtered.filter((d) => d.status === params.status);
  }

  // ソート
  const sortBy = params?.sortBy || 'createdAt';
  const sortOrder = params?.sortOrder || 'desc';
  filtered.sort((a, b) => {
    const aVal = a[sortBy as keyof DocumentDetail] as string;
    const bVal = b[sortBy as keyof DocumentDetail] as string;
    const cmp = (aVal || '').localeCompare(bVal || '');
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  // ページネーション
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return {
    success: true,
    data: {
      items: items.map((d) => ({
        ...d,
        contractPlot: d.contractPlot
          ? {
            id: d.contractPlot.id,
            plotNumber: d.contractPlot.physicalPlot.plotNumber,
            areaName: d.contractPlot.physicalPlot.areaName,
          }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
}

async function mockGetDocumentById(id: string): Promise<ApiResponse<DocumentDetail>> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const document = MOCK_DOCUMENTS.find((d) => d.id === id);
  if (!document) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '書類が見つかりません',
      },
    };
  }

  return { success: true, data: document };
}

async function mockCreateDocument(
  data: CreateDocumentRequest
): Promise<ApiResponse<DocumentDetail>> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const newDocument: DocumentDetail = {
    id: `doc-${Date.now()}`,
    contractPlotId: data.contractPlotId || null,
    customerId: data.customerId || null,
    type: data.type,
    name: data.name,
    description: data.description || null,
    status: 'draft',
    fileKey: null,
    fileName: null,
    fileSize: null,
    mimeType: null,
    templateType: data.templateType || null,
    templateData: data.templateData || null,
    generatedAt: null,
    sentAt: null,
    createdBy: 'テストユーザー',
    notes: data.notes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contractPlot: null,
    customer: null,
  };

  return { success: true, data: newDocument };
}

async function mockUpdateDocument(
  id: string,
  data: UpdateDocumentRequest
): Promise<ApiResponse<DocumentDetail>> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const document = MOCK_DOCUMENTS.find((d) => d.id === id);
  if (!document) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '書類が見つかりません',
      },
    };
  }

  const updated: DocumentDetail = {
    ...document,
    name: data.name ?? document.name,
    description: data.description ?? document.description,
    status: data.status ?? document.status,
    templateData: data.templateData ?? document.templateData,
    notes: data.notes ?? document.notes,
    updatedAt: new Date().toISOString(),
  };

  return { success: true, data: updated };
}

async function mockDeleteDocument(id: string): Promise<ApiResponse<{ message: string }>> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const index = MOCK_DOCUMENTS.findIndex((d) => d.id === id);
  if (index === -1) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '書類が見つかりません',
      },
    };
  }

  return { success: true, data: { message: '書類を削除しました' } };
}

async function mockGetDownloadUrl(id: string): Promise<ApiResponse<DownloadUrlResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const document = MOCK_DOCUMENTS.find((d) => d.id === id);
  if (!document) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '書類が見つかりません',
      },
    };
  }

  if (!document.fileKey) {
    return {
      success: false,
      error: {
        code: 'NO_FILE',
        message: 'ファイルがアップロードされていません',
      },
    };
  }

  return {
    success: true,
    data: {
      url: `https://example-bucket.s3.amazonaws.com/${document.fileKey}?signed=true`,
      fileName: document.fileName || 'document.pdf',
      mimeType: document.mimeType || 'application/pdf',
      expiresIn: 900,
    },
  };
}

async function mockGetDocumentFile(
  id: string
): Promise<ApiResponse<DocumentFileResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const document = MOCK_DOCUMENTS.find((d) => d.id === id);
  if (!document) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '書類が見つかりません',
      },
    };
  }

  if (!document.fileKey || !document.fileName) {
    return {
      success: false,
      error: {
        code: 'NO_FILE',
        message: 'アップロードされたファイルがありません',
      },
    };
  }

  // モックではダミーのBlobを返す（実体ファイルは存在しないため）
  const blob = new Blob([`mock file: ${document.fileName}`], {
    type: document.mimeType || 'application/octet-stream',
  });

  return { success: true, data: { blob, fileName: document.fileName } };
}

async function mockGeneratePdf(
  data: GeneratePdfRequest
): Promise<ApiResponse<GeneratePdfResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // モックではBase64エンコードされた空のPDFを返す
  const mockPdf = 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2Jq';

  return {
    success: true,
    data: {
      documentId: data.documentId || `doc-${Date.now()}`,
      pdf: mockPdf,
      mimeType: 'application/pdf',
      fileSize: mockPdf.length,
    },
  };
}

async function mockRegenerateDocumentPdf(id: string): Promise<ApiResponse<GeneratePdfResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const doc = MOCK_DOCUMENTS.find((d) => d.id === id);
  if (!doc) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '書類が見つかりません',
      },
    };
  }

  // backend regeneratePdf と同条件: template_type AND template_data の両方が必要（#251）
  const hasTemplateData =
    !!doc.templateData && Object.keys(doc.templateData).length > 0;
  if (!canRegenerateDocument(doc.templateType, hasTemplateData)) {
    return {
      success: false,
      error: {
        code: 'NO_TEMPLATE_DATA',
        message: 'テンプレートデータが保存されていないため、再生成できません',
      },
    };
  }

  const mockPdf = 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2Jq';
  const baseName =
    (doc.name || 'document').replace(/[/\\?%*:|"<>]/g, '_').trim() || 'document';
  const fileName = baseName.toLowerCase().endsWith('.pdf') ? baseName : `${baseName}.pdf`;

  return {
    success: true,
    data: {
      documentId: id,
      pdf: mockPdf,
      mimeType: 'application/pdf',
      fileSize: mockPdf.length,
      fileName,
    },
  };
}

// =============================================================================
// API関数
// =============================================================================

/**
 * 書類一覧を取得
 */
export async function getDocuments(
  params?: DocumentSearchParams
): Promise<ApiResponse<DocumentListResponse>> {
  if (shouldUseMockData()) {
    return mockGetDocuments(params);
  }

  return apiGet<DocumentListResponse>('/documents', params as Record<string, string | number | undefined>);
}

/**
 * 書類詳細を取得
 */
export async function getDocumentById(id: string): Promise<ApiResponse<DocumentDetail>> {
  if (shouldUseMockData()) {
    return mockGetDocumentById(id);
  }

  return apiGet<DocumentDetail>(`/documents/${id}`);
}

/**
 * 書類を作成
 */
export async function createDocument(
  data: CreateDocumentRequest
): Promise<ApiResponse<DocumentDetail>> {
  if (shouldUseMockData()) {
    return mockCreateDocument(data);
  }

  return apiPost<DocumentDetail>('/documents', data);
}

/**
 * 書類を更新
 */
export async function updateDocument(
  id: string,
  data: UpdateDocumentRequest
): Promise<ApiResponse<DocumentDetail>> {
  if (shouldUseMockData()) {
    return mockUpdateDocument(id, data);
  }

  return apiPut<DocumentDetail>(`/documents/${id}`, data);
}

/**
 * 書類を削除
 */
export async function deleteDocument(id: string): Promise<ApiResponse<{ message: string }>> {
  if (shouldUseMockData()) {
    return mockDeleteDocument(id);
  }

  return apiDelete<{ message: string }>(`/documents/${id}`);
}

/**
 * ファイルをアップロード
 */
export async function uploadDocumentFile(
  id: string,
  file: File
): Promise<ApiResponse<{ id: string; fileName: string; fileSize: number; mimeType: string }>> {
  if (shouldUseMockData()) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      success: true,
      data: {
        id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    };
  }

  const formData = new FormData();
  formData.append('file', file);

  const url = `${API_CONFIG.baseUrl}/documents/${id}/upload`;

  try {
    // FormData のため apiPost は使えないが、トークンリフレッシュは共有する（#256）
    const response = await fetchWithTokenRefresh(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data.error?.code || `HTTP_${response.status}`,
          message: data.error?.message || 'ファイルのアップロードに失敗しました',
        },
      };
    }

    return data;
  } catch {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラーが発生しました',
      },
    };
  }
}

/**
 * ダウンロードURLを取得
 */
export async function getDocumentDownloadUrl(
  id: string
): Promise<ApiResponse<DownloadUrlResponse>> {
  if (shouldUseMockData()) {
    return mockGetDownloadUrl(id);
  }

  return apiGet<DownloadUrlResponse>(`/documents/${id}/download`);
}

// アップロード済みファイル本体（Blob）レスポンス
export interface DocumentFileResponse {
  blob: Blob;
  fileName: string;
}

/**
 * アップロード済みのファイル本体（署名済みスキャン等）を取得する。
 *
 * backend `GET /documents/:id/file` は認証付きでファイル実体を返す（res.download）。
 * Authorization は HttpOnly Cookie で行うため `credentials: 'include'` で取得し、
 * 取得した Blob をそのままダウンロードに使う（再生成PDFとは別経路）。
 *
 * blob 応答のため apiGet は使えないが、トークンリフレッシュ（期限間近の先行
 * リフレッシュ・401 時の一度きり再試行）は fetchWithTokenRefresh で
 * 共有クライアントと同じ挙動にする（#256）。
 */
export async function getDocumentFile(
  id: string
): Promise<ApiResponse<DocumentFileResponse>> {
  if (shouldUseMockData()) {
    return mockGetDocumentFile(id);
  }

  const url = `${API_CONFIG.baseUrl}/documents/${id}/file`;

  try {
    const response = await fetchWithTokenRefresh(url, {
      method: 'GET',
    });

    if (!response.ok) {
      // エラー時は JSON ボディ（{ success:false, error }）が返る
      let code = `HTTP_${response.status}`;
      let message = 'ファイルのダウンロードに失敗しました';
      try {
        const data = await response.json();
        code = data.error?.code || code;
        message = data.error?.message || message;
      } catch {
        // JSON でない場合はデフォルトメッセージのまま
      }
      return { success: false, error: { code, message } };
    }

    const blob = await response.blob();
    const fileName = parseContentDispositionFileName(
      response.headers.get('content-disposition')
    );

    return { success: true, data: { blob, fileName: fileName || 'download' } };
  } catch {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラーが発生しました',
      },
    };
  }
}

/**
 * Content-Disposition ヘッダーからファイル名を抽出する。
 * `filename*=UTF-8''...`（RFC 5987）と `filename="..."` の両方に対応。
 */
function parseContentDispositionFileName(header: string | null): string | null {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const asciiMatch = header.match(/filename="?([^";]+)"?/i);
  return asciiMatch ? asciiMatch[1] : null;
}

/**
 * PDFを生成
 */
export async function generatePdf(
  data: GeneratePdfRequest
): Promise<ApiResponse<GeneratePdfResponse>> {
  if (shouldUseMockData()) {
    return mockGeneratePdf(data);
  }

  return apiPost<GeneratePdfResponse>('/documents/generate-pdf', data);
}

/**
 * 保存済みテンプレートデータからPDFを再生成（ダウンロード用）
 */
export async function regenerateDocumentPdf(
  id: string,
  options?: { textOnly?: boolean }
): Promise<ApiResponse<GeneratePdfResponse>> {
  if (shouldUseMockData()) {
    return mockRegenerateDocumentPdf(id);
  }

  return apiPost<GeneratePdfResponse>(`/documents/${id}/regenerate-pdf`, options);
}

// =============================================================================
// 請求書（護持費のお知らせ）の一括印刷
// =============================================================================

/**
 * 一括印刷の対象一覧を取得する（プレビュー）。
 *
 * `billingYears` はクエリ文字列に載せるため `"5,10"` に畳む（backend の Zod が
 * カンマ区切りと配列の両方を受ける）。
 */
export async function getBulkInvoiceTargets(
  query: BulkInvoiceTargetsQuery
): Promise<ApiResponse<BulkInvoiceTargetsResponse>> {
  if (shouldUseMockData()) {
    return mockGetBulkInvoiceTargets(query);
  }

  return apiGet<BulkInvoiceTargetsResponse>('/documents/bulk-invoice/targets', {
    year: query.year,
    month: query.month,
    billingYears: query.billingYears?.join(','),
    includeOverdue: query.includeOverdue === undefined ? undefined : String(query.includeOverdue),
  });
}

/**
 * 対象の請求書を 1 ファイルの PDF にまとめて生成する
 */
export async function generateBulkInvoice(
  request: GenerateBulkInvoiceRequest
): Promise<ApiResponse<GenerateBulkInvoiceResponse>> {
  if (shouldUseMockData()) {
    return mockGenerateBulkInvoice(request);
  }

  return apiPost<GenerateBulkInvoiceResponse>('/documents/bulk-invoice/generate', request);
}

async function mockGetBulkInvoiceTargets(
  query: BulkInvoiceTargetsQuery
): Promise<ApiResponse<BulkInvoiceTargetsResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const month = query.month ?? 3;
  const targets: BulkInvoiceTarget[] = [
    {
      contractPlotId: 'cp-001',
      customerId: 'cust-001',
      customerName: '山田 太郎',
      customerNameKana: 'ヤマダ タロウ',
      areaName: '第1期',
      plotNumber: 'A-56',
      displayNumber: 'A-56',
      billingYears: 10,
      billingMonth: month,
      lastBillingMonth: `${query.year - 10}-${String(month).padStart(2, '0')}`,
      targetYear: query.year,
      amount: 82800,
      nextNoticeDate: `${query.year + 10}年${month}月`,
      overdue: false,
    },
    {
      contractPlotId: 'cp-002',
      customerId: 'cust-002',
      customerName: '佐藤 花子',
      customerNameKana: 'サトウ ハナコ',
      areaName: '第2期',
      plotNumber: 'B-12',
      displayNumber: 'B-12',
      billingYears: 5,
      billingMonth: month,
      lastBillingMonth: `${query.year - 5}-${String(month).padStart(2, '0')}`,
      targetYear: query.year,
      amount: 31820,
      nextNoticeDate: `${query.year + 5}年${month}月`,
      overdue: false,
    },
  ];

  return {
    success: true,
    data: {
      targets,
      total: targets.length,
      totalAmount: targets.reduce((sum, t) => sum + t.amount, 0),
    },
  };
}

async function mockGenerateBulkInvoice(
  request: GenerateBulkInvoiceRequest
): Promise<ApiResponse<GenerateBulkInvoiceResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const mockPdf = 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2Jq';
  const count = request.contractPlotIds?.length ?? 2;

  return {
    success: true,
    data: {
      pdf: mockPdf,
      mimeType: 'application/pdf',
      fileName: `護持費のお知らせ_${request.year}03_${count}件.pdf`,
      fileSize: mockPdf.length,
      count,
    },
  };
}

/**
 * Base64 PDFをダウンロード
 */
function pdfBlobFromBase64(base64: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'application/pdf' });
}

export function downloadPdfFromBase64(base64: string, fileName: string): void {
  downloadFileBlob(pdfBlobFromBase64(base64), fileName);
}

/**
 * すでに開いている窓に、文字だけのPDFを表示して印刷画面を出す。
 * 窓はボタンを押した直後に開いておく（あとから開くとブラウザに止められる）。
 */
export function printPdfFromBase64(base64: string, targetWindow: Window): void {
  const url = URL.createObjectURL(pdfBlobFromBase64(base64));
  let printed = false;
  const triggerPrint = () => {
    if (printed || targetWindow.closed) return;
    printed = true;
    targetWindow.focus();
    targetWindow.print();
  };
  targetWindow.addEventListener('load', triggerPrint, { once: true });
  targetWindow.location.href = url;
  window.setTimeout(triggerPrint, 1000);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** 保存済みの許可証を、台紙の上に文字だけ載せる印刷画面で開く */
export async function printSavedPermitText(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return {
      ok: false,
      message: '印刷用の新しい窓を開けませんでした。ポップアップを止めていないか確認してください。',
    };
  }
  printWindow.document.title = '台紙に文字だけ印刷';
  printWindow.document.body.innerHTML =
    '<p style="font-family:sans-serif">文字を準備しています…</p>';

  const response = await regenerateDocumentPdf(id, { textOnly: true });
  if (!response.success || !response.data.pdf) {
    printWindow.close();
    return {
      ok: false,
      message: response.success
        ? '印刷用の文字を用意できませんでした'
        : response.error.message,
    };
  }
  printPdfFromBase64(response.data.pdf, printWindow);
  return { ok: true };
}
