import type { PlotFormData } from '@/lib/validations/plot-form';
import type { PreviewSection, PreviewDiffSection, PreviewDiffItem } from '@/components/shared/dialogs';
import type { MasterItem } from '@/lib/api';
import { isUnsetContractor } from '@/lib/legacy-sentinels';

export interface PreviewMasterContext {
  contractors?: MasterItem[];
}

function resolveContractorLabel(
  value: string | null | undefined,
  contractors: MasterItem[] | undefined,
): string {
  // legacy-gyousha-0 は「業者ID未設定」のセンチネル。書類にも実在業者として印字しない（#334）。
  if (!value || isUnsetContractor(value)) return '';
  if (!contractors || contractors.length === 0) return value;
  const master = contractors.find((c) => c.code === value);
  return master ? master.name : value;
}

type SectionConfig = {
  title: string;
  fields: { key: string; label: string; format?: (v: unknown) => string }[];
};

const formatDate = (v: unknown) => (v ? String(v) : '');
const formatNumber = (v: unknown) => (v !== null && v !== undefined ? String(v) : '');
const formatGender = (v: unknown) => {
  if (v === 'MALE') return '男性';
  if (v === 'FEMALE') return '女性';
  if (v === 'OTHER') return 'その他';
  return '';
};
const formatPaymentStatus = (v: unknown) => {
  const map: Record<string, string> = {
    Unpaid: '未払い', PartialPaid: '一部支払い済み', Paid: '支払い済み',
    Overdue: '延滞', Refunded: '返金済み', Cancelled: 'キャンセル',
  };
  return map[String(v)] ?? String(v ?? '');
};

