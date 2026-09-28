/**
 * 区画フォームバリデーション
 *
 * スキーマ定義は @komine/types/validations から参照（フロントエンド・バックエンド統一）。
 * このファイルにはフロントエンド固有の要素のみ残す:
 * - デフォルト値
 * - フォームデータ ⇔ APIリクエスト変換関数
 */

import {
  ContractRole,
  ContractStatus,
  PaymentStatus,
  DmSetting,
  AddressType,
} from '@komine/types';
import type { CreatePlotRequest, UpdatePlotRequest, PlotDetailResponse } from '@komine/types';
import { resolveHandlerName } from '@/lib/legacy-grave-labels';

// ===== スキーマと型を @komine/types から再エクスポート =====
export {
  // 個別スキーマ
  physicalPlotSchema,
  contractPlotSchema,
  saleContractSchema,
  customerSchema,
  applicantSchema,
  workInfoSchema,
  usageFeeSchema,
  managementFeeSchema,
  gravestoneInfoSchema,
  familyContactSchema,
  buriedPersonSchema,
  constructionInfoSchema,
  collectiveBurialSchema,
  // 複合スキーマ
  plotFormSchema,
  plotUpdateFormSchema,
} from '@komine/types/validations';

export type {
  PhysicalPlotFormData,
  ContractPlotFormData,
  SaleContractFormData,
  CustomerSectionFormData,
  ApplicantSectionFormData,
  WorkInfoFormData,
  UsageFeeFormData,
  ManagementFeeFormData,
  GravestoneInfoFormData,
  FamilyContactFormData,
  BuriedPersonFormData,
  ConstructionInfoFormData,
  CollectiveBurialFormData,
  PlotFormData,
  PlotUpdateFormData,
} from '@komine/types/validations';

import type {
  PhysicalPlotFormData,
  ContractPlotFormData,
  SaleContractFormData,
  CustomerSectionFormData,
  ApplicantSectionFormData,
  PlotFormData,
  PlotUpdateFormData,
} from '@komine/types/validations';
import { normalizeYearMonth } from '@komine/types/validations';

/**
 * 終納請求年月の表示用正規化（types #31）。
 * レガシー移行データ（'2024-04'/'202404' 等）をフォーム初期値の時点で
 * 'YYYY年M月' に寄せる。バリデーション側（yearMonthSchema の preprocess）
 * でも正規化されるため保存は通るが、入力欄の表示も統一する。
 */
function normalizeLastBillingMonth(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = normalizeYearMonth(value);
  return typeof normalized === 'string' ? normalized : value;
}

// ===== デフォルト値 =====

export const defaultPhysicalPlot: PhysicalPlotFormData = {
  plotNumber: '',
  areaName: '',
  areaSqm: 3.6,
  notes: null,
};

export const defaultContractPlot: ContractPlotFormData = {
  contractAreaSqm: 3.6,
  locationDescription: null,
};

export const defaultSaleContract: SaleContractFormData = {
  contractDate: new Date().toISOString().split('T')[0],
  price: 0,
  contractStatus: ContractStatus.Active,
  paymentStatus: PaymentStatus.Unpaid,
  reservationDate: '',
  acceptanceNumber: '',
  acceptanceDate: '',
  staffInCharge: null,
  agentName: null,
  permitDate: '',
  permitNumber: '',
  startDate: '',
  notes: null,
};

export const defaultCustomer: CustomerSectionFormData = {
  name: '',
  nameKana: '',
  birthDate: null,
  gender: null,
  postalCode: '',
  address: '',
  addressLine2: null,
  registeredPostalCode: null,
  registeredAddress: null,
  phoneNumber: '',
  faxNumber: null,
  email: null,
  bankName: null,
  branchName: null,
  accountType: null,
  accountNumber: null,
  accountHolder: null,
  notes: null,
  role: ContractRole.Contractor,
};

