import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlotFilters } from '@/components/plot-registry/PlotFilters';

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}));

const noop = () => {};

function renderFilters(
  areaNames: string[],
  filterAreaName = '',
  graveTypes: number[] = []
) {
  return render(
    <PlotFilters
      filterOccupancy="in_use"
      onFilterOccupancyChange={noop}
      filterPeriod=""
      onFilterPeriodChange={noop}
      filterAreaName={filterAreaName}
      onFilterAreaNameChange={noop}
      filterGraveType={undefined}
      onFilterGraveTypeChange={noop}
      graveClassifications={{
        graveKinds: [],
        graveKubuns: [],
        graveTypes,
        areaNames,
      }}
      showBuriedPersons={false}
      onToggleBuriedPersons={noop}
    />
  );
}

describe('台帳フィルターのエリア選択', () => {
  it('エリアは入力欄ではなく選択肢から選ぶ', () => {
    renderFilters(['A', '凛B']);

    expect(screen.queryByPlaceholderText('エリア名')).not.toBeInTheDocument();
    expect(screen.getByTestId('select-item-A')).toHaveTextContent('A');
    expect(screen.getByTestId('select-item-凛B')).toHaveTextContent('凛B');
  });

  it('旧システムの内部コードは選択肢に出さない', () => {
    renderFilters(['A', '1-29', 'unknown-101']);

    expect(screen.getByTestId('select-item-A')).toBeInTheDocument();
    expect(screen.queryByTestId('select-item-1-29')).not.toBeInTheDocument();
    expect(screen.queryByTestId('select-item-unknown-101')).not.toBeInTheDocument();
  });

  it('意味の分からない旧番号の絞り込み（形状・基地）は出さない', () => {
    renderFilters(['A'], '', [1, 9]);

    expect(screen.queryByText('形状:')).not.toBeInTheDocument();
    expect(screen.queryByText('基地:')).not.toBeInTheDocument();
    expect(screen.getByText('区分:')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-1')).toHaveTextContent('1');
    expect(screen.getByTestId('select-item-9')).toHaveTextContent('9');
  });

  it('利用中・空き区画・全てを選べる', () => {
    renderFilters(['A']);

    expect(screen.getByText('利用:')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-in_use')).toHaveTextContent('利用中');
    expect(screen.getByTestId('select-item-vacant')).toHaveTextContent('空き区画');
    expect(screen.getAllByText('全て').length).toBeGreaterThan(0);
  });

  it('区画と入金の絞り込みは出さず、期で選べる', () => {
    renderFilters(['A']);

    expect(screen.queryByText('区画:')).not.toBeInTheDocument();
    expect(screen.queryByText('入金:')).not.toBeInTheDocument();
    expect(screen.getByText('期:')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-第1期')).toHaveTextContent('第1期');
    expect(screen.getByTestId('select-item-第2期')).toHaveTextContent('第2期');
    expect(screen.getByTestId('select-item-第3期')).toHaveTextContent('第3期');
    expect(screen.getByTestId('select-item-第3期樹林部')).toHaveTextContent('第3期樹林部');
    expect(screen.getByTestId('select-item-第4期')).toHaveTextContent('第4期');
    expect(screen.getByTestId('select-item-その他')).toHaveTextContent('その他');
  });
});
