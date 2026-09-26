import type { GraveClassificationsResponse } from '@komine/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isLegacyAreaName } from '@/lib/legacy-plot-display';
import { PERIOD_NAMES } from '@/lib/section-period';

export type OccupancyFilter = 'in_use' | 'vacant' | 'all';

interface PlotFiltersProps {
  filterOccupancy: OccupancyFilter;
  onFilterOccupancyChange: (value: string) => void;
  filterPeriod: string;
  onFilterPeriodChange: (value: string) => void;
  filterAreaName: string;
  onFilterAreaNameChange: (value: string) => void;
  filterGraveType: number | undefined;
  onFilterGraveTypeChange: (value: string) => void;
  graveClassifications: GraveClassificationsResponse;
  showBuriedPersons: boolean;
  onToggleBuriedPersons: (checked: boolean) => void;
}

/** 折りたたみフィルタ行。 */
export function PlotFilters({
  filterOccupancy,
  onFilterOccupancyChange,
  filterPeriod,
  onFilterPeriodChange,
  filterAreaName,
  onFilterAreaNameChange,
  filterGraveType,
  onFilterGraveTypeChange,
  graveClassifications,
  showBuriedPersons,
  onToggleBuriedPersons,
}: PlotFiltersProps) {
  const areaOptions = (graveClassifications.areaNames ?? []).filter((name) => !isLegacyAreaName(name));
  const selectableAreas =
    filterAreaName && !areaOptions.includes(filterAreaName)
      ? [filterAreaName, ...areaOptions]
      : areaOptions;

  return (
    <div className="mb-3 p-3 bg-white border border-gin rounded-elegant grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 sm:flex-wrap">
      <div className="flex items-center gap-1 sm:gap-2">
        <span className="text-xs sm:text-sm text-hai whitespace-nowrap">利用:</span>
        <Select value={filterOccupancy} onValueChange={onFilterOccupancyChange}>
          <SelectTrigger className="w-full sm:w-32 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_use">利用中</SelectItem>
            <SelectItem value="vacant">空き区画</SelectItem>
            <SelectItem value="all">全て</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <span className="text-xs sm:text-sm text-hai whitespace-nowrap">期:</span>
        <Select value={filterPeriod || 'all'} onValueChange={onFilterPeriodChange}>
          <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て</SelectItem>
            {PERIOD_NAMES.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
            <SelectItem value="その他">その他</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <span className="text-xs sm:text-sm text-hai whitespace-nowrap">エリア:</span>
        <Select value={filterAreaName || 'all'} onValueChange={onFilterAreaNameChange}>
          <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て</SelectItem>
            {selectableAreas.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <span className="text-xs sm:text-sm text-hai whitespace-nowrap">区分:</span>
        <Select
          value={filterGraveType === undefined ? 'all' : String(filterGraveType)}
          onValueChange={onFilterGraveTypeChange}
        >
          <SelectTrigger className="w-full sm:w-20 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て</SelectItem>
            {graveClassifications.graveTypes.map((v) => (
              <SelectItem key={v} value={String(v)}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="md:hidden items-center gap-1.5 text-xs sm:text-sm text-hai cursor-pointer col-span-2 select-none flex">
        <input
          type="checkbox"
          checked={showBuriedPersons}
          onChange={(e) => onToggleBuriedPersons(e.target.checked)}
          className="rounded border-gin accent-matsu"
        />
        埋葬者を表示
      </label>
    </div>
  );
}
