'use client';

/**
 * PlotDetailView - 区画詳細表示コンポーネント
 *
 * @komine/types の PlotDetailResponse を直接使用し、Customer型への変換なしで表示
 * Phase 2-B: Plot-centric migration
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import {
  PlotDetailResponse,
  PaymentStatus,
  ContractStatus,
  PhysicalPlotStatus,
  Gender,
  ContractRole,
  AddressType,
  DmSetting,
} from '@komine/types';
import { usePlotDetail } from '@/hooks/usePlots';
import { useMasters } from '@/hooks/useMasters';
import type { MasterItem, TaxTypeMasterItem, SectionNameMasterItem } from '@/lib/api/masters';
import { resolveMasterName, LEGACY_FEE_CODE_MAP } from '@/lib/master-resolve';
import { resolvePeriodFromAreaName } from '@/lib/section-period';
import { getPlotSizeLabel } from '@/types/plot-constants';
import { calculateScheduledCollectiveBurialDate } from '@/lib/collective-burial-rules';
import { isEmptyDisplayValue, EMPTY_LABELS, type EmptyKind } from '@/lib/empty-display';
import { LegacyAwareValue, LegacyValueNote } from '@/components/legacy-aware-value';
import { isLegacyPlotNumber, isLegacyAreaName } from '@/lib/legacy-plot-display';
import { isUnsetContractor } from '@/lib/legacy-sentinels';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { StatusBadge, type StatusBadgeProps } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatNumber,
  formatPhoneNumber,
  formatPostalCode,
  formatBillingMonth,
  formatDate,
} from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { HistoryTab } from '@/components/plot-form/HistoryTab';
import { useAuth } from '@/contexts/auth-context';
import BillingManagement from '@/components/billing';
import PaymentManagement from '@/components/payment';
import { getBillings } from '@/lib/api/billings';
import { getPayments } from '@/lib/api/payments';

// ===== 型定義 =====

interface PlotDetailViewProps {
  plotId: string;
  onEdit?: () => void;
  onBack?: () => void;
  onDelete?: (plotCode: string, customerName: string) => void;
  onRestore?: (plotCode: string, customerName: string) => void;
}

// ===== ステータスラベル =====

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.Unpaid]: '未入金',
  [PaymentStatus.Paid]: '入金済',
  [PaymentStatus.PartialPaid]: '一部入金',
  [PaymentStatus.Overdue]: '滞納',
  [PaymentStatus.Refunded]: '返金済',
};

const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, StatusBadgeProps['variant']> = {
  [PaymentStatus.Unpaid]: 'unpaid',
  [PaymentStatus.Paid]: 'paid',
  [PaymentStatus.PartialPaid]: 'partial',
  [PaymentStatus.Overdue]: 'overdue',
  [PaymentStatus.Refunded]: 'refunded',
};

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  [ContractStatus.Vacant]: '空き',
  [ContractStatus.Active]: '有効',
  [ContractStatus.Terminated]: '終了',
};

const CONTRACT_STATUS_VARIANTS: Record<ContractStatus, StatusBadgeProps['variant']> = {
  [ContractStatus.Vacant]: 'neutral',
  [ContractStatus.Active]: 'active',
  [ContractStatus.Terminated]: 'neutral',
};

const PHYSICAL_STATUS_LABELS: Record<PhysicalPlotStatus, string> = {
  [PhysicalPlotStatus.Available]: '利用可能',
  [PhysicalPlotStatus.PartiallySold]: '一部販売済',
  [PhysicalPlotStatus.SoldOut]: '完売',
};

const PHYSICAL_STATUS_VARIANTS: Record<PhysicalPlotStatus, StatusBadgeProps['variant']> = {
  [PhysicalPlotStatus.Available]: 'available',
  [PhysicalPlotStatus.PartiallySold]: 'pending',
  [PhysicalPlotStatus.SoldOut]: 'sold',
};

const GENDER_LABELS: Record<Gender, string> = {
  [Gender.Male]: '男性',
  [Gender.Female]: '女性',
  [Gender.NotAnswered]: '未回答',
};

const CONTRACT_ROLE_LABELS: Record<ContractRole, string> = {
  [ContractRole.Applicant]: '申込者',
  [ContractRole.Contractor]: '契約者',
};

const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  [AddressType.Home]: '自宅',
  [AddressType.Work]: '勤務先',
  [AddressType.Other]: 'その他',
};

const DM_SETTING_LABELS: Record<DmSetting, string> = {
  [DmSetting.Allow]: '送付する',
  [DmSetting.Deny]: '送付しない',
  [DmSetting.Limited]: '制限付き',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ordinary: '普通',
  current: '当座',
  savings: '貯蓄',
};

// ===== ヘルパー関数 =====

interface FeeMasters {
  calcTypes: MasterItem[];
  taxTypes: TaxTypeMasterItem[];
  billingTypes: MasterItem[];
  paymentMethods: MasterItem[];
}

// ===== サブコンポーネント =====

function InfoField({
  label,
  value,
  hint,
  emptyKind = 'unregistered',
}: {
  label: string;
  value: string | null | undefined;
  /** 値の意味を補足する小さなヘルプ文（常時表示・モバイル対応）。#178 */
  hint?: string;
  /** 空値の意味（#181）。未入力=unregistered（「未登録」）/ 該当なし=na（「対象外」）。 */
  emptyKind?: EmptyKind;
}) {
  const empty = isEmptyDisplayValue(value);
  return (
    <div className="py-2">
      <dt className="text-sm text-hai">{label}</dt>
      <dd
        className={cn(
          'mt-1 text-sm',
          empty ? 'font-normal italic text-hai' : 'font-semibold text-sumi'
        )}
      >
        {empty ? EMPTY_LABELS[emptyKind] : value}
      </dd>
      {hint && <p className="mt-0.5 text-[11px] text-hai font-normal leading-snug">{hint}</p>}
    </div>
  );
}

/**
 * 物理区画面積 > 契約面積（分割販売）のとき、面積の意味の違いを注記する（#178）。
 * 区画情報セクションのグリッド内に全幅で表示する。
 */
