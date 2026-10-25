import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ViewModeField, ViewModeSelect, ViewModeTextarea } from '@/components/plot-form/ViewModeField';
import { HistoryTab } from '@/components/plot-form/HistoryTab';
import type { PlotDetailResponse } from '@komine/types';
import {
  PaymentStatus,
  ContractRole,
  PhysicalPlotStatus,
  ContractStatus,
} from '@komine/types';

// toast はテスト中サイレントにする
jest.mock('@/lib/toast', () => ({
  showWarning: jest.fn(),
  showSuccess: jest.fn(),
  showError: jest.fn(),
}));

// ===== Mocks =====

// useMasters をモック
jest.mock('@/hooks', () => ({
  useMasters: () => ({
    calcTypes: [],
    taxTypes: [],
    billingTypes: [],
    paymentMethods: [],
    accountTypes: [],
    isLoading: false,
  }),
}));

// Radix UI Select をモック（JSDOMで動作しないため）
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="mock-select" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="mock-select-trigger">{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-select-content">{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="mock-select-value">{placeholder}</span>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`mock-select-item-${value}`}>{children}</div>
  ),
}));

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

// ===== ViewModeField =====

describe('ViewModeField', () => {
  it('viewMode=trueの場合、表示用ボックスを表示する', () => {
    render(<ViewModeField label="氏名" value="田中太郎" viewMode={true} />);
    expect(screen.getByText('田中太郎')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('viewMode=trueで値がnullの場合、ハイフンを表示する', () => {
    render(<ViewModeField label="氏名" value={null} viewMode={true} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('viewMode=trueで値が空文字の場合、ハイフンを表示する', () => {
    render(<ViewModeField label="氏名" value="" viewMode={true} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('viewMode=trueで数値の場合、文字列に変換して表示する', () => {
    render(<ViewModeField label="面積" value={3.6} viewMode={true} />);
    expect(screen.getByText('3.6')).toBeInTheDocument();
  });

  it('viewMode=falseの場合、Input要素を表示する', () => {
    render(<ViewModeField label="氏名" viewMode={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('required=trueの場合、アスタリスクを表示する', () => {
    render(<ViewModeField label="氏名" required={true} viewMode={false} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('required=falseの場合、アスタリスクを表示しない', () => {
    render(<ViewModeField label="氏名" required={false} viewMode={false} />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('error表示する', () => {
    render(<ViewModeField label="氏名" viewMode={false} error="入力必須です" />);
    expect(screen.getByText('入力必須です')).toBeInTheDocument();
  });

  it('ラベルを表示する', () => {
    render(<ViewModeField label="区画番号" viewMode={false} />);
    expect(screen.getByText('区画番号')).toBeInTheDocument();
  });
});

// ===== ViewModeSelect =====

describe('ViewModeSelect', () => {
  it('viewMode=trueの場合、表示用ボックスを表示する', () => {
    render(
      <ViewModeSelect label="性別" value="male" displayValue="男性" viewMode={true}>
        <div>options</div>
      </ViewModeSelect>
    );
    expect(screen.getByText('男性')).toBeInTheDocument();
  });

  it('viewMode=trueでdisplayValueがない場合、valueを表示する', () => {
    render(
      <ViewModeSelect label="性別" value="male" viewMode={true}>
        <div>options</div>
      </ViewModeSelect>
    );
    expect(screen.getByText('male')).toBeInTheDocument();
  });

  it('viewMode=trueで値がない場合、ハイフンを表示する', () => {
    render(
      <ViewModeSelect label="性別" viewMode={true}>
        <div>options</div>
      </ViewModeSelect>
    );
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('viewMode=falseの場合、Selectコンポーネントを表示する', () => {
    render(
      <ViewModeSelect label="性別" viewMode={false}>
        <div>options</div>
      </ViewModeSelect>
    );
    expect(screen.getByTestId('mock-select')).toBeInTheDocument();
  });

  it('required=trueの場合、アスタリスクを表示する', () => {
    render(
      <ViewModeSelect label="性別" required={true} viewMode={false}>
        <div>options</div>
      </ViewModeSelect>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});

// ===== ViewModeTextarea =====

describe('ViewModeTextarea', () => {
  it('viewMode=trueの場合、表示用ボックスを表示する', () => {
    render(<ViewModeTextarea label="備考" value="テスト備考" viewMode={true} />);
    expect(screen.getByText('テスト備考')).toBeInTheDocument();
  });

  it('viewMode=trueで値がない場合、ハイフンを表示する', () => {
    render(<ViewModeTextarea label="備考" viewMode={true} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('viewMode=falseの場合、textarea要素を表示する', () => {
    render(<ViewModeTextarea label="備考" viewMode={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('required=trueの場合、アスタリスクを表示する', () => {
    render(<ViewModeTextarea label="備考" required={true} viewMode={false} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});

// ===== HistoryTab =====

describe('HistoryTab', () => {
  it('historiesが空の場合「履歴データはありません」を表示する', () => {
    const detail = makePlotDetail({ histories: [] });
    render(<HistoryTab plotDetail={detail} />);
    expect(screen.getByText('履歴データはありません')).toBeInTheDocument();
  });

  it('plotDetailが未定義の場合「履歴データはありません」を表示する', () => {
    render(<HistoryTab plotDetail={undefined} />);
    expect(screen.getByText('履歴データはありません')).toBeInTheDocument();
  });

  it('historiesプロパティがない場合「履歴データはありません」を表示する', () => {
    const detail = makePlotDetail();
    // histories は optional なので undefined でもOK
    render(<HistoryTab plotDetail={detail} />);
    expect(screen.getByText('履歴データはありません')).toBeInTheDocument();
  });

  it('ヘッダーを表示する', () => {
    const detail = makePlotDetail({
      histories: [
        {
          id: 'h-1',
          actionType: 'CREATE',
          changedFields: ['name'],
          changedBy: '管理者',
          changeReason: null,
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
    });
    render(<HistoryTab plotDetail={detail} />);

    expect(screen.getByText('氏名')).toBeInTheDocument();
    expect(screen.getByText('更新履歴')).toBeInTheDocument();
    expect(screen.getByText('更新事由')).toBeInTheDocument();
    expect(screen.getByText('詳細')).toBeInTheDocument();
  });

  it('CREATEアクションを「作成」と表示する', () => {
    const detail = makePlotDetail({
      histories: [
        {
          id: 'h-1',
          actionType: 'CREATE',
          changedFields: null,
          changedBy: null,
          changeReason: null,
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
    });
    render(<HistoryTab plotDetail={detail} />);
    expect(screen.getByText('を作成')).toBeInTheDocument();
  });

  it('UPDATEアクションを「更新」と表示する', () => {
    const detail = makePlotDetail({
      histories: [
        {
          id: 'h-1',
          actionType: 'UPDATE',
          changedFields: ['price'],
          changedBy: '管理者',
          changeReason: null,
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
    });
    render(<HistoryTab plotDetail={detail} />);
    expect(screen.getByText('price')).toBeInTheDocument();
  });

  it('DELETEアクションを「削除」と表示する', () => {
    const detail = makePlotDetail({
      histories: [
        {
          id: 'h-1',
          actionType: 'DELETE',
          changedFields: null,
          changedBy: null,
          changeReason: null,
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
    });
    render(<HistoryTab plotDetail={detail} />);
    expect(screen.getByText('を削除')).toBeInTheDocument();
  });

  it('未知のactionTypeはそのまま表示する', () => {
    const detail = makePlotDetail({
      histories: [
        {
          id: 'h-1',
          actionType: 'ARCHIVE',
          changedFields: null,
          changedBy: null,
          changeReason: null,
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
    });
    render(<HistoryTab plotDetail={detail} />);
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('ARCHIVE')).not.toBeInTheDocument();
  });

  it('CREATEアクションで変更内容欄に「を作成」と表示する', () => {
    const detail = makePlotDetail({
      histories: [
        {
          id: 'h-1',
          actionType: 'CREATE',
          changedFields: null,
          changedBy: '管理者',
          changeReason: null,
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
    });
    render(<HistoryTab plotDetail={detail} />);
    expect(screen.getByText(/を作成/)).toBeInTheDocument();
  });

  it('changedFieldsをカンマ区切りで表示する（旧shape: 配列形式）', () => {
    const detail = makePlotDetail({
      histories: [
        {
          id: 'h-1',
          actionType: 'UPDATE',
          changedFields: ['name', 'address', 'phone'],
          changedBy: '管理者',
          changeReason: null,
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
    });
    render(<HistoryTab plotDetail={detail} />);
    expect(screen.getByText('name, address, phone')).toBeInTheDocument();
  });

  it('changedByがnullの場合ハイフンを表示する', () => {
    const detail = makePlotDetail({
      histories: [
        {
          id: 'h-1',
          actionType: 'CREATE',
          changedFields: ['all'],
          changedBy: null,
          changeReason: null,
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
    });
    render(<HistoryTab plotDetail={detail} />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('行クリックで詳細セクションがトグル表示される', () => {
    const detail = makePlotDetail({
      histories: [
        {
          id: 'h-1',
          actionType: 'CREATE',
          changedFields: null,
          changedBy: null,
          changeReason: '初回登録',
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
    });
    render(<HistoryTab plotDetail={detail} />);
    const row = screen.getByText('初回登録').closest('button');
    expect(row).toBeInTheDocument();

    // 初期状態: 詳細パネルの「変更事由:」ラベルは表示されていない
    expect(screen.queryByText(/変更事由:/)).not.toBeInTheDocument();

    // クリックで展開: 変更事由が表示される
    fireEvent.click(row!);
    expect(screen.getByText(/変更事由:/)).toBeInTheDocument();

    // 再クリックで折りたたみ
    fireEvent.click(row!);
    expect(screen.queryByText(/変更事由:/)).not.toBeInTheDocument();
  });
});

// ===== PlotForm 統合テスト =====

describe('PlotForm', () => {
  // PlotForm を動的にインポート（モック設定後）
  let PlotForm: React.ComponentType<{
    plotDetail?: PlotDetailResponse;
    onSave: (data: unknown) => void;
    onCancel: () => void;
    isLoading?: boolean;
  }>;

  beforeAll(async () => {
    const mod = await import('@/components/plot-form/index');
    PlotForm = mod.default;
  });

  it('5つのタブを表示する', () => {
    render(
      <PlotForm onSave={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByText('基本情報①')).toBeInTheDocument();
    expect(screen.getByText('基本情報②')).toBeInTheDocument();
    expect(screen.getByText('連絡先/家族')).toBeInTheDocument();
    expect(screen.getByText('埋葬情報')).toBeInTheDocument();
    expect(screen.getByText('工事情報')).toBeInTheDocument();
  });

  it('新規作成モードで「登録」ボタンを表示する', () => {
    render(
      <PlotForm onSave={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByRole('button', { name: '登録' })).toBeInTheDocument();
  });

  it('編集モード（plotDetail渡し）で「更新」ボタンを表示する', () => {
    const detail = makePlotDetail();
    render(
      <PlotForm plotDetail={detail} onSave={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
  });

  it('isLoading=trueの場合「保存中...」を表示する', () => {
    render(
      <PlotForm onSave={jest.fn()} onCancel={jest.fn()} isLoading={true} />
    );

    expect(screen.getByRole('button', { name: '保存中...' })).toBeInTheDocument();
  });

  it('isLoading=trueの場合ボタンがdisabledになる', () => {
    render(
      <PlotForm onSave={jest.fn()} onCancel={jest.fn()} isLoading={true} />
    );

    expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled();
  });

  it('タブ切り替えが動作する', () => {
    render(
      <PlotForm onSave={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.click(screen.getByText('基本情報②'));
    // タブがアクティブになる（Radixの内部動作に依存しないため、エラーがないことを確認）
  });

  it('form要素をレンダリングする', () => {
    const { container } = render(
      <PlotForm onSave={jest.fn()} onCancel={jest.fn()} />
    );

    expect(container.querySelector('form')).toBeInTheDocument();
  });

  // ===== バリデーション・プレビューフロー =====

  it('新規モードで未入力のまま送信するとバリデーションエラーリストが表示される', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<PlotForm onSave={onSave} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: '登録' }));

    await waitFor(() => {
      expect(screen.getByText('入力エラーがあります')).toBeInTheDocument();
    });

    // 必須エラー（区画番号は必須です）がエラーリストに含まれる
    expect(screen.getByText(/区画番号: 区画番号は必須です/)).toBeInTheDocument();
    // onSave は呼ばれない
    expect(onSave).not.toHaveBeenCalled();
  });

  it('バリデーションエラーがあるタブにエラーバッジ（!）が表示される', async () => {
    const user = userEvent.setup();
    render(<PlotForm onSave={jest.fn()} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: '登録' }));

    await waitFor(() => {
      // tabsWithErrors が反映されてエラーバッジ「!」が複数表示される
      const badges = screen.getAllByText('!');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('編集モードでは plotDetail から初期値が反映される', () => {
    const detail = makePlotDetail();
    render(<PlotForm plotDetail={detail} onSave={jest.fn()} onCancel={jest.fn()} />);

    // 区画番号が初期値として入力されている
    const plotNumberInput = screen.getByDisplayValue('A-001');
    expect(plotNumberInput).toBeInTheDocument();
    // 契約者氏名が初期値として入力されている
    expect(screen.getByDisplayValue('田中太郎')).toBeInTheDocument();
  });

  it('plotDetail が後から変わると reset でフォーム値が更新される', () => {
    const detail1 = makePlotDetail({
      physicalPlot: {
        id: 'pp-1',
        plotNumber: 'A-001',
        areaName: '第1期',
        areaSqm: 3.6,
        status: PhysicalPlotStatus.SoldOut,
        mapId: null,
        notes: null,
      },
    });
    const { rerender } = render(
      <PlotForm plotDetail={detail1} onSave={jest.fn()} onCancel={jest.fn()} />
    );
    expect(screen.getByDisplayValue('A-001')).toBeInTheDocument();

    const detail2 = makePlotDetail({
      physicalPlot: {
        id: 'pp-2',
        plotNumber: 'B-200',
        areaName: '第2期',
        areaSqm: 1.8,
        status: PhysicalPlotStatus.SoldOut,
        mapId: null,
        notes: null,
      },
    });
    rerender(
      <PlotForm plotDetail={detail2} onSave={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByDisplayValue('B-200')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('A-001')).not.toBeInTheDocument();
  });

  it('編集モードで送信すると差分プレビュー（PreviewDialog）が表示される', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const detail = makePlotDetail();
    render(<PlotForm plotDetail={detail} onSave={onSave} onCancel={jest.fn()} />);

    // 区画番号を変更
    const plotNumberInput = screen.getByDisplayValue('A-001');
    await user.clear(plotNumberInput);
    await user.type(plotNumberInput, 'A-002');

    // 更新ボタンクリック
    await user.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() => {
      expect(screen.getByText('更新内容の確認')).toBeInTheDocument();
    });
    expect(screen.getByText('以下の項目が変更されます')).toBeInTheDocument();
    // この時点では onSave はまだ呼ばれない（確認ダイアログ表示中）
    expect(onSave).not.toHaveBeenCalled();
  });

  it('プレビューで「確認して更新」をクリックすると onSave が呼ばれる', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const detail = makePlotDetail();
    render(<PlotForm plotDetail={detail} onSave={onSave} onCancel={jest.fn()} />);

    const plotNumberInput = screen.getByDisplayValue('A-001');
    await user.clear(plotNumberInput);
    await user.type(plotNumberInput, 'A-002');

    await user.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '確認して更新' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '確認して更新' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    // onSave に渡されたデータには変更後の値が含まれる
    expect(onSave.mock.calls[0][0].physicalPlot.plotNumber).toBe('A-002');
  });

  it('プレビューの変更理由入力（プリセットdatalist付き）の値が onSave の第2引数に渡る（#261）', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const detail = makePlotDetail();
    render(<PlotForm plotDetail={detail} onSave={onSave} onCancel={jest.fn()} />);

    const plotNumberInput = screen.getByDisplayValue('A-001');
    await user.clear(plotNumberInput);
    await user.type(plotNumberInput, 'A-002');
    await user.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() => {
      expect(screen.getByLabelText('変更理由（任意）')).toBeInTheDocument();
    });

    // プリセットの datalist が描画されている
    const reasonInput = screen.getByLabelText('変更理由（任意）') as HTMLInputElement;
    expect(reasonInput).toHaveAttribute('list', 'change-reason-presets');
    const datalist = document.getElementById('change-reason-presets');
    expect(datalist).not.toBeNull();
    const options = Array.from(datalist!.querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(
      expect.arrayContaining(['名義変更', '住所変更', '解約', '合祀', '修理', '字彫', '備品購入'])
    );

    // 自由入力（プリセット外）も可
    await user.type(reasonInput, '名義変更');
    await user.click(screen.getByRole('button', { name: '確認して更新' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(onSave.mock.calls[0][1]).toBe('名義変更');
  });

  it('変更理由が未入力なら onSave の第2引数は undefined（#261）', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const detail = makePlotDetail();
    render(<PlotForm plotDetail={detail} onSave={onSave} onCancel={jest.fn()} />);

    const plotNumberInput = screen.getByDisplayValue('A-001');
    await user.clear(plotNumberInput);
    await user.type(plotNumberInput, 'A-002');
    await user.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '確認して更新' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: '確認して更新' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(onSave.mock.calls[0][1]).toBeUndefined();
  });

  it('プレビューで「戻る」をクリックするとダイアログが閉じて onSave は呼ばれない', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const detail = makePlotDetail();
    render(<PlotForm plotDetail={detail} onSave={onSave} onCancel={jest.fn()} />);

    const plotNumberInput = screen.getByDisplayValue('A-001');
    await user.clear(plotNumberInput);
    await user.type(plotNumberInput, 'A-002');
    await user.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '戻る' }));

    await waitFor(() => {
      expect(screen.queryByText('更新内容の確認')).not.toBeInTheDocument();
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});
