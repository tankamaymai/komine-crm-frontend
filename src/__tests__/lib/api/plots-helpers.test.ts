import {
  getPrimaryCustomer,
  getPlotDisplayStatus,
  sortPlotsByNumber,
  sortPlotsByCustomerKana,
  filterPlotsByAiueo,
} from '@/lib/api/plots';
import type { PlotDetailResponse, PlotListItem } from '@komine/types';
import {
  PaymentStatus,
  ContractRole,
  PhysicalPlotStatus,
  ContractStatus,
} from '@komine/types';

// ===== テストヘルパー =====

function makePlotDetail(overrides: Partial<PlotDetailResponse> = {}): PlotDetailResponse {
  return {
    id: 'plot-1',
    contractAreaSqm: 3.6,
    locationDescription: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
    physicalPlot: {
      id: 'pp-1',
      plotNumber: 'A-001',
      areaName: '第1期',
      areaSqm: 3.6,
      status: PhysicalPlotStatus.SoldOut,
      mapId: null,
      notes: null,
    },
    contractDate: '2024-01-15',
    price: 500000,
    uncollectedAmount: 0,
    contractStatus: ContractStatus.Active,
    paymentStatus: PaymentStatus.Paid,
    reservationDate: null,
    requestDate: null,
    acceptanceNumber: null,
    acceptanceDate: null,
    staffInCharge: null,
    permitDate: null,
    permitNumber: null,
    startDate: null,
    contractNotes: null,
    agentName: null,
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
        id: 'role-1',
        role: ContractRole.Contractor,
        roleStartDate: null,
        roleEndDate: null,
        notes: null,
        customer: {
          id: 'cust-1',
          name: '田中太郎',
          nameKana: 'タナカタロウ',
          gender: null,
          birthDate: null,
          phoneNumber: '09012345678',
          faxNumber: null,
          email: null,
          postalCode: '1234567',
          address: '東京都新宿区',
          addressLine2: null,
          registeredPostalCode: null,
          registeredAddress: null,
          bankName: null,
          branchName: null,
          accountType: null,
          accountNumber: null,
          accountHolder: null,
          staffId: null,
          legacyDankaCd: null,
          notes: null,
          workInfo: null,
        },
      },
    ],
    ...overrides,
  };
}

