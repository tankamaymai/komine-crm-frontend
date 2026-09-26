'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDocumentDetail,
  useDocumentMutations,
  DocumentDetail,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
} from '@/hooks/useDocuments';
import { getContractorPlotNumber } from '@/lib/api/plots';
import { downloadPdfFromBase64, printPdfFromBase64 } from '@/lib/api/documents';
import {
  ArrowLeft,
  Save,
  FileText,
  RefreshCw,
  Download,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { TemplateId } from './document-template-gallery';
import {
  InvoiceLivePreview,
  DocumentTextStyleToolbar,
} from './document-template-preview';
import { PermitLivePreview } from './permit-live-preview';
import { FreeformDocumentEditor } from './freeform-document-editor';
import {
  parseFreeformBlocks,
  saveFreeformTemplate,
  type FreeformBlock,
  type SavedFreeformTemplate,
} from '@/lib/freeform-templates';
import { PAPER_SIZES, paperSizeOf, type PaperSizeId } from '@/lib/paper-sizes';
import { PaymentGuideLivePreview } from './payment-guide-preview';
import {
  PostcardDocumentEditor,
  selectedPostcardPiece,
  updatePostcardPiece,
} from './postcard-document-editor';
import {
  normalizeTextStylePreset,
  type DocumentTextStylePresetId,
} from './document-text-style-presets';
import {
  PlotDetailResponse,
  ContractRole,
  PERMIT_CERTIFICATE_PAGES,
  ENVELOPE_LETTER_PAGES,
  ENVELOPE_BASE_PAGES,
  splitPermitAddressAtChome,
  splitPostalCodeDigits,
} from '@komine/types';

type DocumentType =
  | 'invoice'
  | 'postcard'
  | 'contract'
  | 'permit'
  | 'envelope_letter'
  | 'envelope_base'
  | 'other';
type DocumentStatus = 'draft' | 'generated' | 'sent' | 'archived';

const PDF_TEMPLATE_IDS = new Set<string>([
  'invoice',
  'postcard',
  'permit',
  'payment-guide',
  'envelope-letter',
  'envelope-base',
]);

function templateIdToDocumentType(id: TemplateId): DocumentType {
  if (id === 'payment-guide') return 'other';
  if (id === 'envelope-letter') return 'envelope_letter';
  if (id === 'envelope-base') return 'envelope_base';
  return id as DocumentType;
}

interface InvoiceItem {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

interface DocumentFormProps {
  documentId?: string;
  customerId?: string;
  templateId?: TemplateId;
  /** 区画詳細データ（自動挿入用） */
  plotDetail?: PlotDetailResponse;
  onBack: () => void;
  onSaved: (doc: DocumentDetail) => void;
  /** 保存済み書類を消す。編集中だけ出す */
  onDelete?: () => void;
  /** 保存した形から作るとき、その文字の並び */
  savedFreeform?: SavedFreeformTemplate | null;
}

/**
 * 区画詳細から契約者（applicant or contractor）を取得
 */
function getPrimaryCustomer(plotDetail: PlotDetailResponse) {
  const contractor = plotDetail.roles.find(
    (r) => r.role === ContractRole.Contractor
  );
  const applicant = plotDetail.roles.find(
    (r) => r.role === ContractRole.Applicant
  );
  return contractor?.customer || applicant?.customer || plotDetail.roles[0]?.customer || null;
}

/**
 * 区画詳細からテンプレートデータを自動生成
 */
function buildAutoFillData(
  plotDetail: PlotDetailResponse,
  templateType: TemplateId
): { templateData: Record<string, string>; invoiceItems: InvoiceItem[] } {
  const customer = getPrimaryCustomer(plotDetail);
  const plot = plotDetail.physicalPlot;
  const customerName = customer?.name || '';
  const customerAddress = [
    customer?.postalCode ? `〒${customer.postalCode}` : '',
    customer?.address || '',
    customer?.addressLine2 || '',
  ]
    .filter(Boolean)
    .join(' ');
  const today = new Date().toISOString().slice(0, 10);

  const base: Record<string, string> = {};
  let items: InvoiceItem[] = [];

  switch (templateType) {
    case 'invoice': {
      base.customerName = customerName;
      base.customerAddress = customerAddress;
      base.yearCount = '1';
      const now = new Date();
      const year = now.getFullYear();
      base.nextNoticeDate = `${year}年12月31日`;
      base.seasonGreeting = getSeasonGreetingByMonth(now.getMonth() + 1);

      // 推定金額：管理費 + 使用料 + 未収金
      let amount = 0;
      if (plotDetail.managementFee?.managementFee) {
        amount += parseFloat(plotDetail.managementFee.managementFee) || 0;
      }
      if (plotDetail.usageFee?.usageFee) {
        amount += parseFloat(plotDetail.usageFee.usageFee) || 0;
      }
      if (plotDetail.uncollectedAmount > 0) {
        amount += plotDetail.uncollectedAmount;
      }
      base.amount = amount > 0 ? String(amount) : '';

      items = [];
      break;
    }
    case 'postcard': {
      base.recipientPostalCode = customer?.postalCode || '';
      base.recipientAddress = customer?.address || '';
      base.recipientName = customerName;
      base.senderPostalCode = '';
      base.senderAddress = '';
      base.senderName = '小峰霊園管理事務所';
      base.message = '';
      break;
    }
    case 'contract': {
      base.contractNumber = `CON-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      base.contractDate = plotDetail.contractDate || today;
      base.contractorName = customerName;
      base.plotNumber = `${plot.areaName} ${plot.displayNumber || plot.plotNumber}`;
      base.terms = '';
      break;
    }
    case 'permit': {
      const now = new Date();
      base.permitNumber = plotDetail.permitNumber || '';
      base.permitType = '普通墓地';
      base.plotNumber = `${plot.areaName} ${plot.displayNumber || plot.plotNumber}`;
      if (plot.areaSqm) base.area = String(plot.areaSqm);
      base.issueYear = String(now.getFullYear());
      base.issueMonth = String(now.getMonth() + 1);
      base.issueDay = String(now.getDate());
      base.applicantName = customerName;
      {
        const registeredSplit = splitPermitAddressAtChome(
          customer?.registeredAddress || ''
        );
        base.registeredAddress = registeredSplit.line1;
        base.registeredAddress2 = registeredSplit.line2;
      }
      {
        const currentFull = [customer?.address, customer?.addressLine2]
          .filter(Boolean)
          .join(' ');
        const currentSplit = splitPermitAddressAtChome(currentFull);
        base.currentAddress = currentSplit.line1;
        base.currentAddress2 = currentSplit.line2;
      }
      break;
    }
    case 'envelope-letter':
    case 'envelope-base': {
      base.recipientName = customerName ? `${customerName} 様` : '';
      const postalCode = customer?.postalCode || '';
      base.recipientPostalCode = postalCode;
      splitPostalCodeDigits(postalCode).forEach((digit, i) => {
        base[`recipientPostalDigit${i + 1}`] = digit;
      });
      base.recipientAddress = customer?.address || '';
      base.recipientAddress2 = customer?.addressLine2 || '';
      break;
    }
    default:
      break;
  }

  return { templateData: base, invoiceItems: items };
}

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  invoice: '護持費のお知らせ',
  postcard: 'はがき',
  contract: '契約書',
  permit: '許可証',
  'envelope-letter': '封筒書',
  'envelope-base': '封筒大',
  'payment-guide': 'お支払い方法のご案内',
  other: 'その他',
};

function getSeasonGreetingByMonth(month: number): string {
  const table: Record<number, string> = {
    1: '厳寒の候',
    2: '晩冬の候',
    3: '早春の候',
    4: '春暖の候',
    5: '新緑の候',
    6: '初夏の候',
    7: '盛夏の候',
    8: '残暑の候',
    9: '初秋の候',
    10: '秋涼の候',
    11: '晩秋の候',
    12: '師走の候',
  };
  return table[month] ?? '時下';
}

export function DocumentForm({
  documentId,
  customerId: initialCustomerId,
  templateId,
  plotDetail,
  onBack,
  onSaved,
  onDelete,
  savedFreeform,
}: DocumentFormProps) {
  const isEditMode = !!documentId;
  const { data: existingData, isLoading: isLoadingDetail } = useDocumentDetail(
    documentId || null
  );
  const {
    create,
    update,
    generate,
    isLoading: isMutating,
    error: mutationError,
  } = useDocumentMutations();

  const [formData, setFormData] = useState<{
    name: string;
    type: DocumentType;
    status: DocumentStatus;
    description: string;
    notes: string;
    contractPlotId: string;
    customerId: string;
    templateType: string;
  }>({
    name: '',
    type: templateId ? templateIdToDocumentType(templateId) : 'invoice',
    status: 'draft',
    description: '',
    notes: '',
    contractPlotId: '',
    customerId: initialCustomerId || '',
    templateType:
      templateId && PDF_TEMPLATE_IDS.has(templateId) ? templateId : '',
  });

  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { description: '', quantity: '1', unitPrice: '', amount: '0' },
  ]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [freeformSelectedId, setFreeformSelectedId] = useState<string | null>(null);
  const [postcardSelectedId, setPostcardSelectedId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (existingData) {
      setFormData({
        name: existingData.name,
        type: existingData.type,
        status: existingData.status,
        description: existingData.description || '',
        notes: existingData.notes || '',
        contractPlotId: existingData.contractPlotId || '',
        customerId: existingData.customerId || '',
        templateType: existingData.templateType || '',
      });
      if (existingData.templateData) {
        const data: Record<string, string> = {};
        Object.entries(existingData.templateData).forEach(([key, value]) => {
          if (key === 'items') return;
          if (key === 'freeText') {
            setFreeText(String(value));
            return;
          }
          data[key] = typeof value === 'string' ? value : JSON.stringify(value);
        });
        setTemplateData(data);

        const items = existingData.templateData.items;
        if (Array.isArray(items) && items.length > 0) {
          setInvoiceItems(
            items.map((it: Record<string, unknown>) => ({
              description: String(it.description || ''),
              quantity: String(it.quantity || '1'),
              unitPrice: String(it.unitPrice || ''),
              amount: String(it.amount || '0'),
            }))
          );
        }
      }
    }
  }, [existingData]);

  // テンプレート選択時 + 区画詳細からの自動挿入
  useEffect(() => {
    if (!templateId || isEditMode) return;

    const today = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const customerName = plotDetail
      ? getPrimaryCustomer(plotDetail)?.name || ''
      : '';
    const plotNumber = plotDetail
      ? `${plotDetail.physicalPlot.areaName} ${plotDetail.physicalPlot.displayNumber || plotDetail.physicalPlot.plotNumber}`
      : '';
    const nameSuffix = customerName
      ? `_${customerName}_${plotNumber}`
      : '';

    const docType: DocumentType = templateId
      ? templateIdToDocumentType(templateId)
      : 'invoice';

    setFormData((prev) => ({
      ...prev,
      name: `${TEMPLATE_LABELS[templateId]}${nameSuffix}_${today}`,
      type: docType,
      templateType: PDF_TEMPLATE_IDS.has(templateId) ? templateId : '',
      contractPlotId: plotDetail?.id || prev.contractPlotId,
    }));

    // 区画詳細がある場合はテンプレートデータを自動挿入
    if (plotDetail) {
      const autoFill = buildAutoFillData(plotDetail, templateId);
      setTemplateData(autoFill.templateData);
      setInvoiceItems(autoFill.invoiceItems);
    }

    // 許可証は、この人が契約中の区画を1枚にまとめる
    const contractorId =
      templateId === 'permit' && plotDetail
        ? getPrimaryCustomer(plotDetail)?.id
        : undefined;
    if (!contractorId) return;

    let cancelled = false;
    void getContractorPlotNumber(contractorId).then((response) => {
      if (cancelled || !response.success) return;
      const plotNumber = response.data.plotNumber.trim();
      if (!plotNumber) return;
      setTemplateData((prev) => ({ ...prev, plotNumber }));
    });
    return () => {
      cancelled = true;
    };
  }, [templateId, isEditMode, plotDetail]);

  useEffect(() => {
    if (!savedFreeform) return;
    const today = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    setTemplateData((prev) => ({
      ...prev,
      freeformBlocks: JSON.stringify(savedFreeform.blocks),
    }));
    setFormData((prev) => ({
      ...prev,
      name: `${savedFreeform.name}_${today}`,
    }));
  }, [savedFreeform]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTemplateDataChange = (key: string, value: string) => {
    setTemplateData((prev) => ({ ...prev, [key]: value }));
  };

  const handleEnvelopePostalCodeChange = (value: string) => {
    const digits = splitPostalCodeDigits(value);
    setTemplateData((prev) => {
      const next: Record<string, string> = {
        ...prev,
        recipientPostalCode: value,
      };
      digits.forEach((digit, i) => {
        next[`recipientPostalDigit${i + 1}`] = digit;
      });
      return next;
    });
  };

  const handleTextStyleChange = (id: DocumentTextStylePresetId) => {
    handleTemplateDataChange('textStylePreset', id);
  };

  const textStylePreset = normalizeTextStylePreset(
    templateData.textStylePreset
  );

  // 旧請求書互換：既存データ（items あり）を保存するための集計のみ保持
  const subtotal = invoiceItems.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );
  const taxRate = 0.1;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  const buildTemplateDataPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = { ...templateData };
    if (formData.templateType === 'invoice') {
      // 護持費のお知らせレイアウトに対応するため、金額は amount（数値）として送信
      const amountRaw = String(templateData.amount ?? '').trim();
      const amountNum = parseFloat(amountRaw);
      if (Number.isFinite(amountNum)) {
        payload.amount = amountNum;
      } else {
        delete payload.amount;
      }
      // 旧請求書互換：items があれば送るが、無ければ送らない
      if (invoiceItems.some((it) => it.description.trim() !== '')) {
        payload.items = invoiceItems.map((it) => ({
          description: it.description,
          quantity: parseFloat(it.quantity) || 0,
          unitPrice: parseFloat(it.unitPrice) || 0,
          amount: parseFloat(it.amount) || 0,
        }));
        payload.subtotal = subtotal;
        payload.tax = tax;
        payload.total = total;
      }
    }
    if (freeText.trim()) {
      payload.freeText = freeText;
    }
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('書類名を入力してください');
      return;
    }

    const tPayload = buildTemplateDataPayload();
    let result: DocumentDetail | null = null;

    if (isEditMode && documentId) {
      const updateData: UpdateDocumentRequest = {
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        templateData: Object.keys(tPayload).length > 0 ? tPayload : undefined,
      };
      result = await update(documentId, updateData);
    } else {
      const createData: CreateDocumentRequest = {
        name: formData.name,
        type: formData.type,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        contractPlotId: formData.contractPlotId || undefined,
        customerId: formData.customerId || undefined,
        templateType: formData.templateType || undefined,
        templateData: Object.keys(tPayload).length > 0 ? tPayload : undefined,
      };
      result = await create(createData);
    }

    if (result) {
      toast.success(
        isEditMode
          ? '書類の変更を保存しました。'
          : '書類を保存しました。この画面で直し直せます。'
      );
      onSaved(result);
    } else if (mutationError) {
      toast.error(mutationError);
    }
  };

  const handleGeneratePdf = async () => {
    if (!formData.templateType) {
      toast.error('テンプレート種類を選択してください');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const tPayload = buildTemplateDataPayload();
      const result = await generate({
        templateType: formData.templateType as
          | 'invoice'
          | 'postcard'
          | 'permit'
          | 'envelope-letter'
          | 'envelope-base'
          | 'payment-guide',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        templateData: tPayload as any,
        documentId: documentId,
        name: formData.name || undefined,
      });

      if (result) {
        downloadPdfFromBase64(result.pdf, `${formData.name || 'document'}.pdf`);
        toast.success(
          `PDF生成完了 (${(result.fileSize / 1024).toFixed(1)} KB)`
        );
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintTextOnly = async (kind: 'permit' | 'envelope-letter') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('印刷用の新しい窓を開けませんでした。ポップアップを止めていないか確認してください。');
      return;
    }
    const paperName = kind === 'permit' ? '台紙' : '封筒';
    printWindow.document.title = `${paperName}に文字だけ印刷`;
    printWindow.document.body.innerHTML =
      '<p style="font-family:sans-serif">文字を準備しています…</p>';

    setIsGeneratingPdf(true);
    try {
      const tPayload = buildTemplateDataPayload();
      const result = await generate({
        templateType: kind,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        templateData: tPayload as any,
        documentId: documentId,
        name: formData.name || undefined,
        textOnly: true,
      });

      if (!result) {
        printWindow.close();
        return;
      }

      printPdfFromBase64(result.pdf, printWindow);
      toast.success(
        `印刷の画面を開きました。拡大縮小は「そのまま」にして、${paperName}をセットしてください。`
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const templateType = formData.templateType || templateId || '';
  const showInvoiceFields =
    templateType === 'invoice' || formData.type === 'invoice';
  const showPostcardFields =
    templateType === 'postcard' || formData.type === 'postcard';
  const showContractFields = formData.type === 'contract';
  const isPermitTemplate =
    templateType === 'permit' || formData.type === 'permit';
  const isEnvelopeLetterTemplate =
    templateType === 'envelope-letter' ||
    formData.type === 'envelope_letter';
  const isEnvelopeBaseTemplate =
    templateType === 'envelope-base' || formData.type === 'envelope_base';
  const isPaymentGuideTemplate = templateType === 'payment-guide';
  const showPermitCertificateForm = isPermitTemplate;
  const showEnvelopeRecipientForm =
    isEnvelopeLetterTemplate || isEnvelopeBaseTemplate;
  const showPermitStyleLivePreview =
    isPermitTemplate || isEnvelopeLetterTemplate || isEnvelopeBaseTemplate;
  const showPdfTemplatePreview =
    showInvoiceFields ||
    showPostcardFields ||
    showPermitStyleLivePreview ||
    isPaymentGuideTemplate;
  const isFreeformTemplate =
    templateId === 'other' ||
    (formData.type === 'other' && !isPaymentGuideTemplate);
  const showPaperPreview = showPdfTemplatePreview || isFreeformTemplate;

  if (isEditMode && isLoadingDetail) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-matsu" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <h3 className="font-mincho text-lg md:text-xl font-semibold text-sumi truncate">
            {isEditMode
              ? '書類編集'
              : savedFreeform
                ? `${savedFreeform.name}を作成`
                : templateId
                  ? `${TEMPLATE_LABELS[templateId]}を作成`
                  : '新規書類作成'}
          </h3>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="submit"
            form="document-form"
            size="sm"
            className="bg-matsu hover:bg-matsu-dark text-white"
            disabled={isMutating}
          >
            {isMutating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? '変更を保存' : '書類を保存'}
          </Button>
          {isEditMode && onDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-beni hover:text-beni-dark hover:bg-beni-50 border-beni-200"
              onClick={onDelete}
            >
              削除
            </Button>
          )}
          {isPermitTemplate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrintTextOnly('permit')}
              disabled={isGeneratingPdf}
              className="border-matsu/40 text-matsu-dark hover:bg-matsu/5"
            >
              {isGeneratingPdf ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              台紙に文字だけ印刷
            </Button>
          )}
          {isEnvelopeLetterTemplate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrintTextOnly('envelope-letter')}
              disabled={isGeneratingPdf}
              className="border-matsu/40 text-matsu-dark hover:bg-matsu/5"
            >
              {isGeneratingPdf ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              封筒に文字だけ印刷
            </Button>
          )}
          {showPdfTemplatePreview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="border-ai/40 text-ai hover:bg-ai/5"
            >
              {isGeneratingPdf ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF生成・ダウンロード
            </Button>
          )}
        </div>
      </div>

      <form
        id="document-form"
        onSubmit={handleSubmit}
        className={showPaperPreview ? '' : 'space-y-6'}
      >
        <div
          className={
            showPaperPreview
              ? 'flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(360px,1.35fr)_minmax(260px,380px)] xl:gap-8 xl:items-start'
              : 'space-y-6'
          }
        >
          {showPaperPreview && (
            <aside className="order-first xl:order-none space-y-3 xl:sticky xl:top-4 xl:self-start min-w-0">
              <div>
                <h3 className="font-mincho text-base font-semibold text-sumi">
                  プレビューで編集
                </h3>
                <p className="text-xs text-hai mt-1 leading-relaxed">
                  {isFreeformTemplate
                    ? '左の白紙に文字を足します。位置や書き方は右側で決めます。'
                    : showPostcardFields
                      ? 'はがきの表と裏です。紙は実物と同じ縦長です。文字を押すと、右側でその文字だけ直せます。'
                    : isPermitTemplate
                    ? '許可証（1枚）の台紙の上に、入力欄を置いています。上の「書類を保存」で、この人の書類として残せます。PDFの保存は台紙の絵も一緒に残します。印刷は、台紙の上に入れた文字だけを重ねます。'
                    : isEnvelopeLetterTemplate
                      ? '封筒の表だけです。右上の郵便番号の下に住所、真ん中に名前を縦書きで印字します。'
                      : isEnvelopeBaseTemplate
                        ? '封筒大（大型封筒）1枚のテンプレートです。'
                        : isPaymentGuideTemplate
                          ? '振込先や代表者名など、変更があれば直接編集できます。大半の文面は既定のままで問題ありません。'
                          : '右の「文字の見た目」で書体のバランスを変えられます。本文は左の紙の上で直接直せます。'}
                </p>
              </div>
              <div className="rounded-elegant-lg border border-gin bg-kinari-50/90 p-3 shadow-inner">
                {showInvoiceFields && (
                  <InvoiceLivePreview
                    templateData={templateData}
                    onTemplateDataChange={handleTemplateDataChange}
                    textStylePreset={textStylePreset}
                    onTextStyleChange={handleTextStyleChange}
                  />
                )}
                {showPostcardFields && (
                  <PostcardDocumentEditor
                    templateData={templateData}
                    onTemplateDataChange={handleTemplateDataChange}
                    selectedId={postcardSelectedId}
                    onSelect={setPostcardSelectedId}
                  />
                )}
                {showPermitStyleLivePreview && (
                  <PermitLivePreview
                    pages={
                      isPermitTemplate
                        ? PERMIT_CERTIFICATE_PAGES
                        : isEnvelopeLetterTemplate
                          ? ENVELOPE_LETTER_PAGES
                          : ENVELOPE_BASE_PAGES
                    }
                    templateData={templateData}
                    onTemplateDataChange={handleTemplateDataChange}
                  />
                )}
                {isFreeformTemplate && (
                  <FreeformDocumentEditor
                    blocks={parseFreeformBlocks(templateData.freeformBlocks)}
                    selectedId={freeformSelectedId}
                    paperSize={templateData.paperSize}
                    onSelect={setFreeformSelectedId}
                    onChange={(blocks) =>
                      handleTemplateDataChange('freeformBlocks', JSON.stringify(blocks))
                    }
                  />
                )}
                {isPaymentGuideTemplate && (
                  <PaymentGuideLivePreview
                    templateData={templateData}
                    onTemplateDataChange={handleTemplateDataChange}
                    textStylePreset={textStylePreset}
                    onTextStyleChange={handleTextStyleChange}
                  />
                )}
              </div>
            </aside>
          )}

          <div className="min-w-0 space-y-6 order-last xl:order-none">
        {(showInvoiceFields || isPaymentGuideTemplate || isFreeformTemplate) && (
          <div className="rounded-elegant-lg border border-gin bg-white p-4">
            <h4 className="font-mincho text-base font-semibold text-sumi">紙の大きさ</h4>
            <p className="mt-1 text-xs text-hai">
              画面の紙と、PDFにしたときの紙の大きさが変わります。最初はA4（普通の紙）です。小さい紙を選ぶと、文字を縮めて1枚に収めます。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PAPER_SIZES.map((size) => {
                const selected = paperSizeOf(templateData.paperSize).id === size.id;
                return (
                  <Button
                    key={size.id}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    size="sm"
                    className={selected ? 'bg-matsu text-white hover:bg-matsu-dark' : ''}
                    onClick={() =>
                      handleTemplateDataChange('paperSize', size.id as PaperSizeId)
                    }
                  >
                    {size.label}
                    <span className="ml-1 text-[10px] opacity-80">{size.hint}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
        {(showInvoiceFields || isPaymentGuideTemplate) && (
          <DocumentTextStyleToolbar
            value={textStylePreset}
            onChange={handleTextStyleChange}
          />
        )}
        {isFreeformTemplate && (
          <FreeformSideTools
            blocks={parseFreeformBlocks(templateData.freeformBlocks)}
            selectedId={freeformSelectedId}
            templateName={templateName}
            onTemplateName={setTemplateName}
            onSelect={setFreeformSelectedId}
            onChange={(blocks) =>
              handleTemplateDataChange('freeformBlocks', JSON.stringify(blocks))
            }
          />
        )}
        {showPostcardFields && (
          <PostcardPieceTools
            templateData={templateData}
            selectedId={postcardSelectedId}
            onTemplateDataChange={handleTemplateDataChange}
          />
        )}
        <details className="group rounded-elegant-lg border border-gin bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 md:px-6 [&::-webkit-details-marker]:hidden">
            <span className="border-l-4 border-l-matsu pl-3 font-mincho text-base font-semibold text-sumi">
              基本情報
            </span>
            <span className="text-xs text-hai group-open:hidden">開く</span>
            <span className="hidden text-xs text-hai group-open:inline">閉じる</span>
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-4 md:px-6 md:pb-6">
            <div className="space-y-2">
              <Label htmlFor="name">書類名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="請求書_2026年1月"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">種類</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => handleInputChange('type', v)}
                disabled={isEditMode || !!templateId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => handleInputChange('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange('description', e.target.value)
                }
                placeholder="書類の説明"
              />
            </div>
          </div>
        </details>

        {/* ===== 護持費のお知らせ（旧「請求書」テンプレート） ===== */}
        {showInvoiceFields && (
          <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6">
            <header className="mb-4 flex items-start gap-2 pl-3 border-l-4 border-l-ai">
              <FileText className="mt-0.5 h-5 w-5 text-ai" />
              <div>
                <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
                  護持費のお知らせ
                </h3>
                <p className="text-xs text-hai mt-0.5">
                  左のプレビュー内で直接編集できます。下の入力とも同期します。
                </p>
              </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
              <div className="space-y-2">
                <Label>宛名（上部・本文中 共通）</Label>
                <Input
                  value={templateData.customerName || ''}
                  onChange={(e) =>
                    handleTemplateDataChange('customerName', e.target.value)
                  }
                  placeholder="【デモ】小峰 太郎"
                />
              </div>
              <div className="space-y-2">
                <Label>更新年数（◯年分）</Label>
                <Input
                  type="number"
                  min="0"
                  value={templateData.yearCount || ''}
                  onChange={(e) =>
                    handleTemplateDataChange('yearCount', e.target.value)
                  }
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>お支払金額（円）</Label>
                <Input
                  type="number"
                  min="0"
                  value={templateData.amount || ''}
                  onChange={(e) =>
                    handleTemplateDataChange('amount', e.target.value)
                  }
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label>次回お預かり日</Label>
                <Input
                  value={templateData.nextNoticeDate || ''}
                  onChange={(e) =>
                    handleTemplateDataChange('nextNoticeDate', e.target.value)
                  }
                  placeholder="2026年12月31日"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>時候の挨拶（例: 早春の候）</Label>
                <Input
                  list="season-greeting-presets-form"
                  value={templateData.seasonGreeting || ''}
                  onChange={(e) =>
                    handleTemplateDataChange('seasonGreeting', e.target.value)
                  }
                  placeholder="早春の候"
                />
                <datalist id="season-greeting-presets-form">
                  <option value="厳寒の候" />
                  <option value="晩冬の候" />
                  <option value="早春の候" />
                  <option value="春暖の候" />
                  <option value="陽春の候" />
                  <option value="新緑の候" />
                  <option value="初夏の候" />
                  <option value="梅雨の候" />
                  <option value="盛夏の候" />
                  <option value="残暑の候" />
                  <option value="初秋の候" />
                  <option value="秋涼の候" />
                  <option value="晩秋の候" />
                  <option value="師走の候" />
                </datalist>
                <p className="text-xs text-hai">
                  未入力の場合は現在の月に応じた挨拶が自動で使われます。
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ===== はがきテンプレート ===== */}
        {showPostcardFields && (
          <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6">
            <header className="mb-4 flex items-start gap-2 pl-3 border-l-4 border-l-matsu">
              <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
                はがき情報
              </h3>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sumi border-b border-gin pb-1">
                  宛先
                </h4>
                <div className="space-y-2">
                  <Label>郵便番号</Label>
                  <Input
                    value={templateData.recipientPostalCode || ''}
                    onChange={(e) =>
                      handleTemplateDataChange(
                        'recipientPostalCode',
                        e.target.value
                      )
                    }
                    placeholder="123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>住所</Label>
                  <textarea
                    value={templateData.recipientAddress || ''}
                    onChange={(e) =>
                      handleTemplateDataChange(
                        'recipientAddress',
                        e.target.value
                      )
                    }
                    placeholder="東京都○○区..."
                    className="w-full min-h-[60px] px-3 py-2 border border-gin rounded-md focus:outline-none focus:ring-2 focus:ring-matsu text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>宛名</Label>
                  <Input
                    value={templateData.recipientName || ''}
                    onChange={(e) =>
                      handleTemplateDataChange('recipientName', e.target.value)
                    }
                    placeholder="田中 太郎"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sumi border-b border-gin pb-1">
                  差出人
                </h4>
                <div className="space-y-2">
                  <Label>郵便番号</Label>
                  <Input
                    value={templateData.senderPostalCode || ''}
                    onChange={(e) =>
                      handleTemplateDataChange(
                        'senderPostalCode',
                        e.target.value
                      )
                    }
                    placeholder="987-6543"
                  />
                </div>
                <div className="space-y-2">
                  <Label>住所</Label>
                  <textarea
                    value={templateData.senderAddress || ''}
                    onChange={(e) =>
                      handleTemplateDataChange('senderAddress', e.target.value)
                    }
                    placeholder="○○県○○市..."
                    className="w-full min-h-[60px] px-3 py-2 border border-gin rounded-md focus:outline-none focus:ring-2 focus:ring-matsu text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>差出人名</Label>
                  <Input
                    value={templateData.senderName || ''}
                    onChange={(e) =>
                      handleTemplateDataChange('senderName', e.target.value)
                    }
                    placeholder="小峰霊園管理事務所"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label>メッセージ</Label>
              <textarea
                value={templateData.message || ''}
                onChange={(e) =>
                  handleTemplateDataChange('message', e.target.value)
                }
                placeholder="拝啓 時下ますますご清栄のこととお慶び申し上げます..."
                className="w-full min-h-[120px] px-3 py-2 border border-gin rounded-md focus:outline-none focus:ring-2 focus:ring-matsu text-sm"
              />
            </div>
          </section>
        )}

        {/* ===== 契約書テンプレート ===== */}
        {showContractFields && (
          <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6">
            <header className="mb-4 flex items-start gap-2 pl-3 border-l-4 border-l-kohaku">
              <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
                契約書情報
              </h3>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>契約番号</Label>
                <Input
                  value={templateData.contractNumber || ''}
                  onChange={(e) =>
                    handleTemplateDataChange('contractNumber', e.target.value)
                  }
                  placeholder="CON-2026-0001"
                />
              </div>
              <div className="space-y-2">
                <Label>契約日</Label>
                <Input
                  type="date"
                  value={templateData.contractDate || ''}
                  onChange={(e) =>
                    handleTemplateDataChange('contractDate', e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>契約者名</Label>
                <Input
                  value={templateData.contractorName || ''}
                  onChange={(e) =>
                    handleTemplateDataChange('contractorName', e.target.value)
                  }
                  placeholder="田中 太郎"
                />
              </div>
              <div className="space-y-2">
                <Label>区画番号</Label>
                <Input
                  value={templateData.plotNumber || ''}
                  onChange={(e) =>
                    handleTemplateDataChange('plotNumber', e.target.value)
                  }
                  placeholder="A-56"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>契約条件</Label>
              <textarea
                value={templateData.terms || ''}
                onChange={(e) =>
                  handleTemplateDataChange('terms', e.target.value)
                }
                placeholder="契約条件を入力..."
                className="w-full min-h-[150px] px-3 py-2 border border-gin rounded-md focus:outline-none focus:ring-2 focus:ring-kohaku text-sm"
              />
            </div>
          </section>
        )}

        {/* ===== 許可証テンプレート（許可証書のみ） ===== */}
        {showPermitCertificateForm && (
          <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6">
            <header className="mb-4 flex items-start gap-2 pl-3 border-l-4 border-l-cha">
              <div>
                <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
                  許可証情報
                </h3>
                <p className="text-xs text-hai mt-0.5">
                  左のプレビュー上の位置に、下記の値がそのまま印字されます。
                </p>
              </div>
            </header>

            <div className="mb-5">
              <h4 className="text-sm font-semibold text-sumi border-b border-gin pb-1 mb-3">
                許可証書
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>許可番号（第○号）</Label>
                  <Input
                    value={templateData.permitNumber || ''}
                    onChange={(e) =>
                      handleTemplateDataChange('permitNumber', e.target.value)
                    }
                    placeholder="12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label>種別</Label>
                  <Input
                    value={templateData.permitType || ''}
                    onChange={(e) =>
                      handleTemplateDataChange('permitType', e.target.value)
                    }
                    placeholder="普通墓地"
                  />
                </div>
                <div className="space-y-2">
                  <Label>区画番号</Label>
                  <Input
                    value={templateData.plotNumber || ''}
                    onChange={(e) =>
                      handleTemplateDataChange('plotNumber', e.target.value)
                    }
                    placeholder="A-56、B-12"
                  />
                  <p className="text-xs text-hai">
                    この人が契約中の区画は、1枚の許可証にまとめて入ります。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>面積（㎡）</Label>
                  <Input
                    value={templateData.area || ''}
                    onChange={(e) =>
                      handleTemplateDataChange('area', e.target.value)
                    }
                    placeholder="4.5"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 md:col-span-2">
                  <div className="space-y-2">
                    <Label>発行年</Label>
                    <Input
                      value={templateData.issueYear || ''}
                      onChange={(e) =>
                        handleTemplateDataChange('issueYear', e.target.value)
                      }
                      placeholder="2026"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>月</Label>
                    <Input
                      value={templateData.issueMonth || ''}
                      onChange={(e) =>
                        handleTemplateDataChange('issueMonth', e.target.value)
                      }
                      placeholder="4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>日</Label>
                    <Input
                      value={templateData.issueDay || ''}
                      onChange={(e) =>
                        handleTemplateDataChange('issueDay', e.target.value)
                      }
                      placeholder="23"
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>使用者名（殿）</Label>
                  <Input
                    value={templateData.applicantName || ''}
                    onChange={(e) =>
                      handleTemplateDataChange('applicantName', e.target.value)
                    }
                    placeholder="【デモ】小峰 太郎"
                  />
                </div>
                <div className="space-y-2">
                  <Label>本籍（1列目・○丁目まで）</Label>
                  <Input
                    value={templateData.registeredAddress || ''}
                    onChange={(e) =>
                      handleTemplateDataChange(
                        'registeredAddress',
                        e.target.value
                      )
                    }
                    placeholder="福岡県北九州市八幡西区小峰1丁目"
                  />
                </div>
                <div className="space-y-2">
                  <Label>本籍（2列目・丁目以降）</Label>
                  <Input
                    value={templateData.registeredAddress2 || ''}
                    onChange={(e) =>
                      handleTemplateDataChange(
                        'registeredAddress2',
                        e.target.value
                      )
                    }
                    placeholder="2番3号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>現住所（1列目・○丁目まで）</Label>
                  <Input
                    value={templateData.currentAddress || ''}
                    onChange={(e) =>
                      handleTemplateDataChange(
                        'currentAddress',
                        e.target.value
                      )
                    }
                    placeholder="福岡県北九州市八幡西区小峰1丁目"
                  />
                </div>
                <div className="space-y-2">
                  <Label>現住所（2列目・丁目以降）</Label>
                  <Input
                    value={templateData.currentAddress2 || ''}
                    onChange={(e) =>
                      handleTemplateDataChange(
                        'currentAddress2',
                        e.target.value
                      )
                    }
                    placeholder="2番3号 マンション名など"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== 封筒書・封筒大（宛先） ===== */}
        {showEnvelopeRecipientForm && (
          <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6">
            <header className="mb-4 flex items-start gap-2 pl-3 border-l-4 border-l-cha">
              <div>
                <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
                  {isEnvelopeLetterTemplate ? '封筒書（宛先）' : '封筒大（宛先）'}
                </h3>
                <p className="text-xs text-hai mt-0.5">
                  右上の郵便番号の下に住所、真ん中に名前を、縦書きで印字します。
                </p>
              </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>郵便番号（7桁・ハイフン可）</Label>
                <Input
                  value={templateData.recipientPostalCode || ''}
                  onChange={(e) => handleEnvelopePostalCodeChange(e.target.value)}
                  placeholder="123-4567"
                />
                <p className="text-xs text-hai">
                  郵便番号は右上の枠に1桁ずつ入ります。ハイフンは印字しません。
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <p className="text-xs text-hai">
                  住所は右、名前は中央です。文字は上から下へ並びます。
                </p>
                <div className="flex items-start justify-end gap-3 overflow-x-auto">
                  <div className="space-y-1">
                    <Label>宛名</Label>
                    <textarea
                      value={templateData.recipientName || ''}
                      onChange={(e) =>
                        handleTemplateDataChange('recipientName', e.target.value)
                      }
                      placeholder="コミネ太郎 様"
                      aria-label="宛名の入力"
                      className="h-64 w-16 resize-none rounded-md border border-gin px-1 py-2 text-center font-mincho text-sumi outline-none focus:ring-2 focus:ring-matsu"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>住所（2列目）</Label>
                    <textarea
                      value={templateData.recipientAddress2 || ''}
                      onChange={(e) =>
                        handleTemplateDataChange('recipientAddress2', e.target.value)
                      }
                      placeholder="見本1丁目2番3号"
                      aria-label="宛先住所2列目の入力"
                      className="h-64 w-14 resize-none rounded-md border border-gin px-1 py-2 font-mincho text-sumi outline-none focus:ring-2 focus:ring-matsu"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>住所（右の列）</Label>
                    <textarea
                      value={templateData.recipientAddress || ''}
                      onChange={(e) =>
                        handleTemplateDataChange('recipientAddress', e.target.value)
                      }
                      placeholder="見本県見本市見本区"
                      aria-label="宛先住所の入力"
                      className="h-64 w-14 resize-none rounded-md border border-gin px-1 py-2 font-mincho text-sumi outline-none focus:ring-2 focus:ring-matsu"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <details className="group rounded-elegant-lg border border-gin bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 md:px-6 [&::-webkit-details-marker]:hidden">
            <span className="border-l-4 border-l-sumi pl-3 font-mincho text-base font-semibold text-sumi">
              自由記入欄
            </span>
            <span className="text-xs text-hai group-open:hidden">開く</span>
            <span className="hidden text-xs text-hai group-open:inline">閉じる</span>
          </summary>
          <div className="px-4 pb-4 md:px-6 md:pb-6">
            <p className="mb-3 text-xs text-hai">
              紙には刷られないメモです。必要なときだけ開いて書いてください。
            </p>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="追加の備考、修正内容、特記事項などを自由に入力..."
              className="w-full min-h-[150px] px-3 py-2 border border-gin rounded-md focus:outline-none focus:ring-2 focus:ring-matsu text-sm font-mono leading-relaxed"
            />
          </div>
        </details>

        <details className="group rounded-elegant-lg border border-gin bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 md:px-6 [&::-webkit-details-marker]:hidden">
            <span className="border-l-4 border-l-sumi pl-3 font-mincho text-base font-semibold text-sumi">
              備考
            </span>
            <span className="text-xs text-hai group-open:hidden">開く</span>
            <span className="hidden text-xs text-hai group-open:inline">閉じる</span>
          </summary>
          <div className="px-4 pb-4 md:px-6 md:pb-6">
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="管理用メモ（書類には出力されません）"
              className="w-full min-h-[80px] px-3 py-2 border border-gin rounded-md focus:outline-none focus:ring-2 focus:ring-matsu text-sm"
            />
          </div>
        </details>

        {/* エラー */}
        {mutationError && (
          <div className="p-4 bg-beni-50 border border-beni-200 text-beni rounded-lg">
            {mutationError}
          </div>
        )}

        {/* 送信ボタン */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            キャンセル
          </Button>
          <Button
            type="submit"
            className="bg-matsu hover:bg-matsu-dark text-white"
            disabled={isMutating}
          >
            {isMutating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? '変更を保存' : '書類を保存'}
          </Button>
        </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function FreeformSideTools({
  blocks,
  selectedId,
  templateName,
  onTemplateName,
  onSelect,
  onChange,
}: {
  blocks: FreeformBlock[];
  selectedId: string | null;
  templateName: string;
  onTemplateName: (value: string) => void;
  onSelect: (id: string | null) => void;
  onChange: (blocks: FreeformBlock[]) => void;
}) {
  const selected = blocks.find((block) => block.id === selectedId) ?? null;

  const addBlock = () => {
    const block: FreeformBlock = {
      id: `block-${Date.now()}`,
      text: '',
      xMm: 20,
      yMm: Math.min(20 + blocks.length * 18, 240),
      widthMm: 80,
      heightMm: 28,
      font: 'mincho',
      sizePt: 14,
      weight: 'normal',
      direction: 'horizontal',
    };
    onChange([...blocks, block]);
    onSelect(block.id);
  };

  const patch = (next: Partial<FreeformBlock>) => {
    if (!selected) return;
    onChange(blocks.map((block) => (block.id === selected.id ? { ...block, ...next } : block)));
  };

  return (
    <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6 space-y-4">
      <header className="pl-3 border-l-4 border-l-sumi">
        <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
          文字
        </h3>
        <p className="text-xs text-hai mt-0.5">
          左の紙に文字を足して、上の帯をつかむと位置を動かせます。
        </p>
      </header>
      <Button type="button" variant="outline" onClick={addBlock}>
        文字を足す
      </Button>
      {selected && (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-sumi">
            書体
            <select
              className="mt-1 w-full rounded-md border border-gin px-2 py-2"
              value={selected.font}
              onChange={(event) =>
                patch({ font: event.target.value === 'gothic' ? 'gothic' : 'mincho' })
              }
            >
              <option value="mincho">明朝（筆のような文字）</option>
              <option value="gothic">ゴシック（角ばった文字）</option>
            </select>
          </label>
          <label className="text-sm text-sumi">
            大きさ
            <input
              type="number"
              min={8}
              max={36}
              className="mt-1 w-full rounded-md border border-gin px-2 py-2"
              value={selected.sizePt}
              onChange={(event) => patch({ sizePt: Number(event.target.value) || 14 })}
            />
          </label>
          <label className="text-sm text-sumi">
            太さ
            <select
              className="mt-1 w-full rounded-md border border-gin px-2 py-2"
              value={selected.weight}
              onChange={(event) =>
                patch({ weight: event.target.value === 'bold' ? 'bold' : 'normal' })
              }
            >
              <option value="normal">ふつう</option>
              <option value="bold">太い</option>
            </select>
          </label>
          <label className="text-sm text-sumi">
            向き
            <select
              className="mt-1 w-full rounded-md border border-gin px-2 py-2"
              value={selected.direction}
              onChange={(event) =>
                patch({
                  direction: event.target.value === 'vertical' ? 'vertical' : 'horizontal',
                })
              }
            >
              <option value="horizontal">横書き</option>
              <option value="vertical">縦書き</option>
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            className="col-span-2 text-beni"
            onClick={() => {
              onChange(blocks.filter((block) => block.id !== selected.id));
              onSelect(null);
            }}
          >
            この文字を消す
          </Button>
        </div>
      )}
      <div className="space-y-2 border-t border-gin pt-4">
        <Label>この形の名前</Label>
        <Input
          value={templateName}
          onChange={(event) => onTemplateName(event.target.value)}
          placeholder="例: お礼の手紙"
          aria-label="テンプレートの名前"
        />
        <Button
          type="button"
          className="bg-matsu text-white hover:bg-matsu-dark"
          onClick={() => {
            saveFreeformTemplate(templateName, blocks);
            toast.success('この形を保存しました。書類の一覧に戻ると「保存した形」からやり直せます。');
          }}
        >
          この形をテンプレートにする
        </Button>
      </div>
    </section>
  );
}

function PostcardPieceTools({
  templateData,
  selectedId,
  onTemplateDataChange,
}: {
  templateData: Record<string, string>;
  selectedId: string | null;
  onTemplateDataChange: (key: string, value: string) => void;
}) {
  const piece = selectedPostcardPiece(templateData, selectedId);
  if (!piece) {
    return (
      <p className="text-sm text-hai">
        左のはがきで直したい文字を押すと、ここで書体・大きさ・太さ・縦書きか横書きかを変えられます。上の細い帯をつかむと、その文字だけ動かせます。
      </p>
    );
  }
  const patch = (next: Parameters<typeof updatePostcardPiece>[2]) => {
    onTemplateDataChange('postcardLayout', updatePostcardPiece(templateData, piece.id, next));
  };
  return (
    <section className="bg-white rounded-elegant-lg border border-gin p-4 space-y-3">
      <h3 className="font-mincho text-base font-semibold text-sumi">{piece.label}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-sumi">
          書体
          <select
            className="mt-1 w-full rounded-md border border-gin px-2 py-2"
            value={piece.font}
            onChange={(event) => patch({ font: event.target.value === 'gothic' ? 'gothic' : 'mincho' })}
          >
            <option value="mincho">明朝（筆のような文字）</option>
            <option value="gothic">ゴシック（角ばった文字）</option>
          </select>
        </label>
        <label className="text-sm text-sumi">
          大きさ
          <input
            type="number"
            min={8}
            max={36}
            className="mt-1 w-full rounded-md border border-gin px-2 py-2"
            value={piece.sizePt}
            onChange={(event) => patch({ sizePt: Number(event.target.value) || 12 })}
          />
        </label>
        <label className="text-sm text-sumi">
          太さ
          <select
            className="mt-1 w-full rounded-md border border-gin px-2 py-2"
            value={piece.weight}
            onChange={(event) => patch({ weight: event.target.value === 'bold' ? 'bold' : 'normal' })}
          >
            <option value="normal">ふつう</option>
            <option value="bold">太い</option>
          </select>
        </label>
        <label className="text-sm text-sumi">
          向き
          <select
            className="mt-1 w-full rounded-md border border-gin px-2 py-2"
            value={piece.direction}
            onChange={(event) =>
              patch({ direction: event.target.value === 'vertical' ? 'vertical' : 'horizontal' })
            }
          >
            <option value="vertical">縦書き</option>
            <option value="horizontal">横書き</option>
          </select>
        </label>
      </div>
      {piece.id === 'recipientName' && (
        <label className="flex items-center gap-2 text-sm text-sumi">
          <input
            type="checkbox"
            checked={templateData.showHonorific !== '0'}
            onChange={(event) =>
              onTemplateDataChange('showHonorific', event.target.checked ? '1' : '0')
            }
          />
          うしろに「様」をつける
        </label>
      )}
    </section>
  );
}
