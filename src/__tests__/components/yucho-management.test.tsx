import type { ComponentType, ReactNode } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const getYuchoBilling = jest.fn();
const exportYuchoCsv = jest.fn();
const generateMonthBilling = jest.fn();
jest.mock('@/lib/api/billings', () => ({
  generateMonthBilling: (...a: unknown[]) => generateMonthBilling(...a),
}));
jest.mock('@/lib/api/yucho', () => ({
  getYuchoBilling: (...a: unknown[]) => getYuchoBilling(...a),
  exportYuchoCsv: (...a: unknown[]) => exportYuchoCsv(...a),
  downloadBlob: jest.fn(),
}));

jest.mock('@/components/page-header', () => ({
  __esModule: true,
  default: () => null,
}));

// Radix Select は jsdom で開けないので、ネイティブの select に置き換える
jest.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({
    value,
    disabled,
    children,
  }: {
    value: string;
    disabled?: boolean;
    children: ReactNode;
  }) => (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  ),
}));

const billingResponse = {
  success: true,
  data: {
    period: { year: 2026, month: 5 },
    items: [
      {
        category: 'management',
        sourceId: 'fee-1',
        contractPlotId: 'plot-1',
        plotNumber: 'A-1',
        displayNumber: 'A-1',
        areaName: '第1期',
        contractDate: '2020-01-01',
        customerId: 'cust-1',
        customerName: '見本 太郎',
        customerNameKana: 'ミホン タロウ',
        billingAmount: 12000,
        billingStatus: 'pending',
        scheduledDate: null,
        billingMonth: 5,
        billingInfo: {
          bankName: 'ゆうちょ銀行',
          branchName: null,
          accountType: 'ordinary',
          accountNumber: null,
          accountHolder: 'ミホン タロウ',
          yuchoSymbol: '19990',
          yuchoNumber: '12345671',
        },
      },
    ],
    summary: {
      totalCount: 1,
      totalAmount: 12000,
      exportableCount: 1,
      exportableAmount: 12000,
      excludedNoAccountCount: 0,
      byCategory: {
        management: { count: 1, amount: 12000 },
        collective: { count: 0, amount: 0 },
      },
    },
    exportSettings: { zenginReady: false, missing: ['会社の番号（委託者コード）'] },
  },
};

let YuchoManagement: ComponentType;

beforeAll(() => {
  // 年・月・曜日を固定する（2026-05-10）。タイマーは本物のまま
  jest.useFakeTimers({
    now: new Date('2026-05-10T09:00:00+09:00'),
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'queueMicrotask',
      'nextTick',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'performance',
      'hrtime',
    ],
  });
  YuchoManagement = jest.requireActual('@/components/yucho/YuchoManagement').default;
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  getYuchoBilling.mockResolvedValue(billingResponse);
  exportYuchoCsv.mockResolvedValue(new Blob(['']));
  generateMonthBilling.mockResolvedValue({
    success: true,
    data: {
      year: 2026,
      month: 5,
      apply: false,
      created: 2,
      skippedExisting: 1,
      skippedPrepaid: 0,
      skippedNoAmount: 0,
      skippedNoCustomer: 0,
      needsReview: 0,
    },
  });
});

// 画面の並びは 年 → 月 → 引き落とし日
const daySelect = () => screen.getAllByRole('combobox')[2]!;

describe('YuchoManagement', () => {
  it('管理料だけを取りに行き、合祀料金は画面に出さない', async () => {
    render(<YuchoManagement />);

    await waitFor(() => expect(screen.getAllByText('見本 太郎').length).toBeGreaterThan(0));
    expect(getYuchoBilling).toHaveBeenCalledWith({
      year: 2026,
      month: 5,
      status: 'unbilled',
      category: 'management',
    });
    expect(screen.queryByText(/合祀/)).not.toBeInTheDocument();
  });

  it('引き落とし日はその月の全部の日から選べて、ゆうちょの休みは選べない', async () => {
    render(<YuchoManagement />);
    await waitFor(() => expect(screen.getAllByText('見本 太郎').length).toBeGreaterThan(0));

    expect(daySelect().querySelectorAll('option')).toHaveLength(31);
    expect(daySelect()).toHaveValue('15');
    expect(screen.getByRole('option', { name: '15日（金）' })).toBeEnabled();
    expect(screen.getByRole('option', { name: '17日（日） 休み（土日）' })).toBeDisabled();
    expect(screen.getByRole('option', { name: '6日（水） 休み（祝日）' })).toBeDisabled();
  });

  it('月を変えて選んでいた日が休みになったら、近い営業日へ寄せる', async () => {
    render(<YuchoManagement />);
    await waitFor(() => expect(screen.getAllByText('見本 太郎').length).toBeGreaterThan(0));

    fireEvent.change(screen.getAllByRole('combobox')[1]!, { target: { value: '2' } });

    // 2026-02-15 は日曜 → 16日（月）
    await waitFor(() => expect(daySelect()).toHaveValue('16'));
    expect(daySelect().querySelectorAll('option')).toHaveLength(28);
  });

  it('決済CSVは選んだ日と管理料だけで出力を頼む', async () => {
    render(<YuchoManagement />);
    await waitFor(() => expect(screen.getAllByText('見本 太郎').length).toBeGreaterThan(0));

    fireEvent.change(daySelect(), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: '決済CSV' }));

    await waitFor(() =>
      expect(exportYuchoCsv).toHaveBeenCalledWith({
        year: 2026,
        month: 5,
        category: 'management',
        kind: 'debit',
        transferDay: 18,
        transferMonth: 5,
      }),
    );
  });

  it('選んだ年と月で、まだ請求が無い人の請求を作る', async () => {
    render(<YuchoManagement />);
    const button = await screen.findByRole('button', { name: '2026年5月の請求を作る' });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() =>
      expect(generateMonthBilling).toHaveBeenCalledWith({
        year: 2026,
        month: 5,
        apply: true,
      }),
    );
  });
});
