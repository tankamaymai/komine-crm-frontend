/**
 * 区画図: 配置マスと本番契約の重ね合わせ
 *
 * 空き / 予約 / 契約済み / 売却不可 を判定し、Excel区画図の番号と
 * display_number（例: 1-97, D-10）を結びつける。
 */
import {
  deriveOverlayStatus,
  findMapId,
  hasPlotMap,
  matchLayoutCellToPlot,
  overlayLayoutWithPlots,
} from '@/lib/plot-maps/overlay';
import { PLOT_MAP_IDS } from '@/lib/plot-maps/catalog';
import type { PlotMapOverlayPlot } from '@/lib/plot-maps/types';

function plot(overrides: Partial<PlotMapOverlayPlot> = {}): PlotMapOverlayPlot {
  return {
    id: 'pp-1',
    plotNumber: 'legacy-1',
    displayNumber: '1-97',
    areaName: '1',
    areaSqm: 1,
    overlayStatus: 'vacant',
    contractorName: null,
    reservationDate: null,
    contractPlotId: null,
    ...overrides,
  };
}

describe('catalog', () => {
  it('1期〜4期の区画図を揃えている', () => {
    expect(PLOT_MAP_IDS).toEqual(expect.arrayContaining(['1-A', '1-D', '2-1', '3-10', '4-RURI-TERRACE', '3-JURIN']));
    expect(PLOT_MAP_IDS.length).toBeGreaterThanOrEqual(40);
  });
});

describe('findMapId / hasPlotMap', () => {
  it('第2期の1区を 2-1 に解決する', () => {
    expect(findMapId('第2期', '1')).toBe('2-1');
    expect(findMapId('第2期', '1区')).toBe('2-1');
    expect(hasPlotMap('第2期', '１')).toBe(true);
  });

  it('第1期のD区を 1-D に解決する', () => {
    expect(findMapId('第1期', 'D')).toBe('1-D');
    expect(findMapId('第1期', 'Ｄ区')).toBe('1-D');
  });

  it('第1期のA区・第2期の2区・第4期るり庵テラスを解決する', () => {
    expect(findMapId('第1期', 'A')).toBe('1-A');
    expect(findMapId('第2期', '2')).toBe('2-2');
    expect(findMapId('第4期', 'るり庵テラス')).toBe('4-RURI-TERRACE');
    expect(findMapId('第3期', '10')).toBe('3-10');
    expect(findMapId('第3期樹林部', '樹林')).toBe('3-JURIN');
    expect(findMapId('第3期樹林部', '天空K')).toBe('3-TENKU-K');
  });

  it('第4期の凛C・凛Dも凛の地図に解決する', () => {
    expect(findMapId('第4期', '凛A')).toBe('4-RIN');
    expect(findMapId('第4期', '凛C')).toBe('4-RIN');
    expect(findMapId('第4期', '凛Ｄ')).toBe('4-RIN');
  });

  it('地図のない区は null', () => {
    expect(findMapId('第2期', '4')).toBeNull();
    expect(findMapId('第1期', 'Z')).toBeNull();
    expect(hasPlotMap('第3期', '存在しない区')).toBe(false);
  });
});

describe('matchLayoutCellToPlot', () => {
  it('1区97番は display_number 1-97 に一致する', () => {
    expect(matchLayoutCellToPlot('97', '1', plot({ displayNumber: '1-97' }))).toBe(true);
  });

  it('D区10番は D-10 に一致する', () => {
    expect(
      matchLayoutCellToPlot('10', 'D', plot({ displayNumber: 'D-10', areaName: 'D' }))
    ).toBe(true);
  });

  it('別番号には一致しない', () => {
    expect(matchLayoutCellToPlot('97', '1', plot({ displayNumber: '1-96' }))).toBe(false);
    expect(matchLayoutCellToPlot('10', 'D', plot({ displayNumber: '1-10' }))).toBe(false);
  });

  it('全角の区名でも一致する', () => {
    expect(matchLayoutCellToPlot('97', '１', plot({ displayNumber: '1-97' }))).toBe(true);
  });

  it('凛Aの台帳番号 43-6 は地図の A-43-6 に結びつく', () => {
    expect(
      matchLayoutCellToPlot(
        'A-43-6',
        '凛A',
        plot({ displayNumber: '43-6', areaName: '凛A', overlayStatus: 'vacant' })
      )
    ).toBe(true);
  });

  it('吉相Cの台帳番号 5-1 は地図の C-5-1 に結びつく', () => {
    expect(
      matchLayoutCellToPlot(
        'C-5-1',
        '吉相C',
        plot({ displayNumber: '5-1', areaName: '吉相C' })
      )
    ).toBe(true);
  });

  it('A区の3番を隣の E-3 と間違えない', () => {
    expect(matchLayoutCellToPlot('E-3', 'A', plot({ displayNumber: '3', areaName: 'A' }))).toBe(false);
  });
});

describe('deriveOverlayStatus', () => {
  it('売却不可マスは契約より優先する', () => {
    expect(deriveOverlayStatus(plot({ overlayStatus: 'contracted' }), true)).toBe('unsellable');
  });

  it('台帳と結びついていない番号は空きにしない', () => {
    expect(deriveOverlayStatus(null, false)).toBe('unknown');
  });

  it('予約・契約済みをそのまま使う', () => {
    expect(deriveOverlayStatus(plot({ overlayStatus: 'reserved' }), false)).toBe('reserved');
    expect(deriveOverlayStatus(plot({ overlayStatus: 'contracted' }), false)).toBe('contracted');
  });
});

describe('overlayLayoutWithPlots', () => {
  it('配置に契約者名と状態を載せる', () => {
    const cells = overlayLayoutWithPlots(
      [
        { row: 0, col: 6, plotLabel: '97' },
        { row: 0, col: 0, plotLabel: '90', unsellable: true },
      ],
      '1',
      [
        plot({
          displayNumber: '1-97',
          overlayStatus: 'vacant',
        }),
      ]
    );

    expect(cells[0]).toMatchObject({
      plotLabel: '97',
      status: 'vacant',
      displayLabel: '空き',
    });
    expect(cells[1]).toMatchObject({
      plotLabel: '90',
      status: 'unsellable',
      displayLabel: '売却不可',
    });
  });

  it('同じ台帳を2マスに重ねない', () => {
    const cells = overlayLayoutWithPlots(
      [
        { row: 0, col: 0, plotLabel: 'A-1-6' },
        { row: 0, col: 1, plotLabel: 'A-1-6' },
      ],
      '凛A',
      [plot({ id: 'pp-1', displayNumber: '1-6', areaName: '凛A', overlayStatus: 'vacant' })]
    );
    expect(cells.map((cell) => cell.status)).toEqual(['vacant', 'unknown']);
  });

  it('契約済みマスには姓を出す', () => {
    const [cell] = overlayLayoutWithPlots(
      [{ row: 0, col: 0, plotLabel: '97' }],
      '1',
      [plot({ overlayStatus: 'contracted', contractorName: '疋田' })]
    );
    expect(cell.status).toBe('contracted');
    expect(cell.displayLabel).toBe('疋田');
  });
});
