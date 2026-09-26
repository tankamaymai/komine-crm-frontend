import { ContractStatus, type PlotListItem } from '@komine/types';
import { getPlotDisplayStatus } from '@/lib/api/plots';
import { formatCurrency, formatYearMonth } from '@/lib/format';
import { SEARCH_HISTORY_KEY, SEARCH_HISTORY_MAX } from './constants';

// ===== 検索履歴 =====

export function loadSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string').slice(0, SEARCH_HISTORY_MAX)
      : [];
  } catch {
    return [];
  }
}

/** 一覧APIが返す期。共有の型定義に届く前でも、画面側で読めるようにする。 */
export function plotPeriod(plot: PlotListItem): string {
  const value = (plot as PlotListItem & { period?: string }).period;
  return typeof value === 'string' ? value.trim() : '';
}

export function saveSearchHistory(history: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, SEARCH_HISTORY_MAX)));
  } catch {
    // ignore quota/disabled errors
  }
}

// ===== フォーマッタ =====

/** 一覧の契約日。2桁年を廃し共通の {@link formatYearMonth}（YYYY/MM）に統一（#167）。 */
export function formatContractDate(dateStr: string | null | undefined): string {
  return formatYearMonth(dateStr);
}

/**
 * 検索語が「表示中の契約者名」以外でヒットした理由を返す（#162）。
 * 氏名/フリガナ一致なら null（期待どおりなのでバッジ不要）。
 * 表示フィールド（区画番号/住所/電話/埋葬者）で一致すればその項目を示し、
 * いずれも一致しなければ別ロールの氏名等、一覧に出ていない情報での一致とみなす。
 */
export function getSearchHitReason(
  plot: PlotListItem,
  query: string | null | undefined,
): string | null {
  const q = query?.trim().toLowerCase();
  if (!q) return null;
  const has = (v: string | null | undefined): boolean => !!v && v.toLowerCase().includes(q);

  if (has(plot.customerName) || has(plot.customerNameKana)) return null;
  if (has(plot.displayNumber) || has(plot.plotNumber)) return '区画番号に一致';
  if (has(plot.customerAddress)) return '住所に一致';
  if (has(plot.customerPhoneNumber)) return '電話番号に一致';
  if (plot.buriedPersonNames?.some((n) => has(n))) return '埋葬者名に一致';
  return '関係者情報に一致';
}

/** @deprecated 共通の {@link formatCurrency} を使用。後方互換のため残置。 */
export function formatMoneyString(value: string | null | undefined): string {
  return formatCurrency(value);
}

const PERPETUAL_TYPE_RE = /^(PERPETUAL|2|永代|legacy-seikyu-2)$/i;

/**
 * 旧システムの管理料列（「永代」「１０年」）に相当する表示。
 * 請求区分が永代、または請求年数が 0 なら「永代」。正の年数なら「10年」形式。
 */
export function formatManagementFeeTerm(
  billingType: string | null | undefined,
  billingYears: string | number | null | undefined,
): string | null {
  const type = billingType?.trim() ?? '';
  if (type && (PERPETUAL_TYPE_RE.test(type) || type.includes('永代'))) {
    return '永代';
  }

  if (billingYears === null || billingYears === undefined || billingYears === '') {
    return null;
  }

  const years =
    typeof billingYears === 'number' ? billingYears : Number(String(billingYears).trim());
  if (!Number.isFinite(years)) return null;
  if (years === 0) return '永代';
  if (years > 0) return `${years}年`;
  return null;
}

// ===== 行表示ヘルパー（テーブル・モバイルカードで共用） =====

export function isVacantPlot(plot: PlotListItem): boolean {
  return plot.contractStatus === ContractStatus.Vacant;
}

/** 一覧左端の利用表示。解約済みも台帳上は「利用中」側。 */
export function getOccupancyLabel(plot: PlotListItem): '空き' | '利用中' {
  return isVacantPlot(plot) ? '空き' : '利用中';
}

/** 行背景色。空きは灰色、利用中は滞納/未入金を強調し、それ以外はゼブラ。 */
export function getRowBgColor(plot: PlotListItem, absoluteIndex: number) {
  if (isVacantPlot(plot)) return 'bg-hai-50';
  const status = getPlotDisplayStatus(plot);
  if (status === 'overdue') return 'bg-beni-50';
  if (status === 'attention') return 'bg-kohaku-50';
  return absoluteIndex % 2 === 0 ? 'bg-white' : 'bg-kinari';
}

// ===== 埋葬者の行展開 =====

/**
 * 一覧に描画する1行。埋葬者表示ONのとき、1区画は埋葬者の人数だけ行に展開される。
 *
 * 旧システム（ソフタス）の区画一覧と同じ「埋葬者を1人1行で並べる」表示に対応する。
 * 契約者名で探すときに区画が消えないよう、埋葬者0人の区画も1行として残す。
 */
export interface PlotDisplayRow {
  plot: PlotListItem;
  /** この行に出す埋葬者名。埋葬者0人の区画、および展開OFF時は null */
  buriedPersonName: string | null;
  /** 区画内での何人目か（0始まり）。key の一意化と積み上げ判定に使う */
  buriedIndex: number;
  /**
   * 区画の先頭行か。false（＝積み上げ行）では契約者情報を省略して
   * 埋葬者だけを出し、同一区画のまとまりが目で追えるようにする。
   */
  isPlotLead: boolean;
  /**
   * ゼブラ縞を区画単位で揃えるための区画の絶対 index。
   * 行単位で縞を付けると同一区画が縞で分断され、まとまりが崩れる。
   */
  plotAbsoluteIndex: number;
}

/**
 * 区画一覧を描画用の行リストへ変換する。
 *
 * @param plots 表示対象の区画（APIのページング単位。1ページ=N区画のまま変えない）
 * @param startIndex ページ先頭の通し番号（ゼブラ縞をページ跨ぎで連続させる）
 * @param expandBuriedPersons 埋葬者を1人1行に展開するか（「埋葬者を表示」トグル）
 */
export function buildPlotDisplayRows(
  plots: PlotListItem[],
  startIndex: number,
  expandBuriedPersons: boolean,
): PlotDisplayRow[] {
  return plots.flatMap((plot, index): PlotDisplayRow[] => {
    const plotAbsoluteIndex = startIndex + index;
    const names = expandBuriedPersons ? (plot.buriedPersonNames ?? []).filter(Boolean) : [];

    if (names.length === 0) {
      return [{ plot, buriedPersonName: null, buriedIndex: 0, isPlotLead: true, plotAbsoluteIndex }];
    }

    return names.map((buriedPersonName, buriedIndex) => ({
      plot,
      buriedPersonName,
      buriedIndex,
      isPlotLead: buriedIndex === 0,
      plotAbsoluteIndex,
    }));
  });
}
