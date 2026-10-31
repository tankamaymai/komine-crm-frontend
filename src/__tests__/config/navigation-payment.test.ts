import { NAV_GROUPS } from '@/config/navigation';

describe('入金管理のメニュー', () => {
  it('窓口入金と未収金一覧は入金管理の下にあり、業務には残らない', () => {
    const payment = NAV_GROUPS.find((group) => group.label === '入金管理');
    expect(payment?.items.map((item) => item.label)).toEqual(['窓口入金', '未収金一覧']);
    expect(payment?.items.map((item) => item.path)).toEqual(['/cashier', '/uncollected']);

    const work = NAV_GROUPS.find((group) => group.label === '業務');
    const workLabels = work?.items.map((item) => item.label) ?? [];
    expect(workLabels).not.toContain('窓口入金');
    expect(workLabels).not.toContain('未収金一覧');
    expect(workLabels).toContain('ゆうちょ連携');
  });
});
