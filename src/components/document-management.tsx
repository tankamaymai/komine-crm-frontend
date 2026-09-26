'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DocumentTemplateGallery,
  TemplateId,
} from './document-template-gallery';
import { DocumentListView } from './document-list-view';
import { DocumentDetailView } from './document-detail-view';
import { DocumentForm } from './document-form';
import type { SavedFreeformTemplate } from '@/lib/freeform-templates';
import { useDocumentMutations, DocumentDetail } from '@/hooks/useDocuments';
import { printSavedPermitText } from '@/lib/api/documents';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { ConfirmDialog } from '@/components/shared/dialogs';
import { PlotDetailResponse } from '@komine/types';

type ViewMode = 'templates' | 'list' | 'detail' | 'create' | 'edit';

interface DocumentManagementProps {
  customerId?: string;
  customerName?: string;
  /** 区画詳細データ（区画コンテキストから書類作成時、フォームに自動挿入するため） */
  plotDetail?: PlotDetailResponse;
  initialMode?: 'list' | 'create' | 'templates';
  onBack?: () => void;
}

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  invoice: '護持費のお知らせ',
  postcard: 'はがき',
  contract: '契約書',
  permit: '許可証（永代使用）',
  'envelope-letter': '封筒書',
  'envelope-base': '封筒大',
  'payment-guide': 'お支払い方法のご案内',
  other: 'その他',
};

