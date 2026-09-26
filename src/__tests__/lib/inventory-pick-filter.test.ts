import { pickExact, sortSectionRows, uniqueNames } from '@/lib/inventory-pick-filter';

const rows = [
  { section: 'C' },
  { section: '吉相C' },
  { section: 'A' },
];

describe('pickExact', () => {
  it('全てなら行を減らさない', () => {
    expect(pickExact(rows, 'all', (row) => row.section)).toEqual(rows);
  });

  it('Cを選ぶとCだけ残り、吉相Cは残らない', () => {
    expect(pickExact(rows, 'C', (row) => row.section)).toEqual([{ section: 'C' }]);
  });
});

describe('sortSectionRows', () => {
  const row = (section: string, period = '第2期') => ({
    period,
    section,
    totalCount: 1,
    usedCount: 0,
    remainingCount: 1,
    usageRate: 0,
  });

  it('第2期の区画を 1, 2, 3 の順に並べる', () => {
    const sorted = sortSectionRows(
      ['6', '1', '7', '2', '8', '5', '3'].map((section) => row(section)),
      'period',
      'asc',
    );
    expect(sorted.map((item) => item.section)).toEqual(['1', '2', '3', '5', '6', '7', '8']);
  });

  it('10 を 2 より後ろに置く', () => {
    const sorted = sortSectionRows(
      [row('10', '第3期'), row('2', '第3期'), row('11', '第3期')],
      'section',
      'asc',
    );
    expect(sorted.map((item) => item.section)).toEqual(['2', '10', '11']);
  });

  it('期は第1期が第2期より前', () => {
    const sorted = sortSectionRows(
      [row('1', '第2期'), row('A', '第1期')],
      'period',
      'asc',
    );
    expect(sorted.map((item) => item.period)).toEqual(['第1期', '第2期']);
  });
});

describe('uniqueNames', () => {
  it('空と重複を除いて読み順に並べる', () => {
    expect(uniqueNames(['C', 'A', 'C', '', '10', '2'])).toEqual(['2', '10', 'A', 'C']);
  });
});
