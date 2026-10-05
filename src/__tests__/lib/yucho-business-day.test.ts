import {
  daysInMonth,
  getJapaneseHolidays,
  getYuchoClosedReason,
  nearestYuchoBusinessDay,
  weekdayLabel,
} from '@/lib/yucho-business-day';

describe('yucho-business-day', () => {
  it('2026年の祝日に振替休日と国民の休日が入る', () => {
    const holidays = getJapaneseHolidays(2026);
    expect(holidays.has('5-6')).toBe(true);
    expect(holidays.has('9-22')).toBe(true);
    expect(holidays.has('3-20')).toBe(true);
    expect(holidays.size).toBe(18);
  });

  it('休みの理由を返す', () => {
    expect(getYuchoClosedReason(2026, 5, 16)).toBe('weekend');
    expect(getYuchoClosedReason(2026, 9, 22)).toBe('holiday');
    expect(getYuchoClosedReason(2026, 12, 31)).toBe('year_end');
    expect(getYuchoClosedReason(2026, 10, 15)).toBeNull();
  });

  it('月の日数と曜日', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(weekdayLabel(2026, 10, 15)).toBe('木');
  });

  it('休みや存在しない日は近い営業日へ寄せる', () => {
    // 2026-05-16(土) → 18(月)
    expect(nearestYuchoBusinessDay(2026, 5, 16)).toBe(18);
    // 2026-02-30 は無い → 月末27(金)。28は土曜
    expect(nearestYuchoBusinessDay(2026, 2, 30)).toBe(27);
    expect(nearestYuchoBusinessDay(2026, 10, 15)).toBe(15);
  });
});