const sectionConfigs: SectionConfig[] = [
  {
    title: '物理区画情報',
    fields: [
      { key: 'physicalPlot.plotNumber', label: '区画番号' },
      { key: 'physicalPlot.areaName', label: '区画' },
      { key: 'physicalPlot.areaSqm', label: '面積（㎡）', format: formatNumber },
      { key: 'physicalPlot.notes', label: '備考' },
    ],
  },
  {
    title: '契約区画情報',
    fields: [
      { key: 'contractPlot.contractAreaSqm', label: '契約面積（㎡）', format: formatNumber },
      { key: 'contractPlot.locationDescription', label: '区画位置詳細' },
    ],
  },
  {
    title: '販売契約情報',
    fields: [
      { key: 'saleContract.contractDate', label: '契約日', format: formatDate },
      { key: 'saleContract.price', label: '金額', format: formatNumber },
      { key: 'saleContract.paymentStatus', label: '支払状態', format: formatPaymentStatus },
      { key: 'saleContract.reservationDate', label: '予約日', format: formatDate },
      { key: 'saleContract.acceptanceNumber', label: '承諾書番号' },
      { key: 'saleContract.permitDate', label: '許可日', format: formatDate },
      { key: 'saleContract.startDate', label: '開始年月日', format: formatDate },
      { key: 'saleContract.acceptanceDate', label: '受付日', format: formatDate },
      { key: 'saleContract.staffInCharge', label: '担当者' },
      { key: 'saleContract.agentName', label: '取扱' },
      { key: 'saleContract.notes', label: '備考' },
    ],
  },
  {
    title: '契約者情報',
    fields: [
      { key: 'customer.name', label: '氏名' },
      { key: 'customer.nameKana', label: '氏名カナ' },
      { key: 'customer.birthDate', label: '生年月日', format: formatDate },
      { key: 'customer.gender', label: '性別', format: formatGender },
      { key: 'customer.postalCode', label: '郵便番号' },
      { key: 'customer.address', label: '住所' },
      { key: 'customer.addressLine2', label: '住所2' },
      { key: 'customer.registeredPostalCode', label: '本籍郵便番号' },
      { key: 'customer.registeredAddress', label: '本籍地' },
      { key: 'customer.phoneNumber', label: '電話番号' },
      { key: 'customer.faxNumber', label: 'FAX' },
      { key: 'customer.email', label: 'メール' },
      { key: 'customer.notes', label: '備考' },
    ],
  },
  {
    title: '申込者情報',
    fields: [
      { key: 'applicant.name', label: '氏名' },
      { key: 'applicant.nameKana', label: '氏名カナ' },
      { key: 'applicant.birthDate', label: '生年月日', format: formatDate },
      { key: 'applicant.gender', label: '性別', format: formatGender },
      { key: 'applicant.postalCode', label: '郵便番号' },
      { key: 'applicant.address', label: '住所' },
      { key: 'applicant.addressLine2', label: '住所2' },
      { key: 'applicant.registeredPostalCode', label: '本籍郵便番号' },
      { key: 'applicant.registeredAddress', label: '本籍地' },
      { key: 'applicant.phoneNumber', label: '電話番号' },
      { key: 'applicant.faxNumber', label: 'FAX' },
      { key: 'applicant.email', label: 'メール' },
      { key: 'applicant.notes', label: '備考' },
    ],
  },
  {
    title: '使用料',
    fields: [
      { key: 'usageFee.calculationType', label: '計算区分' },
      { key: 'usageFee.taxType', label: '税区分' },
      { key: 'usageFee.billingType', label: '請求区分' },
      { key: 'usageFee.billingYears', label: '請求年数', format: formatNumber },
      { key: 'usageFee.usageFee', label: '使用料', format: formatNumber },
      { key: 'usageFee.area', label: '面積', format: formatNumber },
      { key: 'usageFee.unitPrice', label: '単価', format: formatNumber },
      { key: 'usageFee.paymentMethod', label: '送付方法' },
    ],
  },
  {
    title: '管理料',
    fields: [
      { key: 'managementFee.calculationType', label: '計算区分' },
      { key: 'managementFee.taxType', label: '税区分' },
      { key: 'managementFee.billingType', label: '請求区分' },
      { key: 'managementFee.billingYears', label: '請求年数', format: formatNumber },
      { key: 'managementFee.area', label: '面積', format: formatNumber },
      { key: 'managementFee.billingMonth', label: '請求月' },
      { key: 'managementFee.managementFee', label: '管理料', format: formatNumber },
      { key: 'managementFee.unitPrice', label: '単価', format: formatNumber },
      { key: 'managementFee.lastBillingMonth', label: '終納請求年月' },
      { key: 'managementFee.paymentMethod', label: '送付方法' },
    ],
  },
  {
    title: '勤務先情報',
    fields: [
      { key: 'workInfo.companyName', label: '勤務先名称' },
      { key: 'workInfo.companyNameKana', label: '勤務先名称カナ' },
      { key: 'workInfo.workPostalCode', label: '勤務先郵便番号' },
      { key: 'workInfo.workPhoneNumber', label: '勤務先電話番号' },
      { key: 'workInfo.workAddress', label: '勤務先住所' },
    ],
  },
  {
    title: '墓石情報',
    fields: [
      { key: 'gravestoneInfo.gravestoneBase', label: '墓石台' },
      { key: 'gravestoneInfo.enclosurePosition', label: '外柵位置' },
      { key: 'gravestoneInfo.gravestoneDealer', label: '石材店' },
      { key: 'gravestoneInfo.gravestoneType', label: '墓石種類' },
      { key: 'gravestoneInfo.surroundingArea', label: '周辺面積' },
      { key: 'gravestoneInfo.gravestoneCost', label: '墓石代', format: formatNumber },
      { key: 'gravestoneInfo.establishmentDeadline', label: '建立期限', format: formatDate },
      { key: 'gravestoneInfo.establishmentDate', label: '建立日', format: formatDate },
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): unknown {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function formatFieldValue(value: unknown, format?: (v: unknown) => string): string {
  if (format) return format(value);
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

/**
 * 新規登録時のプレビューセクションを生成
 */
export function buildPlotPreviewSections(
  data: PlotFormData,
  masterContext?: PreviewMasterContext,
): PreviewSection[] {
  const sections: PreviewSection[] = [];

  for (const config of sectionConfigs) {
    const items = config.fields
      .map((f) => ({
        label: f.label,
        value: formatFieldValue(getNestedValue(data, f.key), f.format),
      }))
      .filter((item) => item.value !== '');
    if (items.length > 0) {
      sections.push({ title: config.title, items });
    }
  }

  // 家族連絡先
  if (data.familyContacts?.length) {
    for (let i = 0; i < data.familyContacts.length; i++) {
      const c = data.familyContacts[i];
      const items = [
        { label: '氏名', value: c.name || '' },
        { label: '続柄', value: c.relationship || '' },
        { label: '電話番号', value: c.phoneNumber || '' },
        { label: '住所', value: c.address || '' },
        { label: 'メール', value: c.email || '' },
      ].filter((item) => item.value !== '');
      if (items.length > 0) {
        sections.push({ title: `家族連絡先 ${i + 1}`, items });
      }
    }
  }

  // 埋葬者
  if (data.buriedPersons?.length) {
    for (let i = 0; i < data.buriedPersons.length; i++) {
      const p = data.buriedPersons[i];
      const items = [
        { label: '氏名', value: p.name || '' },
        { label: '命日', value: p.deathDate || '' },
        { label: '埋葬日', value: p.burialDate || '' },
        { label: '享年', value: p.age ? String(p.age) : '' },
        { label: '性別', value: formatGender(p.gender) },
        {
          label: '合祀年数（この方のみ）',
          value:
            p.validityPeriodYearsOverride != null
              ? `${p.validityPeriodYearsOverride}年`
              : '',
        },
      ].filter((item) => item.value !== '');
      if (items.length > 0) {
        sections.push({ title: `埋葬者 ${i + 1}`, items });
      }
    }
  }

  // 工事情報
  if (data.constructionInfos?.length) {
    for (let i = 0; i < data.constructionInfos.length; i++) {
      const ci = data.constructionInfos[i];
      const items = [
        { label: '工事種別', value: ci.constructionType || '' },
        { label: '業者名', value: resolveContractorLabel(ci.contractor, masterContext?.contractors) },
        { label: '工事開始日', value: ci.startDate || '' },
        { label: '工事終了日', value: ci.completionDate || '' },
        { label: '工事内容', value: ci.constructionContent || '' },
      ].filter((item) => item.value !== '');
      if (items.length > 0) {
        sections.push({ title: `工事情報 ${i + 1}`, items });
      }
    }
  }

  return sections;
}

// 配列の差分セクションを生成するヘルパー
interface ArrayFieldDef {
  key: string;
  label: string;
  format?: (v: unknown) => string;
}

function buildArrayDiffSections(
  sectionLabel: string,
  originalArr: Record<string, unknown>[] | undefined,
  currentArr: Record<string, unknown>[] | undefined,
  fields: ArrayFieldDef[],
): PreviewDiffSection[] {
  // 中間削除や並べ替えで original[i] と current[i] が別レコードになるため、
  // インデックスではなく id で突合する（backend updatePlot の id 突合と同じ基準）。
  // id を持たない current 要素は新規追加分として扱う（#222）。
  const sections: PreviewDiffSection[] = [];
  const originals = originalArr ?? [];
  const currents = currentArr ?? [];

  const fmt = (f: ArrayFieldDef, v: unknown): string =>
    f.format ? f.format(v) : String(v ?? '');

  const getId = (item: Record<string, unknown>): string | undefined =>
    typeof item.id === 'string' && item.id !== '' ? item.id : undefined;

  const origById = new Map<string, Record<string, unknown>>();
  for (const orig of originals) {
    const id = getId(orig);
    if (id) origById.set(id, orig);
  }
  const currentIds = new Set(
    currents.map(getId).filter((id): id is string => !!id),
  );

  // 追加・変更: current の表示順で連番を振る
  currents.forEach((curr, i) => {
    const id = getId(curr);
    const orig = id ? origById.get(id) : undefined;
    const items: PreviewDiffItem[] = [];

    if (!orig) {
      // 新規追加（id 無し、または original に存在しない id）
      for (const f of fields) {
        const val = fmt(f, curr[f.key]);
        if (val) {
          items.push({ label: f.label, before: '', after: val });
        }
      }
      if (items.length > 0) {
        sections.push({ title: `${sectionLabel} ${i + 1}（追加）`, items });
      }
    } else {
      // 既存の変更（同一 id 同士でフィールド比較）
      for (const f of fields) {
        const before = fmt(f, orig[f.key]);
        const after = fmt(f, curr[f.key]);
        if (before !== after) {
          items.push({ label: f.label, before, after });
        }
      }
      if (items.length > 0) {
        sections.push({ title: `${sectionLabel} ${i + 1}`, items });
      }
    }
  });

  // 削除: current に id が残っていない original（編集前の表示順で連番）
  // ※ original はサーバ取得データのため id を持つ前提。id 無しの original は
  //   突合不能なので削除判定の対象外とする
  originals.forEach((orig, i) => {
    const id = getId(orig);
    if (!id || currentIds.has(id)) return;
    const items: PreviewDiffItem[] = [];
    for (const f of fields) {
      const val = fmt(f, orig[f.key]);
      if (val) {
        items.push({ label: f.label, before: val, after: '' });
      }
    }
    if (items.length > 0) {
      sections.push({ title: `${sectionLabel} ${i + 1}（削除）`, items });
    }
  });

  return sections;
}

const familyContactFields: ArrayFieldDef[] = [
  { key: 'name', label: '氏名' },
  { key: 'relationship', label: '続柄' },
  { key: 'phoneNumber', label: '電話番号' },
  { key: 'address', label: '住所' },
  { key: 'email', label: 'メール' },
];

const buriedPersonFieldDefs: ArrayFieldDef[] = [
  { key: 'name', label: '氏名' },
  { key: 'deathDate', label: '命日' },
  { key: 'burialDate', label: '埋葬日' },
  { key: 'age', label: '享年' },
  { key: 'gender', label: '性別' },
  {
    key: 'validityPeriodYearsOverride',
    label: '合祀年数（この方のみ）',
    format: (v) => (v != null ? `${v as number}年` : ''),
  },
];

const buildConstructionInfoFieldDefs = (
  contractors: MasterItem[] | undefined,
): ArrayFieldDef[] => [
  { key: 'constructionType', label: '工事種別' },
  {
    key: 'contractor',
    label: '業者名',
    format: (v) => resolveContractorLabel(v as string | null | undefined, contractors),
  },
  { key: 'startDate', label: '工事開始日' },
  { key: 'completionDate', label: '工事終了日' },
  { key: 'constructionContent', label: '工事内容' },
  { key: 'supervisor', label: '監督者' },
  { key: 'permitNumber', label: '許可番号' },
  { key: 'notes', label: '備考' },
];

/**
 * 更新時の差分プレビューセクションを生成
 */
export function buildPlotDiffSections(
  original: PlotFormData,
  current: PlotFormData,
  masterContext?: PreviewMasterContext,
): PreviewDiffSection[] {
  const sections: PreviewDiffSection[] = [];

  // フラットフィールドの差分
  for (const config of sectionConfigs) {
    const items = config.fields
      .map((f) => ({
        label: f.label,
        before: formatFieldValue(getNestedValue(original, f.key), f.format),
        after: formatFieldValue(getNestedValue(current, f.key), f.format),
      }))
      .filter((item) => item.before !== item.after);
    if (items.length > 0) {
      sections.push({ title: config.title, items });
    }
  }

  // 配列フィールドの差分
  sections.push(...buildArrayDiffSections(
    '家族連絡先',
    original.familyContacts as unknown as Record<string, unknown>[],
    current.familyContacts as unknown as Record<string, unknown>[],
    familyContactFields,
  ));

  sections.push(...buildArrayDiffSections(
    '埋葬者',
    original.buriedPersons as unknown as Record<string, unknown>[],
    current.buriedPersons as unknown as Record<string, unknown>[],
    buriedPersonFieldDefs,
  ));

  sections.push(...buildArrayDiffSections(
    '工事情報',
    original.constructionInfos as unknown as Record<string, unknown>[],
    current.constructionInfos as unknown as Record<string, unknown>[],
    buildConstructionInfoFieldDefs(masterContext?.contractors),
  ));

  return sections;
}
