/** 案内やお知らせで選べる紙。数字は印刷したときの実寸（ミリ） */
export const PAPER_SIZES = [
  { id: 'a4', label: 'A4', hint: '普通の紙', widthMm: 210, heightMm: 297 },
  { id: 'b5', label: 'B5', hint: '一回り小さい', widthMm: 182, heightMm: 257 },
  { id: 'a5', label: 'A5', hint: 'A4の半分', widthMm: 148, heightMm: 210 },
  { id: 'b4', label: 'B4', hint: '一回り大きい', widthMm: 257, heightMm: 364 },
] as const;

export type PaperSizeId = (typeof PAPER_SIZES)[number]['id'];

export function paperSizeOf(id: string | undefined) {
  return PAPER_SIZES.find((size) => size.id === id) ?? PAPER_SIZES[0];
}
