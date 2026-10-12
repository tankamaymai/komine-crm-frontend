'use client';

import { useState, useEffect } from 'react';
import { BurialInfoTabProps, getDefaultBuriedPerson } from './types';
import { MasterFallbackSelectItem, ViewModeField, ViewModeSelect } from './ViewModeField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Gender } from '@komine/types';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import {
  inferValidityPeriodYears,
  summarizeValidityRule,
  calculateScheduledCollectiveBurialDate,
  getValidityYearOptions,
} from '@/lib/collective-burial-rules';
import { formatDate } from '@/lib/format';

/**
 * 合祀年数の標準値（マスタ由来）をワンタップで選べるクイック選択チップ（#289）。
 * 自由入力（例外指定 Q17）は維持しつつ、標準年数の語彙をマスタから供給する。
 */
function ValidityYearChips({
  options,
  value,
  onPick,
  onClear,
}: {
  options: number[];
  value: number | null | undefined;
  onPick: (year: number) => void;
  onClear?: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-hai">標準（マスタ）:</span>
      {options.map((year) => {
        const active = value === year;
        return (
          <button
            key={year}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(year)}
            className={`px-2 py-0.5 rounded-full border text-xs transition-colors ${
              active
                ? 'bg-matsu text-white border-matsu'
                : 'bg-white text-sumi border-gin hover:bg-matsu-50'
            }`}
          >
            {year}年
          </button>
        );
      })}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="px-2 py-0.5 rounded-full border border-gin text-xs text-hai bg-white hover:bg-kinari"
        >
          区画既定
        </button>
      )}
    </div>
  );
}

