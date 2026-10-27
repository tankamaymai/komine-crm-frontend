'use client';

/**
 * まとめ買い登録の2つ目以降の区画（仕様: komine-docs/design/COMBINED_PLOT_SALE_SPEC.md）
 *
 * お客様の名前は1回だけ書き、区画ごとに契約を作る。埋葬者・墓石などは1つ目にだけ付く。
 */

import { useEffect, useMemo, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import type { VacantPlotItem } from '@komine/types';
import { MAX_PLOTS_PER_REGISTRATION } from '@komine/types/validations';
import { createAdditionalPlotRow } from '@/lib/validations/plot-form';
import { SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlotTabBaseProps } from './types';
import { ViewModeField, ViewModeSelect } from './ViewModeField';
import { VacantPlotPicker } from './VacantPlotPicker';

type RowProps = Pick<PlotTabBaseProps, 'register' | 'watch' | 'setValue' | 'errors' | 'masterData'>;

function useSectionsByPeriod(masterData: PlotTabBaseProps['masterData']) {
  return useMemo(() => {
    const periodSet = new Set<string>();
    const map: Record<string, string[]> = {};
    for (const item of masterData?.sectionNames || []) {
      periodSet.add(item.period);
      (map[item.period] ||= []).push(item.name);
    }
    return { periods: Array.from(periodSet), sectionsByPeriod: map };
  }, [masterData?.sectionNames]);
}

export function AdditionalPlotsFields({
  register,
  watch,
  setValue,
  errors,
  control,
  masterData,
}: PlotTabBaseProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'additionalPlots' });

  const firstPlotId = watch('physicalPlot.id');
  const firstAreaName = watch('physicalPlot.areaName');
  const additionalPlots = watch('additionalPlots') ?? [];
  const canAdd = fields.length < MAX_PLOTS_PER_REGISTRATION - 1;

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-sumi">まとめて買う区画</h3>
        <p className="mt-1 text-xs text-hai">
          同じお客様が隣の区画なども一緒に買うときは「もう1区画足す」を押してください。名前や住所は上で1回書けば、全部の区画に入ります。埋葬者や墓石は1つ目の区画にだけ入ります。
        </p>
      </div>

      {fields.map((field, index) => {
        const excludeIds = [
          firstPlotId,
          ...additionalPlots.map((plot, other) => (other === index ? '' : plot.physicalPlotId)),
        ].filter((id): id is string => Boolean(id));

        return (
          <AdditionalPlotRow
            key={field.id}
            index={index}
            excludeIds={excludeIds}
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
            masterData={masterData}
            onRemove={() => remove(index)}
          />
        );
      })}

      {errors.additionalPlots?.root?.message && (
        <p className="text-beni text-sm">{errors.additionalPlots.root.message}</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canAdd}
        onClick={() => append(createAdditionalPlotRow(firstAreaName || ''))}
      >
        もう1区画足す
      </Button>
      {!canAdd && (
        <p className="text-xs text-hai">
          一度に登録できる区画は{MAX_PLOTS_PER_REGISTRATION}件までです
        </p>
      )}
    </div>
  );
}

