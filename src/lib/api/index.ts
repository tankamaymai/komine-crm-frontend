/**
 * API統合レイヤーのエントリーポイント
 */

// 型のエクスポート
export * from './types';

// クライアントユーティリティのエクスポート
export {
  API_CONFIG,
  shouldUseMockData,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  getTokenExpiresAt,
  setTokenExpiresAt,
  clearTokenExpiresAt,
  clearAllTokens,
  isTokenExpiringSoon,
  isTokenExpired,
} from './client';

// 認証APIのエクスポート
export {
  login,
  logout,
  getCurrentUser,
  changePassword,
  updateProfile,
  isAuthenticated,
  refreshAccessToken,
  initializeTokenRefresh,
} from './auth';

// 区画APIのエクスポート
export {
  getPlots,
  getPlotById,
  createPlot,
  updatePlot,
  deletePlot,
  getPrimaryCustomer,
  getPlotDisplayStatus,
  sortPlotsByNumber,
  sortPlotsByCustomerKana,
} from './plots';
export type {
  PlotSearchParams,
  PlotListResult,
} from './plots';

// マスタAPIのエクスポート
export {
  getAllMasters,
  getCemeteryTypes,
  getPaymentMethods,
  getTaxTypes,
  getCalcTypes,
  getBillingTypes,
  getRecipientTypes,
  getConstructionTypes,
  getSectionNames,
  getRelationships,
  getContractors,
  getDirections,
  getPositions,
  getValidityPeriods,
  createMasterItem,
  updateMasterItem,
  deleteMasterItem,
} from './masters';
export type { MasterItem, TaxTypeMasterItem, SectionNameMasterItem, AllMastersData, MasterType, CreateMasterRequest, UpdateMasterRequest } from './masters';

// スタッフAPIのエクスポート
export {
  getStaffList,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffActive,
  resendInvitation,
  ROLE_LABELS,
} from './staff';
export type {
  StaffRole,
  StaffListItem,
  StaffDetail,
  StaffListResponse,
  CreateStaffRequest,
  UpdateStaffRequest,
  ToggleActiveResponse,
  ResendInvitationResponse,
  StaffSearchParams,
} from './staff';

// 合祀管理APIのエクスポート
export {
  getCollectiveBurialList,
  getCollectiveBurialById,
  createCollectiveBurial,
  updateCollectiveBurial,
  updateBillingStatus,
  syncBurialCount,
  deleteCollectiveBurial,
  getCollectiveBurialStatsByYear,
  BILLING_STATUS_LABELS,
  BILLING_STATUS_COLORS,
  // notes変換ヘルパー
  serializeNotesData,
  parseNotesData,
} from './collective-burials';
export type {
  BillingStatus,
  BuriedPersonSummary,
  BuriedPersonDetail,
  ApplicantInfo,
  CollectiveBurialListItem,
  CollectiveBurialDetail,
  CollectiveBurialListResponse,
  CreateCollectiveBurialRequest,
  UpdateCollectiveBurialRequest,
  UpdateBillingStatusRequest,
  SyncBurialCountResponse,
  YearlyStats,
  CollectiveBurialSearchParams,
  // notes統合用型定義
  CeremonyInfo,
  DocumentInfo,
  NotesData,
} from './collective-burials';

// 書類管理APIのエクスポート
export {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentFile,
  getDocumentDownloadUrl,
  getDocumentFile,
  regenerateDocumentPdf,
  generatePdf,
  downloadPdfFromBase64,
  downloadFileBlob,
  canRegenerateDocument,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from './documents';
export type {
  DocumentType,
  DocumentStatus,
  DocumentListItem,
  DocumentDetail,
  DocumentListResponse,
  DocumentSearchParams,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DownloadUrlResponse,
  DocumentFileResponse,
  GeneratePdfRequest,
  GeneratePdfResponse,
  InvoiceTemplateData,
  PostcardTemplateData,
} from './documents';

// ゆうちょ連携APIのエクスポート
export { getYuchoBilling, exportYuchoCsv, downloadBlob } from './yucho';
export type {
  YuchoCategory,
  YuchoStatus,
  YuchoBillingInfo,
  YuchoBillingItem,
  YuchoBillingSummary,
  YuchoBillingResponse,
  YuchoBillingParams,
  YuchoExportParams,
} from './yucho';

// 請求 (Billing) APIのエクスポート
export {
  getBillings,
  getBillingById,
  createBilling,
  updateBilling,
  deleteBilling,
  getUnpaidBillings,
  BILLING_CATEGORY_LABELS,
  BILLING_RECORD_STATUS_LABELS,
} from './billings';

// 入金 (Payment) APIのエクスポート
export {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  settleRemaining,
} from './payments';

// 区画在庫管理APIのエクスポート
export {
  getInventorySummary,
  getInventoryPeriods,
  getInventorySections,
  getInventoryAreas,
} from './plot-inventory';
export type {
  PlotStatus,
  SectionSortKey,
  AreaSortKey,
  SortOrder,
  InventorySummary,
  PeriodSummary,
  SectionInventoryItem,
  AreaInventoryItem,
  InventoryPeriodsResponse,
  InventorySectionsResponse,
  InventoryAreasResponse,
  InventorySectionsParams,
  InventoryAreasParams,
} from './plot-inventory';