export function DocumentManagement({
  customerId,
  customerName,
  plotDetail,
  initialMode = 'templates',
  onBack,
}: DocumentManagementProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialMode === 'create' ? 'create' : initialMode === 'list' ? 'list' : 'templates'
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<TemplateId | null>(null);
  const [savedFreeform, setSavedFreeform] = useState<SavedFreeformTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const { remove, download, downloadFile, isLoading: isMutating } =
    useDocumentMutations();

  useEffect(() => {
    if (initialMode === 'create') setViewMode('create');
    else if (initialMode === 'list') setViewMode('list');
    else setViewMode('templates');
  }, [initialMode]);

  const handleBackToTemplates = useCallback(() => {
    setViewMode('templates');
    setSelectedDocumentId(null);
    setSelectedTemplateId(null);
    setSavedFreeform(null);
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedDocumentId(null);
  }, []);

  const handleViewHistory = useCallback(() => {
    setViewMode('list');
  }, []);

  const handleSelectTemplate = useCallback(
    (templateId: TemplateId, saved?: SavedFreeformTemplate) => {
      setSelectedTemplateId(templateId);
      setSavedFreeform(saved ?? null);
      setViewMode('create');
    },
    []
  );

  const handleCreateNew = useCallback(() => {
    setSelectedTemplateId(null);
    setViewMode('create');
  }, []);

  const handleViewDetail = useCallback((id: string) => {
    setSelectedDocumentId(id);
    setViewMode('edit');
  }, []);

  const handleEdit = useCallback((id: string) => {
    setSelectedDocumentId(id);
    setViewMode('edit');
  }, []);

  const handleSaved = useCallback((doc: DocumentDetail) => {
    setSelectedDocumentId(doc.id);
    // 保存後は、日時や中身の生データを並べた詳細ではなく、入力し直せる画面に残す
    setViewMode('edit');
  }, []);

  const handleDeleteRequest = useCallback((id: string) => {
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!documentToDelete) return;
    const success = await remove(documentToDelete);
    if (success) {
      toast.success('書類を削除しました');
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      handleBackToList();
    } else {
      toast.error('削除に失敗しました');
    }
  }, [documentToDelete, remove, handleBackToList]);

  // PDF再生成（template_data ベース）のダウンロード
  const handleDownload = useCallback(
    async (id: string) => {
      const ok = await download(id);
      if (!ok) {
        toast.error('ダウンロードに失敗しました');
      }
    },
    [download]
  );

  // アップロード済みファイル実体のダウンロード
  const handlePrintText = useCallback(async (id: string) => {
    const result = await printSavedPermitText(id);
    if (result.ok) {
      toast.success('印刷の画面を開きました。拡大縮小は「そのまま」にして、台紙をセットしてください。');
    } else {
      toast.error(result.message);
    }
  }, []);

  const handleDownloadFile = useCallback(
    async (id: string) => {
      const ok = await downloadFile(id);
      if (!ok) {
        toast.error('ファイルのダウンロードに失敗しました');
      }
    },
    [downloadFile]
  );

  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else handleBackToTemplates();
  }, [onBack, handleBackToTemplates]);

  const formOnBack =
    customerId
      ? handleBackToTemplates
      : viewMode === 'create'
        ? handleBackToTemplates
        : handleBackToList;

  // ページヘッダーのサブタイトル
  const headerSubtitle = (() => {
    switch (viewMode) {
      case 'templates':
        return 'テンプレートから書類を作成';
      case 'list':
        return '作成済み書類の一覧・管理';
      case 'detail':
        return '書類の詳細を表示';
      case 'create':
        return selectedTemplateId
          ? `${savedFreeform?.name || TEMPLATE_LABELS[selectedTemplateId]}を作成`
          : '新規書類の作成';
      case 'edit':
        return '書類の編集';
      default:
        return '書類の作成・管理';
    }
  })();

  const headerTitle = customerName ? `${customerName} 様の書類` : '書類管理';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        theme="matsu"
        icon={<FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />}
      />

      {/* 顧客コンテキスト時の戻るバー */}
      {customerId && customerName && (viewMode === 'templates' || viewMode === 'list') && (
        <div className="px-3 md:px-6 py-2 flex items-center gap-4 border-b border-gin bg-kinari-50/60">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {viewMode === 'templates' ? '区画詳細に戻る' : '顧客詳細に戻る'}
          </Button>
          <div className="text-hai text-xs md:text-sm">
            <span className="font-medium text-sumi">{customerName}</span> 様の書類
            {viewMode === 'templates' ? 'を作成' : ''}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {viewMode === 'templates' && (
          <div className="p-3 md:p-6">
            <DocumentTemplateGallery
              onSelectTemplate={handleSelectTemplate}
              onViewHistory={handleViewHistory}
            />
          </div>
        )}

        {viewMode === 'list' && (
          <DocumentListView
            customerId={customerId}
            customerName={customerName}
            onCreateNew={customerId ? handleCreateNew : handleBackToTemplates}
            onViewDetail={handleViewDetail}
            onDownload={handleDownload}
            onDownloadFile={handleDownloadFile}
            onPrintText={handlePrintText}
            onBack={customerId ? undefined : handleBackToTemplates}
          />
        )}

        {viewMode === 'detail' && selectedDocumentId && (
          <div className="p-3 md:p-6">
            <DocumentDetailView
              documentId={selectedDocumentId}
              onBack={handleBackToList}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              onDownload={handleDownload}
              onDownloadFile={handleDownloadFile}
              onPrintText={handlePrintText}
            />
          </div>
        )}

        {viewMode === 'create' && (
          <div className="p-3 md:p-6">
            <DocumentForm
              customerId={customerId}
              templateId={selectedTemplateId || undefined}
              savedFreeform={savedFreeform}
              plotDetail={plotDetail}
              onBack={formOnBack}
              onSaved={handleSaved}
            />
          </div>
        )}

        {viewMode === 'edit' && selectedDocumentId && (
          <div className="p-3 md:p-6">
            <DocumentForm
              documentId={selectedDocumentId}
              onBack={handleBackToList}
              onSaved={handleSaved}
              onDelete={() => handleDeleteRequest(selectedDocumentId)}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          if (!isMutating) {
            setDeleteDialogOpen(false);
            setDocumentToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title="書類の削除"
        message="この書類を削除してもよろしいですか？この操作は取り消せません。"
        confirmText="削除"
        cancelText="キャンセル"
        variant="danger"
        isLoading={isMutating}
      />
    </div>
  );
}
