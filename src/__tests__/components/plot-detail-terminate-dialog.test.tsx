/**
 * 区画詳細の解約確認（この区画だけ / この人の全区画）
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import TerminateConfirmDialog from '@/components/plot-detail-sidebar/dialogs/TerminateConfirmDialog';

const getContractorPlotNumber = jest.fn();
jest.mock('@/lib/api/plots', () => ({
  getContractorPlotNumber: (...args: unknown[]) => getContractorPlotNumber(...args),
}));

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';

describe('TerminateConfirmDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getContractorPlotNumber.mockResolvedValue({
      success: true,
      data: { plotNumber: '一般墓地A 10・11' },
    });
  });

  it('この区画だけのときは、ほかの区画はそのままと書き、一覧は取りに行かない', () => {
    render(
      <TerminateConfirmDialog
        isOpen
        scope="one"
        plotNumber="10"
        customerName="山田太郎"
        onTerminate={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'この区画を解約' })).toBeInTheDocument();
    expect(screen.getByText(/ほかに持っている区画はそのままです/)).toBeInTheDocument();
    expect(getContractorPlotNumber).not.toHaveBeenCalled();
  });

  it('全区画のときは、その人の区画番号を全部並べる', async () => {
    render(
      <TerminateConfirmDialog
        isOpen
        scope="all"
        plotNumber="10"
        customerName="山田太郎"
        customerId={CUSTOMER_ID}
        onTerminate={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'この人の全区画を解約' })).toBeInTheDocument();
    expect(screen.getByText(/別の日に買った区画も一緒に終わります/)).toBeInTheDocument();
    expect(await screen.findByText('一般墓地A 10・11（山田太郎）')).toBeInTheDocument();
    expect(getContractorPlotNumber).toHaveBeenCalledWith(CUSTOMER_ID);
  });

  it('一覧が読めなければ、台帳で確かめるよう出す', async () => {
    getContractorPlotNumber.mockResolvedValue({ success: false, error: { message: 'x' } });
    render(
      <TerminateConfirmDialog
        isOpen
        scope="all"
        plotNumber="10"
        customerName="山田太郎"
        customerId={CUSTOMER_ID}
        onTerminate={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(await screen.findByText(/一覧を読めませんでした/)).toBeInTheDocument();
  });

  it('理由と確認のチェックがそろうまで押せず、そろうと理由を渡す', async () => {
    const user = userEvent.setup();
    const onTerminate = jest.fn();
    render(
      <TerminateConfirmDialog
        isOpen
        scope="all"
        plotNumber="10"
        customerName="山田太郎"
        customerId={CUSTOMER_ID}
        onTerminate={onTerminate}
        onClose={jest.fn()}
      />
    );
    await waitFor(() => expect(getContractorPlotNumber).toHaveBeenCalled());

    const submit = screen.getByRole('button', { name: '全部解約する' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/解約理由/), '  全区画の返還  ');
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onTerminate).toHaveBeenCalledWith('全区画の返還');
  });
});
