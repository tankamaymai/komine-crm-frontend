import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PLOT_MAP_STATUS_LABELS } from './PlotMapLegend';
import type { PlotMapCellView } from '@/lib/plot-maps/types';

export function PlotMapPanel({ cell }: { cell: PlotMapCellView | null }) {
  if (!cell) {
    return (
      <aside className="rounded-elegant border border-dashed border-gin bg-kinari/40 p-4 text-sm text-hai">
        マスをクリックすると、契約者・予約日・空き状況が出ます。
      </aside>
    );
  }

  const canOpenLedger = !!cell.contractPlotId;
  const canRegister = cell.status === 'vacant' && !!cell.physicalPlotId;

  return (
    <aside className="rounded-elegant border border-gin bg-white p-4 shadow-elegant-sm">
      <p className="text-xs font-semibold text-hai">選択中の区画</p>
      <p className="mt-1 font-mono text-lg font-semibold text-matsu">{cell.plotLabel}番</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-hai">状態</dt>
          <dd className="font-medium text-sumi">{PLOT_MAP_STATUS_LABELS[cell.status]}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-hai">契約者</dt>
          <dd className="text-sumi">{cell.contractorName || '-'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-hai">予約日</dt>
          <dd className="text-sumi">{cell.reservationDate || '-'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-hai">面積</dt>
          <dd className="text-sumi">{cell.areaSqm != null ? `${cell.areaSqm}㎡` : '-'}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-col gap-2">
        {canOpenLedger && (
          <Link
            href={`/plots/${cell.contractPlotId}`}
            className={cn(buttonVariants({ variant: 'matsu', size: 'sm' }), 'w-full')}
          >
            台帳を開く
          </Link>
        )}
        {canRegister && (
          <Link
            href="/plots/new"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}
          >
            新規登録へ
          </Link>
        )}
        {cell.status === 'vacant' && (
          <p className="text-xs text-matsu">この区画は空いています。</p>
        )}
        {cell.status === 'unsellable' && (
          <p className="text-xs text-hai">この区画は売却できません。</p>
        )}
        {cell.status === 'unknown' && (
          <p className="text-xs text-hai">
            この番号は台帳の区画と結びついていません。空きかどうかは分かりません。
          </p>
        )}
      </div>
    </aside>
  );
}
