/**
 * 区画API (Plot-centric API)
 *
 * @komine/types を直接使用し、型変換なしでAPIレスポンスを返す
 * customers.ts の代替として段階的に移行
 */

import {
  PlotListItem,
  PlotDetailResponse,
  CreatePlotRequest,
  UpdatePlotRequest,
  CreatePlotResponse,
  PhysicalPlotStatus,
  PaymentStatus,
  ContractStatus,
  ContractRole,
  Gender,
  RestoreContractRequest,
  RestoreContractResponse,
  GraveClassificationsResponse,
  BillingRecordStatus,
  CreatePhysicalPlotRequest,
  CreatePhysicalPlotResponse,
} from '@komine/types';
import { apiGet, apiPost, apiPut, apiDelete, shouldUseMockData } from './client';
import { ApiResponse } from './types';

// ===== 型定義 =====

/**
 * 区画一覧のAPIレスポンス形式
 */
interface PlotListApiResponse {
  data: PlotListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * 区画検索パラメータ
 */
export interface PlotSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  areaName?: string;
  status?: PhysicalPlotStatus;
  paymentStatus?: PaymentStatus;
  contractStatus?: ContractStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  nameKanaPrefix?: string;
  graveKind?: number;
  graveKubun?: number;
  graveType?: number;
}

/**
 * 区画一覧レスポンス（フロントエンド用）
 */
export interface PlotListResult {
  items: PlotListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== モック実装 =====

/**
 * モック用の区画データ
 */
const mockPlots: PlotListItem[] = [
  {
    id: 'mock-plot-1',
    contractAreaSqm: 3.6,
    locationDescription: null,
    plotNumber: 'A-001',
    displayNumber: 'A-1',
    areaName: '第1期',
    physicalPlotAreaSqm: 3.6,
    physicalPlotStatus: PhysicalPlotStatus.SoldOut,
    contractDate: '2020-04-01',
    price: 500000,
    paymentStatus: PaymentStatus.Paid,
    customerName: '田中太郎',
    customerNameKana: 'タナカタロウ',
    customerPhoneNumber: '09012345678',
    customerAddress: '東京都新宿区西新宿1-1-1',
    customerRole: ContractRole.Contractor,
    roles: [
      {
        role: ContractRole.Contractor,
        customer: { id: 'customer-1', name: '田中太郎' },
      },
    ],
    contractNotes: '管理料口座振替済',
    customerNotes: null,
    buriedPersonNames: ['田中一郎'],
    agentName: '山田石材',
    permitNumber: '許可-2020-001',
    nextBillingDate: '2025-04-01',
    managementFee: '5000',
    uncollectedAmount: 0,
    billingSummary: {
      hasBilling: true,
      latestYear: 2024,
      latestYearStatus: BillingRecordStatus.Paid,
      unpaidYearCount: 0,
    },
    createdAt: '2020-04-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'mock-plot-2',
    contractAreaSqm: 1.8,
    locationDescription: '左半分',
    plotNumber: 'B-015',
    displayNumber: 'B-15',
    areaName: '第2期',
    physicalPlotAreaSqm: 3.6,
    physicalPlotStatus: PhysicalPlotStatus.PartiallySold,
    contractDate: '2022-08-15',
    price: 300000,
    paymentStatus: PaymentStatus.Unpaid,
    customerName: '鈴木花子',
    customerNameKana: 'スズキハナコ',
    customerPhoneNumber: '08098765432',
    customerAddress: '神奈川県横浜市中区本町1-2-3',
    customerRole: ContractRole.Contractor,
    roles: [
      {
        role: ContractRole.Contractor,
        customer: { id: 'customer-2', name: '鈴木花子' },
      },
    ],
    contractNotes: null,
    customerNotes: '連絡は午後希望',
    buriedPersonNames: [],
    agentName: null,
    permitNumber: null,
    nextBillingDate: '2025-08-15',
    managementFee: '3000',
    uncollectedAmount: 0,
    billingSummary: {
      hasBilling: true,
      latestYear: 2024,
      latestYearStatus: BillingRecordStatus.Overdue,
      unpaidYearCount: 2,
    },
    createdAt: '2022-08-15T00:00:00Z',
    updatedAt: '2024-02-20T14:45:00Z',
  },
];

/**
 * モック: 区画一覧取得
 */
async function mockGetPlots(
  params: PlotSearchParams
): Promise<ApiResponse<PlotListResult>> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  let plots = [...mockPlots];

