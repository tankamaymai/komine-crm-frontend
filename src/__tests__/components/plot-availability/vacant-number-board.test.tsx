/**
 * 区画の下に、ボタンを押さなくても空き番号が並ぶ。
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { VacantNumberBoard } from '@/components/plot-availability/vacant-number-board';

describe('VacantNumberBoard', () => {
  it('空き番号をそのまま並べる', () => {
    render(
      <VacantNumberBoard
        plots={[
          { id: '1', label: '3', areaSqm: 3.6 },
          { id: '2', label: '12', areaSqm: 3.6 },
        ]}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('空きが無いときはその旨を出す', () => {
    render(<VacantNumberBoard plots={[]} />);
    expect(screen.getByText('空きはありません')).toBeInTheDocument();
  });
});
