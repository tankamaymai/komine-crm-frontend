import {
  DEFAULT_PLOT_DISPLAY_SETTINGS,
  DISPLAY_SETTINGS_KEY,
  loadPlotDisplaySettings,
  savePlotDisplaySettings,
} from '../plots-display-settings';

describe('plots-display-settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('未保存時は大きめ・やや太めの初期値', () => {
    expect(loadPlotDisplaySettings()).toEqual(DEFAULT_PLOT_DISPLAY_SETTINGS);
    expect(DEFAULT_PLOT_DISPLAY_SETTINGS.fontSize).toBe('md');
    expect(DEFAULT_PLOT_DISPLAY_SETTINGS.fontWeight).toBe('medium');
  });

  it('保存した値を読み戻せる', () => {
    savePlotDisplaySettings({ fontSize: 'lg', fontWeight: 'bold' });
    expect(loadPlotDisplaySettings()).toEqual({ fontSize: 'lg', fontWeight: 'bold' });
  });

  it('不正な JSON は初期値に戻す', () => {
    window.localStorage.setItem(DISPLAY_SETTINGS_KEY, '{not json');
    expect(loadPlotDisplaySettings()).toEqual(DEFAULT_PLOT_DISPLAY_SETTINGS);
  });

  it('未知の値は初期値に落とす', () => {
    window.localStorage.setItem(
      DISPLAY_SETTINGS_KEY,
      JSON.stringify({ fontSize: 'huge', fontWeight: 'thin' })
    );
    expect(loadPlotDisplaySettings()).toEqual(DEFAULT_PLOT_DISPLAY_SETTINGS);
  });
});
