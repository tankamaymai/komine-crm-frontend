import { PERIOD_NAMES } from '@/lib/section-period';

/** 期は第1期、第2期…の順。一覧に無い期はその後ろ。 */
function periodRank(period: string): number {
  const index = (PERIOD_NAMES as readonly string[]).indexOf(period);
  return index === -1 ? PERIOD_NAMES.length : index;
}

function compareSectionName(a: string, b: string): number {
  return a.localeCompare(b, 'ja', { numeric: true });
}

export type SectionSortKey =
  | 'period'
  | 'section'
  | 'totalCount'
  | 'usedCount'
  | 'remainingCount'
  | 'usageRate';

type SectionRow = {
  period: string;
  section: string;
  totalCount: number;
  usedCount: number;
  remainingCount: number;
  usageRate: number;
};

/**
 * 区画の並び。同じ期の中は 1, 2, 3 … のように番号順。
 * 期で並べるときは、期を逆にしても区内の番号順はそのまま。
 */
export function sortSectionRows<T extends SectionRow>(
  items: T[],
  sortKey: SectionSortKey,
  sortOrder: 'asc' | 'desc',
): T[] {
  const direction = sortOrder === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sortKey === 'period') {
      const byPeriod = (periodRank(a.period) - periodRank(b.period)) * direction;
      if (byPeriod !== 0) return byPeriod;
      return compareSectionName(a.section, b.section);
    }

    let compared = 0;
    switch (sortKey) {
      case 'section':
        compared = compareSectionName(a.section, b.section);
        break;
      case 'totalCount':
        compared = a.totalCount - b.totalCount;
        break;
      case 'usedCount':
        compared = a.usedCount - b.usedCount;
        break;
      case 'remainingCount':
        compared = a.remainingCount - b.remainingCount;
        break;
      case 'usageRate':
        compared = a.usageRate - b.usageRate;
        break;
      default:
        compared = 0;
    }
    if (compared !== 0) return compared * direction;
    const byPeriod = periodRank(a.period) - periodRank(b.period);
    if (byPeriod !== 0) return byPeriod;
    return compareSectionName(a.section, b.section);
  });
}

/** 「全て」なら一覧をそのまま返す。名前を選んだときは、その名前と完全に一致する行だけ残す。 */
export function pickExact<T>(
  items: T[],
  selected: string,
  nameOf: (item: T) => string,
): T[] {
  if (selected === 'all') return items;
  return items.filter((item) => nameOf(item) === selected);
}

/** 空を除いた区画名を、重複なし・読み順で返す。 */
export function uniqueNames(names: Iterable<string>): string[] {
  return [...new Set(names)]
    .filter((name) => name.length > 0)
    .sort((a, b) => a.localeCompare(b, 'ja', { numeric: true }));
}
