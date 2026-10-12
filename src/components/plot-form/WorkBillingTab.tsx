'use client'

import { PlotTabBaseProps } from './types'
import { ViewModeField, ViewModeSelect } from './ViewModeField'
import { SelectItem } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DmSetting, AddressType } from '@komine/types'
import { digitsOnly } from '@/lib/format'

export function WorkBillingTab({
  register,
  watch,
  setValue,
  errors,
}: PlotTabBaseProps) {
  const hasWorkInfo = watch('workInfo') !== null

  const toggleWorkInfo = () => {
    if (hasWorkInfo) {
      setValue('workInfo', null)
    } else {
      setValue('workInfo', {
        companyName: '',
        companyNameKana: '',
        workAddress: '',
        workPostalCode: '',
        workPhoneNumber: '',
        dmSetting: DmSetting.Allow,
        addressType: AddressType.Home,
        notes: null
      })
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
      {/* Section 1: Work Info */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-sumi">勤務先情報</h3>
          <Button type="button" variant="outline" size="sm" onClick={toggleWorkInfo}>
            {hasWorkInfo ? '削除' : '追加'}
          </Button>
        </div>
        {hasWorkInfo && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <ViewModeField
                label="勤務先名称"
                required
                register={register('workInfo.companyName')}
                error={errors.workInfo?.companyName?.message}
                placeholder="会社名"
              />
              <ViewModeField
                label="勤務先名称カナ"
                register={register('workInfo.companyNameKana')}
                error={errors.workInfo?.companyNameKana?.message}
                placeholder="カイシャメイ"
              />
              <ViewModeField
                label="勤務先郵便番号"
                register={register('workInfo.workPostalCode', { setValueAs: digitsOnly })}
                error={errors.workInfo?.workPostalCode?.message}
                placeholder="123-4567"
              />
              <ViewModeField
                label="勤務先電話番号"
                register={register('workInfo.workPhoneNumber', { setValueAs: digitsOnly })}
                error={errors.workInfo?.workPhoneNumber?.message}
                placeholder="03-1234-5678"
              />
              <div className="col-span-2">
                <ViewModeField
                  label="勤務先住所"
                  register={register('workInfo.workAddress')}
                  error={errors.workInfo?.workAddress?.message}
                  placeholder="東京都..."
                />
              </div>
            </div>

            {/* DM・宛先設定 */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-sumi mb-3">DM・宛先設定</h4>
              <div className="grid grid-cols-2 gap-4">
                <ViewModeSelect
                  label="DM送信設定"
                  value={watch('workInfo.dmSetting') || ''}
                  onValueChange={(v) => setValue('workInfo.dmSetting', v as DmSetting)}
                  placeholder="選択..."
                >
                  <SelectItem value={DmSetting.Allow}>送信許可</SelectItem>
                  <SelectItem value={DmSetting.Deny}>送信拒否</SelectItem>
                  <SelectItem value={DmSetting.Limited}>制限付き</SelectItem>
                </ViewModeSelect>

                <ViewModeSelect
                  label="宛先区分"
                  value={watch('workInfo.addressType') || ''}
                  onValueChange={(v) => setValue('workInfo.addressType', v as AddressType)}
                  placeholder="選択..."
                >
                  <SelectItem value={AddressType.Home}>自宅</SelectItem>
                  <SelectItem value={AddressType.Work}>勤務先</SelectItem>
                  <SelectItem value={AddressType.Other}>その他</SelectItem>
                </ViewModeSelect>

                <div className="col-span-2">
                  <Label className="text-sm font-medium">備考</Label>
                  <textarea
                    className="mt-1 w-full px-3 py-2 border rounded-md resize-none"
                    rows={2}
                    {...register('workInfo.notes')}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Section 2: 請求情報（契約者の振込先口座、ゆうちょ自動払込 CSV 用） */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-sumi">請求情報</h3>
          {/* ゆうちょ自動払込のクイック入力（機関名称＝ゆうちょ銀行・口座科目＝普通） */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setValue('customer.bankName', 'ゆうちょ銀行')
              if (!watch('customer.accountType')) {
                setValue('customer.accountType', 'ordinary')
              }
            }}
          >
            ゆうちょ自動払込をセット
          </Button>
        </div>
        {/* ゆうちょ自動払込（口座振替）の入力ガイド。受領した口座リストCSVの値をそのまま入力する（#170）。 */}
        <p className="text-xs text-hai mb-3 leading-relaxed">
          ゆうちょ自動払込（口座振替）の場合：
          <span className="font-medium text-sumi">機関名称</span>＝「ゆうちょ銀行」／
          <span className="font-medium text-sumi">支店名称</span>＝店番3桁（例: 747）／
          <span className="font-medium text-sumi">口座科目</span>＝普通／
          <span className="font-medium text-sumi">記号番号</span>＝口座番号 を、受領した口座リストCSVの値どおりに入力してください。
        </p>
        <div className="grid grid-cols-2 gap-4">
          <ViewModeField
            label="機関名称"
            register={register('customer.bankName')}
            error={errors.customer?.bankName?.message}
            placeholder="○○銀行 / ゆうちょ銀行"
          />
          <ViewModeField
            label="支店名称 / ゆうちょ店番"
            register={register('customer.branchName')}
            error={errors.customer?.branchName?.message}
            placeholder="支店名 / ゆうちょは店番3桁（例: 747）"
          />
          <ViewModeSelect
            label="口座科目"
            value={watch('customer.accountType') || ''}
            onValueChange={(v) => setValue('customer.accountType', v)}
            placeholder="選択..."
          >
            <SelectItem value="ordinary">普通</SelectItem>
            <SelectItem value="current">当座</SelectItem>
            <SelectItem value="savings">貯蓄</SelectItem>
          </ViewModeSelect>
          <ViewModeField
            label="記号番号 / ゆうちょ口座番号"
            register={register('customer.accountNumber')}
            error={errors.customer?.accountNumber?.message}
            placeholder="口座番号（ゆうちょは口座番号7桁）"
          />
          <div className="col-span-2">
            <ViewModeField
              label="口座名義"
              register={register('customer.accountHolder')}
              error={errors.customer?.accountHolder?.message}
              placeholder="ヤマダ タロウ"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