function AdditionalPlotRow({
  index,
  excludeIds,
  register,
  watch,
  setValue,
  errors,
  masterData,
  onRemove,
}: RowProps & { index: number; excludeIds: string[]; onRemove: () => void }) {
  const prefix = `additionalPlots.${index}` as const;
  const rowErrors = errors.additionalPlots?.[index];
  const { periods, sectionsByPeriod } = useSectionsByPeriod(masterData);

  const areaName = watch(`${prefix}.areaName`);
  const plotNumber = watch(`${prefix}.plotNumber`);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  useEffect(() => {
    if (!areaName) return;
    const found = Object.entries(sectionsByPeriod).find(([, sections]) =>
      sections.includes(areaName)
    )?.[0];
    if (found) setSelectedPeriod((prev) => (prev === found ? prev : found));
  }, [sectionsByPeriod, areaName]);

  const setRow = (values: Partial<Record<'physicalPlotId' | 'plotNumber', string>> & {
    displayNumber?: string | null;
    availableAreaSqm?: number;
    contractAreaSqm?: number;
  }) => {
    for (const [key, value] of Object.entries(values)) {
      setValue(`${prefix}.${key as keyof typeof values}`, value as never, { shouldDirty: true });
    }
  };

  const clearPlot = () =>
    setRow({ physicalPlotId: '', plotNumber: '', displayNumber: null, availableAreaSqm: 0, contractAreaSqm: 0 });

  const handleSelect = (plot: VacantPlotItem) =>
    setRow({
      physicalPlotId: plot.id,
      plotNumber: plot.plotNumber,
      displayNumber: plot.displayNumber,
      availableAreaSqm: plot.availableAreaSqm,
      // 残りを丸ごと買うのが普通なので、残りの広さを最初の値にする
      contractAreaSqm: plot.availableAreaSqm,
    });

  const changeArea = (value: string) => {
    setValue(`${prefix}.areaName`, value, { shouldDirty: true });
    clearPlot();
  };

  // 選択欄は、こちらが値を入れ直したときにも空や同じ値で呼ばれることがある。人が選び直したときだけ反応する
  const changePeriod = (value: string) => {
    if (!value || value === selectedPeriod) return;
    setSelectedPeriod(value);
    changeArea('');
  };

  return (
    <div className="rounded-lg border border-gin bg-shiro p-4 space-y-4" data-testid={`additional-plot-${index}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-sumi">{index + 2}つ目の区画</h4>
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          この区画をやめる
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">
            区画
            <span className="text-beni"> *</span>
          </Label>
          <div className="space-y-2">
            <ViewModeSelect
              label=""
              value={selectedPeriod}
              onValueChange={changePeriod}
              placeholder="期を選択..."
            >
              {periods.map((period) => (
                <SelectItem key={period} value={period}>
                  {period}
                </SelectItem>
              ))}
            </ViewModeSelect>
            {selectedPeriod && (
              <ViewModeSelect
                label=""
                value={areaName || ''}
                onValueChange={(value) => {
                  if (value && value !== areaName) changeArea(value);
                }}
                placeholder="区画を選択..."
              >
                {sectionsByPeriod[selectedPeriod]?.map((section) => (
                  <SelectItem key={section} value={section}>
                    {section}
                  </SelectItem>
                ))}
              </ViewModeSelect>
            )}
          </div>
          {rowErrors?.areaName && <p className="text-beni text-sm mt-1">{rowErrors.areaName.message}</p>}
        </div>

        <VacantPlotPicker
          inputId={`vacant-plot-search-extra-${index}`}
          label={`区画番号（${index + 2}つ目）`}
          value={plotNumber || ''}
          areaName={areaName || undefined}
          excludeIds={excludeIds}
          onSelect={handleSelect}
          onClear={clearPlot}
          error={rowErrors?.physicalPlotId?.message}
        />

        <ViewModeField
          label="契約面積(㎡)"
          required
          type="number"
          register={register(`${prefix}.contractAreaSqm`)}
          error={rowErrors?.contractAreaSqm?.message}
        />

        <ViewModeField
          label="区画位置詳細"
          register={register(`${prefix}.locationDescription`)}
          error={rowErrors?.locationDescription?.message}
          placeholder="例: 北側中央付近"
        />

        <ViewModeField
          label="金額"
          type="number"
          register={register(`${prefix}.price`)}
          error={rowErrors?.price?.message}
          placeholder="空でも登録できます"
        />

        <div className="grid grid-cols-2 gap-4">
          <ViewModeField
            label="使用料"
            register={register(`${prefix}.usageFee`)}
            error={rowErrors?.usageFee?.message}
          />
          <ViewModeField
            label="管理料"
            register={register(`${prefix}.managementFee`)}
            error={rowErrors?.managementFee?.message}
          />
        </div>
      </div>
      <p className="text-xs text-hai">
        使用料・管理料の計算区分や請求月は、1つ目の区画と同じものが入ります。金額だけこの区画の分を書いてください。
      </p>
    </div>
  );
}