function PlotAreaSplitNote({
  physicalAreaSqm,
  contractAreaSqm,
}: {
  physicalAreaSqm: number | null | undefined;
  contractAreaSqm: number | null | undefined;
}) {
  if (physicalAreaSqm == null || contractAreaSqm == null) return null;
  if (contractAreaSqm >= physicalAreaSqm) return null;
  const sizeLabel = getPlotSizeLabel(contractAreaSqm);
  return (
    <div className="col-span-full mt-1 rounded-elegant border border-cha-200 bg-cha-50 px-3 py-2 text-[11px] md:text-xs text-sumi leading-relaxed">
      この区画は分割販売です。物理区画 {physicalAreaSqm}㎡ のうち、本契約の取得面積は{' '}
      {contractAreaSqm}㎡{sizeLabel ? `（${sizeLabel}）` : ''} です。料金は契約・課金面積に基づいて計算されます。
    </div>
  );
}

/** タブの件数バッジ（#180）。アクティブ時の matsu 背景でも見えるよう白チップで表示。 */
function TabCount({ count }: { count: number }) {
  return (
    <span
      className={cn(
        'ml-1 inline-flex items-center justify-center rounded-full px-1.5 min-w-[1.125rem] h-4 text-[10px] font-semibold tabular-nums border',
        count > 0 ? 'bg-white text-matsu border-matsu-200' : 'bg-white/70 text-hai border-gin'
      )}
    >
      {count}
    </span>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
  collapsible = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const headingId = `section-${title.replace(/\s+/g, '-')}`;

  return (
    <div className="bg-white border border-gin rounded-elegant-lg shadow-elegant-sm overflow-hidden mb-4">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls={headingId}
          className="w-full px-4 md:px-5 py-3 md:py-4 bg-kinari border-b border-gin flex items-center justify-between hover:bg-kinari/70 transition-colors"
        >
          <h3 className="font-semibold text-sumi flex items-center text-sm md:text-base">
            <span className="w-1 h-4 md:h-5 bg-matsu rounded-full mr-2 md:mr-3" />
            {title}
          </h3>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-hai transition-transform duration-200 shrink-0',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      ) : (
        <div className="px-5 py-4 bg-kinari border-b border-gin">
          <h3 className="font-semibold text-sumi flex items-center">
            <span className="w-1 h-5 bg-matsu rounded-full mr-3" />
            {title}
          </h3>
        </div>
      )}
      {isOpen && (
        <dl id={headingId} className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {children}
        </dl>
      )}
    </div>
  );
}

// ===== タブコンポーネント =====

type PlotRole = PlotDetailResponse['roles'][number];

function CustomerInfoSection({
  role,
  title,
  defaultOpen = true,
  note,
}: {
  role: PlotRole;
  title: string;
  defaultOpen?: boolean;
  note?: string;
}) {
  const customer = role.customer;
  return (
    <Section title={title} defaultOpen={defaultOpen}>
      {note && (
        <div className="col-span-full rounded-elegant border border-cha-200 bg-cha-50 px-3 py-2 text-[11px] md:text-xs text-sumi leading-relaxed">
          {note}
        </div>
      )}
      <InfoField label="氏名" value={customer.name} />
      <InfoField label="ふりがな" value={customer.nameKana} />
      <InfoField label="性別" value={customer.gender ? GENDER_LABELS[customer.gender as Gender] : null} />
      <InfoField label="生年月日" value={formatDate(customer.birthDate)} />
      <InfoField label="電話番号" value={formatPhoneNumber(customer.phoneNumber)} />
      <InfoField label="FAX" value={formatPhoneNumber(customer.faxNumber)} />
      <InfoField label="メール" value={customer.email} />
      <InfoField label="郵便番号" value={formatPostalCode(customer.postalCode)} />
      <InfoField label="住所" value={customer.address} />
      <InfoField label="住所2" value={customer.addressLine2} />
      <InfoField label="本籍郵便番号" value={formatPostalCode(customer.registeredPostalCode)} />
      <InfoField label="本籍地" value={customer.registeredAddress} />
      <InfoField label="役割開始日" value={formatDate(role.roleStartDate)} />
      <InfoField label="役割終了日" value={formatDate(role.roleEndDate)} />
      <InfoField label="備考" value={customer.notes} />
    </Section>
  );
}

