import type { PermitField } from '@komine/types';
import { PERMIT_CERTIFICATE_PAGES } from '@komine/types';

import {
  PERMIT_CERTIFICATE_FIELD_ROOM,
  overflowsRoom,
  textSpanPt,
} from '@/lib/permit-field-room';

const field = (overrides: Partial<PermitField>): PermitField =>
  ({
    id: 'x',
    label: 'x',
    pageIndex: 0,
    x: 100,
    y: 100,
    fontSize: 12,
    direction: 'horizontal',
    align: 'left',
    ...overrides,
  }) as PermitField;

describe('許可証の欄の使える範囲', () => {
  it('許可証の入力欄すべてに、使える範囲が決まっている', () => {
    const ids = PERMIT_CERTIFICATE_PAGES[0]!.fields.map((f) => f.id);
    ids.forEach((id) => {
      expect(PERMIT_CERTIFICATE_FIELD_ROOM[id]).toBeDefined();
    });
  });

  it('使える範囲は、文字を置く位置を含んでいる', () => {
    PERMIT_CERTIFICATE_PAGES[0]!.fields.forEach((f) => {
      const room = PERMIT_CERTIFICATE_FIELD_ROOM[f.id]!;
      expect(room.right).toBeGreaterThan(f.x);
      if (room.left !== undefined) expect(room.left).toBeLessThan(f.x);
    });
  });

  it('左寄せの文字は置く位置から右へ伸びる', () => {
    expect(textSpanPt(field({ align: 'left', x: 100 }), 40)).toEqual({ left: 100, right: 140 });
  });

  it('中央寄せの文字は置く位置から左右へ半分ずつ伸びる', () => {
    expect(textSpanPt(field({ align: 'center', x: 100 }), 40)).toEqual({ left: 80, right: 120 });
  });

  it('右端を越えたらはみ出し', () => {
    const f = field({ align: 'left', x: 100 });
    expect(overflowsRoom(f, 40, { right: 140 })).toBe(false);
    expect(overflowsRoom(f, 41, { right: 140 })).toBe(true);
  });

  it('中央寄せは左端を越えてもはみ出し', () => {
    const f = field({ align: 'center', x: 100 });
    expect(overflowsRoom(f, 20, { left: 90, right: 200 })).toBe(false);
    expect(overflowsRoom(f, 22, { left: 90, right: 200 })).toBe(true);
  });

  it('本籍1列目は、台紙の線の右端までなら収まる', () => {
    const f = PERMIT_CERTIFICATE_PAGES[0]!.fields.find((x) => x.id === 'registeredAddress')!;
    const room = PERMIT_CERTIFICATE_FIELD_ROOM.registeredAddress!;
    expect(overflowsRoom(f, room.right - f.x, room)).toBe(false);
    expect(overflowsRoom(f, room.right - f.x + 1, room)).toBe(true);
  });
});