export const defaultApplicant: ApplicantSectionFormData = {
  name: '',
  nameKana: '',
  birthDate: null,
  gender: null,
  postalCode: null,
  address: null,
  addressLine2: null,
  registeredPostalCode: null,
  registeredAddress: null,
  phoneNumber: null,
  faxNumber: null,
  email: null,
  notes: null,
};

export const defaultPlotFormData: PlotFormData = {
  physicalPlot: defaultPhysicalPlot,
  contractPlot: defaultContractPlot,
  saleContract: defaultSaleContract,
  customer: defaultCustomer,
  applicant: null,
  workInfo: null,
  usageFee: null,
  managementFee: null,
  gravestoneInfo: null,
  familyContacts: [],
  buriedPersons: [],
  constructionInfos: [],
  collectiveBurial: null,
};

// ===== フォームデータ → APIリクエスト変換 =====

/**
 * PlotFormData を CreatePlotRequest に変換
 */
export function plotFormDataToCreateRequest(formData: PlotFormData): CreatePlotRequest {
  return {
    physicalPlot: {
      plotNumber: formData.physicalPlot.plotNumber,
      areaName: formData.physicalPlot.areaName,
      areaSqm: formData.physicalPlot.areaSqm,
      notes: formData.physicalPlot.notes || undefined,
    },
    contractPlot: {
      contractAreaSqm: formData.contractPlot.contractAreaSqm,
      locationDescription: formData.contractPlot.locationDescription || undefined,
    },
    saleContract: {
      contractDate: formData.saleContract.contractDate,
      price: formData.saleContract.price,
      paymentStatus: formData.saleContract.paymentStatus,
      reservationDate: formData.saleContract.reservationDate || undefined,
      acceptanceNumber: formData.saleContract.acceptanceNumber || undefined,
      acceptanceDate: formData.saleContract.acceptanceDate || undefined,
      staffInCharge: formData.saleContract.staffInCharge || undefined,
      agentName: formData.saleContract.agentName || undefined,
      permitDate: formData.saleContract.permitDate || undefined,
      permitNumber: formData.saleContract.permitNumber || undefined,
      startDate: formData.saleContract.startDate || undefined,
      notes: formData.saleContract.notes || undefined,
    },
    customer: {
      name: formData.customer.name,
      nameKana: formData.customer.nameKana,
      birthDate: formData.customer.birthDate || undefined,
      gender: formData.customer.gender || undefined,
      postalCode: formData.customer.postalCode,
      address: formData.customer.address,
      addressLine2: formData.customer.addressLine2 || undefined,
      registeredPostalCode: formData.customer.registeredPostalCode || undefined,
      registeredAddress: formData.customer.registeredAddress || undefined,
      phoneNumber: formData.customer.phoneNumber || null,
      faxNumber: formData.customer.faxNumber || undefined,
      email: formData.customer.email || undefined,
      bankName: formData.customer.bankName || undefined,
      branchName: formData.customer.branchName || undefined,
      accountType: formData.customer.accountType || undefined,
      accountNumber: formData.customer.accountNumber || undefined,
      accountHolder: formData.customer.accountHolder || undefined,
      notes: formData.customer.notes || undefined,
      role: formData.customer.role,
    },
    applicant: formData.applicant && formData.applicant.name
      ? {
        name: formData.applicant.name,
        nameKana: formData.applicant.nameKana,
        birthDate: formData.applicant.birthDate || undefined,
        gender: formData.applicant.gender || undefined,
        postalCode: formData.applicant.postalCode || undefined,
        address: formData.applicant.address || undefined,
        addressLine2: formData.applicant.addressLine2 || undefined,
        registeredPostalCode: formData.applicant.registeredPostalCode || undefined,
        registeredAddress: formData.applicant.registeredAddress || undefined,
        phoneNumber: formData.applicant.phoneNumber || undefined,
        faxNumber: formData.applicant.faxNumber || undefined,
        email: formData.applicant.email || undefined,
        notes: formData.applicant.notes || undefined,
      }
      : undefined,
    workInfo: formData.workInfo
      ? {
        companyName: formData.workInfo.companyName,
        companyNameKana: formData.workInfo.companyNameKana,
        workAddress: formData.workInfo.workAddress,
        workPostalCode: formData.workInfo.workPostalCode,
        workPhoneNumber: formData.workInfo.workPhoneNumber,
        dmSetting: formData.workInfo.dmSetting,
        addressType: formData.workInfo.addressType,
        notes: formData.workInfo.notes || undefined,
      }
      : undefined,
    usageFee: formData.usageFee
      ? {
        calculationType: formData.usageFee.calculationType || undefined,
        taxType: formData.usageFee.taxType || undefined,
        billingType: formData.usageFee.billingType || undefined,
        billingYears: formData.usageFee.billingYears || undefined,
        usageFee: formData.usageFee.usageFee || undefined,
        area: formData.usageFee.area || undefined,
        unitPrice: formData.usageFee.unitPrice || undefined,
        paymentMethod: formData.usageFee.paymentMethod || undefined,
      }
      : undefined,
    managementFee: formData.managementFee
      ? {
        calculationType: formData.managementFee.calculationType || undefined,
        taxType: formData.managementFee.taxType || undefined,
        billingType: formData.managementFee.billingType || undefined,
        billingYears: formData.managementFee.billingYears || undefined,
        area: formData.managementFee.area || undefined,
        billingMonth: formData.managementFee.billingMonth || undefined,
        managementFee: formData.managementFee.managementFee || undefined,
        unitPrice: formData.managementFee.unitPrice || undefined,
        lastBillingMonth: formData.managementFee.lastBillingMonth || undefined,
        paymentMethod: formData.managementFee.paymentMethod || undefined,
      }
      : undefined,
    gravestoneInfo: formData.gravestoneInfo
      ? {
        gravestoneBase: formData.gravestoneInfo.gravestoneBase || undefined,
        enclosurePosition: formData.gravestoneInfo.enclosurePosition || undefined,
        gravestoneDealer: formData.gravestoneInfo.gravestoneDealer || undefined,
        gravestoneType: formData.gravestoneInfo.gravestoneType || undefined,
        surroundingArea: formData.gravestoneInfo.surroundingArea || undefined,
        gravestoneCost: formData.gravestoneInfo.gravestoneCost || undefined,
        establishmentDeadline: formData.gravestoneInfo.establishmentDeadline || undefined,
        establishmentDate: formData.gravestoneInfo.establishmentDate || undefined,
      }
      : undefined,
    familyContacts: formData.familyContacts?.map((fc) => ({
      emergencyContactFlag: fc.emergencyContactFlag,
      name: fc.name,
      nameKana: fc.nameKana || undefined,
      birthDate: fc.birthDate || undefined,
      relationship: fc.relationship,
      postalCode: fc.postalCode || undefined,
      address: fc.address || undefined,
      phoneNumber: fc.phoneNumber || undefined,
      phoneNumber2: fc.phoneNumber2 || undefined,
      faxNumber: fc.faxNumber || undefined,
      email: fc.email || undefined,
      registeredAddress: fc.registeredAddress || undefined,
      mailingType: fc.mailingType || undefined,
      workCompanyName: fc.workCompanyName || undefined,
      workCompanyNameKana: fc.workCompanyNameKana || undefined,
      workAddress: fc.workAddress || undefined,
      workPhoneNumber: fc.workPhoneNumber || undefined,
      contactMethod: fc.contactMethod || undefined,
      notes: fc.notes || undefined,
    })),
    buriedPersons: formData.buriedPersons?.map((bp) => ({
      name: bp.name,
      nameKana: bp.nameKana || undefined,
      relationship: bp.relationship || undefined,
      birthDate: bp.birthDate || undefined,
      deathDate: bp.deathDate || undefined,
      age: bp.age || undefined,
      gender: bp.gender || undefined,
      burialDate: bp.burialDate || undefined,
      posthumousName: bp.posthumousName || undefined,
      reportDate: bp.reportDate || undefined,
      religion: bp.religion || undefined,
      validityPeriodYearsOverride: bp.validityPeriodYearsOverride ?? undefined,
      notes: bp.notes || undefined,
    })),
    constructionInfos: formData.constructionInfos?.map((ci) => ({
      constructionType: ci.constructionType || undefined,
      startDate: ci.startDate || undefined,
      completionDate: ci.completionDate || undefined,
      contractor: ci.contractor || undefined,
      supervisor: ci.supervisor || undefined,
      progress: ci.progress || undefined,
      workItem1: ci.workItem1 || undefined,
      workDate1: ci.workDate1 || undefined,
      workAmount1: ci.workAmount1 ?? undefined,
      workStatus1: ci.workStatus1 || undefined,
      workItem2: ci.workItem2 || undefined,
      workDate2: ci.workDate2 || undefined,
      workAmount2: ci.workAmount2 ?? undefined,
      workStatus2: ci.workStatus2 || undefined,
      permitNumber: ci.permitNumber || undefined,
      applicationDate: ci.applicationDate || undefined,
      permitDate: ci.permitDate || undefined,
      permitStatus: ci.permitStatus || undefined,
      paymentType1: ci.paymentType1 || undefined,
      paymentAmount1: ci.paymentAmount1 ?? undefined,
      paymentDate1: ci.paymentDate1 || undefined,
      paymentStatus1: ci.paymentStatus1 || undefined,
      paymentType2: ci.paymentType2 || undefined,
      paymentAmount2: ci.paymentAmount2 ?? undefined,
      paymentScheduledDate2: ci.paymentScheduledDate2 || undefined,
      paymentStatus2: ci.paymentStatus2 || undefined,
      scheduledEndDate: ci.scheduledEndDate || undefined,
      constructionContent: ci.constructionContent || undefined,
      notes: ci.notes || undefined,
    })),
    collectiveBurial: formData.collectiveBurial
      ? {
        burialCapacity: formData.collectiveBurial.burialCapacity,
        validityPeriodYears: formData.collectiveBurial.validityPeriodYears,
        billingAmount: formData.collectiveBurial.billingAmount || undefined,
        notes: formData.collectiveBurial.notes || undefined,
      }
      : undefined,
  };
}

