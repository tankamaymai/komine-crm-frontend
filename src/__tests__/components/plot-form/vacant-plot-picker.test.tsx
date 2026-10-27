/**
 * 空き区画の選択（議事録 2026-07-21 §6）
 *
 * 手入力を不可にして空き区画から選ばせる。空き区画は実データで約2,500件、
 * 単一の区画名でも最大647件あるため、区画名で絞ってから番号で絞り込む前提。
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { VacantPlotItem } from '@komine/types';

import { VacantPlotPicker } from '@/components/plot-form/VacantPlotPicker';

const getVacantPlots = jest.fn();
jest.mock('@/lib/api/plots', () => ({
  getVacantPlots: (...args: unknown[]) => getVacantPlots(...args),
}));

function item(overrides: Partial<VacantPlotItem> = {}): VacantPlotItem {
  return {
    id: 'p1',
    plotNumber: 'A-101',
    displayNumber: 'A-101',
    areaName: 'A',
    areaSqm: 3.6,
    availableAreaSqm: 3.6,
    ...overrides,
  };
}

function respond(items: VacantPlotItem[], total = items.length) {
  getVacantPlots.mockResolvedValue({
    success: true,
    data: { items, pagination: { page: 1, limit: 200, total, totalPages: 1 } },
  });
}

const noop = () => {};

describe('VacantPlotPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    respond([]);
  });

  it('区画名が未選択なら候補を取得せず、先に選ぶよう促す', () => {
    render(
      <VacantPlotPicker value="" areaName={undefined} onSelect={noop} onClear={noop} />
    );

    expect(screen.getByText('先に区画（エリア）を選択してください')).toBeInTheDocument();
    expect(getVacantPlots).not.toHaveBeenCalled();
  });

  it('区画名を渡すとその区画名で空き区画を取得する', async () => {
    respond([item()]);
    render(<VacantPlotPicker value="" areaName="凛B" onSelect={noop} onClear={noop} />);

    await waitFor(() =>
      expect(getVacantPlots).toHaveBeenCalledWith(expect.objectContaining({ areaName: '凛B' }))
    );
    expect(await screen.findByText('A-101')).toBeInTheDocument();
  });

  it('候補をクリックすると選択された区画を返す', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const target = item({ plotNumber: 'A-102', displayNumber: 'A-102', availableAreaSqm: 1.8 });
    respond([target]);

    render(<VacantPlotPicker value="" areaName="A" onSelect={onSelect} onClear={noop} />);

    await user.click(await screen.findByText('A-102'));
    expect(onSelect).toHaveBeenCalledWith(target);
  });

  it('一部販売済みの区画は空き面積と全体面積を並べて出す', async () => {
    respond([item({ areaSqm: 3.6, availableAreaSqm: 1.8 })]);
    render(<VacantPlotPicker value="" areaName="A" onSelect={noop} onClear={noop} />);

    expect(await screen.findByText(/空き 1.8㎡ \/ 全体 3.6㎡/)).toBeInTheDocument();
  });

  it('空きが全体と同じなら全体面積は併記しない', async () => {
    respond([item({ areaSqm: 3.6, availableAreaSqm: 3.6 })]);
    render(<VacantPlotPicker value="" areaName="A" onSelect={noop} onClear={noop} />);

    expect(await screen.findByText('空き 3.6㎡')).toBeInTheDocument();
    expect(screen.queryByText(/全体/)).not.toBeInTheDocument();
  });

  // 選択後に手入力欄へ戻すと誤入力の余地が残るため、解除して選び直す形にする
  it('選択済みは検索欄を出さず「選び直す」で解除する', async () => {
    const user = userEvent.setup();
    const onClear = jest.fn();
    respond([item()]);

    render(<VacantPlotPicker value="A-101" areaName="A" onSelect={noop} onClear={onClear} />);

    expect(screen.queryByPlaceholderText(/区画番号で絞り込み/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '選び直す' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('検索語を入力すると search 付きで取得する', async () => {
    const user = userEvent.setup();
    respond([item()]);
    render(<VacantPlotPicker value="" areaName="凛B" onSelect={noop} onClear={noop} />);

    await user.type(screen.getByPlaceholderText(/区画番号で絞り込み/), '10');

    await waitFor(() =>
      expect(getVacantPlots).toHaveBeenLastCalledWith(
        expect.objectContaining({ areaName: '凛B', search: '10' })
      )
    );
  });

  // 641件のような区画名では上限まで出しても全部載らない。
  // 「これで全部」と誤解させないよう残件を明示する
  it('取得上限を超える場合は絞り込みを促す', async () => {
    respond([item()], 641);
    render(<VacantPlotPicker value="" areaName="凛B" onSelect={noop} onClear={noop} />);

    expect(
      await screen.findByText(/凛B の空き 641件のうち 1件を表示中/)
    ).toBeInTheDocument();
  });

  it('全件表示できている場合は件数だけ出す', async () => {
    respond([item()], 1);
    render(<VacantPlotPicker value="" areaName="A" onSelect={noop} onClear={noop} />);

    expect(await screen.findByText('A の空き 1件')).toBeInTheDocument();
  });

  it('空き0件なら該当なしを出す', async () => {
    respond([]);
    render(<VacantPlotPicker value="" areaName="A" onSelect={noop} onClear={noop} />);

    expect(await screen.findByText('A に空き区画がありません')).toBeInTheDocument();
  });

  it('取得に失敗したらエラーを出す', async () => {
    getVacantPlots.mockRejectedValue(new Error('network'));
    render(<VacantPlotPicker value="" areaName="A" onSelect={noop} onClear={noop} />);

    expect(await screen.findByText('空き区画の取得に失敗しました')).toBeInTheDocument();
  });

  it('バリデーションエラーを表示する', () => {
    render(
      <VacantPlotPicker
        value=""
        areaName={undefined}
        onSelect={noop}
        onClear={noop}
        error="区画番号は必須です"
      />
    );

    expect(screen.getByText('区画番号は必須です')).toBeInTheDocument();
  });
});

describe('VacantPlotPicker（まとめ買い）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ほかの段で選んだ区画は押せず、「すでに選んでいます」と出る', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    respond([
      item({ id: 'p1', plotNumber: 'A-101', displayNumber: 'A-101' }),
      item({ id: 'p2', plotNumber: 'A-102', displayNumber: 'A-102' }),
    ]);
    render(
      <VacantPlotPicker
        value=""
        areaName="A"
        excludeIds={['p1']}
        onSelect={onSelect}
        onClear={noop}
      />
    );

    const taken = await screen.findByRole('button', { name: /A-101/ });
    expect(taken).toBeDisabled();
    expect(screen.getByText('この区画はすでに選んでいます')).toBeInTheDocument();
    await user.click(taken);
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /A-102/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2' }));
  });

  it('見出しと検索欄の id を段ごとに変えられる', () => {
    render(
      <VacantPlotPicker
        value=""
        areaName="A"
        inputId="vacant-plot-search-extra-0"
        label="区画番号（2つ目）"
        onSelect={noop}
        onClear={noop}
      />
    );

    expect(screen.getByLabelText(/区画番号（2つ目）/)).toHaveAttribute(
      'id',
      'vacant-plot-search-extra-0'
    );
  });
});
