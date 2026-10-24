/**
 * 空き区画の範囲一括登録ダイアログ（議事録 2026-07-21 §6）
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import {
  BULK_MAX_COUNT,
  BulkCreateVacantPlotsDialog,
} from '@/components/bulk-create-vacant-plots-dialog';

const createPhysicalPlotsBulk = jest.fn();
const getVacantPlots = jest.fn();
jest.mock('@/lib/api/plots', () => ({
  createPhysicalPlotsBulk: (...a: unknown[]) => createPhysicalPlotsBulk(...a),
  getVacantPlots: (...a: unknown[]) => getVacantPlots(...a),
}));

const showError = jest.fn();
const showSuccess = jest.fn();
const showWarning = jest.fn();
const showApiError = jest.fn();
jest.mock('@/lib/toast', () => ({
  showError: (...a: unknown[]) => showError(...a),
  showSuccess: (...a: unknown[]) => showSuccess(...a),
  showWarning: (...a: unknown[]) => showWarning(...a),
  showApiError: (...a: unknown[]) => showApiError(...a),
}));

function ok(createdCount: number, skippedCount = 0) {
  return {
    success: true,
    data: {
      created: Array.from({ length: createdCount }, (_, i) => ({ plotNumber: `C-${i + 1}` })),
      createdCount,
      skipped: Array.from({ length: skippedCount }, (_, i) => ({
        plotNumber: `C-skip-${i}`,
        displayNumber: `${i}`,
        reason: 'この区画番号は既に登録されています',
      })),
      skippedCount,
    },
  };
}

const onCreated = jest.fn();
const onClose = jest.fn();

function renderDialog() {
  return render(
    <BulkCreateVacantPlotsDialog isOpen onClose={onClose} onCreated={onCreated} />
  );
}

/** 区画名・範囲・面積を埋める */
async function fill(
  user: ReturnType<typeof userEvent.setup>,
  { area = 'C', start = '1', end = '3', sqm = '3.6', prefix = '' } = {}
) {
  await user.type(screen.getByLabelText(/区画名（エリア）/), area);
  if (prefix) await user.type(screen.getByLabelText(/接頭辞/), prefix);
  await user.type(screen.getByLabelText(/開始番号/), start);
  await user.type(screen.getByLabelText(/終了番号/), end);
  const sqmInput = screen.getByLabelText(/面積/);
  await user.clear(sqmInput);
  await user.type(sqmInput, sqm);
}

describe('BulkCreateVacantPlotsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getVacantPlots.mockResolvedValue({ success: true, data: { items: [] } });
    createPhysicalPlotsBulk.mockResolvedValue(ok(3));
  });

  // 範囲の打ち間違いに実行前に気づけるようにする
  it('範囲を入れると登録件数のプレビューを出す', async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByText(/開始番号と終了番号を入れると登録件数が出ます/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/開始番号/), '1');
    await user.type(screen.getByLabelText(/終了番号/), '50');

    // 「1 〜 50 の 50 件を登録します」。件数の箇所だけを見る
    const preview = await screen.findByText(/件を登録します/);
    expect(preview).toHaveTextContent('1');
    expect(preview).toHaveTextContent('50');
    expect(screen.getByText('50', { selector: '.font-semibold' })).toBeInTheDocument();
  });

  it('範囲と面積を入れて送信すると API を呼ぶ', async () => {
    const user = userEvent.setup();
    renderDialog();
    await fill(user, { area: 'C', start: '1', end: '3', sqm: '3.6' });

    await user.click(screen.getByRole('button', { name: '一括登録' }));

    await waitFor(() =>
      expect(createPhysicalPlotsBulk).toHaveBeenCalledWith(
        expect.objectContaining({ areaName: 'C', startNumber: 1, endNumber: 3, areaSqm: 3.6 })
      )
    );
    expect(onCreated).toHaveBeenCalled();
  });

  it('接頭辞は入力があるときだけ送る', async () => {
    const user = userEvent.setup();
    renderDialog();
    await fill(user, { prefix: 'A-' });

    await user.click(screen.getByRole('button', { name: '一括登録' }));

    await waitFor(() =>
      expect(createPhysicalPlotsBulk).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: 'A-' })
      )
    );
  });

  it('区画名が空なら送信せずエラーを出す', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/開始番号/), '1');
    await user.type(screen.getByLabelText(/終了番号/), '3');

    await user.click(screen.getByRole('button', { name: '一括登録' }));

    expect(createPhysicalPlotsBulk).not.toHaveBeenCalled();
    expect(showError).toHaveBeenCalledWith('区画名（エリア）は必須です');
  });

  // 開始 > 終了 は送信ボタン自体を無効化して防ぐ
  it('開始が終了より大きいと送信ボタンを無効にする', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/区画名（エリア）/), 'C');
    await user.type(screen.getByLabelText(/開始番号/), '10');
    await user.type(screen.getByLabelText(/終了番号/), '1');

    expect(screen.getByRole('button', { name: '一括登録' })).toBeDisabled();
  });

  it(`${BULK_MAX_COUNT} 件を超えると警告を出し送信ボタンを無効にする`, async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/区画名（エリア）/), 'C');
    await user.type(screen.getByLabelText(/開始番号/), '1');
    await user.type(screen.getByLabelText(/終了番号/), String(BULK_MAX_COUNT + 1));

    expect(
      await screen.findByText(new RegExp(`一度に登録できるのは${BULK_MAX_COUNT}件までです`))
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '一括登録' })).toBeDisabled();
  });

  // 3.6 決め打ちだと凛(0.013)や納骨堂(0.09)で毎回間違えるため既存値から埋める
  it('区画名を入れるとその区画の既存面積を初期値に入れる', async () => {
    const user = userEvent.setup();
    getVacantPlots.mockResolvedValue({
      success: true,
      data: { items: [{ areaSqm: 0.09 }] },
    });
    renderDialog();

    await user.type(screen.getByLabelText(/区画名（エリア）/), '納骨堂-天空');

    await waitFor(() => expect(screen.getByLabelText(/面積/)).toHaveValue(0.09));
  });

  it('スキップがあれば件数を分けて伝える', async () => {
    const user = userEvent.setup();
    createPhysicalPlotsBulk.mockResolvedValue(ok(48, 2));
    renderDialog();
    await fill(user);

    await user.click(screen.getByRole('button', { name: '一括登録' }));

    await waitFor(() =>
      expect(showSuccess).toHaveBeenCalledWith(
        '48件を登録しました（2件は既に登録済みのためスキップ）'
      )
    );
  });

  // 1件も登録されなかったのを成功と誤認させない
  it('全件スキップなら警告として伝える', async () => {
    const user = userEvent.setup();
    createPhysicalPlotsBulk.mockResolvedValue(ok(0, 3));
    renderDialog();
    await fill(user);

    await user.click(screen.getByRole('button', { name: '一括登録' }));

    await waitFor(() =>
      expect(showWarning).toHaveBeenCalledWith(
        '登録できる区画がありませんでした（3件はすべて既に登録済みです）'
      )
    );
    expect(showSuccess).not.toHaveBeenCalled();
  });

  it('API 失敗時はエラーを出し onCreated を呼ばない', async () => {
    const user = userEvent.setup();
    createPhysicalPlotsBulk.mockResolvedValue({
      success: false,
      error: { message: '権限がありません' },
    });
    renderDialog();
    await fill(user);

    await user.click(screen.getByRole('button', { name: '一括登録' }));

    await waitFor(() =>
      expect(showApiError).toHaveBeenCalledWith('空き区画の一括登録', '権限がありません')
    );
    expect(onCreated).not.toHaveBeenCalled();
  });
});