/**
 * PlotUpdateFormData を UpdatePlotRequest に変換
 */
export function plotFormDataToUpdateRequest(formData: PlotUpdateFormData): UpdatePlotRequest {
  const request: UpdatePlotRequest = {};

  if (formData.physicalPlot) {
    request.physicalPlot = {
      plotNumber: formData.physicalPlot.plotNumber || undefined,
      areaName: formData.physicalPlot.areaName || undefined,
      areaSqm: formData.physicalPlot.areaSqm,
      notes: formData.physicalPlot.notes ?? undefined,
    };
  }

  if (formData.contractPlot) {
    request.contractPlot = {
      contractAreaSqm: formData.contractPlot.contractAreaSqm,
      // 空文字は明示 null で送り、backend に「クリア」と解釈させる（#304）。
      // `|| undefined` だと backend の `!== undefined` ガードで「変更なし」扱いになり、
      // 一度登録した値を UI から空にできなくなる。
      locationDescription: formData.contractPlot.locationDescription?.trim()
        ? formData.contractPlot.locationDescription
        : null,
    };
  }

  if (formData.saleContract) {
    request.saleContract = {
      contractDate: formData.saleContract.contractDate,
      price: formData.saleContract.price,
      paymentStatus: formData.saleContract.paymentStatus,
      reservationDate: formData.saleContract.reservationDate || undefined,
      acceptanceNumber: formData.saleContract.acceptanceNumber || undefined,
      acceptanceDate: formData.saleContract.acceptanceDate || undefined,
      staffInCharge: formData.saleContract.staffInCharge || undefined,
      agentName: formData.saleContract.agentName || undefined,
      permitDate: formData.saleContract.permitDate || undefined,
      permitNumber: formData.saleContract.permitNumber || undefined,
      startDate: formData.saleContract.startDate || undefined,
      notes: formData.saleContract.notes || undefined,
    };
  }

  if (formData.customer) {
    request.customer = {
      name: formData.customer.name,
      nameKana: formData.customer.nameKana,
      birthDate: formData.customer.birthDate || undefined,
      gender: formData.customer.gender || undefined,
      postalCode: formData.customer.postalCode,
      address: formData.customer.address,
      addressLine2: formData.customer.addressLine2 || undefined,
      registeredPostalCode: formData.customer.registeredPostalCode || undefined,
      registeredAddress: formData.customer.registeredAddress || undefined,
      phoneNumber: formData.customer.phoneNumber || null,
      faxNumber: formData.customer.faxNumber || undefined,
      email: formData.customer.email || undefined,
      bankName: formData.customer.bankName ?? null,
      branchName: formData.customer.branchName ?? null,
      accountType: formData.customer.accountType ?? null,
      accountNumber: formData.customer.accountNumber ?? null,
      accountHolder: formData.customer.accountHolder ?? null,
      notes: formData.customer.notes || undefined,
    };
  }

  // 申込者: 名前ありで送信、name 空 or applicant=null → null（既存解除）、undefined → 変更なし
  if (formData.applicant !== undefined) {
    if (formData.applicant && formData.applicant.name) {
      request.applicant = {
        name: formData.applicant.name,
        nameKana: formData.applicant.nameKana,
        birthDate: formData.applicant.birthDate || undefined,
        gender: formData.applicant.gender || undefined,
        postalCode: formData.applicant.postalCode || undefined,
        address: formData.applicant.address || undefined,
        addressLine2: formData.applicant.addressLine2 || undefined,
        registeredPostalCode: formData.applicant.registeredPostalCode || undefined,
        registeredAddress: formData.applicant.registeredAddress || undefined,
        phoneNumber: formData.applicant.phoneNumber || undefined,
        faxNumber: formData.applicant.faxNumber || undefined,
        email: formData.applicant.email || undefined,
        notes: formData.applicant.notes || undefined,
      };
    } else {
      request.applicant = null;
    }
  }

  // オプショナルセクション
  request.workInfo = formData.workInfo;
  request.usageFee = formData.usageFee;
  request.managementFee = formData.managementFee;
  request.gravestoneInfo = formData.gravestoneInfo;

  // 配列セクション
  if (formData.familyContacts) {
    request.familyContacts = formData.familyContacts.map((fc) => ({
      id: fc.id,
      emergencyContactFlag: fc.emergencyContactFlag,
      name: fc.name,
      nameKana: fc.nameKana || undefined,
      birthDate: fc.birthDate || undefined,
      relationship: fc.relationship,
      postalCode: fc.postalCode || undefined,
      address: fc.address || undefined,
      phoneNumber: fc.phoneNumber || undefined,
      phoneNumber2: fc.phoneNumber2 || undefined,
      faxNumber: fc.faxNumber || undefined,
      email: fc.email || undefined,
      registeredAddress: fc.registeredAddress || undefined,
      mailingType: fc.mailingType || undefined,
      workCompanyName: fc.workCompanyName || undefined,
      workCompanyNameKana: fc.workCompanyNameKana || undefined,
      workAddress: fc.workAddress || undefined,
      workPhoneNumber: fc.workPhoneNumber || undefined,
      contactMethod: fc.contactMethod || undefined,
      notes: fc.notes || undefined,
    }));
  }

  if (formData.buriedPersons) {
    request.buriedPersons = formData.buriedPersons.map((bp) => ({
      id: bp.id,
      name: bp.name,
      nameKana: bp.nameKana || undefined,
      relationship: bp.relationship || undefined,
      birthDate: bp.birthDate || undefined,
      deathDate: bp.deathDate || undefined,
      age: bp.age || undefined,
      gender: bp.gender || undefined,
      burialDate: bp.burialDate || undefined,
      posthumousName: bp.posthumousName || undefined,
      reportDate: bp.reportDate || undefined,
      religion: bp.religion || undefined,
      validityPeriodYearsOverride: bp.validityPeriodYearsOverride ?? undefined,
      notes: bp.notes || undefined,
    }));
  }

  if (formData.constructionInfos) {
    request.constructionInfos = formData.constructionInfos.map((ci) => ({
      id: ci.id,
      constructionType: ci.constructionType || undefined,
      startDate: ci.startDate || undefined,
      completionDate: ci.completionDate || undefined,
      contractor: ci.contractor || undefined,
      supervisor: ci.supervisor || undefined,
      progress: ci.progress || undefined,
      workItem1: ci.workItem1 || undefined,
      workDate1: ci.workDate1 || undefined,
      workAmount1: ci.workAmount1 ?? undefined,
      workStatus1: ci.workStatus1 || undefined,
      workItem2: ci.workItem2 || undefined,
      workDate2: ci.workDate2 || undefined,
      workAmount2: ci.workAmount2 ?? undefined,
      workStatus2: ci.workStatus2 || undefined,
      permitNumber: ci.permitNumber || undefined,
      applicationDate: ci.applicationDate || undefined,
      permitDate: ci.permitDate || undefined,
      permitStatus: ci.permitStatus || undefined,
      paymentType1: ci.paymentType1 || undefined,
      paymentAmount1: ci.paymentAmount1 ?? undefined,
      paymentDate1: ci.paymentDate1 || undefined,
      paymentStatus1: ci.paymentStatus1 || undefined,
      paymentType2: ci.paymentType2 || undefined,
      paymentAmount2: ci.paymentAmount2 ?? undefined,
      paymentScheduledDate2: ci.paymentScheduledDate2 || undefined,
      paymentStatus2: ci.paymentStatus2 || undefined,
      scheduledEndDate: ci.scheduledEndDate || undefined,
      constructionContent: ci.constructionContent || undefined,
      notes: ci.notes || undefined,
    }));
  }

  request.collectiveBurial = formData.collectiveBurial;

  return request;
}

