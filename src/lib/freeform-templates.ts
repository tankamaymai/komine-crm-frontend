export type FreeformFont = 'gothic' | 'mincho';
export type FreeformWeight = 'normal' | 'bold';
export type FreeformDirection = 'vertical' | 'horizontal';

export interface FreeformBlock {
  id: string;
  text: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  font: FreeformFont;
  sizePt: number;
  weight: FreeformWeight;
  direction: FreeformDirection;
}

export interface SavedFreeformTemplate {
  id: string;
  name: string;
  blocks: FreeformBlock[];
}

const STORAGE_KEY = 'komine-freeform-templates';

export const FREEFORM_PAGE = { widthMm: 210, heightMm: 297 };

function isBlock(value: unknown): value is FreeformBlock {
  if (!value || typeof value !== 'object') return false;
  const block = value as FreeformBlock;
  return typeof block.id === 'string' && typeof block.text === 'string';
}

export function parseFreeformBlocks(raw: string | undefined): FreeformBlock[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? data.filter(isBlock) : [];
  } catch {
    return [];
  }
}

export function listFreeformTemplates(): SavedFreeformTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (item): item is SavedFreeformTemplate =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as SavedFreeformTemplate).id === 'string' &&
        typeof (item as SavedFreeformTemplate).name === 'string' &&
        Array.isArray((item as SavedFreeformTemplate).blocks)
    );
  } catch {
    return [];
  }
}

export function saveFreeformTemplate(name: string, blocks: FreeformBlock[]): SavedFreeformTemplate {
  const next: SavedFreeformTemplate = {
    id: `freeform-${Date.now()}`,
    name: name.trim() || '名前のない形',
    blocks,
  };
  const all = listFreeformTemplates().filter((item) => item.name !== next.name);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...all]));
  return next;
}