function BasicInfoTab({
  plot,
  sectionNames,
}: {
  plot: PlotDetailResponse;
  sectionNames: SectionNameMasterItem[];
}) {
  // 期は area_name から区画名マスタ経由で導出する（DBに独立カラムが無い設計 #166/#285）
  const period = resolvePeriodFromAreaName(plot.physicalPlot.areaName, sectionNames);
  const areaIsLegacy = isLegacyAreaName(plot.physicalPlot.areaName);
  const contractorRole = plot.roles.find(r => r.role === ContractRole.Contractor);
  const applicantRole = plot.roles.find(r => r.role === ContractRole.Applicant);
  const primaryRole = contractorRole ?? plot.roles[0];
  const primaryCustomer = primaryRole?.customer;

  // 申込者＝最初の契約者（業務確認 2026-06-07 Q3）。契約者（今の契約者）をメイン表示にし、
  // 申込者は折りたたみで情報を保持する（#260）。同一人物でもセクション自体は残し、
  // 「申込者＝契約者で省略」と「申込者未登録」を区別できるようにする（#159 の趣旨は維持）。
  const applicantIsSameAsContractor =
    !!applicantRole && !!primaryRole && applicantRole.customer.id === primaryRole.customer.id;

  // 空き区画は contract_status='vacant' の器契約。契約日・受付等が空でも
  // 「未登録（入力漏れ）」ではなく「対象外（契約がそもそも無い）」なので区別する（#181）。
  const isVacant = plot.contractStatus === ContractStatus.Vacant;
  const contractEmptyKind: EmptyKind = isVacant ? 'na' : 'unregistered';

  return (
    <div className="space-y-4">
      {/* 区画情報 */}
      <Section title="区画情報">
        <InfoField
          label="区画番号"
          // 表示用区画番号（grave_name_cd 由来）を優先。未設定時のみ legacy 値を表示し注記 #158
          value={plot.physicalPlot.displayNumber || plot.physicalPlot.plotNumber}
          hint={
            !plot.physicalPlot.displayNumber && isLegacyPlotNumber(plot.physicalPlot.plotNumber)
              ? '整備中（レガシー移行値・要確認）'
              : undefined
          }
        />
        <InfoField
          label="期"
          // 期は区画名マスタ（SectionNameMaster.period）から導出（#285）
          value={period ?? undefined}
          hint={
            period
              ? undefined
              : areaIsLegacy
                ? '整備中（レガシー移行値・要確認）'
                : '区画名マスタから期を判定できません（要確認）'
          }
        />
        <InfoField
          label="区画名（エリア）"
          value={plot.physicalPlot.areaName}
          hint={
            areaIsLegacy
              ? '整備中（レガシー移行値・要確認）'
              : '霊園の区画名（例: 凛A）。上の「期」はこの区画名から判定'
          }
        />
        <InfoField
          label="物理区画面積 (㎡)"
          value={plot.physicalPlot.areaSqm?.toString()}
          hint="区画全体の面積（分割前）"
        />
        <InfoField
          label="契約面積 (㎡)"
          value={plot.contractAreaSqm?.toString()}
          hint={`この契約で取得した面積${
            getPlotSizeLabel(plot.contractAreaSqm) ? `（${getPlotSizeLabel(plot.contractAreaSqm)}）` : ''
          }`}
        />
        <InfoField label="区画状態" value={PHYSICAL_STATUS_LABELS[plot.physicalPlot.status as PhysicalPlotStatus]} />
        <InfoField label="備考" value={plot.locationDescription} />
        <PlotAreaSplitNote
          physicalAreaSqm={plot.physicalPlot.areaSqm}
          contractAreaSqm={plot.contractAreaSqm}
        />
      </Section>

      {/* 契約情報 */}
      <Section title="契約情報">
        <InfoField label="契約日" value={formatDate(plot.contractDate)} emptyKind={contractEmptyKind} />
        {/* 契約金額＝旧システムの「使用料」を引き継いだ金額（管理料は料金情報タブ。システム確認 項目⑥） */}
        <InfoField
          label="契約金額"
          value={formatCurrency(plot.price)}
          emptyKind={contractEmptyKind}
          hint="区画の使用料（旧システムの使用料欄を引き継いだ金額。管理料は含まない）"
        />
        <InfoField label="利用申込" value={CONTRACT_STATUS_LABELS[plot.contractStatus as ContractStatus]} />
        <InfoField label="入金状態" value={PAYMENT_STATUS_LABELS[plot.paymentStatus as PaymentStatus]} />
        <InfoField label="予約日" value={formatDate(plot.reservationDate)} />
        <InfoField label="受付番号" value={plot.acceptanceNumber} emptyKind={contractEmptyKind} />
        <InfoField label="受付日" value={formatDate(plot.acceptanceDate)} emptyKind={contractEmptyKind} />
        <InfoField label="担当者" value={plot.staffInCharge} />
        <InfoField label="取扱" value={plot.agentName} />
        <InfoField label="許可日" value={formatDate(plot.permitDate)} emptyKind={contractEmptyKind} />
        <InfoField label="平成書番号" value={plot.permitNumber} emptyKind={contractEmptyKind} />
        <InfoField label="開始日" value={formatDate(plot.startDate)} emptyKind={contractEmptyKind} />
        <InfoField label="契約備考" value={plot.contractNotes} />
      </Section>

      {/* 契約者情報（今の契約者）— メイン表示 */}
      {primaryRole && <CustomerInfoSection role={primaryRole} title="契約者情報" />}

      {/* 勤務先情報（契約者） */}
      {primaryCustomer?.workInfo && (
        <Section title="勤務先情報">
          <InfoField label="勤務先名称" value={primaryCustomer.workInfo.companyName} />
          <InfoField label="勤務先かな" value={primaryCustomer.workInfo.companyNameKana} />
          <InfoField label="勤務先郵便番号" value={formatPostalCode(primaryCustomer.workInfo.workPostalCode)} />
          <InfoField label="勤務先住所" value={primaryCustomer.workInfo.workAddress} />
          <InfoField label="勤務先電話番号" value={formatPhoneNumber(primaryCustomer.workInfo.workPhoneNumber)} />
          <InfoField label="DM設定" value={primaryCustomer.workInfo.dmSetting ? DM_SETTING_LABELS[primaryCustomer.workInfo.dmSetting as DmSetting] : null} />
          <InfoField label="宛先区分" value={primaryCustomer.workInfo.addressType ? ADDRESS_TYPE_LABELS[primaryCustomer.workInfo.addressType as AddressType] : null} />
          <InfoField label="備考" value={primaryCustomer.workInfo.notes} />
        </Section>
      )}

      {/* 請求情報（契約者の振込先口座、ゆうちょ自動払込 CSV 用） */}
      {primaryCustomer && (
        primaryCustomer.bankName ||
        primaryCustomer.branchName ||
        primaryCustomer.accountType ||
        primaryCustomer.accountNumber ||
        primaryCustomer.accountHolder
      ) && (
        <Section title="請求情報">
          <InfoField label="機関名称" value={primaryCustomer.bankName} />
          <InfoField label="支店名称" value={primaryCustomer.branchName} />
          <InfoField label="口座科目" value={primaryCustomer.accountType ? (ACCOUNT_TYPE_LABELS[primaryCustomer.accountType] ?? primaryCustomer.accountType) : null} />
          <InfoField label="記号番号" value={primaryCustomer.accountNumber} />
          <InfoField label="口座名義" value={primaryCustomer.accountHolder} />
        </Section>
      )}

      {/* 申込者情報（最初の契約者）— 控えめ表示（折りたたみ・末尾配置、#260）。情報自体は保持する */}
      {applicantRole ? (
        <CustomerInfoSection
          role={applicantRole}
          title={
            applicantIsSameAsContractor
              ? '申込者情報（最初の契約者・契約者に同じ）'
              : '申込者情報（最初の契約者）'
          }
          defaultOpen={false}
          note={
            applicantIsSameAsContractor
              ? '申込者は契約時点の最初の契約者です。この区画では現在の契約者と同一人物です。'
              : '申込者は契約時点の最初の契約者です。名義変更などにより現在の契約者とは異なります。'
          }
        />
      ) : (
        <Section title="申込者情報（最初の契約者）" defaultOpen={false}>
          <InfoField label="申込者" value={null} />
        </Section>
      )}
    </div>
  );
}

