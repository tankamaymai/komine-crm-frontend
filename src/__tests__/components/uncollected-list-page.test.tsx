import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BillingCategory, type UnpaidBillingItem } from '@komine/types';
import UncollectedListPage from '@/components/uncollected/uncollected-list-page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const getUncollectedBillings = jest.fn();
jest.mock('@/lib/api/billings', () => ({
  getUncollectedBillings: (...a: unknown[]) => getUncollectedBillings(...a),
}));

jest.mock('@/components/page-header', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

const unpaidTanaka: UnpaidBillingItem = {
  billingId: 'b-1',
  contractPlotId: 'plot-1',
  customerId: 'cust-1',
  contractorName: '田中花子',
  buriedPersonName: '田中一郎',
  plotNumber: 'A-1',
  displayNumber: '東-1',
  category: BillingCategory.ManagementFee,
  year: 2024,
  remainingAmount: 5000,
};

beforeEach(() => {
  jest.clearAllMocks();
  getUncollectedBillings.mockResolvedValue({
    success: true,
    data: {
      items: [unpaidTanaka],
      pagination: { page: 1, limit: 50, totalCount: 1, totalPages: 1 },
    },
  });
});

describe('UncollectedListPage', () => {
  it('見出し「未収金一覧」が出る', async () => {
    render(<UncollectedListPage />);

    expect(screen.getByRole('heading', { name: '未収金一覧' })).toBeInTheDocument();
    await waitFor(() => {
      expect(getUncollectedBillings).toHaveBeenCalled();
    });
  });

  it('マウントで getUncollectedBillings が呼ばれる（q/year は空相当）', async () => {
    render(<UncollectedListPage />);

    await waitFor(() => {
      expect(getUncollectedBillings).toHaveBeenCalled();
    });

    const query = (getUncollectedBillings.mock.calls[0][0] ?? {}) as {
      q?: string;
      year?: number;
    };
    expect(query.q == null || query.q === '').toBe(true);
    expect(query.year == null || Number.isNaN(query.year)).toBe(true);
  });

  it('0件なら「未払いの請求はありません」', async () => {
    getUncollectedBillings.mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: { page: 1, limit: 50, totalCount: 0, totalPages: 0 },
      },
    });

    render(<UncollectedListPage />);

    expect(await screen.findByText('未払いの請求はありません')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '未収金一覧' })).toBeInTheDocument();
  });

  it('行をクリックすると区画詳細へ進む', async () => {
    const user = userEvent.setup();
    render(<UncollectedListPage />);

    expect(await screen.findByText('田中花子')).toBeInTheDocument();
    await user.click(screen.getByText('田中花子'));

    expect(mockPush).toHaveBeenCalledWith('/plots/plot-1');
  });

  it('「入れる」ボタンが無い', async () => {
    const user = userEvent.setup();
    render(<UncollectedListPage />);

    expect(await screen.findByText('田中花子')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '入れる' })).not.toBeInTheDocument();

    await user.click(screen.getByText('田中花子'));

    expect(screen.queryByRole('button', { name: '入れる' })).not.toBeInTheDocument();
  });

  it('API 失敗なら「探せませんでした。もう一度試してください」', async () => {
    getUncollectedBillings.mockRejectedValue(new Error('network'));
    render(<UncollectedListPage />);

    expect(await screen.findByText('探せませんでした。もう一度試してください')).toBeInTheDocument();
  });
});