  // 検索フィルタ
  if (params.search) {
    const query = params.search.toLowerCase();
    plots = plots.filter(
      (p) =>
        p.plotNumber.toLowerCase().includes(query) ||
        p.customerName?.toLowerCase().includes(query) ||
        p.customerNameKana?.toLowerCase().includes(query) ||
        p.customerPhoneNumber?.includes(query) ||
        p.customerAddress?.toLowerCase().includes(query)
    );
  }

  // エリアフィルタ
  if (params.areaName) {
    plots = plots.filter((p) => p.areaName === params.areaName);
  }

  // ステータスフィルタ
  if (params.status) {
    plots = plots.filter((p) => p.physicalPlotStatus === params.status);
  }

  if (params.paymentStatus) {
    plots = plots.filter((p) => p.paymentStatus === params.paymentStatus);
  }

  // ページネーション
  const page = params.page || 1;
  const limit = params.limit || 50;
  const startIndex = (page - 1) * limit;
  const paginatedItems = plots.slice(startIndex, startIndex + limit);

  return {
    success: true,
    data: {
      items: paginatedItems,
      total: plots.length,
      page,
      limit,
      totalPages: Math.ceil(plots.length / limit),
    },
  };
}

/**
 * モック: 区画の変更履歴を組み立てる（issue #267）
 *
 * 実環境（backend #51 の historyService）が返すリッチな履歴 shape に合わせて
 * 区画作成（CREATE）と代表的な更新（UPDATE）を数件生成する。
 * `@komine/types` の PlotDetailResponse.histories は簡易 shape のため、
 * HistoryTab が解釈する拡張 shape を unknown 経由でキャストして返す。
 */
function buildMockHistories(plot: PlotListItem): PlotDetailResponse['histories'] {
  const contractorName =
    plot.roles.find((r) => r.role === ContractRole.Contractor)?.customer.name ??
    plot.customerName ??
    '';

  const histories: Array<Record<string, unknown>> = [];

  // 直近の更新（UPDATE）— 区画ごとに妥当な変更を1件
  if (plot.paymentStatus === PaymentStatus.Paid) {
    histories.push({
      id: `${plot.id}-hist-update-1`,
      entityType: 'SaleContract',
      entityLabel: '販売契約',
      actionType: 'UPDATE',
      changedFields: {
        paymentStatus: { before: '未入金', after: '入金済' },
      },
      fieldLabels: { paymentStatus: '入金状況' },
      changedBy: '管理者',
      changeReason: '管理料の口座振替を確認',
      createdAt: plot.updatedAt,
    });
  } else if (plot.customerNotes) {
    histories.push({
      id: `${plot.id}-hist-update-1`,
      entityType: 'Customer',
      entityLabel: '顧客情報',
      actionType: 'UPDATE',
      changedFields: {
        notes: { before: null, after: plot.customerNotes },
      },
      fieldLabels: { notes: '備考' },
      changedBy: '担当者',
      changeReason: '顧客からの連絡を反映',
      createdAt: plot.updatedAt,
    });
  }

  // 区画作成（CREATE）— レガシー移行時の初期登録
  histories.push({
    id: `${plot.id}-hist-create`,
    entityType: 'ContractPlot',
    entityLabel: '契約区画',
    actionType: 'CREATE',
    changedFields: null,
    afterRecord: {
      plotNumber: plot.plotNumber,
      areaName: plot.areaName,
      contractDate: plot.contractDate,
      price: plot.price,
      contractorName,
    },
    fieldLabels: {
      plotNumber: '区画番号',
      areaName: 'エリア',
      contractDate: '契約日',
      price: '契約金額',
      contractorName: '契約者名',
    },
    changedBy: 'システム移行',
    changeReason: 'レガシーデータ移行による初期登録',
    createdAt: plot.createdAt,
  });

  return histories as unknown as PlotDetailResponse['histories'];
}

/**
 * モック: 区画詳細取得
 */
