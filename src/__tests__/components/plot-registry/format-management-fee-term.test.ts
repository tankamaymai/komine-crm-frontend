import { formatManagementFeeTerm } from '@/components/plot-registry/utils';

describe('formatManagementFeeTerm', () => {
  it('請求区分が永代なら「永代」', () => {
    expect(formatManagementFeeTerm('PERPETUAL', '10')).toBe('永代');
    expect(formatManagementFeeTerm('2', null)).toBe('永代');
    expect(formatManagementFeeTerm('legacy-seikyu-2', '0')).toBe('永代');
  });

  it('請求年数0は「永代」', () => {
    expect(formatManagementFeeTerm(null, '0')).toBe('永代');
    expect(formatManagementFeeTerm(null, 0)).toBe('永代');
  });

  it('正の年数は「10年」形式', () => {
    expect(formatManagementFeeTerm('PRESENT', '10')).toBe('10年');
    expect(formatManagementFeeTerm(null, 5)).toBe('5年');
  });

  it('未設定は null', () => {
    expect(formatManagementFeeTerm(null, null)).toBeNull();
    expect(formatManagementFeeTerm('', '')).toBeNull();
  });
});
