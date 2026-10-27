/**
 * まとめ買い登録の「もう1区画足す」（komine-docs/design/COMBINED_PLOT_SALE_SPEC.md）
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { AdditionalPlotsFields } from '@/components/plot-form/AdditionalPlotsFields';
import { defaultPhysicalPlot } from '@/lib/validations/plot-form';
import { TabHost, emptyMasterData } from './test-helpers';

const getVacantPlots = jest.fn();
jest.mock('@/lib/api/plots', () => ({
  getVacantPlots: (...args: unknown[]) => getVacantPlots(...args),
}));

const masterData = {
  ...emptyMasterData,
  sectionNames: [{ id: 1, code: 'A', name: '一般墓地A', period: '第1期', isActive: true }],
} as unknown as typeof emptyMasterData;

function renderFields(onWatch?: (rows: unknown) => void) {
  return render(
    <TabHost
      defaultValues={{
        physicalPlot: { ...defaultPhysicalPlot, id: 'p-first', plotNumber: '10', areaName: '一般墓地A' },
      }}
    >
      {(h) => {
        onWatch?.(h.watch('additionalPlots'));
        return <AdditionalPlotsFields {...h} masterData={masterData} />;
      }}
    </TabHost>
  );
}

describe('AdditionalPlotsFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getVacantPlots.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'p-first',
            plotNumber: '10',
            displayNumber: '10',
            areaName: '一般墓地A',
            areaSqm: 3.6,
            availableAreaSqm: 3.6,
          },
          {
            id: 'p-next',
            plotNumber: '11',
            displayNumber: '11',
            areaName: '一般墓地A',
            areaSqm: 3.6,
            availableAreaSqm: 1.8,
          },
        ],
        pagination: { page: 1, limit: 200, total: 2, totalPages: 1 },
      },
    });
  });

  it('最初は「もう1区画足す」だけで、追加の段は無い', () => {
    renderFields();

    expect(screen.getByRole('button', { name: 'もう1区画足す' })).toBeInTheDocument();
    expect(screen.queryByText('2つ目の区画')).not.toBeInTheDocument();
  });

  it('押すと2つ目の段が増え、1つ目と同じ区画（エリア）で空きを探す', async () => {
    const user = userEvent.setup();
    renderFields();

    await user.click(screen.getByRole('button', { name: 'もう1区画足す' }));

    expect(screen.getByText('2つ目の区画')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^11/ })).toBeInTheDocument();
    expect(getVacantPlots).toHaveBeenCalledWith(expect.objectContaining({ areaName: '一般墓地A' }));
  });

  it('1つ目で選んだ区画は、2つ目では押せない', async () => {
    const user = userEvent.setup();
    renderFields();

    await user.click(screen.getByRole('button', { name: 'もう1区画足す' }));

    expect(await screen.findByRole('button', { name: /^10/ })).toBeDisabled();
  });

  it('空きを選ぶと、残りの広さが契約面積に入る', async () => {
    const user = userEvent.setup();
    let rows: Array<{ physicalPlotId: string; contractAreaSqm: number }> = [];
    renderFields((value) => {
      rows = value as typeof rows;
    });

    await user.click(screen.getByRole('button', { name: 'もう1区画足す' }));
    await user.click(await screen.findByRole('button', { name: /^11/ }));

    expect(rows[0]).toEqual(expect.objectContaining({ physicalPlotId: 'p-next', contractAreaSqm: 1.8 }));
  });

  it('「この区画をやめる」で段が消える', async () => {
    const user = userEvent.setup();
    renderFields();

    await user.click(screen.getByRole('button', { name: 'もう1区画足す' }));
    await user.click(screen.getByRole('button', { name: 'この区画をやめる' }));

    expect(screen.queryByText('2つ目の区画')).not.toBeInTheDocument();
  });
});