async function mockGetPlotById(
  id: string
): Promise<ApiResponse<PlotDetailResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const plot = mockPlots.find((p) => p.id === id);
  if (!plot) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '区画が見つかりません',
      },
    };
  }

  // PlotListItem から PlotDetailResponse への変換（モック用）
  const detail: PlotDetailResponse = {
    id: plot.id,
    contractAreaSqm: plot.contractAreaSqm,
    locationDescription: plot.locationDescription,
    createdAt: plot.createdAt,
    updatedAt: plot.updatedAt,
    physicalPlot: {
      id: `physical-${plot.id}`,
      plotNumber: plot.plotNumber,
      displayNumber: plot.displayNumber,
      areaName: plot.areaName,
      areaSqm: plot.physicalPlotAreaSqm,
      status: plot.physicalPlotStatus,
      mapId: null,
      notes: null,
    },
    contractDate: plot.contractDate,
    price: plot.price,
    contractStatus: ContractStatus.Active,
    paymentStatus: plot.paymentStatus as PaymentStatus,
    reservationDate: null,
    requestDate: null,
    acceptanceNumber: null,
    acceptanceDate: null,
    staffInCharge: null,
    agentName: plot.agentName || null,
    permitDate: null,
    permitNumber: plot.permitNumber || null,
    startDate: null,
    contractNotes: null,
    graveKind: null,
    graveKubun: null,
    graveType: null,
    legacyGraveCd: null,
    usageFee: null,
    managementFee: plot.managementFee
      ? {
        calculationType: null,
        taxType: null,
        billingType: null,
        billingYears: null,
        area: null,
        billingMonth: null,
        managementFee: plot.managementFee,
        unitPrice: null,
        lastBillingMonth: null,
        paymentMethod: null,
      }
      : null,
    // mock-plot-1 のみ合祀デモ: 1名は区画年数を継承、1名は個別上書き（合祀年数）を持つ
    buriedPersons:
      plot.id === 'mock-plot-1'
        ? [
            {
              id: 'mock-buried-1',
              name: '田中一郎',
              nameKana: 'タナカイチロウ',
              relationship: '父',
              birthDate: null,
              deathDate: '2018-03-10',
              age: 82,
              gender: Gender.Male,
              burialDate: '2018-04-01',
              posthumousName: null,
              reportDate: null,
              religion: null,
              deathPlace: null,
              causeOfDeath: null,
              chiefMournerName: null,
              chiefMournerRelationship: null,
              validityPeriodYearsOverride: null,
              notes: null,
            },
            {
              id: 'mock-buried-2',
              name: '田中花',
              nameKana: 'タナカハナ',
              relationship: '母',
              birthDate: null,
              deathDate: '2021-09-20',
              age: 79,
              gender: Gender.Female,
              burialDate: '2021-10-05',
              posthumousName: null,
              reportDate: null,
              religion: null,
              deathPlace: null,
              causeOfDeath: null,
              chiefMournerName: null,
              chiefMournerRelationship: null,
              validityPeriodYearsOverride: 13,
              notes: null,
            },
          ]
        : [],
    familyContacts: [],
    gravestoneInfo: null,
    constructionInfos: [],
    uncollectedAmount: 0,
    collectiveBurial:
      plot.id === 'mock-plot-1'
        ? {
            id: 'mock-cb-1',
            burialCapacity: 10,
            currentBurialCount: 2,
            validityPeriodYears: 33,
            capacityReachedDate: null,
            billingScheduledDate: null,
            billingStatus: '',
            billingAmount: null,
            notes: null,
          }
        : null,
    roles: plot.roles.map((r, idx) => ({
      id: `role-${idx}`,
      role: r.role,
      roleStartDate: null,
      roleEndDate: null,
      notes: null,
      customer: {
        id: r.customer.id,
        name: r.customer.name,
        nameKana: plot.customerNameKana || null,
        gender: null,
        birthDate: null,
        phoneNumber: plot.customerPhoneNumber || null,
        faxNumber: null,
        email: null,
        postalCode: null,
        address: plot.customerAddress || null,
        addressLine2: null,
        registeredPostalCode: null,
        registeredAddress: null,
        bankName: null,
        branchName: null,
        accountType: null,
        accountNumber: null,
        accountHolder: null,
        notes: null,
        staffId: null,
        legacyDankaCd: null,
        workInfo: null,
      },
    })),
    histories: buildMockHistories(plot),
  };

  return {
    success: true,
    data: detail,
  };
}

/**
 * PlotDetailResponse → CreatePlotResponse（作成/更新APIのレスポンス形状）変換。
 * backend の createPlot/updatePlot は PlotDetailResponse ではなく
 * CreatePlotResponse 形状（primaryCustomer あり・buriedPersons 等なし）を
 * 返すため、モックも同じ形状に揃える（#217）。
 */
