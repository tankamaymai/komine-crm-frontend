import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, SlidersHorizontal, Type, X } from 'lucide-react';
import {
  PLOT_FONT_SIZE_LABELS,
  PLOT_FONT_SIZES,
  PLOT_FONT_WEIGHT_LABELS,
  PLOT_FONT_WEIGHTS,
  type PlotFontSize,
  type PlotFontWeight,
} from '@/lib/plots-display-settings';
import { AIUEO_TABS } from './constants';

interface PlotToolbarProps {
  isFilterExpanded: boolean;
  onToggleFilter: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  isAiueoExpanded: boolean;
  onToggleAiueo: () => void;
  activeTab: string;
  onClearFilters: () => void;
  hasCustomColumnWidths: boolean;
  onResetColumnWidths: () => void;
  showBuriedPersons: boolean;
  onToggleBuriedPersons: (checked: boolean) => void;
  isDisplaySettingsOpen: boolean;
  onToggleDisplaySettings: () => void;
  fontSize: PlotFontSize;
  fontWeight: PlotFontWeight;
  onFontSizeChange: (size: PlotFontSize) => void;
  onFontWeightChange: (weight: PlotFontWeight) => void;
}

/** フィルタ・あいう順の切替ボタン + アクティブ条件バッジ + 列幅リセット + 埋葬者表示。 */
export function PlotToolbar({
  isFilterExpanded,
  onToggleFilter,
  hasActiveFilters,
  activeFilterCount,
  isAiueoExpanded,
  onToggleAiueo,
  activeTab,
  onClearFilters,
  hasCustomColumnWidths,
  onResetColumnWidths,
  showBuriedPersons,
  onToggleBuriedPersons,
  isDisplaySettingsOpen,
  onToggleDisplaySettings,
  fontSize,
  fontWeight,
  onFontSizeChange,
  onFontWeightChange,
}: PlotToolbarProps) {
  return (
    <div className="mb-3 flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={onToggleFilter}
        aria-expanded={isFilterExpanded}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 h-9 rounded-elegant border text-xs sm:text-sm transition-colors',
          isFilterExpanded || hasActiveFilters
            ? 'bg-ai-50 text-ai border-ai-200'
            : 'bg-white text-hai border-gin hover:bg-kinari'
        )}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        フィルター
        {hasActiveFilters && (
          <span className="inline-flex items-center justify-center w-4 h-4 bg-ai text-white text-[10px] font-bold rounded-full">
            {activeFilterCount}
          </span>
        )}
        {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <button
        type="button"
        onClick={onToggleAiueo}
        aria-expanded={isAiueoExpanded}
        className={cn(
          'hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-elegant border text-xs sm:text-sm transition-colors',
          isAiueoExpanded || activeTab !== '全'
            ? 'bg-matsu-50 text-matsu border-matsu-200'
            : 'bg-white text-hai border-gin hover:bg-kinari'
        )}
      >
        あいう順
        {activeTab !== '全' && (
          <span className="inline-flex items-center justify-center px-1.5 h-4 bg-matsu text-white text-[10px] font-bold rounded-full">
            {AIUEO_TABS.find((t) => t.key === activeTab)?.shortLabel}
          </span>
        )}
        {isAiueoExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-1 px-2 h-9 rounded-elegant text-xs text-beni hover:bg-beni-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          フィルタ解除
        </button>
      )}

      {hasCustomColumnWidths && (
        <button
          type="button"
          onClick={onResetColumnWidths}
          className="hidden md:inline-flex items-center gap-1 px-2 h-9 rounded-elegant text-xs text-hai hover:bg-kinari transition-colors ml-auto"
          title="列幅を初期状態に戻す"
        >
          <X className="w-3.5 h-3.5" />
          列幅をリセット
        </button>
      )}

      <label
        className={cn(
          'hidden md:inline-flex items-center gap-1.5 text-xs sm:text-sm text-hai cursor-pointer select-none',
          !hasCustomColumnWidths && 'ml-auto'
        )}
      >
        <input
          type="checkbox"
          checked={showBuriedPersons}
          onChange={(e) => onToggleBuriedPersons(e.target.checked)}
          className="rounded border-gin accent-matsu"
        />
        埋葬者を表示
      </label>

      <button
        type="button"
        onClick={onToggleDisplaySettings}
        aria-expanded={isDisplaySettingsOpen}
        className={cn(
          'hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-elegant border text-xs sm:text-sm transition-colors',
          isDisplaySettingsOpen
            ? 'bg-matsu-50 text-matsu border-matsu-200'
            : 'bg-white text-hai border-gin hover:bg-kinari'
        )}
      >
        <Type className="w-3.5 h-3.5" />
        文字の設定
        {isDisplaySettingsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isDisplaySettingsOpen && (
        <div className="w-full basis-full p-3 bg-white border border-gin rounded-elegant flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-hai whitespace-nowrap">大きさ</span>
            <div className="inline-flex rounded-elegant border border-gin overflow-hidden">
              {PLOT_FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={fontSize === size}
                  onClick={() => onFontSizeChange(size)}
                  className={cn(
                    'px-3 h-8 text-sm transition-colors',
                    fontSize === size ? 'bg-matsu text-white' : 'bg-white text-sumi hover:bg-kinari'
                  )}
                >
                  {PLOT_FONT_SIZE_LABELS[size]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-hai whitespace-nowrap">太さ</span>
            <div className="inline-flex rounded-elegant border border-gin overflow-hidden">
              {PLOT_FONT_WEIGHTS.map((weight) => (
                <button
                  key={weight}
                  type="button"
                  aria-pressed={fontWeight === weight}
                  onClick={() => onFontWeightChange(weight)}
                  className={cn(
                    'px-3 h-8 text-sm transition-colors',
                    fontWeight === weight ? 'bg-matsu text-white' : 'bg-white text-sumi hover:bg-kinari'
                  )}
                >
                  {PLOT_FONT_WEIGHT_LABELS[weight]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
