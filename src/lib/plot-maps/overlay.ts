import { PLOT_MAPS } from './catalog';
import type {
  PlotMapCellView,
  PlotMapId,
  PlotMapLayoutCell,
  PlotMapOverlayPlot,
  PlotMapPlacedCell,
  PlotMapStatus,
} from './types';

const FULLWIDTH = /[\uFF01-\uFF5E]/g;

export function toHalfWidth(value: string): string {
  return value.replace(FULLWIDTH, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

export function normalizeSectionKey(section: string): string {
  return toHalfWidth(section)
    .replace(/区$/u, '')
    .trim()
    .toUpperCase();
}

export function normalizePlotLabel(label: string): string {
  return toHalfWidth(String(label)).trim();
}

export function expectedDisplayNumber(section: string, plotLabel: string): string {
  return `${normalizeSectionKey(section)}-${normalizePlotLabel(plotLabel)}`;
}

export function findMapId(period: string, section: string): PlotMapId | null {
  const sectionKey = normalizeSectionKey(section);
  for (const map of Object.values(PLOT_MAPS)) {
    if (map.period !== period) continue;
    if (map.sectionKeys.some((key) => normalizeSectionKey(key) === sectionKey)) {
      return map.id;
    }
  }
  return null;
}

export function hasPlotMap(period: string, section: string): boolean {
  return findMapId(period, section) !== null;
}

export function parseMapId(value: string | null | undefined): PlotMapId | null {
  if (!value) return null;
  return Object.prototype.hasOwnProperty.call(PLOT_MAPS, value) ? value : null;
}

function normalizeId(value: string): string {
  return toHalfWidth(value).replace(/\s+/g, '').toUpperCase();
}

/** 凛A や 吉相C のように、区名の末尾の英字。A区そのものは対象にしない。 */
export function zoneLetter(areaName: string): string | null {
  const key = normalizeSectionKey(areaName);
  const match = key.match(/^(.+)([A-Z])$/);
  if (!match?.[1]) return null;
  return match[2];
}

export function matchLayoutCellToPlot(
  plotLabel: string,
  section: string,
  plot: PlotMapOverlayPlot
): boolean {
  const expected = expectedDisplayNumber(section, plotLabel);
  const compact = expected.replace('-', '');
  const candidates = [plot.displayNumber, plot.plotNumber]
    .filter((value): value is string => !!value)
    .map(normalizeId);

  if (candidates.includes(normalizeId(expected)) || candidates.includes(normalizeId(compact))) {
    return true;
  }

  const areaMatches = normalizeSectionKey(plot.areaName) === normalizeSectionKey(section);
  const labelOnly = normalizePlotLabel(plot.displayNumber ?? plot.plotNumber);
  if (areaMatches && labelOnly === normalizePlotLabel(plotLabel)) {
    return true;
  }

  // 地図は A-43-6、台帳は 43-6（区名 凛A）のように、先頭の英字だけ地図側に付く。
  const zone = zoneLetter(plot.areaName);
  const display = normalizePlotLabel(plot.displayNumber ?? '');
  const label = normalizePlotLabel(plotLabel);
  return !!zone && !!display && label === `${zone}-${display}`;
}

export function deriveOverlayStatus(
  plot: PlotMapOverlayPlot | null,
  unsellable: boolean
): PlotMapStatus {
  if (unsellable) return 'unsellable';
  if (!plot) return 'unknown';
  return plot.overlayStatus;
}

export function shortContractorName(name: string | null): string | null {
  if (!name) return null;
  const head = name.trim().split(/\s+/)[0] ?? name.trim();
  return head.slice(0, 4);
}

const STATUS_LABEL: Record<PlotMapStatus, string> = {
  vacant: '空き',
  reserved: '予約',
  contracted: '契約',
  unsellable: '売却不可',
  unknown: '不明',
};

export function overlayLayoutWithPlots(
  cells: Array<PlotMapLayoutCell & Partial<Pick<PlotMapPlacedCell, 'originRow' | 'originCol'>>>,
  section: string | string[],
  plots: PlotMapOverlayPlot[]
): PlotMapCellView[] {
  const sections = Array.isArray(section) ? section : [section];
  const usedPlotIds = new Set<string>();
  return cells.map((cell) => {
    const matched =
      plots.find(
        (plot) =>
          !usedPlotIds.has(plot.id) &&
          sections.some((key) => matchLayoutCellToPlot(cell.plotLabel, key, plot))
      ) ?? null;
    if (matched) usedPlotIds.add(matched.id);
    const status = deriveOverlayStatus(matched, cell.unsellable === true);
    const contractorName = matched?.contractorName ?? null;
    const shortName = shortContractorName(contractorName);
    let displayLabel = STATUS_LABEL[status];
    if (status === 'contracted' && shortName) displayLabel = shortName;
    if (status === 'reserved' && shortName) displayLabel = shortName;

    return {
      row: cell.row,
      col: cell.col,
      originRow: cell.originRow ?? cell.row,
      originCol: cell.originCol ?? cell.col,
      plotLabel: cell.plotLabel,
      status,
      displayLabel,
      areaSqm: matched?.areaSqm ?? null,
      contractorName,
      reservationDate: matched?.reservationDate ?? null,
      physicalPlotId: matched?.id ?? null,
      contractPlotId: matched?.contractPlotId ?? null,
    };
  });
}