function plotDetailToMutationResponse(detail: PlotDetailResponse): CreatePlotResponse {
  const primaryRole =
    detail.roles.find((r) => r.role === ContractRole.Contractor) ?? detail.roles[0] ?? null;
  return {
    id: detail.id,
    contractAreaSqm: detail.contractAreaSqm,
    locationDescription: detail.locationDescription,
    contractDate: detail.contractDate,
    price: detail.price,
    paymentStatus: detail.paymentStatus,
    reservationDate: detail.reservationDate,
    acceptanceNumber: detail.acceptanceNumber,
    permitDate: detail.permitDate,
    startDate: detail.startDate,
    agentName: detail.agentName ?? null,
    notes: detail.contractNotes ?? null,
    physicalPlot: {
      id: detail.physicalPlot.id,
      plotNumber: detail.physicalPlot.plotNumber,
      areaName: detail.physicalPlot.areaName,
      areaSqm: detail.physicalPlot.areaSqm,
      status: detail.physicalPlot.status,
    },
    primaryCustomer: primaryRole
      ? {
          id: primaryRole.customer.id,
          name: primaryRole.customer.name,
          nameKana: primaryRole.customer.nameKana ?? '',
          phoneNumber: primaryRole.customer.phoneNumber,
          address: primaryRole.customer.address ?? '',
          role: primaryRole.role,
        }
      : null,
    roles: detail.roles.map((r) => ({
      id: r.id,
      role: r.role,
      roleStartDate: r.roleStartDate,
      roleEndDate: r.roleEndDate,
      notes: r.notes,
      customer: {
        id: r.customer.id,
        name: r.customer.name,
        nameKana: r.customer.nameKana ?? '',
        phoneNumber: r.customer.phoneNumber,
        address: r.customer.address ?? '',
      },
    })),
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

/**
 * モック: 区画作成
 */
async function mockCreatePlot(
  request: CreatePlotRequest
): Promise<ApiResponse<CreatePlotResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 簡易的なモック応答
  const newId = `mock-plot-${Date.now()}`;
  const detail: PlotDetailResponse = {
    id: newId,
    contractAreaSqm: request.contractPlot.contractAreaSqm,
    locationDescription: request.contractPlot.locationDescription || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    physicalPlot: {
      id: `physical-${newId}`,
      plotNumber: request.physicalPlot.plotNumber,
      areaName: request.physicalPlot.areaName,
      areaSqm: request.physicalPlot.areaSqm || 3.6,
      status: PhysicalPlotStatus.SoldOut,
      mapId: null,
      notes: request.physicalPlot.notes || null,
    },
    contractDate: request.saleContract.contractDate ?? null,
    price: request.saleContract.price ?? null,
    contractStatus: ContractStatus.Active,
    paymentStatus: request.saleContract.paymentStatus || PaymentStatus.Unpaid,
    reservationDate: request.saleContract.reservationDate || null,
    requestDate: null,
    acceptanceNumber: request.saleContract.acceptanceNumber || null,
    acceptanceDate: request.saleContract.acceptanceDate || null,
    staffInCharge: request.saleContract.staffInCharge || null,
    agentName: request.saleContract.agentName || null,
    permitDate: request.saleContract.permitDate || null,
    permitNumber: request.saleContract.permitNumber || null,
    startDate: request.saleContract.startDate || null,
    uncollectedAmount: request.saleContract.uncollectedAmount ?? 0,
    contractNotes: request.saleContract.notes || null,
    graveKind: null,
    graveKubun: null,
    graveType: null,
    legacyGraveCd: null,
    usageFee: null,
    managementFee: null,
    buriedPersons: [],
    familyContacts: [],
    gravestoneInfo: null,
    constructionInfos: [],
    collectiveBurial: null,
    roles: [
      {
        id: `role-${newId}`,
        role: request.customer.role || ContractRole.Contractor,
        roleStartDate: null,
        roleEndDate: null,
        notes: null,
        customer: {
          id: `customer-${newId}`,
          name: request.customer.name,
          nameKana: request.customer.nameKana,
          gender: request.customer.gender || null,
          birthDate: request.customer.birthDate || null,
          phoneNumber: request.customer.phoneNumber,
          faxNumber: request.customer.faxNumber || null,
          email: request.customer.email || null,
          postalCode: request.customer.postalCode,
          address: request.customer.address,
          addressLine2: request.customer.addressLine2 || null,
          registeredPostalCode: request.customer.registeredPostalCode || null,
          registeredAddress: request.customer.registeredAddress || null,
          bankName: request.customer.bankName || null,
          branchName: request.customer.branchName || null,
          accountType: request.customer.accountType || null,
          accountNumber: request.customer.accountNumber || null,
          accountHolder: request.customer.accountHolder || null,
          notes: request.customer.notes || null,
          staffId: null,
          legacyDankaCd: null,
          workInfo: null,
        },
      },
    ],
  };

  return {
    success: true,
    data: plotDetailToMutationResponse(detail),
  };
}

// ===== 公開API =====

/**
 * 区画一覧取得
 * サーバーサイド検索・ページネーション対応
 */
export async function getPlots(
  params: PlotSearchParams = {}
): Promise<ApiResponse<PlotListResult>> {
  if (shouldUseMockData()) {
    return mockGetPlots(params);
  }

  const response = await apiGet<PlotListApiResponse>('/plots', {
    page: params.page,
    limit: params.limit,
    search: params.search,
    cemeteryType: params.areaName,
    status: params.status,
    paymentStatus: params.paymentStatus,
    contractStatus: params.contractStatus,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    nameKanaPrefix: params.nameKanaPrefix,
    graveKind: params.graveKind,
    graveKubun: params.graveKubun,
    graveType: params.graveType,
  });

  if (!response.success) {
    return response;
  }

  return {
    success: true,
    data: {
      items: response.data.data,
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      totalPages: response.data.pagination.totalPages,
    },
  };
}

/**
 * 空き区画（物理区画のみ）の先行登録（システム確認 項目⑦）
 * 旧システムの「区画を先ず作り、後から契約者を入れる」運用に対応。
 * 登録された区画は契約が付くまで区画残数管理に「空き」として現れる。
 */
export async function createPhysicalPlot(
  request: CreatePhysicalPlotRequest
): Promise<ApiResponse<CreatePhysicalPlotResponse>> {
  if (shouldUseMockData()) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      success: true,
      data: {
        id: `mock-physical-${Date.now()}`,
        plotNumber: request.plotNumber,
        displayNumber: request.displayNumber ?? null,
        areaName: request.areaName,
        areaSqm: request.areaSqm ?? 3.6,
        status: PhysicalPlotStatus.Available,
        notes: request.notes ?? null,
        createdAt: new Date().toISOString(),
      },
    };
  }
  return apiPost<CreatePhysicalPlotResponse>('/plots/physical', request);
}

