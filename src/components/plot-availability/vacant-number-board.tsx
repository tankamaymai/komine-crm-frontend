import type { VacantLedgerPlot } from '@/lib/api/plot-inventory';

export function VacantNumberBoard({ plots }: { plots: VacantLedgerPlot[] }) {
  if (plots.length === 0) {
    return <p className="pb-3 text-sm text-hai">空きはありません</p>;
  }

  return (
    <div className="border-l-2 border-matsu/40 pb-3 pl-3">
      <p className="mb-2 text-xs text-hai">
        空き <span className="font-semibold tabular-nums text-matsu">{plots.length}</span> 件
      </p>
      <ol
        className="m-0 grid list-none gap-1 p-0"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(4.75rem, 1fr))' }}
      >
        {plots.map((plot) => (
          <li
            key={plot.id}
            className="rounded-md bg-matsu-50 px-1 py-1.5 text-center font-mono text-[13px] leading-none tracking-tight text-matsu-dark"
            title={plot.areaSqm ? `${plot.label}　${plot.areaSqm}㎡` : plot.label}
          >
            {plot.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
