/**
 * ゆうちょ引き落とし結果の取り込み
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { YuchoResultImport } from '@/components/yucho/YuchoResultImport';
import type { YuchoResultPlan, YuchoResultPlanRow } from '@/lib/api/yucho';

const previewYuchoResult = jest.fn();
const applyYuchoResult = jest.fn();
jest.mock('@/lib/api/yucho', () => ({
  previewYuchoResult: (...a: unknown[]) => previewYuchoResult(...a),
  applyYuchoResult: (...a: unknown[]) => applyYuchoResult(...a),
  fileToBase64: () => Promise.resolve('BASE64'),
}));

const showSuccess = jest.fn();
const showError = jest.fn();
jest.mock('@/lib/toast', () => ({
  showSuccess: (...a: unknown[]) => showSuccess(...a),
  showError: (...a: unknown[]) => showError(...a),
}));

const row = (overrides: Partial<YuchoResultPlanRow> = {}): YuchoResultPlanRow => ({
  lineNo: 1,
  resultCode: '0',
  resultLabel: '引き落とし済み',
  amount: 12000,
  kana: 'ﾔﾏﾀﾞﾀﾛｳ',
  status: 'will_record',
  contractPlotId: 'plot-1',
  billingId: 'bill-1',
  plotNumber: 'A-1',
  displayNumber: '1',
  areaName: '一般墓地A',
  customerName: '山田太郎',
  remainingAmount: 12000,
  ...overrides,
});

const summary = (rows: YuchoResultPlanRow[]): YuchoResultPlan['summary'] => {
  const base = {
    will_record: { count: 0, amount: 0 },
    already_paid: { count: 0, amount: 0 },
    no_billing: { count: 0, amount: 0 },
    amount_mismatch: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
    unmatched: { count: 0, amount: 0 },
  };
  for (const r of rows) {
    base[r.status].count += 1;
    base[r.status].amount += r.amount;
  }
  return base;
};

const plan = (rows: YuchoResultPlanRow[], overrides: Partial<YuchoResultPlan> = {}): YuchoResultPlan => ({
  year: 2027,
  month: 3,
  transferDate: '2027-03-16',
  monthMismatch: false,
  rows,
  summary: summary(rows),
  ...overrides,
});

async function chooseAndRead(user: ReturnType<typeof userEvent.setup>) {
  const file = new File(['x'], 'result.txt', { type: 'text/plain' });
  await user.upload(screen.getByLabelText('結果ファイル'), file);
  await user.click(screen.getByRole('button', { name: '中身を見る' }));
}

describe('YuchoResultImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ファイルを選ぶまで「中身を見る」は押せない', () => {
    render(<YuchoResultImport year={2027} month={3} />);
    expect(screen.getByRole('button', { name: '中身を見る' })).toBeDisabled();
  });

  it('中身を見ると、入金を付ける人と引き落とせなかった人を分けて見せる', async () => {
    const user = userEvent.setup();
    previewYuchoResult.mockResolvedValue({
      success: true,
      data: plan([
        row(),
        row({
          lineNo: 2,
          resultCode: '1',
          resultLabel: '残高不足',
          status: 'failed',
          customerName: '佐藤花子',
          amount: 6000,
          billingId: 'bill-2',
        }),
      ]),
    });
    render(<YuchoResultImport year={2027} month={3} />);

    await chooseAndRead(user);

    expect(previewYuchoResult).toHaveBeenCalledWith({ year: 2027, month: 3, fileBase64: 'BASE64' });
    expect(await screen.findByText(/1人に入金を付けます（¥12,000）/)).toBeInTheDocument();
    expect(screen.getByText(/引き落とせなかった人が1人います/)).toBeInTheDocument();
    expect(screen.getByText('残高不足')).toBeInTheDocument();
    expect(screen.getByText('未入金のまま。請求の備考に理由を残します')).toBeInTheDocument();
    expect(applyYuchoResult).not.toHaveBeenCalled();
  });

  it('読めないファイルは理由を出す', async () => {
    const user = userEvent.setup();
    previewYuchoResult.mockResolvedValue({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'これはゆうちょへ送ったファイルのようです' },
    });
    render(<YuchoResultImport year={2027} month={3} />);

    await chooseAndRead(user);

    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith(
        '結果ファイルを読めませんでした',
        'これはゆうちょへ送ったファイルのようです'
      )
    );
  });

  it('ファイルの月が選んだ月と違えば、入金を付けるボタンは押せない', async () => {
    const user = userEvent.setup();
    previewYuchoResult.mockResolvedValue({
      success: true,
      data: plan([row()], { monthMismatch: true, transferDate: '2027-04-15' }),
    });
    render(<YuchoResultImport year={2027} month={3} />);

    await chooseAndRead(user);

    expect(await screen.findByText(/2027年4月15日 です。上で選んでいる3月と違います/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1人に入金を付ける' })).toBeDisabled();
  });

  it('確認してから、40人ずつ分けて入金を付け、合計を知らせる', async () => {
    const user = userEvent.setup();
    const onApplied = jest.fn();
    const rows = Array.from({ length: 90 }, (_, i) => row({ lineNo: i + 1 }));
    previewYuchoResult.mockResolvedValue({ success: true, data: plan(rows) });
    applyYuchoResult.mockImplementation(({ lineFrom, lineTo }: { lineFrom: number; lineTo: number }) => {
      const count = lineTo - lineFrom + 1;
      return Promise.resolve({
        success: true,
        data: { recordedCount: count, recordedAmount: count * 12000, notedFailedCount: 0, skippedCount: 0 },
      });
    });
    render(<YuchoResultImport year={2027} month={3} onApplied={onApplied} />);

    await chooseAndRead(user);
    await user.click(await screen.findByRole('button', { name: '90人に入金を付ける' }));
    await user.click(await screen.findByRole('button', { name: '入金を付ける' }));

    await waitFor(() => expect(onApplied).toHaveBeenCalled());
    expect(applyYuchoResult.mock.calls.map((c) => [c[0].lineFrom, c[0].lineTo])).toEqual([
      [1, 40],
      [41, 80],
      [81, 90],
    ]);
    expect(showSuccess).toHaveBeenCalledWith('90人に入金を付けました（¥1,080,000）', '');
  });

  it('途中で止まったら、何人に付いたかと、もう一度押せば続きから付くことを出す', async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 50 }, (_, i) => row({ lineNo: i + 1 }));
    previewYuchoResult.mockResolvedValue({ success: true, data: plan(rows) });
    applyYuchoResult
      .mockResolvedValueOnce({
        success: true,
        data: { recordedCount: 40, recordedAmount: 480000, notedFailedCount: 0, skippedCount: 0 },
      })
      .mockResolvedValueOnce({ success: false, error: { code: 'TIMEOUT', message: '時間切れです' } });
    render(<YuchoResultImport year={2027} month={3} />);

    await chooseAndRead(user);
    await user.click(await screen.findByRole('button', { name: '50人に入金を付ける' }));
    await user.click(await screen.findByRole('button', { name: '入金を付ける' }));

    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith(
        '途中で止まりました',
        '時間切れです。40人には付いています。もう一度押すと、残りの人に付けます'
      )
    );
  });
});