function FeeInfoTab({ plot, masters }: { plot: PlotDetailResponse; masters: FeeMasters }) {
  return (
    <div className="space-y-4">
      {/* 使用料 */}
      {plot.usageFee && (
        <Section title="使用料">
          <InfoField label="計算タイプ" value={resolveMasterName(masters.calcTypes, plot.usageFee.calculationType, LEGACY_FEE_CODE_MAP.calc)} />
          <InfoField label="税区分" value={resolveMasterName(masters.taxTypes, plot.usageFee.taxType, LEGACY_FEE_CODE_MAP.tax)} />
          <InfoField label="請求タイプ" value={resolveMasterName(masters.billingTypes, plot.usageFee.billingType, LEGACY_FEE_CODE_MAP.billing)} />
          <InfoField label="請求年数" value={plot.usageFee.billingYears?.toString()} />
          <InfoField label="課金面積 (㎡)" value={plot.usageFee.area} hint="料金計算に用いる面積" />
          <InfoField label="単価" value={formatCurrency(plot.usageFee.unitPrice)} />
          <InfoField label="使用料" value={formatCurrency(plot.usageFee.usageFee)} />
          <InfoField label="送付方法" value={resolveMasterName(masters.paymentMethods, plot.usageFee.paymentMethod)} />
        </Section>
      )}

      {/* 管理料 */}
      {plot.managementFee && (
        <Section title="管理料">
          <InfoField label="計算タイプ" value={resolveMasterName(masters.calcTypes, plot.managementFee.calculationType, LEGACY_FEE_CODE_MAP.calc)} />
          <InfoField label="税区分" value={resolveMasterName(masters.taxTypes, plot.managementFee.taxType, LEGACY_FEE_CODE_MAP.tax)} />
          <InfoField label="請求タイプ" value={resolveMasterName(masters.billingTypes, plot.managementFee.billingType, LEGACY_FEE_CODE_MAP.billing)} />
          <InfoField label="請求年数" value={plot.managementFee.billingYears?.toString()} />
          <InfoField label="課金面積 (㎡)" value={plot.managementFee.area} hint="料金計算に用いる面積" />
          <InfoField label="請求月" value={plot.managementFee.billingMonth?.toString()} />
          <InfoField label="管理料" value={formatCurrency(plot.managementFee.managementFee)} />
          <InfoField label="単価" value={formatCurrency(plot.managementFee.unitPrice)} />
          <InfoField label="終納請求年月" value={formatBillingMonth(plot.managementFee.lastBillingMonth)} />
          <InfoField label="送付方法" value={resolveMasterName(masters.paymentMethods, plot.managementFee.paymentMethod)} />
        </Section>
      )}

      {!plot.usageFee && !plot.managementFee && (
        <Section title="料金情報">
          <div className="col-span-full text-center text-hai py-4">
            料金情報が登録されていません
          </div>
        </Section>
      )}
    </div>
  );
}

/**
 * 請求タブ（#171）
 *
 * paymentStatus / uncollectedAmount は請求レコードからの派生値のため、
 * 料金（管理料・使用料）設定はあっても請求書が未起票だと
 * 「未入金・管理料あり」かつ請求一覧が空、という一見矛盾した状態になる。
 * これはバグではなく「請求未起票」の正常状態なので、
 * 上部に料金設定サマリーと関係性の説明を、空一覧には理由と次のアクションを示す。
 */
