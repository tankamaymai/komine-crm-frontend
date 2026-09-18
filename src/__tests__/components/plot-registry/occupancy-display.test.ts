import { ContractStatus, PaymentStatus, type PlotListItem } from '@komine/types';
import { getOccupancyLabel, getRowBgColor, isVacantPlot } from '@/components/plot-registry/utils';

function makePlot(overrides: Partial<PlotListItem> = {}): PlotListItem {
  return {
    id: 'p1',
    paymentStatus: PaymentStatus.Paid,
    contractStatus: ContractStatus.Active,
    ...overrides,
  } as PlotListItem;
}

describe('台帳の利用中／空き表示', () => {
  it('空き区画は「空き」、それ以外は「利用中」', () => {
    expect(getOccupancyLabel(makePlot({ contractStatus: ContractStatus.Vacant }))).toBe('空き');
    expect(getOccupancyLabel(makePlot({ contractStatus: ContractStatus.Active }))).toBe('利用中');
    expect(getOccupancyLabel(makePlot({ contractStatus: ContractStatus.Terminated }))).toBe('利用中');
  });

  it('空き区画は未入金でも灰色（入金の黄色にしない）', () => {
    const vacantUnpaid = makePlot({
      contractStatus: ContractStatus.Vacant,
      paymentStatus: PaymentStatus.Unpaid,
    });
    expect(isVacantPlot(vacantUnpaid)).toBe(true);
    expect(getRowBgColor(vacantUnpaid, 0)).toBe('bg-hai-50');
  });

  it('利用中の未入金はこれまでどおり黄色', () => {
    expect(
      getRowBgColor(
        makePlot({ contractStatus: ContractStatus.Active, paymentStatus: PaymentStatus.Unpaid }),
        0
      )
    ).toBe('bg-kohaku-50');
  });
});
