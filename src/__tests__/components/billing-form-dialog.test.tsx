import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillingFormDialog } from '@/components/billing/billing-form-dialog';

const plotId = '123e4567-e89b-12d3-a456-426614174000';
const customerId = '123e4567-e89b-12d3-a456-426614174001';

function openCreate(onSubmit = jest.fn()) {
  render(<BillingFormDialog open onClose={jest.fn()} onSubmit={onSubmit} />);
  return onSubmit;
}

async function fillIds() {
  const user = userEvent.setup();
  const ids = screen.getAllByPlaceholderText('UUID');
  await user.type(ids[0], plotId);
  await user.type(ids[1], customerId);
  return user;
}

describe('請求の登録フォーム', () => {
  it('小数の金額では保存せず、整数と知らせる', async () => {
    const onSubmit = openCreate();
    const user = await fillIds();
    const amount = screen.getAllByRole('spinbutton')[0];
    await user.clear(amount);
    fireEvent.change(amount, { target: { value: '1.5' } });
    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/整数/)).toBeInTheDocument();
  });

  it('2001文字のメモでは保存しない', async () => {
    const onSubmit = openCreate();
    const user = await fillIds();
    fireEvent.change(screen.getByPlaceholderText('備考があれば記入'), {
      target: { value: 'あ'.repeat(2001) },
    });
    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/2000/)).toBeInTheDocument();
  });

  it('整数の金額なら保存する', async () => {
    const onSubmit = openCreate();
    const user = await fillIds();
    const amount = screen.getAllByRole('spinbutton')[0];
    await user.clear(amount);
    await user.type(amount, '1000');
    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        contractPlotId: plotId,
        customerId,
        amount: 1000,
      })
    );
  });

  it('1899年では保存しない', async () => {
    const onSubmit = openCreate();
    const user = await fillIds();
    await user.type(screen.getByPlaceholderText('2026'), '1899');
    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/1900/)).toBeInTheDocument();
  });
});
