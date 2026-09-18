/**
 * 台帳問い合わせ（/plots）一覧テーブルの列幅管理ロジック（issue #146）
 *
 * 列幅は localStorage に永続化し、次回アクセス時も維持する。
 * UI から独立した純粋関数として切り出し、単体テスト可能にしている。
 */

export const COLUMN_WIDTHS_KEY = 'komine:plots:column-widths';
export const COLUMN_MIN_WIDTH = 40;
export const COLUMN_MAX_WIDTH = 600;

/** リサイズ可能な列のキー */
export type ResizableColumnKey =
  | 'plotNumber'
  | 'areaName'
  | 'customerName'
  | 'address'
  | 'phone'
  | 'agent'
  | 'permitNumber'
  | 'notes'
  | 'buriedPersons';

/**
 * 各列のデフォルト幅（px）。
 * null は「幅指定なし（残り幅を吸収して伸縮）」を意味する（備考列）。
 */
export const COLUMN_DEFAULT_WIDTHS: Record<ResizableColumnKey, number | null> = {
  plotNumber: 80,
  areaName: 72,
  customerName: 110,
  address: 90,
  phone: 100,
  agent: 72,
  permitNumber: 96,
  notes: null,
  buriedPersons: 90,
};

export type ColumnWidths = Partial<Record<ResizableColumnKey, number>>;

const COLUMN_KEYS = Object.keys(COLUMN_DEFAULT_WIDTHS) as ResizableColumnKey[];

/** 幅を [MIN, MAX] に収める */
export function clampColumnWidth(width: number): number {
  return Math.min(COLUMN_MAX_WIDTH, Math.max(COLUMN_MIN_WIDTH, Math.round(width)));
}

/** localStorage から列幅設定を読み込む（不正値は無視・クランプ） */
export function loadColumnWidths(): ColumnWidths {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(COLUMN_WIDTHS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const source = parsed as Record<string, unknown>;
    const result: ColumnWidths = {};
    for (const key of COLUMN_KEYS) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        result[key] = clampColumnWidth(value);
      }
    }
    return result;
  } catch {
    return {};
  }
}

/** localStorage に列幅設定を保存する */
export function saveColumnWidths(widths: ColumnWidths): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(widths));
  } catch {
    // quota 超過や localStorage 無効時は黙って無視
  }
}

/**
 * 列がユーザーによって「広げられている」か判定する。
 * 広げられた列はセルを折り返して全文表示する（狭い列は truncate 維持）。
 */
export function isColumnExpanded(widths: ColumnWidths, key: ResizableColumnKey): boolean {
  const width = widths[key];
  if (typeof width !== 'number') return false;
  const base = COLUMN_DEFAULT_WIDTHS[key];
  return base == null ? width > 0 : width > base;
}