function BillingTabPanel({
  plot,
  customerId,
}: {
  plot: PlotDetailResponse;
  customerId?: string;
}) {
  const hasFeeConfig = Boolean(plot.usageFee || plot.managementFee);

  const emptyState = (
    <EmptyState
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
      title="発行済みの請求はありません"
      description={
        hasFeeConfig
          ? '料金（管理料・使用料）の設定はありますが、請求（請求書）はまだ起票されていません。設定があっても請求は自動では作成されないため、上の「新規登録」から請求を追加してください。'
          : '料金設定・請求ともに未登録です。料金情報を登録のうえ、上の「新規登録」から請求を起票してください。'
      }
    />
  );

  return (
    <div className="space-y-4">
      {/* 料金設定サマリー：請求レコードとの関係を明示（#171） */}
      {hasFeeConfig && (
        <div className="rounded-elegant-lg border border-cha-200 bg-cha-50 p-3 md:p-4">
          <p className="text-sm font-semibold text-sumi mb-2">料金設定（請求の元）</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-sumi">
            {plot.managementFee && (
              <span>
                管理料{' '}
                <span className="font-semibold tabular-nums">
                  {formatCurrency(plot.managementFee.managementFee)}
                </span>
                {plot.managementFee.billingMonth
                  ? `（毎年${plot.managementFee.billingMonth}月請求）`
                  : ''}
              </span>
            )}
            {plot.usageFee && (
              <span>
                使用料{' '}
                <span className="font-semibold tabular-nums">
                  {formatCurrency(plot.usageFee.usageFee)}
                </span>
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-hai">
            これは料金の「設定」です。実際の請求（請求書）は下の一覧で管理します。設定があっても請求は自動では作成されないため、「未入金」でも請求が無い場合は「新規登録」から起票してください。
          </p>
        </div>
      )}

      <div className="bg-white border border-gin rounded-elegant-lg overflow-hidden">
        <BillingManagement
          contractPlotId={plot.id}
          customerId={customerId}
          showHeader={false}
          emptyState={emptyState}
        />
      </div>
    </div>
  );
}

function ContactsTab({ plot }: { plot: PlotDetailResponse }) {
  return (
    <div className="space-y-4">
      {/* 契約関係者一覧 */}
      <Section title="契約関係者">
        {plot.roles.length > 0 ? (
          plot.roles.map((role, idx) => (
            <div key={role.id || idx} className={`col-span-full ${idx > 0 ? 'border-t border-gin pt-4' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoField label="役割" value={CONTRACT_ROLE_LABELS[role.role as ContractRole]} />
                <InfoField label="氏名" value={role.customer.name} />
                <InfoField label="ふりがな" value={role.customer.nameKana} />
                <InfoField label="電話番号" value={formatPhoneNumber(role.customer.phoneNumber)} />
                <InfoField label="住所" value={role.customer.address} />
                <InfoField label="開始日" value={formatDate(role.roleStartDate)} />
                <InfoField label="終了日" value={formatDate(role.roleEndDate)} />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-hai py-4">
            契約関係者が登録されていません
          </div>
        )}
      </Section>

      {/* 家族連絡先 */}
      <Section title="家族連絡先">
        {plot.familyContacts && plot.familyContacts.length > 0 ? (
          plot.familyContacts.map((contact, idx) => (
            <div key={contact.id || idx} className={`col-span-full ${idx > 0 ? 'border-t border-gin pt-4' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoField label="氏名" value={contact.name} />
                <InfoField label="ふりがな" value={contact.nameKana} />
                <InfoField label="続柄" value={contact.relationship} />
                <InfoField label="生年月日" value={formatDate(contact.birthDate)} />
                <InfoField label="郵便番号" value={formatPostalCode(contact.postalCode)} />
                <InfoField label="住所" value={contact.address} />
                <InfoField label="電話番号" value={formatPhoneNumber(contact.phoneNumber)} />
                <InfoField label="電話番号2" value={formatPhoneNumber(contact.phoneNumber2)} />
                <InfoField label="FAX" value={formatPhoneNumber(contact.faxNumber)} />
                <InfoField label="メール" value={contact.email} />
                <InfoField label="本籍住所" value={contact.registeredAddress} />
                <InfoField label="送付先区分" value={contact.mailingType ? ADDRESS_TYPE_LABELS[contact.mailingType as AddressType] : null} />
                <InfoField label="連絡方法" value={contact.contactMethod} />
              </div>
              {/* 勤務先情報 */}
              {(contact.workCompanyName || contact.workAddress || contact.workPhoneNumber) && (
                <div className="mt-3 pt-3 border-t border-gin">
                  <h4 className="text-sm font-medium text-hai mb-2">勤務先</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InfoField label="勤務先名称" value={contact.workCompanyName} />
                    <InfoField label="勤務先かな" value={contact.workCompanyNameKana} />
                    <InfoField label="勤務先住所" value={contact.workAddress} />
                    <InfoField label="勤務先電話番号" value={formatPhoneNumber(contact.workPhoneNumber)} />
                  </div>
                </div>
              )}
              {contact.notes && (
                <div className="mt-3 pt-3 border-t border-gin">
                  <InfoField label="備考" value={contact.notes} />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-hai py-4">
            家族連絡先が登録されていません
          </div>
        )}
      </Section>
    </div>
  );
}

function BurialInfoTab({
  plot,
  directions,
  positions,
}: {
  plot: PlotDetailResponse;
  directions: MasterItem[];
  positions: MasterItem[];
}) {
  return (
    <div className="space-y-4">
      {/* 埋葬者情報 */}
      <Section title="埋葬者一覧">
        {plot.buriedPersons && plot.buriedPersons.length > 0 ? (
          plot.buriedPersons.map((person, idx) => {
            // 合祀年数: 個別上書きがあればそれ、なければ区画の合祀年数を継承（#10）
            const override = person.validityPeriodYearsOverride;
            const hasOverride = typeof override === 'number' && !Number.isNaN(override);
            const resolvedYears = hasOverride
              ? override
              : plot.collectiveBurial?.validityPeriodYears ?? null;
            // 合祀予定日 = 契約日 + 解決年数（起点=契約日）。請求には影響しない表示のみ
            const scheduledDate =
              resolvedYears != null
                ? calculateScheduledCollectiveBurialDate(plot.contractDate, resolvedYears)
                : null;
            return (
              <div key={person.id || idx} className={`col-span-full ${idx > 0 ? 'border-t border-gin pt-4' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InfoField label="氏名" value={person.name} />
                  <InfoField label="ふりがな" value={person.nameKana} />
                  <InfoField label="戒名" value={person.posthumousName} />
                  <InfoField label="性別" value={person.gender ? GENDER_LABELS[person.gender as Gender] : null} />
                  <InfoField label="生年月日" value={formatDate(person.birthDate)} />
                  <InfoField label="命日" value={formatDate(person.deathDate)} />
                  {/* 享年は数え年(1始まり)。0=旧システムで未記録のため未登録扱い(#297) */}
                  <InfoField label="享年" value={person.age ? person.age.toString() : null} />
                  <InfoField label="埋葬日" value={formatDate(person.burialDate)} />
                  <InfoField label="届出日" value={formatDate(person.reportDate)} />
                  <InfoField label="続柄" value={person.relationship} />
                  <InfoField label="宗派" value={person.religion} />
                  <InfoField label="備考" value={person.notes} />
                </div>
                {/* 合祀年数の個別上書き（#10）。上書き時のみ琥珀で目立たせる。継承時は控えめ表示 */}
                {hasOverride ? (
                  <div className="mt-2 rounded-elegant border border-kohaku-200 bg-kohaku-50 px-3 py-2 text-[11px] md:text-xs text-sumi leading-relaxed">
                    <span className="font-semibold text-kohaku-700">合祀年数（個別）: {override}年</span>
                    {scheduledDate && (
                      <span className="ml-1">→ 合祀予定日: {formatDate(scheduledDate.toISOString())}</span>
                    )}
                    <span className="block text-hai">この方のみ区画の合祀年数を上書きしています（請求には影響しません）。</span>
                  </div>
                ) : (
                  resolvedYears != null && (
                    <p className="mt-2 text-[11px] md:text-xs text-hai leading-relaxed">
                      合祀年数: {resolvedYears}年（区画の合祀年数を継承）
                      {scheduledDate && <> ／ 合祀予定日: {formatDate(scheduledDate.toISOString())}</>}
                    </p>
                  )
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center text-hai py-4">
            埋葬者が登録されていません
          </div>
        )}
      </Section>

      {/* 合祀情報 */}
      {plot.collectiveBurial && (
        <Section title="合祀情報">
          <InfoField label="収容可能人数" value={plot.collectiveBurial.burialCapacity?.toString()} />
          <InfoField label="現在の埋葬数" value={plot.collectiveBurial.currentBurialCount?.toString()} />
          <InfoField label="有効期間（年）" value={plot.collectiveBurial.validityPeriodYears?.toString()} />
          <InfoField label="上限到達日" value={formatDate(plot.collectiveBurial.capacityReachedDate)} />
          <InfoField label="請求予定日" value={formatDate(plot.collectiveBurial.billingScheduledDate)} />
          <InfoField label="請求状態" value={plot.collectiveBurial.billingStatus} />
          <InfoField label="請求金額" value={formatCurrency(plot.collectiveBurial.billingAmount)} />
          <InfoField label="備考" value={plot.collectiveBurial.notes} />
        </Section>
      )}

      {/* 墓石情報 */}
      {/* 墓石形状(graveKind)・基地タイプ(graveKubun) はマスタ未設計でレガシーintの意味が
          未確定のため非表示（#334）。業務側で意味が確定したらマスタ化して再表示する。 */}
      {plot.gravestoneInfo && (
        <Section title="墓石情報">
          <InfoField label="墓石基礎" value={plot.gravestoneInfo?.gravestoneBase} />
          <InfoField label="外柵位置" value={plot.gravestoneInfo?.enclosurePosition} />
          <InfoField label="石材店" value={plot.gravestoneInfo?.gravestoneDealer} />
          <InfoField label="墓石種類" value={plot.gravestoneInfo?.gravestoneType} />
          <InfoField label="周辺面積" value={plot.gravestoneInfo?.surroundingArea} />
          <InfoField label="墓石代" value={formatCurrency(plot.gravestoneInfo?.gravestoneCost)} />
          <InfoField label="方位" value={resolveMasterName(directions, plot.gravestoneInfo?.directionId?.toString())} />
          <InfoField label="位置" value={resolveMasterName(positions, plot.gravestoneInfo?.positionId?.toString())} />
          <InfoField label="墓誌" value={plot.gravestoneInfo?.gravestoneInscription} />
          <InfoField label="建立期限" value={formatDate(plot.gravestoneInfo?.establishmentDeadline)} />
          <InfoField label="建立日" value={formatDate(plot.gravestoneInfo?.establishmentDate)} />
        </Section>
      )}
    </div>
  );
}

function HistoryInfoTab({ plot }: { plot: PlotDetailResponse }) {
  // 改良版の HistoryTab を再利用（差分表示・日本語ラベル付き）
  return <HistoryTab plotDetail={plot} />;
}

function ConstructionInfoTab({
  plot,
  contractors,
}: {
  plot: PlotDetailResponse;
  contractors: MasterItem[];
}) {
  const resolveContractor = (value: string | null | undefined): string | null => {
    // legacy-gyousha-0 は「業者ID未設定」のセンチネル。実在業者でないため未登録扱い（#334）。
    if (!value || isUnsetContractor(value)) return null;
    const master = contractors.find((c) => c.code === value);
    return master ? master.name : value;
  };
  return (
    <div className="space-y-4">
      <Section title="工事記録">
        {plot.constructionInfos && plot.constructionInfos.length > 0 ? (
          plot.constructionInfos.map((record, idx) => (
            <div key={record.id || idx} className={`col-span-full ${idx > 0 ? 'border-t border-gin pt-4' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoField label="業者名" value={resolveContractor(record.contractor)} />
                <InfoField label="監督者" value={record.supervisor} />
                <InfoField label="工事種別" value={record.constructionType} />
                <InfoField label="工事内容" value={record.constructionContent} />
                <InfoField label="進捗" value={record.progress} />
                <InfoField label="工事開始日" value={formatDate(record.startDate)} />
                <InfoField label="工事終了日" value={formatDate(record.completionDate)} />
                <InfoField label="終了予定日" value={formatDate(record.scheduledEndDate)} />
                <InfoField label="申請日" value={formatDate(record.applicationDate)} />
                <InfoField label="許可番号" value={record.permitNumber} />
                <InfoField label="許可日" value={formatDate(record.permitDate)} />
                <InfoField label="許可状態" value={record.permitStatus} />
                <InfoField label="備考" value={record.notes} />
              </div>
              {/* 工事項目 */}
              {(record.workItem1 || record.workItem2) && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium text-sumi mb-2">工事項目</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {record.workItem1 && (
                      <div className="border border-gin rounded-elegant p-2">
                        <InfoField label="項目1" value={record.workItem1} />
                        <InfoField label="日付" value={formatDate(record.workDate1)} />
                        <InfoField label="金額" value={formatCurrency(record.workAmount1)} />
                        <InfoField label="状態" value={record.workStatus1} />
                      </div>
                    )}
                    {record.workItem2 && (
                      <div className="border border-gin rounded-elegant p-2">
                        <InfoField label="項目2" value={record.workItem2} />
                        <InfoField label="日付" value={formatDate(record.workDate2)} />
                        <InfoField label="金額" value={formatCurrency(record.workAmount2)} />
                        <InfoField label="状態" value={record.workStatus2} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* 入金情報 */}
              {(record.paymentType1 || record.paymentType2) && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium text-sumi mb-2">入金情報</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {record.paymentType1 && (
                      <div className="border border-gin rounded-elegant p-2">
                        <InfoField label="入金種別1" value={record.paymentType1} />
                        <InfoField label="入金額" value={formatCurrency(record.paymentAmount1)} />
                        <InfoField label="入金日" value={formatDate(record.paymentDate1)} />
                        <InfoField label="状態" value={record.paymentStatus1} />
                      </div>
                    )}
                    {record.paymentType2 && (
                      <div className="border border-gin rounded-elegant p-2">
                        <InfoField label="入金種別2" value={record.paymentType2} />
                        <InfoField label="入金額" value={formatCurrency(record.paymentAmount2)} />
                        <InfoField label="入金予定日" value={formatDate(record.paymentScheduledDate2)} />
                        <InfoField label="状態" value={record.paymentStatus2} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-hai py-4">
            工事記録が登録されていません
          </div>
        )}
      </Section>
    </div>
  );
}

// ===== メインコンポーネント =====

export default function PlotDetailView({ plotId, onEdit, onBack, onDelete, onRestore }: PlotDetailViewProps) {
  const { user } = useAuth();
  const { plot, isLoading, error, refresh } = usePlotDetail(plotId);
  // 名称解決は無効化済みマスタを含む全件で行う（#238: 無効化しても既存データの表示を維持）
  const { allMasters } = useMasters();
  const { calcTypes, taxTypes, billingTypes, paymentMethods, contractors, directions, positions, sectionNames } =
    allMasters;
  const feeMasters: FeeMasters = { calcTypes, taxTypes, billingTypes, paymentMethods };

  // #180: 請求・入金タブの件数バッジ用。子コンポーネントが内部 fetch する構造のため
  // タブを開く前は件数が分からない問題に対し、limit=1 の軽量 fetch で pagination.totalCount
  // のみ取得する。CRUD 後の自動更新は無し（次の plot リロードで再取得）。
  const [billingsCount, setBillingsCount] = useState<number | null>(null);
  const [paymentsCount, setPaymentsCount] = useState<number | null>(null);
  useEffect(() => {
    const contractPlotId = plot?.id;
    if (!contractPlotId) return;
    let cancelled = false;
    setBillingsCount(null);
    setPaymentsCount(null);
    Promise.all([
      getBillings({ contractPlotId, page: 1, limit: 1 }),
      getPayments({ contractPlotId, page: 1, limit: 1 }),
    ])
      .then(([b, p]) => {
        if (cancelled) return;
        if (b.success) setBillingsCount(b.data.pagination.totalCount);
        if (p.success) setPaymentsCount(p.data.pagination.totalCount);
      })
      .catch(() => {
        // 件数取得失敗時はバッジ非表示（null のまま）。
      });
    return () => {
      cancelled = true;
    };
  }, [plot?.id]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-beni-50 border border-beni-200 rounded-elegant-lg p-6 text-center">
        <p className="text-beni mb-4">エラーが発生しました: {error}</p>
        <Button onClick={refresh} variant="outline">
          再読み込み
        </Button>
      </div>
    );
  }

  if (!plot) {
    return (
      <div className="bg-kinari border border-gin rounded-elegant-lg p-6 text-center">
        <p className="text-hai">区画が見つかりません</p>
        {onBack && (
          <Button onClick={onBack} variant="outline" className="mt-4">
            戻る
          </Button>
        )}
      </div>
    );
  }

  const primaryCustomer = plot.roles.find(r => r.role === ContractRole.Contractor)?.customer
    || plot.roles[0]?.customer;

  // 表示用区画番号（grave_name_cd 由来）を優先。未設定時のみ legacy 値にフォールバック（#158/#164）。
  // パンくず・復活/削除ダイアログなどユーザー向け表示で一貫して使う。
  const displayPlotNumber = plot.physicalPlot.displayNumber || plot.physicalPlot.plotNumber;

  return (
    <div className="w-full">
      {/* パンくずナビゲーション */}
      <nav className="flex items-center gap-1.5 text-sm text-hai mb-3" aria-label="パンくず">
        <Link href="/plots" className="hover:text-matsu transition-colors">
          台帳
        </Link>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sumi font-medium truncate">
          <LegacyAwareValue value={displayPlotNumber} kind="plotNumber" />
        </span>
      </nav>

      {/* ヘッダー + ツールバー */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 md:mb-6 bg-white border border-gin rounded-elegant-lg shadow-elegant-sm p-4 md:p-5">
        <div className="min-w-0">
          {/* エリア（区）- 区画No（番）の順で「2区-12番」と読めるようにする（システム確認 項目①） */}
          <h2 className="text-lg md:text-2xl font-bold text-sumi truncate">
            <LegacyAwareValue value={plot.physicalPlot.areaName} kind="areaName" /> - <LegacyAwareValue value={displayPlotNumber} kind="plotNumber" />
          </h2>
          {((!plot.physicalPlot.displayNumber && isLegacyPlotNumber(plot.physicalPlot.plotNumber)) || isLegacyAreaName(plot.physicalPlot.areaName)) && (
            <LegacyValueNote className="mt-1" />
          )}
          {primaryCustomer && (
            <p className="text-hai mt-1 text-sm md:text-base truncate">
              契約者: {primaryCustomer.name}
              {primaryCustomer.nameKana && ` (${primaryCustomer.nameKana})`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* 書類作成・履歴は PC 専用画面に遷移するためモバイルでは非表示 */}
          <Link href={`/plots/${plotId}/documents/create`} className="hidden sm:inline-flex">
            <Button variant="outline" size="sm" className="gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>書類作成</span>
            </Button>
          </Link>
          <Link href={`/plots/${plotId}/documents`} className="hidden sm:inline-flex">
            <Button variant="outline" size="sm" className="gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>書類履歴</span>
            </Button>
          </Link>
          {/* terminated 状態のみ「契約を復活」ボタンを表示（誤操作リカバリ用） */}
          {plot.contractStatus === ContractStatus.Terminated && onRestore && (
            <Button
              onClick={() =>
                onRestore(
                  displayPlotNumber,
                  primaryCustomer?.name || displayPlotNumber
                )
              }
              variant="outline"
              size="sm"
              className="gap-1.5 border-matsu text-matsu hover:bg-matsu-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>契約を復活</span>
            </Button>
          )}
          {onEdit && (
            <Button onClick={onEdit} className="bg-matsu hover:bg-matsu-dark text-white" size="sm">
              編集
            </Button>
          )}
          {/* ... ドロップダウンメニュー（削除等） */}
          {user?.role === 'admin' && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2" aria-label="その他の操作">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onDelete(
                    displayPlotNumber,
                    primaryCustomer?.name || displayPlotNumber
                  )}
                  className="text-beni focus:text-beni"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  区画情報を削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* サマリーカード */}
      <div className="mb-4 md:mb-6 rounded-elegant-lg border border-gin bg-white shadow-elegant-sm p-4 md:p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {/* 契約者 */}
          <div className="min-w-0 col-span-2 md:col-span-1">
            <p className="text-[11px] md:text-xs text-hai">契約者</p>
            <p className="mt-1 text-base md:text-lg font-semibold text-sumi truncate">
              {primaryCustomer?.name || '-'}
            </p>
            {primaryCustomer?.nameKana && (
              <p className="text-[11px] md:text-xs text-hai truncate">
                {primaryCustomer.nameKana}
              </p>
            )}
          </div>
          {/* 未収金額 */}
          <div className="min-w-0">
            <p className="text-[11px] md:text-xs text-hai">未収金額</p>
            <p className={cn(
              'mt-1 text-lg md:text-2xl font-semibold tabular-nums',
              (plot.uncollectedAmount ?? 0) > 0 ? 'text-beni' : 'text-sumi'
            )}>
              {formatNumber(plot.uncollectedAmount ?? 0)}
              <span className="text-xs md:text-sm text-hai ml-1 font-normal">円</span>
            </p>
            {/* 未収0 かつ未入金 = まだ請求が起票されていない（#170）。矛盾に見えるため理由を明示。 */}
            {(plot.uncollectedAmount ?? 0) === 0 &&
              plot.paymentStatus === PaymentStatus.Unpaid && (
                <p className="mt-0.5 text-[10px] md:text-xs text-hai">請求未生成</p>
              )}
          </div>
          {/* 直近請求月（管理料） */}
          <div className="min-w-0">
            <p className="text-[11px] md:text-xs text-hai">直近請求</p>
            <p className="mt-1 text-sm md:text-base font-semibold text-sumi tabular-nums truncate">
              {formatBillingMonth(plot.managementFee?.lastBillingMonth, '―')}
            </p>
          </div>
          {/* 状態（入金 / 契約 / 区画販売 を区分ラベル付きで分離表示）#165 */}
          <div className="min-w-0 col-span-2 md:col-span-1">
            <p className="text-[11px] md:text-xs text-hai mb-1.5">状態</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              <span className="inline-flex items-center gap-1">
                <span className="text-[10px] text-hai">入金</span>
                <StatusBadge
                  variant={PAYMENT_STATUS_VARIANTS[plot.paymentStatus as PaymentStatus]}
                  withSymbol
                >
                  {PAYMENT_STATUS_LABELS[plot.paymentStatus as PaymentStatus]}
                </StatusBadge>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-[10px] text-hai">契約</span>
                <StatusBadge
                  variant={CONTRACT_STATUS_VARIANTS[plot.contractStatus as ContractStatus]}
                  withSymbol
                >
                  {CONTRACT_STATUS_LABELS[plot.contractStatus as ContractStatus]}
                </StatusBadge>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-[10px] text-hai">区画</span>
                <StatusBadge
                  variant={PHYSICAL_STATUS_VARIANTS[plot.physicalPlot.status]}
                  withSymbol
                >
                  {PHYSICAL_STATUS_LABELS[plot.physicalPlot.status]}
                </StatusBadge>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 空値表示の凡例（#181）— 「-」が未登録・対象外・取得失敗のどれか分からない問題への対応 */}
      <p className="mb-3 text-[11px] md:text-xs text-hai leading-relaxed">
        <span className="font-semibold text-sumi">表示の凡例</span>：
        <span className="italic">未登録</span>＝未入力の項目／
        <span className="italic">対象外</span>＝この区画では該当しない項目。
        該当しない情報はセクションごと非表示になり、取得に失敗した場合はエラー画面を表示します。
      </p>

      {/* タブ — モバイル: 横スクロール / タブレット以上: グリッド */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList
          className={cn(
            // モバイル: フルwidthで横スクロール、スナップ付き
            // justify-start で base の justify-center を打ち消す
            // (overflow時に中央寄せだと左端が見切れてスクロール不可になるため)
            'flex w-full justify-start overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-thin h-auto gap-1',
            // sm以上: グリッドレイアウトに戻す
            'sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:overflow-visible sm:snap-none'
          )}
        >
          <TabsTrigger value="basic" className="shrink-0 sm:shrink snap-start px-3 sm:px-2 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-matsu data-[state=active]:text-white">
            基本情報
          </TabsTrigger>
          <TabsTrigger value="fee" className="shrink-0 sm:shrink snap-start px-3 sm:px-2 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-matsu data-[state=active]:text-white">
            料金情報
          </TabsTrigger>
          <TabsTrigger value="contacts" className="shrink-0 sm:shrink snap-start px-3 sm:px-2 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-matsu data-[state=active]:text-white">
            連絡先
            <TabCount count={plot.roles.length + (plot.familyContacts?.length ?? 0)} />
          </TabsTrigger>
          <TabsTrigger value="burial" className="shrink-0 sm:shrink snap-start px-3 sm:px-2 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-matsu data-[state=active]:text-white">
            埋葬情報
            <TabCount count={plot.buriedPersons?.length ?? 0} />
          </TabsTrigger>
          <TabsTrigger value="construction" className="shrink-0 sm:shrink snap-start px-3 sm:px-2 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-matsu data-[state=active]:text-white">
            工事情報
            <TabCount count={plot.constructionInfos?.length ?? 0} />
          </TabsTrigger>
          <TabsTrigger value="billing" className="shrink-0 sm:shrink snap-start px-3 sm:px-2 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-matsu data-[state=active]:text-white">
            請求
            {billingsCount !== null && <TabCount count={billingsCount} />}
          </TabsTrigger>
          <TabsTrigger value="payment" className="shrink-0 sm:shrink snap-start px-3 sm:px-2 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-matsu data-[state=active]:text-white">
            入金
            {paymentsCount !== null && <TabCount count={paymentsCount} />}
          </TabsTrigger>
          <TabsTrigger value="history" className="shrink-0 sm:shrink snap-start px-3 sm:px-2 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-matsu data-[state=active]:text-white">
            履歴情報
            <TabCount count={plot.histories?.length ?? 0} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4 md:mt-6">
          <BasicInfoTab plot={plot} sectionNames={sectionNames} />
        </TabsContent>

        <TabsContent value="fee" className="mt-4 md:mt-6">
          <FeeInfoTab plot={plot} masters={feeMasters} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 md:mt-6">
          <ContactsTab plot={plot} />
        </TabsContent>

        <TabsContent value="burial" className="mt-4 md:mt-6">
          <BurialInfoTab plot={plot} directions={directions} positions={positions} />
        </TabsContent>

        <TabsContent value="construction" className="mt-4 md:mt-6">
          <ConstructionInfoTab plot={plot} contractors={contractors} />
        </TabsContent>

        <TabsContent value="billing" className="mt-4 md:mt-6">
          <BillingTabPanel
            plot={plot}
            customerId={
              plot.roles.find((r) => r.role === ContractRole.Contractor)?.customer.id ??
              plot.roles[0]?.customer.id
            }
          />
        </TabsContent>

        <TabsContent value="payment" className="mt-4 md:mt-6">
          <div className="bg-white border border-gin rounded-elegant-lg overflow-hidden">
            <PaymentManagement
              contractPlotId={plot.id}
              customerId={
                plot.roles.find((r) => r.role === ContractRole.Contractor)?.customer.id ??
                plot.roles[0]?.customer.id
              }
              showHeader={false}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4 md:mt-6">
          <HistoryInfoTab plot={plot} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