export function BurialInfoTab({
  register,
  watch,
  setValue,
  errors,
  buriedPersonFields,
  addBuriedPerson,
  removeBuriedPerson,
  masterData,
}: BurialInfoTabProps) {
  const relationships = masterData?.relationships ?? [];
  // 合祀年数の標準選択肢は backend マスタから供給（#289）。未取得時は標準値にフォールバック
  const validityYearOptions = getValidityYearOptions(masterData?.validityPeriods);
  const [expandedBurialId, setExpandedBurialId] = useState<string | null>(null);

  const collectiveBurial = watch('collectiveBurial');
  const [collectiveBurialEnabled, setCollectiveBurialEnabled] = useState(!!collectiveBurial);

  // 合祀年数の自動判定（#259）。区域名＋契約日から業務ルールで推定する。
  // タイプ×年数の確定対応表は業務確認 Q34 回答待ちのため、現行ルールを fallback とし、
  // 推定値と異なる手動指定は例外指定として許容する（Q17「例外対応できるように」）。
  const areaName = watch('physicalPlot.areaName');
  const contractDate = watch('saleContract.contractDate');
  const inferredValidityYears = inferValidityPeriodYears(areaName, contractDate || null);
  const validityRuleSummary = summarizeValidityRule(areaName, contractDate || null);
  const currentValidityYears = collectiveBurial?.validityPeriodYears;
  const isValidityOverridden =
    typeof currentValidityYears === 'number' &&
    !Number.isNaN(currentValidityYears) &&
    currentValidityYears !== inferredValidityYears;

  useEffect(() => {
    setCollectiveBurialEnabled(!!collectiveBurial);
  }, [collectiveBurial]);

  const handleToggleCollectiveBurial = (enabled: boolean) => {
    setCollectiveBurialEnabled(enabled);
    if (enabled) {
      setValue('collectiveBurial', {
        burialCapacity: 10,
        // 自動判定値を初期値にする（#259）。手動で変更すれば例外指定として保存される。
        validityPeriodYears: inferredValidityYears,
        billingAmount: null,
        notes: null,
      });
    } else {
      setValue('collectiveBurial', null);
    }
  };

  const genderLabels: Record<Gender, string> = {
    [Gender.Male]: '男性',
    [Gender.Female]: '女性',
    [Gender.NotAnswered]: '未回答',
  };

  // ===== 最終納骨者（合祀カウントダウンの起点）— 議事録 2026-07-21 §1 =====

  const buriedPersons = watch('buriedPersons');
  // 区画に適用される合祀年数（合祀設定の入力値。未入力なら自動判定値）
  const resolvedPlotValidityYears =
    typeof collectiveBurial?.validityPeriodYears === 'number' &&
    !Number.isNaN(collectiveBurial.validityPeriodYears)
      ? collectiveBurial.validityPeriodYears
      : inferredValidityYears;
  const finalBurialIndex =
    buriedPersons?.findIndex((person) => person?.isFinalBurial === true) ?? -1;
  const hasFinalBurial = finalBurialIndex >= 0;
  // 議事録の「2人目以降の納骨登録時に毎回、カウントダウンを開始してよいか確認を促す」に対応。
  // 毎回モーダルを出すと作業を止めるため、未指定であることを常設の注意として見せる。
  const shouldPromptFinalBurial =
    collectiveBurialEnabled && (buriedPersons?.length ?? 0) >= 2 && !hasFinalBurial;

  // 確認ダイアログ対象の埋葬者 index（null = 非表示）
  const [finalBurialConfirmIndex, setFinalBurialConfirmIndex] = useState<number | null>(null);

  /**
   * 最終納骨者フラグを設定する。1区画につき1人までなので、オンにしたら他は自動でオフにする
   * （backend も1人までしか受け付けず、複数指定は 400 になる）。
   */
  const setFinalBurial = (index: number, value: boolean) => {
    if (value) {
      (buriedPersons ?? []).forEach((_, i) => {
        if (i !== index) {
          setValue(`buriedPersons.${i}.isFinalBurial`, false, { shouldDirty: true });
        }
      });
    }
    setValue(`buriedPersons.${index}.isFinalBurial`, value, { shouldDirty: true });
  };

  const requestFinalBurialConfirm = (index: number) => setFinalBurialConfirmIndex(index);

  const confirmTargetName =
    finalBurialConfirmIndex === null
      ? ''
      : watch(`buriedPersons.${finalBurialConfirmIndex}.name`) || 'この方';
  const confirmTargetBurialDate =
    finalBurialConfirmIndex === null
      ? null
      : watch(`buriedPersons.${finalBurialConfirmIndex}.burialDate`) || null;
  const confirmScheduledDate = confirmTargetBurialDate
    ? calculateScheduledCollectiveBurialDate(confirmTargetBurialDate, resolvedPlotValidityYears)
    : null;
  const replacedFinalBurialName =
    hasFinalBurial && finalBurialConfirmIndex !== null && finalBurialIndex !== finalBurialConfirmIndex
      ? watch(`buriedPersons.${finalBurialIndex}.name`) || '（氏名未入力）'
      : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">埋葬者情報</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBuriedPerson(getDefaultBuriedPerson())}
        >
          <Plus className="h-4 w-4 mr-1" />
          埋葬者を追加
        </Button>
      </div>

      {/* 最終納骨者が未指定である旨の常設注意（議事録 2026-07-21 §1）。
          2人目以降の納骨で毎回意識してもらう箇所。指定されるまで契約日起点で数える */}
      {shouldPromptFinalBurial && (
        <div className="p-3 rounded-lg border border-kohaku-200 bg-kohaku-50">
          <p className="text-sm text-kohaku-dark font-medium">最終納骨者が指定されていません</p>
          <p className="text-xs text-kohaku-dark mt-1">
            この中に最後の納骨者がいる場合は、その方を開いて「最終納骨者」をオンにしてください。
            オンにするとその方の埋葬日を起点に合祀までのカウントダウンが始まります。
            指定がない間は契約日起点で数えます。
          </p>
        </div>
      )}

      {/* Header Row */}
      <div className="grid grid-cols-4 gap-4 p-3 bg-kinari border rounded-md text-sm font-semibold">
        <div>氏名</div>
        <div>性別</div>
        <div>命日</div>
        <div>メモ</div>
      </div>

      {/* Burial Person Rows */}
      <div className="space-y-3">
        {buriedPersonFields.length === 0 && (
          <div className="text-center text-hai py-4 border border-gin rounded-lg">
            埋葬者が登録されていません
          </div>
        )}
        {buriedPersonFields.map((field, index) => {
          const gender = watch(`buriedPersons.${index}.gender`);
          const genderLabel = gender ? genderLabels[gender as Gender] : '-';

          return (
            <div key={field.id} className="border rounded-lg overflow-hidden">
              {/* Summary Row */}
              <div
                className="flex items-center justify-between p-3 bg-kinari border rounded-md cursor-pointer hover:bg-matsu-50 transition-colors duration-200"
                onClick={() =>
                  setExpandedBurialId(expandedBurialId === field.id ? null : field.id)
                }
              >
                <div className="grid grid-cols-4 gap-4 flex-1 text-sm">
                  <span className="font-medium">
                    {watch(`buriedPersons.${index}.name`) || '未入力'}
                    {/* 折りたたんだままでも最終納骨者が誰か分かるようにする */}
                    {watch(`buriedPersons.${index}.isFinalBurial`) && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-ai-50 text-ai text-xs font-normal border border-ai-200">
                        最終納骨者
                      </span>
                    )}
                  </span>
                  <span>{genderLabel}</span>
                  <span>{watch(`buriedPersons.${index}.deathDate`) || '-'}</span>
                  <span className="text-hai truncate">
                    {watch(`buriedPersons.${index}.notes`) || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="削除"
                    aria-label="埋葬者を削除"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBuriedPerson(index);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-beni" />
                  </Button>
                  {expandedBurialId === field.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>

              {/* Expanded Fields */}
              {expandedBurialId === field.id && (
                <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                  {/* Name */}
                  <div>
                    <Label htmlFor={`buriedPersons.${index}.name`}>
                      氏名 <span className="text-beni">*</span>
                    </Label>
                    <Input
                      id={`buriedPersons.${index}.name`}
                      {...register(`buriedPersons.${index}.name`)}
                      className={errors.buriedPersons?.[index]?.name ? 'border-beni' : ''}
                    />
                    {errors.buriedPersons?.[index]?.name && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.name?.message}
                      </p>
                    )}
                  </div>

                  {/* Name Kana */}
                  <div>
                    <Label htmlFor={`buriedPersons.${index}.nameKana`}>氏名カナ</Label>
                    <Input
                      id={`buriedPersons.${index}.nameKana`}
                      {...register(`buriedPersons.${index}.nameKana`)}
                      className={errors.buriedPersons?.[index]?.nameKana ? 'border-beni' : ''}
                    />
                    {errors.buriedPersons?.[index]?.nameKana && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.nameKana?.message}
                      </p>
                    )}
                  </div>

                  {/* Birth Date */}
                  <div>
                    <Label htmlFor={`buriedPersons.${index}.birthDate`}>生年月日</Label>
                    <Input
                      id={`buriedPersons.${index}.birthDate`}
                      type="date"
                      {...register(`buriedPersons.${index}.birthDate`)}
                      className={errors.buriedPersons?.[index]?.birthDate ? 'border-beni' : ''}
                    />
                    {errors.buriedPersons?.[index]?.birthDate && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.birthDate?.message}
                      </p>
                    )}
                  </div>

                  {/* Posthumous Name */}
                  <div>
                    <Label htmlFor={`buriedPersons.${index}.posthumousName`}>戒名</Label>
                    <Input
                      id={`buriedPersons.${index}.posthumousName`}
                      {...register(`buriedPersons.${index}.posthumousName`)}
                      className={
                        errors.buriedPersons?.[index]?.posthumousName ? 'border-beni' : ''
                      }
                    />
                    {errors.buriedPersons?.[index]?.posthumousName && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.posthumousName?.message}
                      </p>
                    )}
                  </div>

                  {/* Report Date */}
                  <div>
                    <Label htmlFor={`buriedPersons.${index}.reportDate`}>届出日</Label>
                    <Input
                      id={`buriedPersons.${index}.reportDate`}
                      type="date"
                      {...register(`buriedPersons.${index}.reportDate`)}
                      className={errors.buriedPersons?.[index]?.reportDate ? 'border-beni' : ''}
                    />
                    {errors.buriedPersons?.[index]?.reportDate && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.reportDate?.message}
                      </p>
                    )}
                  </div>

                  {/* Religion */}
                  <div>
                    <Label htmlFor={`buriedPersons.${index}.religion`}>宗派</Label>
                    <Input
                      id={`buriedPersons.${index}.religion`}
                      {...register(`buriedPersons.${index}.religion`)}
                      className={errors.buriedPersons?.[index]?.religion ? 'border-beni' : ''}
                    />
                    {errors.buriedPersons?.[index]?.religion && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.religion?.message}
                      </p>
                    )}
                  </div>

                  {/* Relationship — RelationshipMaster select with legacy fallback */}
                  <div>
                    {(() => {
                      const currentValue = watch(`buriedPersons.${index}.relationship`) || '';
                      return (
                        <ViewModeSelect
                          label="続柄"
                          value={currentValue}
                          onValueChange={(v) =>
                            setValue(`buriedPersons.${index}.relationship`, v)
                          }
                          placeholder="選択..."
                        >
                          {relationships.map((r) => (
                            <SelectItem key={r.id} value={r.name}>
                              {r.name}
                            </SelectItem>
                          ))}
                          {/* 無効化済み・未登録の既存値はフォールバック表示（#238）。続柄は名称を保存 */}
                          <MasterFallbackSelectItem
                            value={currentValue}
                            masters={masterData?.all?.relationships ?? relationships}
                            matchBy="name"
                          />
                        </ViewModeSelect>
                      );
                    })()}
                    {errors.buriedPersons?.[index]?.relationship && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.relationship?.message}
                      </p>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <ViewModeSelect
                      label="性別"
                      value={watch(`buriedPersons.${index}.gender`) || ''}
                      onValueChange={(value: string) =>
                        setValue(`buriedPersons.${index}.gender`, value as Gender)
                      }
                      viewMode={false}
                    >
                      {Object.entries(genderLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </ViewModeSelect>
                    {errors.buriedPersons?.[index]?.gender && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.gender?.message}
                      </p>
                    )}
                  </div>

                  {/* Death Date */}
                  <div>
                    <Label htmlFor={`buriedPersons.${index}.deathDate`}>命日</Label>
                    <Input
                      id={`buriedPersons.${index}.deathDate`}
                      type="date"
                      {...register(`buriedPersons.${index}.deathDate`)}
                      className={errors.buriedPersons?.[index]?.deathDate ? 'border-beni' : ''}
                    />
                    {errors.buriedPersons?.[index]?.deathDate && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.deathDate?.message}
                      </p>
                    )}
                  </div>

                  {/* Age */}
                  <div>
                    <Label htmlFor={`buriedPersons.${index}.age`}>享年</Label>
                    <Input
                      id={`buriedPersons.${index}.age`}
                      type="number"
                      {...register(`buriedPersons.${index}.age`, {
                        valueAsNumber: true,
                      })}
                      className={errors.buriedPersons?.[index]?.age ? 'border-beni' : ''}
                    />
                    {errors.buriedPersons?.[index]?.age && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.age?.message}
                      </p>
                    )}
                  </div>

                  {/* Burial Date */}
                  <div>
                    <Label htmlFor={`buriedPersons.${index}.burialDate`}>埋葬日</Label>
                    <Input
                      id={`buriedPersons.${index}.burialDate`}
                      type="date"
                      {...register(`buriedPersons.${index}.burialDate`)}
                      className={
                        errors.buriedPersons?.[index]?.burialDate ? 'border-beni' : ''
                      }
                    />
                    {errors.buriedPersons?.[index]?.burialDate && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.burialDate?.message}
                      </p>
                    )}
                  </div>

                  {/* 最終納骨者（合祀カウントダウンの起点）— 議事録 2026-07-21 §1 */}
                  <div className="col-span-2">
                    <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-gin bg-kinari">
                      <div>
                        <Label
                          htmlFor={`buriedPersons.${index}.isFinalBurial`}
                          className="font-medium"
                        >
                          最終納骨者
                        </Label>
                        <p className="text-xs text-hai mt-1">
                          この方を最終納骨者にすると、埋葬日を起点に合祀までのカウントダウンが始まります。
                          指定がない間は契約日起点で数えます。1区画につき1人だけ指定できます。
                        </p>
                        {(() => {
                          const burialDate = watch(`buriedPersons.${index}.burialDate`);
                          const isFinal = watch(`buriedPersons.${index}.isFinalBurial`);
                          if (!isFinal) return null;
                          if (!burialDate) {
                            return (
                              <p className="text-xs text-kohaku-dark mt-1">
                                埋葬日が未入力のため、入力されるまでは契約日起点で数えます
                              </p>
                            );
                          }
                          const scheduled = calculateScheduledCollectiveBurialDate(
                            burialDate,
                            resolvedPlotValidityYears,
                          );
                          return scheduled ? (
                            <p className="text-xs text-ai mt-1">
                              合祀予定日: {formatDate(scheduled.toISOString())}（埋葬日 +{' '}
                              {resolvedPlotValidityYears}年）
                            </p>
                          ) : null;
                        })()}
                      </div>
                      <Switch
                        id={`buriedPersons.${index}.isFinalBurial`}
                        checked={!!watch(`buriedPersons.${index}.isFinalBurial`)}
                        onCheckedChange={(checked) =>
                          checked
                            ? requestFinalBurialConfirm(index)
                            : setFinalBurial(index, false)
                        }
                      />
                    </div>
                  </div>

                  {/* 合祀年数（この方のみ）— 空欄で区画の合祀年数を継承（#10） */}
                  <div className="col-span-2">
                    {(() => {
                      const overrideRaw = watch(`buriedPersons.${index}.validityPeriodYearsOverride`);
                      const hasOverride =
                        typeof overrideRaw === 'number' && !Number.isNaN(overrideRaw);
                      // 区画の合祀年数（合祀設定の入力値）。未入力時は自動判定値で代替表示
                      const plotYears =
                        typeof collectiveBurial?.validityPeriodYears === 'number' &&
                        !Number.isNaN(collectiveBurial.validityPeriodYears)
                          ? collectiveBurial.validityPeriodYears
                          : inferredValidityYears;
                      const resolvedYears = hasOverride ? overrideRaw : plotYears;
                      const scheduledDate = contractDate
                        ? calculateScheduledCollectiveBurialDate(contractDate, resolvedYears)
                        : null;
                      return (
                        <>
                          <Label htmlFor={`buriedPersons.${index}.validityPeriodYearsOverride`}>
                            合祀年数（この方のみ）
                          </Label>
                          <Input
                            id={`buriedPersons.${index}.validityPeriodYearsOverride`}
                            type="number"
                            min={1}
                            max={100}
                            placeholder={`空欄で区画既定（${plotYears}年）を継承`}
                            {...register(`buriedPersons.${index}.validityPeriodYearsOverride`, {
                              setValueAs: (v) =>
                                v === '' || v === null || v === undefined ? null : Number(v),
                            })}
                            className={
                              errors.buriedPersons?.[index]?.validityPeriodYearsOverride
                                ? 'border-beni'
                                : ''
                            }
                          />
                          {hasOverride ? (
                            <p className="text-xs text-kohaku-dark mt-1">
                              個別指定: {overrideRaw}年
                              {scheduledDate
                                ? ` → 合祀予定日: ${formatDate(scheduledDate.toISOString())}`
                                : '（契約日未入力のため予定日は未算出）'}
                            </p>
                          ) : (
                            <p className="text-xs text-hai mt-1">
                              区画既定: {plotYears}年（空欄でこの方も同じ）
                            </p>
                          )}
                          {/* 個別指定の標準年数もマスタから供給。「区画既定」で継承に戻す（#289） */}
                          <ValidityYearChips
                            options={validityYearOptions}
                            value={hasOverride ? overrideRaw : null}
                            onPick={(year) =>
                              setValue(
                                `buriedPersons.${index}.validityPeriodYearsOverride`,
                                year,
                                { shouldDirty: true },
                              )
                            }
                            onClear={() =>
                              setValue(
                                `buriedPersons.${index}.validityPeriodYearsOverride`,
                                null,
                                { shouldDirty: true },
                              )
                            }
                          />
                          {errors.buriedPersons?.[index]?.validityPeriodYearsOverride && (
                            <p className="text-sm text-beni mt-1">
                              {errors.buriedPersons[index]?.validityPeriodYearsOverride?.message}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Notes */}
                  <div className="col-span-2">
                    <Label htmlFor={`buriedPersons.${index}.notes`}>備考</Label>
                    <Input
                      id={`buriedPersons.${index}.notes`}
                      {...register(`buriedPersons.${index}.notes`)}
                      className={errors.buriedPersons?.[index]?.notes ? 'border-beni' : ''}
                    />
                    {errors.buriedPersons?.[index]?.notes && (
                      <p className="text-sm text-beni mt-1">
                        {errors.buriedPersons[index]?.notes?.message}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Collective Burial Settings */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">合祀設定</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="collectiveBurialToggle" className="text-sm text-hai">
              合祀対象区画
            </Label>
            <Switch
              id="collectiveBurialToggle"
              checked={collectiveBurialEnabled}
              onCheckedChange={handleToggleCollectiveBurial}
            />
          </div>
        </div>

        {collectiveBurialEnabled && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-kinari rounded-lg">
            <div>
              <Label htmlFor="collectiveBurial.burialCapacity">
                埋葬上限数 <span className="text-beni">*</span>
              </Label>
              <Input
                id="collectiveBurial.burialCapacity"
                type="number"
                min={1}
                max={100}
                placeholder="例: 10"
                {...register('collectiveBurial.burialCapacity', { valueAsNumber: true })}
                className={errors.collectiveBurial?.burialCapacity ? 'border-beni' : ''}
              />
              <p className="text-xs text-hai mt-1">この区画に埋葬できる最大人数</p>
              {errors.collectiveBurial?.burialCapacity && (
                <p className="text-sm text-beni mt-1">
                  {errors.collectiveBurial.burialCapacity.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="collectiveBurial.validityPeriodYears">
                有効期間（年） <span className="text-beni">*</span>
              </Label>
              <Input
                id="collectiveBurial.validityPeriodYears"
                type="number"
                min={1}
                max={100}
                placeholder={`例: ${inferredValidityYears}`}
                {...register('collectiveBurial.validityPeriodYears', { valueAsNumber: true })}
                className={errors.collectiveBurial?.validityPeriodYears ? 'border-beni' : ''}
              />
              <p className="text-xs text-hai mt-1">埋葬上限到達後の合祀管理期間</p>
              {/* 自動判定 vs 手動指定の明示（#259）。例外指定は正当な運用として許容する */}
              {isValidityOverridden ? (
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-xs text-kohaku-dark">
                    手動指定: {currentValidityYears}年（自動判定: {inferredValidityYears}年 / {validityRuleSummary}）。例外指定として保存されます。
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() =>
                      setValue('collectiveBurial.validityPeriodYears', inferredValidityYears, {
                        shouldDirty: true,
                      })
                    }
                  >
                    自動判定値に戻す
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-hai mt-1">自動判定: {inferredValidityYears}年（{validityRuleSummary}）</p>
              )}
              {/* 標準年数（13/15/24/33 等）をマスタから供給。クリックで設定（#289） */}
              <ValidityYearChips
                options={validityYearOptions}
                value={currentValidityYears}
                onPick={(year) =>
                  setValue('collectiveBurial.validityPeriodYears', year, { shouldDirty: true })
                }
              />
              {errors.collectiveBurial?.validityPeriodYears && (
                <p className="text-sm text-beni mt-1">
                  {errors.collectiveBurial.validityPeriodYears.message}
                </p>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Gravestone Info */}
      <div className="border-t pt-6 mt-6">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-sumi">墓石情報</h3>
            <button
              type="button"
              onClick={() => {
                const current = watch('gravestoneInfo');
                if (current !== null && current !== undefined) {
                  setValue('gravestoneInfo', null);
                } else {
                  setValue('gravestoneInfo', {
                    gravestoneBase: null,
                    enclosurePosition: null,
                    gravestoneDealer: null,
                    gravestoneType: null,
                    surroundingArea: null,
                    establishmentDeadline: null,
                    establishmentDate: null,
                  });
                }
              }}
              className="px-3 py-1 text-sm bg-matsu text-white rounded hover:bg-matsu-dark"
            >
              {watch('gravestoneInfo') !== null && watch('gravestoneInfo') !== undefined
                ? '墓石情報を削除'
                : '墓石情報を追加'}
            </button>
          </div>

          {watch('gravestoneInfo') !== null && watch('gravestoneInfo') !== undefined && (
            <div className="grid grid-cols-3 gap-4">
              <ViewModeField
                label="墓石台"
                register={register('gravestoneInfo.gravestoneBase')}
                error={errors.gravestoneInfo?.gravestoneBase?.message}
                placeholder="御影石"
              />

              <ViewModeField
                label="外柵位置"
                register={register('gravestoneInfo.enclosurePosition')}
                error={errors.gravestoneInfo?.enclosurePosition?.message}
                placeholder="東側"
              />

              <ViewModeField
                label="石材店"
                register={register('gravestoneInfo.gravestoneDealer')}
                error={errors.gravestoneInfo?.gravestoneDealer?.message}
                placeholder="○○石材店"
              />

              <ViewModeField
                label="墓石種類"
                register={register('gravestoneInfo.gravestoneType')}
                error={errors.gravestoneInfo?.gravestoneType?.message}
                placeholder="和型"
              />

              <ViewModeField
                label="周辺面積"
                register={register('gravestoneInfo.surroundingArea')}
                error={errors.gravestoneInfo?.surroundingArea?.message}
                placeholder="1.5"
              />

              <ViewModeField
                label="建立期限"
                type="date"
                register={register('gravestoneInfo.establishmentDeadline')}
                error={errors.gravestoneInfo?.establishmentDeadline?.message}
              />

              <ViewModeField
                label="建立日"
                type="date"
                register={register('gravestoneInfo.establishmentDate')}
                error={errors.gravestoneInfo?.establishmentDate?.message}
              />

              <ViewModeField
                label="墓石代"
                type="number"
                register={register('gravestoneInfo.gravestoneCost')}
                error={errors.gravestoneInfo?.gravestoneCost?.message}
                placeholder="0"
              />
            </div>
          )}
        </div>
      </div>

      {/* 最終納骨者をオンにする前の確認（議事録 2026-07-21 §1「カウントダウンを開始してよいか確認」）。
          合祀予定日が動く操作なので、結果の日付を見せてから確定させる */}
      <ConfirmDialog
        open={finalBurialConfirmIndex !== null}
        onOpenChange={(open) => {
          if (!open) setFinalBurialConfirmIndex(null);
        }}
        title="合祀までのカウントダウンを開始しますか？"
        description={[
          `${confirmTargetName} を最終納骨者にします。`,
          confirmScheduledDate
            ? `合祀予定日は ${formatDate(confirmScheduledDate.toISOString())}（埋葬日 + ${resolvedPlotValidityYears}年）になります。`
            : '埋葬日が未入力のため、入力されるまでは契約日起点で数えます。',
          replacedFinalBurialName
            ? `現在の最終納骨者「${replacedFinalBurialName}」の指定は外れます（1区画につき1人まで）。`
            : '',
        ]
          .filter(Boolean)
          .join('\n')}
        confirmLabel="最終納骨者にする"
        onConfirm={() => {
          if (finalBurialConfirmIndex !== null) setFinalBurial(finalBurialConfirmIndex, true);
          setFinalBurialConfirmIndex(null);
        }}
      />
    </div>
  );
}
