'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  plotFormSchema,
  defaultPlotFormData,
  plotDetailToFormData,
} from '@/lib/validations/plot-form';
import type { PlotFormData } from '@/lib/validations/plot-form';
import { PreviewDialog } from '@/components/shared/dialogs';
import { buildPlotPreviewSections, buildPlotDiffSections } from './previewHelper';
import { CHANGE_REASON_PRESETS, CHANGE_REASON_MAX_LENGTH } from '@/lib/change-reasons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMasters } from '@/hooks';
import { showWarning } from '@/lib/toast';

import type { PlotFormProps, MasterData } from './types';
import { BasicInfoTab } from './BasicInfoTab';
import { resolveBaseName } from '@/lib/legacy-grave-labels';
import { WorkBillingTab } from './WorkBillingTab';
import { ContactsTab } from './ContactsTab';
import { BurialInfoTab } from './BurialInfoTab';
import { FeeInfoTab } from './FeeInfoTab';
import { ConstructionInfoTab } from './ConstructionInfoTab';
export default function PlotForm({ plotDetail, onSave, isLoading }: PlotFormProps) {
  const isEditing = !!plotDetail;

  const {
    calcTypes,
    taxTypes,
    billingTypes,
    paymentMethods,
    sectionNames,
    relationships,
    contractors,
    validityPeriods,
    allMasters,
    isLoading: isMasterLoading,
  } = useMasters();

  const masterData: MasterData = {
    calcTypes,
    taxTypes,
    billingTypes,
    paymentMethods,
    sectionNames,
    relationships,
    contractors,
    validityPeriods,
    // 無効を含む全件。既存値のフォールバック表示に使用（#238）
    all: allMasters,
    isLoading: isMasterLoading,
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
    reset,
  } = useForm<PlotFormData>({
    resolver: zodResolver(plotFormSchema) as Resolver<PlotFormData>,
    defaultValues: plotDetail
      ? plotDetailToFormData(plotDetail)
      : defaultPlotFormData,
  });

  // plotDetail が後から到着した場合にフォームを更新
  useEffect(() => {
    if (plotDetail) {
      reset(plotDetailToFormData(plotDetail));
    }
  }, [plotDetail, reset]);

  const {
    fields: familyContactFields,
    append: addFamilyContact,
    remove: removeFamilyContact,
  } = useFieldArray({ control, name: 'familyContacts' });

  const {
    fields: buriedPersonFields,
    append: addBuriedPerson,
    remove: removeBuriedPerson,
  } = useFieldArray({ control, name: 'buriedPersons' });

  const {
    fields: constructionInfoFields,
    append: addConstructionInfo,
    remove: removeConstructionInfo,
  } = useFieldArray({ control, name: 'constructionInfos' });

  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PlotFormData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  // 変更理由（#261）。編集時の確認ダイアログでプリセット＋自由入力を受け付ける
  const [changeReason, setChangeReason] = useState('');

  const initialFormData = plotDetail ? plotDetailToFormData(plotDetail) : null;

  const onSubmit = (data: PlotFormData) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  const handleConfirmSubmit = () => {
    if (previewData) {
      setShowPreview(false);
      onSave(previewData, isEditing ? changeReason.trim() || undefined : undefined);
    }
  };

  const onError = () => {
    showWarning('入力エラーがあります', 'エラー箇所を確認してください');
  };

  const tabBaseProps = {
    register,
    watch,
    setValue,
    errors,
    control,
    masterData,
    isEditing,
  };

  // タブ定義: フィールドグループ → タブ名の対応
  const tabConfig = {
    'basic-info': {
      label: '区画・契約情報',
      sections: ['physicalPlot', 'contractPlot', 'saleContract', 'customer'],
    },
    'fee-info': {
      label: '料金情報',
      sections: ['usageFee', 'managementFee'],
    },
    'work-billing': {
      label: '勤務先',
      sections: ['workInfo'],
    },
    'contacts': {
      label: '連絡先/家族',
      sections: ['familyContacts'],
    },
    'burial-info': {
      label: '埋葬情報',
      sections: ['buriedPersons', 'collectiveBurial', 'gravestoneInfo'],
    },
    'construction-info': {
      label: '工事情報',
      sections: ['constructionInfos'],
    },
  } satisfies Record<string, { label: string; sections: string[] }>;

  // フィールドパス → 日本語ラベルのマッピング
  const fieldLabels: Record<string, string> = {
    // 物理区画
    'physicalPlot.plotNumber': '区画番号',
    'physicalPlot.areaName': '区画',
    'physicalPlot.areaSqm': '面積',
    'physicalPlot.notes': '備考',
    // 契約区画
    'contractPlot.contractAreaSqm': '契約面積',
    'contractPlot.locationDescription': '区画位置詳細',
    // 販売契約
    'saleContract.contractDate': '契約日',
    'saleContract.price': '金額',
    'saleContract.paymentStatus': '支払状態',
    'saleContract.reservationDate': '予約日',
    'saleContract.acceptanceNumber': '受付番号',
    'saleContract.acceptanceDate': '受付日',
    'saleContract.permitDate': '許可日',
    'saleContract.permitNumber': '平成書番号',
    'saleContract.startDate': '使用開始日',
    'saleContract.staffInCharge': '担当者',
    'saleContract.agentName': '取扱',
    'saleContract.notes': '備考',
    // 契約者
    'customer.name': '氏名',
    'customer.nameKana': '氏名カナ',
    'customer.birthDate': '生年月日',
    'customer.gender': '性別',
    'customer.postalCode': '郵便番号',
    'customer.address': '住所',
    'customer.addressLine2': '住所2',
    'customer.registeredPostalCode': '本籍郵便番号',
    'customer.registeredAddress': '本籍地',
    'customer.phoneNumber': '電話番号',
    'customer.faxNumber': 'FAX',
    'customer.email': 'メール',
    // 振込先情報（請求情報 section）
    'customer.bankName': '機関名称',
    'customer.branchName': '支店名称',
    'customer.accountType': '口座科目',
    'customer.accountNumber': '記号番号',
    'customer.accountHolder': '口座名義',
    'customer.role': '役割',
    'customer.notes': '備考',
    // 勤務先
    'workInfo.companyName': '勤務先名称',
    'workInfo.companyNameKana': '勤務先名称カナ',
    'workInfo.workPostalCode': '勤務先郵便番号',
    'workInfo.workPhoneNumber': '勤務先電話番号',
    'workInfo.workAddress': '勤務先住所',
    'workInfo.dmSetting': 'DM送信設定',
    'workInfo.addressType': '宛先区分',
    'workInfo.notes': '備考',
    // 使用料
    'usageFee.calculationType': '計算区分',
    'usageFee.taxType': '税区分',
    'usageFee.billingType': '請求区分',
    'usageFee.billingYears': '請求年数',
    'usageFee.usageFee': '使用料',
    'usageFee.area': '面積',
    'usageFee.unitPrice': '単価',
    'usageFee.paymentMethod': '送付方法',
    // 管理料
    'managementFee.calculationType': '計算区分',
    'managementFee.taxType': '税区分',
    'managementFee.billingType': '請求区分',
    'managementFee.billingYears': '請求年数',
    'managementFee.area': '面積',
    'managementFee.billingMonth': '請求月',
    'managementFee.managementFee': '管理料',
    'managementFee.unitPrice': '単価',
    'managementFee.lastBillingMonth': '終納請求年月',
    'managementFee.paymentMethod': '送付方法',
    // 墓石情報
    'gravestoneInfo.gravestoneBase': '墓石台',
    'gravestoneInfo.enclosurePosition': '外柵位置',
    'gravestoneInfo.gravestoneDealer': '石材店',
    'gravestoneInfo.gravestoneType': '墓石種類',
    'gravestoneInfo.surroundingArea': '周辺面積',
    'gravestoneInfo.gravestoneCost': '墓石代',
    'gravestoneInfo.establishmentDeadline': '建立期限',
    'gravestoneInfo.establishmentDate': '建立日',
    // 家族連絡先（配列内フィールド）
    'name': '氏名',
    'nameKana': '読み（かな）',
    'relationship': '続柄',
    'birthDate': '生年月日',
    'postalCode': '郵便番号',
    'address': '住所',
    'phoneNumber': '電話番号',
    'phoneNumber2': '電話番号2',
    'faxNumber': 'FAX',
    'email': 'メール',
    'registeredAddress': '本籍地',
    'mailingType': '宛先区分',
    'workCompanyName': '勤務先名称',
    'workCompanyNameKana': '勤務先かな',
    'workAddress': '勤務先住所',
    'workPhoneNumber': '勤務先電話番号',
    'contactMethod': '連絡区分',
    'notes': '備考',
    // 埋葬者（配列内フィールド）
    'deathDate': '命日',
    'age': '享年',
    'gender': '性別',
    'burialDate': '埋葬日',
    'posthumousName': '戒名',
    'reportDate': '届出日',
    'religion': '宗派',
    'validityPeriodYearsOverride': '合祀年数（この方のみ）',
    // 工事情報（配列内フィールド）
    'constructionType': '工事種別',
    'contractor': '業者名',
    'supervisor': '監督者',
    'constructionContent': '工事内容',
    'startDate': '工事開始日',
    'completionDate': '工事終了日',
    'scheduledEndDate': '終了予定日',
    'permitNumber': '許可番号',
    'applicationDate': '申請日',
    'permitDate': '許可日',
    'permitStatus': '許可状態',
    'workItem1': '工事項目1',
    'workDate1': '工事日付1',
    'workAmount1': '工事金額1',
    'workStatus1': '工事状態1',
    'workItem2': '工事項目2',
    'workDate2': '工事日付2',
    'workAmount2': '工事金額2',
    'workStatus2': '工事状態2',
    'paymentType1': '入金種別1',
    'paymentAmount1': '入金額1',
    'paymentDate1': '入金日1',
    'paymentStatus1': '入金状態1',
    'paymentType2': '入金種別2',
    'paymentAmount2': '入金額2',
    'paymentScheduledDate2': '入金予定日2',
    'paymentStatus2': '入金状態2',
    // 合祀設定
    'collectiveBurial.burialCapacity': '埋葬上限数',
    'collectiveBurial.validityPeriodYears': '有効期間（年）',
    'collectiveBurial.billingAmount': '請求金額',
    'collectiveBurial.notes': '備考',
  };

  // 配列フィールドのセクション名
  const arraySectionLabels: Record<string, string> = {
    familyContacts: '家族連絡先',
    buriedPersons: '埋葬者',
    constructionInfos: '工事情報',
  };

  // フィールドパスからタブ名を取得
  const getTabLabel = (path: string): string => {
    const topKey = path.split('.')[0];
    for (const tab of Object.values(tabConfig)) {
      if (tab.sections.includes(topKey)) return tab.label;
    }
    return '';
  };

  // フィールドパスから日本語ラベルを取得
  const getFieldLabel = (path: string): string => {
    // 完全一致
    if (fieldLabels[path]) return fieldLabels[path];

    // 配列パターン: familyContacts.0.name → 家族連絡先[1] 氏名
    const arrayMatch = path.match(/^(\w+)\.(\d+)\.(.+)$/);
    if (arrayMatch) {
      const [, section, index, field] = arrayMatch;
      const sectionLabel = arraySectionLabels[section] || section;
      const fieldLabel = fieldLabels[field] || field;
      return `${sectionLabel}[${Number(index) + 1}] ${fieldLabel}`;
    }

    return path;
  };

  // エラーメッセージを整形（ネストされたエラーも再帰的に収集）
  const collectErrors = (obj: Record<string, unknown>, prefix = ''): string[] => {
    const messages: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        if ('message' in value && typeof value.message === 'string') {
          const path = `${prefix}${key}`;
          const tabLabel = getTabLabel(path);
          const fieldLabel = getFieldLabel(path);
          const label = tabLabel ? `[${tabLabel}] ${fieldLabel}` : fieldLabel;
          messages.push(`${label}: ${value.message}`);
        } else {
          messages.push(...collectErrors(value as Record<string, unknown>, `${prefix}${key}.`));
        }
      }
    }
    return messages;
  };
  const errorMessages = collectErrors(errors as Record<string, unknown>);

  // エラーがあるタブを判定
  const tabsWithErrors = new Set<string>();
  for (const key of Object.keys(errors)) {
    for (const [tabKey, tab] of Object.entries(tabConfig)) {
      if (tab.sections.includes(key)) {
        tabsWithErrors.add(tabKey);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} noValidate className="w-full">
      {errorMessages.length > 0 && (
        <div className="mb-4 p-4 bg-beni-50 border border-beni-200 rounded-elegant">
          <h4 className="text-beni-dark font-semibold mb-2">入力エラーがあります</h4>
          <ul className="list-disc list-inside text-beni text-sm">
            {errorMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <Tabs defaultValue="basic-info" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1">
          {Object.entries(tabConfig).map(([tabKey, tab]) => {
            const hasError = tabsWithErrors.has(tabKey);
            return (
              <TabsTrigger
                key={tabKey}
                value={tabKey}
                className={`relative py-2 text-xs sm:text-sm data-[state=active]:bg-matsu data-[state=active]:text-white ${hasError ? 'text-beni border-b-2 border-beni data-[state=active]:bg-beni' : ''
                  }`}
              >
                {hasError && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-beni text-white text-[10px] font-bold leading-none">
                    !
                  </span>
                )}
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="basic-info" className="space-y-6 mt-6">
          <BasicInfoTab {...tabBaseProps} legacyBaseName={resolveBaseName(plotDetail?.graveType)} />
        </TabsContent>

        <TabsContent value="fee-info" className="space-y-6 mt-6">
          <FeeInfoTab {...tabBaseProps} />
        </TabsContent>

        <TabsContent value="work-billing" className="space-y-6 mt-6">
          <WorkBillingTab {...tabBaseProps} />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6 mt-6">
          <ContactsTab
            {...tabBaseProps}
            familyContactFields={familyContactFields}
            addFamilyContact={addFamilyContact}
            removeFamilyContact={removeFamilyContact}
            expandedContactId={expandedContactId}
            setExpandedContactId={setExpandedContactId}
          />
        </TabsContent>

        <TabsContent value="burial-info" className="space-y-6 mt-6">
          <BurialInfoTab
            {...tabBaseProps}
            buriedPersonFields={buriedPersonFields}
            addBuriedPerson={addBuriedPerson}
            removeBuriedPerson={removeBuriedPerson}
          />
        </TabsContent>

        <TabsContent value="construction-info" className="space-y-6 mt-6">
          <ConstructionInfoTab
            {...tabBaseProps}
            constructionInfoFields={constructionInfoFields}
            addConstructionInfo={addConstructionInfo}
            removeConstructionInfo={removeConstructionInfo}
          />
        </TabsContent>

      </Tabs>

      <div className="flex justify-end space-x-4 mt-6 md:mt-8 pt-4 md:pt-6 border-t">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-matsu hover:bg-matsu-dark text-white px-6"
        >
          {isLoading ? '保存中...' : isEditing ? '更新' : '登録'}
        </Button>
      </div>

      {previewData && (
        <PreviewDialog
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          onConfirm={handleConfirmSubmit}
          title={isEditing ? '更新内容の確認' : '登録内容の確認'}
          description={isEditing ? '以下の項目が変更されます' : '以下の内容で登録します'}
          sections={!isEditing ? buildPlotPreviewSections(previewData, { contractors: allMasters?.contractors ?? contractors }) : undefined}
          diffSections={isEditing && initialFormData ? buildPlotDiffSections(initialFormData, previewData, { contractors: allMasters?.contractors ?? contractors }) : undefined}
          confirmText={isEditing ? '確認して更新' : '確認して登録'}
          isLoading={isLoading}
          size="xl"
        >
          {/* 変更理由（#261）。プリセット＋自由入力（datalist）。履歴に記録される */}
          {isEditing && (
            <div>
              <Label htmlFor="plot-change-reason" className="text-sm font-medium text-sumi">
                変更理由（任意）
              </Label>
              <Input
                id="plot-change-reason"
                list="change-reason-presets"
                value={changeReason}
                maxLength={CHANGE_REASON_MAX_LENGTH}
                placeholder="例: 名義変更（選択または自由入力）"
                onChange={(e) => setChangeReason(e.target.value)}
                className="mt-1"
              />
              <datalist id="change-reason-presets">
                {CHANGE_REASON_PRESETS.map((preset) => (
                  <option key={preset} value={preset} />
                ))}
              </datalist>
              <p className="text-xs text-hai mt-1">
                入力した理由は変更履歴（変更事由）に記録されます
              </p>
            </div>
          )}
        </PreviewDialog>
      )}
    </form>
  );
}