function makePlotListItem(overrides: Partial<PlotListItem> = {}): PlotListItem {
  return {
    id: 'plot-1',
    contractAreaSqm: 3.6,
    locationDescription: null,
    plotNumber: 'A-001',
    areaName: '第1期',
    physicalPlotAreaSqm: 3.6,
    physicalPlotStatus: PhysicalPlotStatus.SoldOut,
    contractDate: '2024-01-15',
    price: 500000,
    uncollectedAmount: 0,
    paymentStatus: PaymentStatus.Paid,
    contractStatus: ContractStatus.Active,
    customerName: '田中太郎',
    customerNameKana: 'タナカタロウ',
    customerPhoneNumber: '09012345678',
    customerAddress: '東京都新宿区',
    customerRole: ContractRole.Contractor,
    roles: [
      {
        role: ContractRole.Contractor,
        customer: { id: 'cust-1', name: '田中太郎' },
      },
    ],
    contractNotes: null,
    customerNotes: null,
    buriedPersonNames: [],
    agentName: null,
    permitNumber: null,
    nextBillingDate: '2025-04-01',
    managementFee: '5000',
    managementFeeBillingType: null,
    managementFeeBillingYears: null,
    billingSummary: {
      hasBilling: false,
      latestYear: null,
      latestYearStatus: null,
      unpaidYearCount: 0,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
    ...overrides,
  };
}

// ===== getPrimaryCustomer =====

describe('getPrimaryCustomer', () => {
  it('Contractorロールの顧客を返す', () => {
    const detail = makePlotDetail();
    const customer = getPrimaryCustomer(detail);

    expect(customer).not.toBeNull();
    expect(customer!.name).toBe('田中太郎');
  });

  it('Contractorが存在する場合、Applicantよりも優先する', () => {
    const detail = makePlotDetail({
      roles: [
        {
          id: 'role-app',
          role: ContractRole.Applicant,
          roleStartDate: null,
          roleEndDate: null,
          notes: null,
          customer: {
            id: 'cust-app',
            name: '申込者A',
            nameKana: null,
            gender: null,
            birthDate: null,
            phoneNumber: null,
            faxNumber: null,
            email: null,
            postalCode: null,
            address: null,
            addressLine2: null,
            registeredPostalCode: null,
            registeredAddress: null,
            bankName: null,
            branchName: null,
            accountType: null,
            accountNumber: null,
            accountHolder: null,
            staffId: null,
            legacyDankaCd: null,
            notes: null,
            workInfo: null,
            },
        },
        {
          id: 'role-con',
          role: ContractRole.Contractor,
          roleStartDate: null,
          roleEndDate: null,
          notes: null,
          customer: {
            id: 'cust-con',
            name: '契約者B',
            nameKana: null,
            gender: null,
            birthDate: null,
            phoneNumber: null,
            faxNumber: null,
            email: null,
            postalCode: null,
            address: null,
            addressLine2: null,
            registeredPostalCode: null,
            registeredAddress: null,
            bankName: null,
            branchName: null,
            accountType: null,
            accountNumber: null,
            accountHolder: null,
            staffId: null,
            legacyDankaCd: null,
            notes: null,
            workInfo: null,
            },
        },
      ],
    });
    const customer = getPrimaryCustomer(detail);

    expect(customer!.name).toBe('契約者B');
  });

  it('Contractorがない場合、最初のロールの顧客を返す', () => {
    const detail = makePlotDetail({
      roles: [
        {
          id: 'role-app',
          role: ContractRole.Applicant,
          roleStartDate: null,
          roleEndDate: null,
          notes: null,
          customer: {
            id: 'cust-app',
            name: '申込者のみ',
            nameKana: null,
            gender: null,
            birthDate: null,
            phoneNumber: null,
            faxNumber: null,
            email: null,
            postalCode: null,
            address: null,
            addressLine2: null,
            registeredPostalCode: null,
            registeredAddress: null,
            bankName: null,
            branchName: null,
            accountType: null,
            accountNumber: null,
            accountHolder: null,
            staffId: null,
            legacyDankaCd: null,
            notes: null,
            workInfo: null,
            },
        },
      ],
    });
    const customer = getPrimaryCustomer(detail);

    expect(customer!.name).toBe('申込者のみ');
  });

  it('rolesが空の場合nullを返す', () => {
    const detail = makePlotDetail({ roles: [] });
    const customer = getPrimaryCustomer(detail);

    expect(customer).toBeNull();
  });
});

// ===== getPlotDisplayStatus =====

describe('getPlotDisplayStatus', () => {
  it('Overdueの場合"overdue"を返す', () => {
    const plot = makePlotListItem({ paymentStatus: PaymentStatus.Overdue });
    expect(getPlotDisplayStatus(plot)).toBe('overdue');
  });

  it('Unpaidの場合"attention"を返す', () => {
    const plot = makePlotListItem({ paymentStatus: PaymentStatus.Unpaid });
    expect(getPlotDisplayStatus(plot)).toBe('attention');
  });

  it('PartialPaidの場合"attention"を返す', () => {
    const plot = makePlotListItem({ paymentStatus: PaymentStatus.PartialPaid });
    expect(getPlotDisplayStatus(plot)).toBe('attention');
  });

  it('Paidの場合"active"を返す', () => {
    const plot = makePlotListItem({ paymentStatus: PaymentStatus.Paid });
    expect(getPlotDisplayStatus(plot)).toBe('active');
  });

  it('Refundedの場合"active"を返す', () => {
    const plot = makePlotListItem({ paymentStatus: PaymentStatus.Refunded });
    expect(getPlotDisplayStatus(plot)).toBe('active');
  });

  it('Refunded(旧Cancelled)の場合"active"を返す', () => {
    const plot = makePlotListItem({ paymentStatus: PaymentStatus.Refunded });
    expect(getPlotDisplayStatus(plot)).toBe('active');
  });
});

// ===== sortPlotsByNumber =====

describe('sortPlotsByNumber', () => {
  it('同プレフィックスの区画を数値順にソートする', () => {
    const plots = [
      makePlotListItem({ id: '3', plotNumber: 'A-010' }),
      makePlotListItem({ id: '1', plotNumber: 'A-001' }),
      makePlotListItem({ id: '2', plotNumber: 'A-005' }),
    ];
    const sorted = sortPlotsByNumber(plots);

    expect(sorted.map((p) => p.plotNumber)).toEqual(['A-001', 'A-005', 'A-010']);
  });

  it('異なるプレフィックスをアルファベット順にソートする', () => {
    const plots = [
      makePlotListItem({ id: '1', plotNumber: 'C-001' }),
      makePlotListItem({ id: '2', plotNumber: 'A-001' }),
      makePlotListItem({ id: '3', plotNumber: 'B-001' }),
    ];
    const sorted = sortPlotsByNumber(plots);

    expect(sorted.map((p) => p.plotNumber)).toEqual(['A-001', 'B-001', 'C-001']);
  });

  it('元の配列を変更しない（immutability）', () => {
    const plots = [
      makePlotListItem({ id: '2', plotNumber: 'B-001' }),
      makePlotListItem({ id: '1', plotNumber: 'A-001' }),
    ];
    const original = [...plots];
    sortPlotsByNumber(plots);

    expect(plots[0].plotNumber).toBe(original[0].plotNumber);
  });

  it('空配列を返す', () => {
    const sorted = sortPlotsByNumber([]);
    expect(sorted).toEqual([]);
  });

  it('パース不可能な区画番号はそのまま残る', () => {
    const plots = [
      makePlotListItem({ id: '1', plotNumber: 'A-001' }),
      makePlotListItem({ id: '2', plotNumber: '特殊区画' }),
    ];
    const sorted = sortPlotsByNumber(plots);

    expect(sorted).toHaveLength(2);
  });

  it('プレフィックス同じ場合に数値で正しくソート（文字列ソートでない）', () => {
    const plots = [
      makePlotListItem({ id: '1', plotNumber: 'A-100' }),
      makePlotListItem({ id: '2', plotNumber: 'A-20' }),
      makePlotListItem({ id: '3', plotNumber: 'A-3' }),
    ];
    const sorted = sortPlotsByNumber(plots);

    expect(sorted.map((p) => p.plotNumber)).toEqual(['A-3', 'A-20', 'A-100']);
  });
});

// ===== sortPlotsByCustomerKana =====

describe('sortPlotsByCustomerKana', () => {
  it('あいうえお順にソートする', () => {
    const plots = [
      makePlotListItem({ id: '1', customerNameKana: 'タナカ' }),
      makePlotListItem({ id: '2', customerNameKana: 'アオキ' }),
      makePlotListItem({ id: '3', customerNameKana: 'サトウ' }),
    ];
    const sorted = sortPlotsByCustomerKana(plots);

    expect(sorted.map((p) => p.customerNameKana)).toEqual(['アオキ', 'サトウ', 'タナカ']);
  });

  it('カナが空文字の場合先頭に来る', () => {
    const plots = [
      makePlotListItem({ id: '1', customerNameKana: 'タナカ' }),
      makePlotListItem({ id: '2', customerNameKana: '' }),
    ];
    const sorted = sortPlotsByCustomerKana(plots);

    expect(sorted[0].customerNameKana).toBe('');
  });

  it('カナがnullの場合空文字として扱われる', () => {
    const plots = [
      makePlotListItem({ id: '1', customerNameKana: 'タナカ' }),
      makePlotListItem({ id: '2', customerNameKana: null as unknown as string }),
    ];
    const sorted = sortPlotsByCustomerKana(plots);

    expect(sorted).toHaveLength(2);
  });

  it('元の配列を変更しない', () => {
    const plots = [
      makePlotListItem({ id: '1', customerNameKana: 'タナカ' }),
      makePlotListItem({ id: '2', customerNameKana: 'アオキ' }),
    ];
    const original = [...plots];
    sortPlotsByCustomerKana(plots);

    expect(plots[0].customerNameKana).toBe(original[0].customerNameKana);
  });
});

// ===== filterPlotsByAiueo =====

describe('filterPlotsByAiueo', () => {
  const plots = [
    makePlotListItem({ id: '1', customerNameKana: 'アオキ' }),    // あ行
    makePlotListItem({ id: '2', customerNameKana: 'カトウ' }),    // か行
    makePlotListItem({ id: '3', customerNameKana: 'サトウ' }),    // さ行
    makePlotListItem({ id: '4', customerNameKana: 'タナカ' }),    // た行
    makePlotListItem({ id: '5', customerNameKana: 'ナカムラ' }),  // な行
    makePlotListItem({ id: '6', customerNameKana: 'ハヤシ' }),    // は行
    makePlotListItem({ id: '7', customerNameKana: 'マツモト' }),  // ま行
    makePlotListItem({ id: '8', customerNameKana: 'ヤマダ' }),    // や行
    makePlotListItem({ id: '9', customerNameKana: 'ワタナベ' }),  // わ行
  ];

  it('"all"の場合全件を返す', () => {
    const result = filterPlotsByAiueo(plots, 'all');
    expect(result).toHaveLength(plots.length);
  });

  it('"あ"タブでア行をフィルタする', () => {
    const result = filterPlotsByAiueo(plots, 'あ');
    expect(result).toHaveLength(1);
    expect(result[0].customerNameKana).toBe('アオキ');
  });

  it('"か"タブでカ行をフィルタする', () => {
    const result = filterPlotsByAiueo(plots, 'か');
    expect(result).toHaveLength(1);
    expect(result[0].customerNameKana).toBe('カトウ');
  });

  it('"さ"タブでサ行をフィルタする', () => {
    const result = filterPlotsByAiueo(plots, 'さ');
    expect(result).toHaveLength(1);
    expect(result[0].customerNameKana).toBe('サトウ');
  });

  it('"た"タブでタ行をフィルタする', () => {
    const result = filterPlotsByAiueo(plots, 'た');
    expect(result).toHaveLength(1);
    expect(result[0].customerNameKana).toBe('タナカ');
  });

  it('"な"タブでナ行をフィルタする', () => {
    const result = filterPlotsByAiueo(plots, 'な');
    expect(result).toHaveLength(1);
    expect(result[0].customerNameKana).toBe('ナカムラ');
  });

  it('"は"タブでハ行をフィルタする', () => {
    const result = filterPlotsByAiueo(plots, 'は');
    expect(result).toHaveLength(1);
    expect(result[0].customerNameKana).toBe('ハヤシ');
  });

  it('"ま"タブでマ行をフィルタする', () => {
    const result = filterPlotsByAiueo(plots, 'ま');
    expect(result).toHaveLength(1);
    expect(result[0].customerNameKana).toBe('マツモト');
  });

  it('"や"タブでヤ行をフィルタする', () => {
    const result = filterPlotsByAiueo(plots, 'や');
    expect(result).toHaveLength(1);
    expect(result[0].customerNameKana).toBe('ヤマダ');
  });

  it('"わ"タブでワ行をフィルタする', () => {
    const result = filterPlotsByAiueo(plots, 'わ');
    expect(result).toHaveLength(1);
    expect(result[0].customerNameKana).toBe('ワタナベ');
  });

  it('該当なしの場合空配列を返す', () => {
    const aPlots = [makePlotListItem({ id: '1', customerNameKana: 'アオキ' })];
    const result = filterPlotsByAiueo(aPlots, 'ら');
    expect(result).toHaveLength(0);
  });

  it('カナが空文字の場合フィルタから除外される', () => {
    const testPlots = [
      makePlotListItem({ id: '1', customerNameKana: '' }),
      makePlotListItem({ id: '2', customerNameKana: 'アオキ' }),
    ];
    const result = filterPlotsByAiueo(testPlots, 'あ');
    expect(result).toHaveLength(1);
    expect(result[0].customerNameKana).toBe('アオキ');
  });

  it('未定義のタブの場合全件を返す', () => {
    const result = filterPlotsByAiueo(plots, '未定義');
    expect(result).toHaveLength(plots.length);
  });

  it('ラ行のフィルタ', () => {
    const testPlots = [
      makePlotListItem({ id: '1', customerNameKana: 'リクチ' }),
    ];
    const result = filterPlotsByAiueo(testPlots, 'ら');
    expect(result).toHaveLength(1);
  });
});
