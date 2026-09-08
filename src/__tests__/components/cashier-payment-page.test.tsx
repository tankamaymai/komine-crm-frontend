import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BillingCategory, type UnpaidBillingItem } from '@komine/types';
import CashierPaymentPage from '@/components/cashier/cashier-payment-page';

const mockUseHasPermission = jest.fn();
jest.mock('@/hooks', () => ({
  useHasPermission: (...args: unknown[]) => mockUseHasPermission(...args),
}));

const getUnpaidBillings = jest.fn();
jest.mock('@/lib/api/billings', () => ({
  getUnpaidBillings: (...a: unknown[]) => getUnpaidBillings(...a),
  BILLING_CATEGORY_LABELS: {
    usage_fee: '使用料',
    management_fee: '管理料',
    collective_fee: '合祀料金',
    construction_fee: '工事料金',
    gravestone_fee: '墓石代',
    other: 'その他',
  },
}));

const settleRemaining = jest.fn();
jest.mock('@/lib/api/payments', () => ({
  settleRemaining: (...a: unknown[]) => settleRemaining(...a),
}));

jest.mock('@/components/page-header', () => ({
  __esModule: true,
  default: () => null,
}));

const THIS_YEAR = Number(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date())
);

const unpaidTanaka: UnpaidBillingItem = {
  billingId: 'b-1',
  contractPlotId: 'plot-1',
  customerId: 'cust-1',
  contractorName: '田中花子',
  buriedPersonName: '田中一郎',
  plotNumber: 'A-1',
  displayNumber: '東-1',
  category: BillingCategory.ManagementFee,
  year: THIS_YEAR,
  remainingAmount: 5000,
};

const unpaidSato: UnpaidBillingItem = {
  billingId: 'b-2',
  contractPlotId: 'plot-2',
  customerId: 'cust-2',
  contractorName: '佐藤次郎',
  buriedPersonName: null,
  plotNumber: 'B-2',
  displayNumber: null,
  category: BillingCategory.UsageFee,
  year: THIS_YEAR,
  remainingAmount: 3000,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseHasPermission.mockReturnValue(true);
  getUnpaidBillings.mockResolvedValue({
    success: true,
    data: { items: [unpaidTanaka, unpaidSato] },
  });
  settleRemaining.mockResolvedValue({
    success: true,
    data: { id: 'p-1' },
  });
});

describe('CashierPaymentPage', () => {
  it('名前空で探すと案内を出し、APIは呼ばない', async () => {
    const user = userEvent.setup();
    render(<CashierPaymentPage />);

    await user.click(screen.getByRole('button', { name: '探す' }));

    expect(screen.getByText('名前か区画番号を書いてください')).toBeInTheDocument();
    expect(getUnpaidBillings).not.toHaveBeenCalled();
  });

  it('「田中」で探すと今年・管理料で未払いを取る', async () => {
    const user = userEvent.setup();
    render(<CashierPaymentPage />);

    await user.type(screen.getByRole('textbox'), '田中');
    await user.click(screen.getByRole('button', { name: '探す' }));

    await waitFor(() => {
      expect(getUnpaidBillings).toHaveBeenCalledWith({
        q: '田中',
        year: THIS_YEAR,
        category: 'management_fee',
      });
    });
  });

  it('種類を全部・年を空にして探すと year と category を送らない', async () => {
    const user = userEvent.setup();
    render(<CashierPaymentPage />);

    await user.type(screen.getByRole('textbox'), '田中');
    await user.selectOptions(screen.getByRole('combobox'), '');
    await user.clear(screen.getByRole('spinbutton'));
    await user.click(screen.getByRole('button', { name: '探す' }));

    await waitFor(() => {
      expect(getUnpaidBillings).toHaveBeenCalledWith({
        q: '田中',
        year: undefined,
        category: undefined,
      });
    });
  });

  it('行を押して入れると残額入金し、その行が消える', async () => {
    const user = userEvent.setup();
    render(<CashierPaymentPage />);

    await user.type(screen.getByRole('textbox'), '田中');
    await user.click(screen.getByRole('button', { name: '探す' }));

    expect(await screen.findByText('田中花子')).toBeInTheDocument();
    await user.click(screen.getByText('田中花子'));

    expect(
      await screen.findByText(
        `田中花子 / 東-1 / ${THIS_YEAR}年の管理料 / 5000円 を、今日の日付で入れますか？`
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '入れる' }));

    await waitFor(() => {
      expect(settleRemaining).toHaveBeenCalledWith({ billingId: 'b-1' });
    });
    await waitFor(() => {
      expect(screen.queryByText('田中花子')).not.toBeInTheDocument();
    });
    expect(screen.getByText('佐藤次郎')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('田中');
  });

  it('探す結果が0件なら未払いなしだけ出し、探してくださいは出さない', async () => {
    getUnpaidBillings.mockResolvedValue({
      success: true,
      data: { items: [] },
    });
    const user = userEvent.setup();
    render(<CashierPaymentPage />);

    await user.type(screen.getByRole('textbox'), '田中');
    await user.click(screen.getByRole('button', { name: '探す' }));

    expect(await screen.findByText('未払いの請求はありません')).toBeInTheDocument();
    expect(screen.queryByText('名前か区画番号を書いて探してください')).not.toBeInTheDocument();
  });

  it('探すが失敗してメッセージ無しなら探せませんでしたを出し、保存メッセージは出さない', async () => {
    getUnpaidBillings.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    render(<CashierPaymentPage />);

    await user.type(screen.getByRole('textbox'), '田中');
    await user.click(screen.getByRole('button', { name: '探す' }));

    expect(await screen.findByText('探せませんでした。もう一度試してください')).toBeInTheDocument();
    expect(screen.queryByText('保存できませんでした。もう一度試してください')).not.toBeInTheDocument();
  });

  it('探すがAPI失敗でメッセージ無しなら探せませんでしたを出す', async () => {
    getUnpaidBillings.mockResolvedValue({
      success: false,
      error: { message: '' },
    });
    const user = userEvent.setup();
    render(<CashierPaymentPage />);

    await user.type(screen.getByRole('textbox'), '田中');
    await user.click(screen.getByRole('button', { name: '探す' }));

    expect(await screen.findByText('探せませんでした。もう一度試してください')).toBeInTheDocument();
    expect(screen.queryByText('保存できませんでした。もう一度試してください')).not.toBeInTheDocument();
  });

  it('権限が無いと入れるボタンが無い、または押せない', async () => {
    mockUseHasPermission.mockReturnValue(false);
    const user = userEvent.setup();
    render(<CashierPaymentPage />);

    await user.type(screen.getByRole('textbox'), '田中');
    await user.click(screen.getByRole('button', { name: '探す' }));

    expect(await screen.findByText('田中花子')).toBeInTheDocument();
    await user.click(screen.getByText('田中花子'));

    expect(
      await screen.findByText(
        `田中花子 / 東-1 / ${THIS_YEAR}年の管理料 / 5000円 を、今日の日付で入れますか？`
      )
    ).toBeInTheDocument();

    const enterButton = screen.queryByRole('button', { name: '入れる' });
    if (enterButton) {
      expect(enterButton).toBeDisabled();
    } else {
      expect(enterButton).not.toBeInTheDocument();
    }
  });
});