/**
 * 区画区分 distinct 値取得（フィルタ select 用）
 * master 化されるまでの暫定 API
 */
export async function getGraveClassifications(): Promise<
  ApiResponse<GraveClassificationsResponse>
> {
  if (shouldUseMockData()) {
    return {
      success: true,
      data: { graveKinds: [], graveKubuns: [], graveTypes: [] },
    };
  }
  return apiGet<GraveClassificationsResponse>('/plots/grave-classifications');
}

/**
 * 区画詳細取得
 */
export async function getPlotById(
  id: string,
  options?: { includeHistory?: boolean }
): Promise<ApiResponse<PlotDetailResponse>> {
  if (shouldUseMockData()) {
    return mockGetPlotById(id);
  }

  const params = new URLSearchParams();
  if (options?.includeHistory) {
    params.set('includeHistory', 'true');
  }
  const query = params.toString();
  return apiGet<PlotDetailResponse>(`/plots/${id}${query ? `?${query}` : ''}`);
}

/**
 * 区画作成
 *
 * backend は PlotDetailResponse ではなく CreatePlotResponse 形状
 * （primaryCustomer あり・buriedPersons/familyContacts 等なし）を返す（#217）。
 * フル詳細が必要な場合は getPlotById で再取得すること。
 */
export async function createPlot(
  request: CreatePlotRequest
): Promise<ApiResponse<CreatePlotResponse>> {
  if (shouldUseMockData()) {
    return mockCreatePlot(request);
  }

  return apiPost<CreatePlotResponse>('/plots', request);
}

/**
 * 区画更新
 *
 * backend updatePlot のレスポンスも CreatePlotResponse と同形状（#217）。
 */
