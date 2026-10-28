import type { PermitField } from '@komine/types';

/** 文字が使える左右の範囲（pt）。left が無い欄は、左は気にしない */
export interface PermitFieldRoom {
  left?: number;
  right: number;
}

/**
 * 許可証の台紙で、各欄の文字が使える範囲（台紙の絵と同じ座標）。
 * 台紙の絵（permit-base-1）を測り、線の右端や「殿」「第」「号」「型」「㎡」「年」「月」「日」の
 * 手前までにしている。これを越えると、刷った文字が台紙の線や字にかかる。
 */
export const PERMIT_CERTIFICATE_FIELD_ROOM: Readonly<Record<string, PermitFieldRoom>> = {
  applicantName: { right: 330 },
  registeredAddress: { right: 344 },
  registeredAddress2: { right: 344 },
  currentAddress: { right: 344 },
  currentAddress2: { right: 344 },
  permitNumber: { left: 443, right: 544 },
  permitType: { left: 443, right: 544 },
  plotNumber: { left: 443, right: 544 },
  area: { left: 443, right: 542.5 },
  issueYear: { left: 350, right: 441 },
  issueMonth: { left: 449.5, right: 484.5 },
  issueDay: { left: 493, right: 529 },
};

export function textSpanPt(field: PermitField, widthPt: number): { left: number; right: number } {
  const align = field.align ?? 'left';
  if (align === 'center') return { left: field.x - widthPt / 2, right: field.x + widthPt / 2 };
  if (align === 'right') return { left: field.x - widthPt, right: field.x };
  return { left: field.x, right: field.x + widthPt };
}

export function overflowsRoom(field: PermitField, widthPt: number, room: PermitFieldRoom): boolean {
  const span = textSpanPt(field, widthPt);
  if (span.right > room.right) return true;
  return room.left !== undefined && span.left < room.left;
}
