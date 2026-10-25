import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BillingListTable } from '@/components/billing/billing-list-table';
import type { Billing } from '@komine/types';
import { LEGACY_VALUE_NOTE } from '@/lib/legacy-plot-display';

/**
 * #171: 請求一覧の空状態テスト
 * - emptyState 未指定時は既定メッセージ
 * - emptyState 指定時は文脈付き説明を表示（理由・次のアクション）
 */
describe('BillingListTable empty state', () => {
  it('items が空で emptyState 未指定なら既定メッセージを表示する', () => {
    render(<BillingListTable items={[]} />);
    expect(screen.getByText('請求データがありません')).toBeInTheDocument();
  });

  it('items が空で emptyState 指定なら、その文脈付きノードを表示し既定メッセージは出さない', () => {
    render(
      <BillingListTable
        items={[]}
        emptyState={
          <div>
            <p>発行済みの請求はありません</p>
            <p>「新規登録」から請求を追加してください</p>
          </div>
        }
      />
    );
    expect(screen.getByText('発行済みの請求はありません')).toBeInTheDocument();
    expect(screen.getByText(/新規登録/)).toBeInTheDocument();
    expect(screen.queryByText('請求データがありません')).not.toBeInTheDocument();
  });

  it('読み込み中は emptyState ではなくローディング表示を出す', () => {
    render(
      <BillingListTable
        items={[]}
        isLoading
        emptyState={<p>発行済みの請求はありません</p>}
      />
    );
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    expect(screen.queryByText('発行済みの請求はありません')).not.toBeInTheDocument();
  });
});

/**
 * #283: 請求一覧の区画番号も displayNumber 優先・legacy-* はミュート表示。
 */
describe('BillingListTable の区画番号表示 (#283)', () => {
  const makeBilling = (overrides: Partial<Billing>): Billing =>
    ({
      id: 'b1',
      amount: 5000,
      paidAmount: 0,
      plotNumber: 'legacy-0',
      displayNumber: null,
      areaName: '第1期',
      customer: null,
      ...overrides,
    } as unknown as Billing);

  it('displayNumber があれば業務番号を表示し、生の legacy 値は出さない', () => {
    render(<BillingListTable items={[makeBilling({ displayNumber: 'A-1', plotNumber: 'legacy-101' })]} />);
    const el = screen.getByText('A-1');
    expect(el).not.toHaveAttribute('title', LEGACY_VALUE_NOTE);
    expect(screen.queryByText('legacy-101')).not.toBeInTheDocument();
  });

  it('displayNumber 未設定の legacy 区画は「整備中」ミュート表示にする', () => {
    render(<BillingListTable items={[makeBilling({ displayNumber: null, plotNumber: 'legacy-3' })]} />);
    const el = screen.getByText('legacy-3');
    expect(el).toHaveAttribute('title', LEGACY_VALUE_NOTE);
    expect(el.className).toContain('italic');
  });
});

/**
 * #307: 二次画面の areaName も legacy-aware 表示にする。
 * 正規化済みの期名はそのまま、レガシー移行値（1-29 等）は「整備中」ミュート表示。
 */
describe('BillingListTable の areaName 表示 (#307)', () => {
  const makeBilling = (overrides: Partial<Billing>): Billing =>
    ({
      id: 'b1',
      amount: 5000,
      paidAmount: 0,
      plotNumber: 'A-1',
      displayNumber: 'A-1',
      areaName: '第1期',
      customer: null,
      ...overrides,
    } as unknown as Billing);

  it('正規化済みの areaName はミュートせずそのまま表示する', () => {
    render(<BillingListTable items={[makeBilling({ areaName: '第1期' })]} />);
    const el = screen.getByText('第1期');
    expect(el).not.toHaveAttribute('title', LEGACY_VALUE_NOTE);
  });

  it('legacy 移行値の areaName は「整備中」ミュート表示にする', () => {
    render(<BillingListTable items={[makeBilling({ areaName: '1-29' })]} />);
    const el = screen.getByText('1-29');
    expect(el).toHaveAttribute('title', LEGACY_VALUE_NOTE);
    expect(el.className).toContain('italic');
  });
});

/**
 * 前受金の行は 1 年だけ消すとまとまりが壊れるため、
 * 「前受取り消し」だけ出し、通常の削除・編集は出さない。
 */
describe('BillingListTable の前受取り消し', () => {
  const makeBilling = (overrides: Partial<Billing>): Billing =>
    ({
      id: 'b1',
      amount: 1250,
      paidAmount: 1250,
      category: 'management_fee',
      status: 'paid',
      plotNumber: 'A-12',
      displayNumber: 'A-12',
      areaName: '第1期',
      customer: null,
      prepaidBatchId: null,
      ...overrides,
    } as unknown as Billing);

  it('前受の行には「前受取り消し」を出し、削除と編集は出さない', () => {
    render(
      <BillingListTable
        items={[makeBilling({ prepaidBatchId: 'batch-1' })]}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onCancelPrepaid={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: '前受取り消し' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
  });

  it('通常の請求行には「前受取り消し」を出さない', () => {
    render(
      <BillingListTable
        items={[makeBilling({ prepaidBatchId: null })]}
        onDelete={jest.fn()}
        onCancelPrepaid={jest.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: '前受取り消し' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('前受取り消しを押すとその行を渡す', async () => {
    const user = userEvent.setup();
    const onCancelPrepaid = jest.fn();
    const billing = makeBilling({ prepaidBatchId: 'batch-1' });
    render(
      <BillingListTable items={[billing]} onCancelPrepaid={onCancelPrepaid} />
    );
    await user.click(screen.getByRole('button', { name: '前受取り消し' }));
    expect(onCancelPrepaid).toHaveBeenCalledWith(billing);
  });
});