export async function updatePlot(
  id: string,
  request: UpdatePlotRequest
): Promise<ApiResponse<CreatePlotResponse>> {
  if (shouldUseMockData()) {
    // モック実装は簡略化（詳細を取得して作成/更新レスポンス形状に変換）
    const detail = await mockGetPlotById(id);
    if (!detail.success) return detail;
    return { success: true, data: plotDetailToMutationResponse(detail.data) };
  }

  return apiPut<CreatePlotResponse>(`/plots/${id}`, request);
}

/**
 * 区画削除（論理削除）
 */
export async function deletePlot(id: string): Promise<ApiResponse<void>> {
  if (shouldUseMockData()) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { success: true, data: undefined };
  }

  return apiDelete<void>(`/plots/${id}`);
}

/**
 * 契約復活（terminated → active、誤操作リカバリ用）
 * reason は履歴に記録される
 */
export async function restoreContract(
  id: string,
  request: RestoreContractRequest
): Promise<ApiResponse<RestoreContractResponse>> {
  if (shouldUseMockData()) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      success: true,
      data: {
        message: '契約区画を復活しました',
        id,
        contractStatus: ContractStatus.Active,
      },
    };
  }

  return apiPost<RestoreContractResponse>(`/plots/${id}/restore`, request);
}

// ===== ヘルパー関数 =====

/**
 * 区画の主たる顧客を取得
 */
export function getPrimaryCustomer(plot: PlotDetailResponse) {
  // contractor ロールの顧客を優先
  const contractorRole = plot.roles.find((r) => r.role === 'contractor');
  if (contractorRole) {
    return contractorRole.customer;
  }

  // なければ最初の顧客
  return plot.roles[0]?.customer || null;
}

/**
 * 区画の表示用ステータスを取得
 */
export function getPlotDisplayStatus(plot: PlotListItem): 'active' | 'attention' | 'overdue' {
  if (plot.paymentStatus === PaymentStatus.Overdue) {
    return 'overdue';
  }
  if (plot.paymentStatus === PaymentStatus.Unpaid || plot.paymentStatus === PaymentStatus.PartialPaid) {
    return 'attention';
  }
  return 'active';
}

/**
 * 区画番号でソート
 */
export function sortPlotsByNumber(plots: PlotListItem[]): PlotListItem[] {
  return [...plots].sort((a, b) => {
    // 区画番号をパース（例: A-001 → { letter: 'A', number: 1 }）
    const parseNumber = (pn: string) => {
      const match = pn.match(/^([A-Z]+)-?(\d+)$/i);
      if (!match) return { letter: pn, number: 0 };
      return { letter: match[1].toUpperCase(), number: parseInt(match[2], 10) };
    };

    const aNum = parseNumber(a.plotNumber);
    const bNum = parseNumber(b.plotNumber);

    // 文字部分で比較
    if (aNum.letter !== bNum.letter) {
      return aNum.letter.localeCompare(bNum.letter);
    }

    // 数値部分で比較
    return aNum.number - bNum.number;
  });
}

/**
 * 顧客名カナであいうえお順にソート
 */
export function sortPlotsByCustomerKana(plots: PlotListItem[]): PlotListItem[] {
  return [...plots].sort((a, b) => {
    const aKana = a.customerNameKana || '';
    const bKana = b.customerNameKana || '';
    return aKana.localeCompare(bKana, 'ja');
  });
}

/**
 * あいうえおタブでフィルタ
 */
export function filterPlotsByAiueo(plots: PlotListItem[], tab: string): PlotListItem[] {
  if (tab === 'all') return plots;

  const kanaRanges: Record<string, [string, string]> = {
    'あ': ['ア', 'オ'],
    'か': ['カ', 'コ'],
    'さ': ['サ', 'ソ'],
    'た': ['タ', 'ト'],
    'な': ['ナ', 'ノ'],
    'は': ['ハ', 'ホ'],
    'ま': ['マ', 'モ'],
    'や': ['ヤ', 'ヨ'],
    'ら': ['ラ', 'ロ'],
    'わ': ['ワ', 'ン'],
  };

  const range = kanaRanges[tab];
  if (!range) return plots;

  return plots.filter((p) => {
    const kana = p.customerNameKana || '';
    if (!kana) return false;
    const firstChar = kana.charAt(0);
    return firstChar >= range[0] && firstChar <= range[1];
  });
}