// ===== PlotDetailResponse → PlotFormData 変換（編集時のデフォルト値生成） =====

/**
 * ISO日付文字列をYYYY-MM-DD形式に正規化
 * "2024-01-15T00:00:00.000Z" → "2024-01-15"
 */
function toDateOnly(date: string | null | undefined): string {
  if (!date) return '';
  return date.split('T')[0];
}

/**
 * PlotDetailResponse を PlotFormData に変換
 * 編集フォームの defaultValues として使用
 */
export function plotDetailToFormData(detail: PlotDetailResponse): PlotFormData {
  // Primary contractor を取得（最初の Contractor ロール、なければ最初のロール）
  const primaryRole = detail.roles.find((r) => r.role === ContractRole.Contractor) || detail.roles[0];
  const customer = primaryRole?.customer;
  // 申込者（契約者と別人の場合のみ採用。同一人物のときは contractor 1 件として扱う）
  const applicantRole = detail.roles.find((r) => r.role === ContractRole.Applicant);
  const applicantCustomer =
    applicantRole && applicantRole.customer.id !== primaryRole?.customer.id
      ? applicantRole.customer
      : null;

  return {
    physicalPlot: {
      plotNumber: detail.physicalPlot.plotNumber,
      areaName: detail.physicalPlot.areaName,
      areaSqm: detail.physicalPlot.areaSqm,
      notes: detail.physicalPlot.notes,
    },
    contractPlot: {
      contractAreaSqm: detail.contractAreaSqm,
      locationDescription: detail.locationDescription,
    },
    saleContract: {
      contractDate: toDateOnly(detail.contractDate),
      price: detail.price,
      contractStatus: detail.contractStatus ?? ContractStatus.Active,
      paymentStatus: detail.paymentStatus,
      reservationDate: toDateOnly(detail.reservationDate),
      acceptanceNumber: detail.acceptanceNumber || '',
      acceptanceDate: toDateOnly(detail.acceptanceDate),
      staffInCharge: detail.staffInCharge || null,
      agentName: resolveHandlerName(detail.agentName, detail.graveKind),
      permitDate: toDateOnly(detail.permitDate),
      permitNumber: detail.permitNumber || '',
      startDate: toDateOnly(detail.startDate),
      notes: detail.contractNotes,
    },
    customer: {
      name: customer?.name || '',
      nameKana: customer?.nameKana || '',
      birthDate: toDateOnly(customer?.birthDate) || null,
      gender: customer?.gender || null,
      postalCode: customer?.postalCode || '',
      address: customer?.address || '',
      addressLine2: customer?.addressLine2 || null,
      registeredPostalCode: customer?.registeredPostalCode || null,
      registeredAddress: customer?.registeredAddress || null,
      phoneNumber: customer?.phoneNumber || '',
      faxNumber: customer?.faxNumber || null,
      email: customer?.email || null,
      bankName: customer?.bankName || null,
      branchName: customer?.branchName || null,
      accountType: customer?.accountType || null,
      accountNumber: customer?.accountNumber || null,
      accountHolder: customer?.accountHolder || null,
      notes: customer?.notes || null,
      role: primaryRole?.role || ContractRole.Contractor,
    },
    applicant: applicantCustomer
      ? {
        name: applicantCustomer.name,
        nameKana: applicantCustomer.nameKana || '',
        birthDate: toDateOnly(applicantCustomer.birthDate) || null,
        gender: applicantCustomer.gender || null,
        postalCode: applicantCustomer.postalCode || null,
        address: applicantCustomer.address || null,
        addressLine2: applicantCustomer.addressLine2 || null,
        registeredPostalCode: applicantCustomer.registeredPostalCode || null,
        registeredAddress: applicantCustomer.registeredAddress || null,
        phoneNumber: applicantCustomer.phoneNumber || null,
        faxNumber: applicantCustomer.faxNumber || null,
        email: applicantCustomer.email || null,
        notes: applicantCustomer.notes || null,
      }
      : null,
    workInfo: customer?.workInfo
      ? {
        companyName: customer.workInfo.companyName || '',
        companyNameKana: customer.workInfo.companyNameKana || '',
        workAddress: customer.workInfo.workAddress || '',
        workPostalCode: customer.workInfo.workPostalCode || '',
        workPhoneNumber: customer.workInfo.workPhoneNumber || '',
        dmSetting: customer.workInfo.dmSetting || DmSetting.Allow,
        addressType: customer.workInfo.addressType || AddressType.Home,
        notes: customer.workInfo.notes || null,
      }
      : null,
    usageFee: detail.usageFee
      ? {
        calculationType: detail.usageFee.calculationType,
        taxType: detail.usageFee.taxType,
        billingType: detail.usageFee.billingType,
        billingYears: detail.usageFee.billingYears,
        usageFee: detail.usageFee.usageFee,
        area: detail.usageFee.area,
        unitPrice: detail.usageFee.unitPrice,
        paymentMethod: detail.usageFee.paymentMethod,
      }
      : null,
    managementFee: detail.managementFee
      ? {
        calculationType: detail.managementFee.calculationType,
        taxType: detail.managementFee.taxType,
        billingType: detail.managementFee.billingType,
        billingYears: detail.managementFee.billingYears,
        area: detail.managementFee.area,
        billingMonth: detail.managementFee.billingMonth,
        managementFee: detail.managementFee.managementFee,
        unitPrice: detail.managementFee.unitPrice,
        lastBillingMonth: normalizeLastBillingMonth(detail.managementFee.lastBillingMonth),
        paymentMethod: detail.managementFee.paymentMethod,
      }
      : null,
    gravestoneInfo: detail.gravestoneInfo
      ? {
        gravestoneBase: detail.gravestoneInfo.gravestoneBase,
        enclosurePosition: detail.gravestoneInfo.enclosurePosition,
        gravestoneDealer: detail.gravestoneInfo.gravestoneDealer,
        gravestoneType: detail.gravestoneInfo.gravestoneType,
        surroundingArea: detail.gravestoneInfo.surroundingArea,
        gravestoneCost: detail.gravestoneInfo.gravestoneCost,
        establishmentDeadline: toDateOnly(detail.gravestoneInfo.establishmentDeadline),
        establishmentDate: toDateOnly(detail.gravestoneInfo.establishmentDate),
      }
      : null,
    familyContacts: detail.familyContacts.map((fc) => ({
      id: fc.id,
      emergencyContactFlag: false,
      name: fc.name,
      nameKana: fc.nameKana || null,
      birthDate: toDateOnly(fc.birthDate) || null,
      relationship: fc.relationship,
      postalCode: fc.postalCode,
      address: fc.address,
      phoneNumber: fc.phoneNumber,
      phoneNumber2: fc.phoneNumber2 || null,
      faxNumber: fc.faxNumber,
      email: fc.email,
      registeredAddress: fc.registeredAddress,
      mailingType: fc.mailingType,
      workCompanyName: fc.workCompanyName || null,
      workCompanyNameKana: fc.workCompanyNameKana || null,
      workAddress: fc.workAddress || null,
      workPhoneNumber: fc.workPhoneNumber || null,
      contactMethod: fc.contactMethod || null,
      notes: fc.notes,
    })),
    buriedPersons: detail.buriedPersons.map((bp) => ({
      id: bp.id,
      name: bp.name,
      nameKana: bp.nameKana,
      relationship: bp.relationship,
      birthDate: toDateOnly(bp.birthDate) || null,
      deathDate: toDateOnly(bp.deathDate) || null,
      age: bp.age,
      gender: bp.gender,
      burialDate: toDateOnly(bp.burialDate) || null,
      posthumousName: bp.posthumousName || null,
      reportDate: toDateOnly(bp.reportDate) || null,
      religion: bp.religion || null,
      validityPeriodYearsOverride: bp.validityPeriodYearsOverride ?? null,
      notes: bp.notes,
    })),
    constructionInfos: detail.constructionInfos.map((ci) => ({
      id: ci.id,
      constructionType: ci.constructionType,
      startDate: toDateOnly(ci.startDate),
      completionDate: toDateOnly(ci.completionDate),
      contractor: ci.contractor,
      supervisor: ci.supervisor,
      progress: ci.progress,
      workItem1: ci.workItem1,
      workDate1: toDateOnly(ci.workDate1),
      workAmount1: ci.workAmount1,
      workStatus1: ci.workStatus1,
      workItem2: ci.workItem2,
      workDate2: toDateOnly(ci.workDate2),
      workAmount2: ci.workAmount2,
      workStatus2: ci.workStatus2,
      permitNumber: ci.permitNumber,
      applicationDate: toDateOnly(ci.applicationDate),
      permitDate: toDateOnly(ci.permitDate),
      permitStatus: ci.permitStatus,
      paymentType1: ci.paymentType1,
      paymentAmount1: ci.paymentAmount1,
      paymentDate1: toDateOnly(ci.paymentDate1),
      paymentStatus1: ci.paymentStatus1,
      paymentType2: ci.paymentType2,
      paymentAmount2: ci.paymentAmount2,
      paymentScheduledDate2: toDateOnly(ci.paymentScheduledDate2),
      paymentStatus2: ci.paymentStatus2,
      scheduledEndDate: toDateOnly(ci.scheduledEndDate),
      constructionContent: ci.constructionContent,
      notes: ci.notes,
    })),
    collectiveBurial: detail.collectiveBurial
      ? {
        burialCapacity: detail.collectiveBurial.burialCapacity,
        validityPeriodYears: detail.collectiveBurial.validityPeriodYears,
        billingAmount: detail.collectiveBurial.billingAmount,
        notes: detail.collectiveBurial.notes,
      }
      : null,
  };
}
