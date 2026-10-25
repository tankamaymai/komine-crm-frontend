import { cn } from '@/lib/utils';
import type { PlotMapStatus } from '@/lib/plot-maps/types';

export const PLOT_MAP_STATUS_LABELS: Record<PlotMapStatus, string> = {
  vacant: '空き',
  reserved: '予約',
  contracted: '契約済み',
  unsellable: '売却不可',
  unknown: '台帳にない',
};

const LEGEND: Array<{ status: PlotMapStatus; className: string }> = [
  { status: 'vacant', className: 'bg-matsu-50 border-matsu' },
  { status: 'reserved', className: 'bg-kohaku-50 border-kohaku' },
  { status: 'contracted', className: 'bg-white border-gin' },
  { status: 'unsellable', className: 'bg-yellow-100 border-yellow-400' },
  { status: 'unknown', className: 'bg-kinari border-dashed border-gin' },
];

export function PlotMapLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-3 text-xs text-hai', className)}>
      {LEGEND.map((item) => (
        <li key={item.status} className="inline-flex items-center gap-1.5">
          <span className={cn('inline-block h-3.5 w-3.5 rounded-sm border', item.className)} />
          {PLOT_MAP_STATUS_LABELS[item.status]}
        </li>
      ))}
    </ul>
  );
}
