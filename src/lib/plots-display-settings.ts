/**
 * 台帳問い合わせ一覧の文字サイズ・太さ設定。
 * 列幅と同じく localStorage に残し、次回も同じ見え方にする。
 */

export const DISPLAY_SETTINGS_KEY = 'komine:plots:display-settings';

export const PLOT_FONT_SIZES = ['sm', 'md', 'lg'] as const;
export type PlotFontSize = (typeof PLOT_FONT_SIZES)[number];

export const PLOT_FONT_WEIGHTS = ['normal', 'medium', 'bold'] as const;
export type PlotFontWeight = (typeof PLOT_FONT_WEIGHTS)[number];

export interface PlotDisplaySettings {
  fontSize: PlotFontSize;
  fontWeight: PlotFontWeight;
}

/** 先方指摘（字が小さい・細い）を受け、初期値は大きめ・やや太めにする */
export const DEFAULT_PLOT_DISPLAY_SETTINGS: PlotDisplaySettings = {
  fontSize: 'md',
  fontWeight: 'medium',
};

export const PLOT_FONT_SIZE_PX: Record<PlotFontSize, number> = {
  sm: 13,
  md: 16,
  lg: 18,
};

export const PLOT_FONT_WEIGHT_NUM: Record<PlotFontWeight, number> = {
  normal: 400,
  medium: 600,
  bold: 700,
};

export const PLOT_FONT_SIZE_LABELS: Record<PlotFontSize, string> = {
  sm: '小',
  md: '中',
  lg: '大',
};

export const PLOT_FONT_WEIGHT_LABELS: Record<PlotFontWeight, string> = {
  normal: '細め',
  medium: '普通',
  bold: '太め',
};

function isFontSize(value: unknown): value is PlotFontSize {
  return PLOT_FONT_SIZES.includes(value as PlotFontSize);
}

function isFontWeight(value: unknown): value is PlotFontWeight {
  return PLOT_FONT_WEIGHTS.includes(value as PlotFontWeight);
}

export function loadPlotDisplaySettings(): PlotDisplaySettings {
  if (typeof window === 'undefined') return { ...DEFAULT_PLOT_DISPLAY_SETTINGS };
  try {
    const raw = window.localStorage.getItem(DISPLAY_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_PLOT_DISPLAY_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PLOT_DISPLAY_SETTINGS };
    const source = parsed as Record<string, unknown>;
    return {
      fontSize: isFontSize(source.fontSize) ? source.fontSize : DEFAULT_PLOT_DISPLAY_SETTINGS.fontSize,
      fontWeight: isFontWeight(source.fontWeight)
        ? source.fontWeight
        : DEFAULT_PLOT_DISPLAY_SETTINGS.fontWeight,
    };
  } catch {
    return { ...DEFAULT_PLOT_DISPLAY_SETTINGS };
  }
}

export function savePlotDisplaySettings(settings: PlotDisplaySettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // quota 超過や localStorage 無効時は黙って無視
  }
}
