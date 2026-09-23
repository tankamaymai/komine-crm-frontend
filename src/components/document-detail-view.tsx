'use client';

/**
 * 書類詳細表示コンポーネント
 */

import { Button } from '@/components/ui/button';
import { LegacyAwareValue } from '@/components/legacy-aware-value';
import {
  useDocumentDetail,
  canRegenerateDocument,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from '@/hooks/useDocuments';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Printer,
  RefreshCw,
  FileText,
  Calendar,
  User,
  MapPin,
  File,
} from 'lucide-react';

interface DocumentDetailViewProps {
  documentId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** template_data から PDF を再生成してダウンロード */
  onDownload: (id: string) => void;
  /** アップロード済みファイル実体をダウンロード */
  onDownloadFile: (id: string) => void;
  /** 保存済み許可証を、台紙の上に文字だけ載せて印刷する */
  onPrintText?: (id: string) => void;
}

export function DocumentDetailView({
  documentId,
  onBack,
  onEdit,
  onDelete,
  onDownload,
  onDownloadFile,
  onPrintText,
}: DocumentDetailViewProps) {
  const { data, isLoading, error, refresh } = useDocumentDetail(documentId);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-matsu" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <div className="p-4 bg-beni-50 border border-beni-200 text-beni rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <div className="p-8 text-center text-hai">
          <FileText className="mx-auto h-12 w-12 text-gin mb-2" />
          書類が見つかりません
        </div>
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
            {data.name}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(documentId)}>
            <Edit className="mr-2 h-4 w-4" />
            編集
          </Button>
          {onPrintText &&
            (data.templateType === 'permit' ||
              data.type === 'permit' ||
              data.templateType === 'envelope-letter' ||
              data.type === 'envelope_letter') &&
            canRegenerateDocument(
              data.templateType,
              !!data.templateData && Object.keys(data.templateData).length > 0
            ) && (
              <Button
                variant="outline"
                size="sm"
                className="border-matsu/40 text-matsu-dark hover:bg-matsu/5"
                onClick={() => onPrintText(documentId)}
              >
                <Printer className="mr-2 h-4 w-4" />
                {data.templateType === 'envelope-letter' || data.type === 'envelope_letter'
                  ? '封筒に文字だけ印刷'
                  : '台紙に文字だけ印刷'}
              </Button>
            )}
          {data.fileName && (
            <Button
              variant="outline"
              size="sm"
              title="アップロード済みファイルをダウンロード"
              onClick={() => onDownloadFile(documentId)}
            >
              <Download className="mr-2 h-4 w-4" />
              ファイルをダウンロード
            </Button>
          )}
          {canRegenerateDocument(
            data.templateType,
            !!data.templateData && Object.keys(data.templateData).length > 0
          ) && (
            <Button
              variant="outline"
              size="sm"
              title="保存済みテンプレートからPDFを再生成してダウンロード"
              onClick={() => onDownload(documentId)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              PDF再生成
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-beni hover:text-beni-dark hover:bg-beni-50 border-beni-200"
            onClick={() => onDelete(documentId)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            削除
          </Button>
        </div>
      </div>

      {/* メイン情報 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* 基本情報 */}
        <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6">
          <header className="mb-4 flex items-start gap-2 pl-3 border-l-4 border-l-matsu">
            <FileText className="mt-0.5 h-5 w-5 text-matsu" />
            <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
              基本情報
            </h3>
          </header>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-hai">書類名</dt>
              <dd className="text-sumi font-medium">{data.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-hai">種類</dt>
              <dd>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ai/10 text-ai border border-ai/30">
                  {DOCUMENT_TYPE_LABELS[data.type]}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-hai">ステータス</dt>
              <dd>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DOCUMENT_STATUS_COLORS[data.status]}`}
                >
                  {DOCUMENT_STATUS_LABELS[data.status]}
                </span>
              </dd>
            </div>
            {data.description && (
              <div>
                <dt className="text-xs text-hai">説明</dt>
                <dd className="text-sumi">{data.description}</dd>
              </div>
            )}
            {data.notes && (
              <div>
                <dt className="text-xs text-hai">備考</dt>
                <dd className="text-sumi whitespace-pre-wrap">{data.notes}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* ファイル情報 */}
        <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6">
          <header className="mb-4 flex items-start gap-2 pl-3 border-l-4 border-l-cha">
            <File className="mt-0.5 h-5 w-5 text-cha" />
            <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
              ファイル情報
            </h3>
          </header>
          {data.fileName ? (
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-hai">ファイル名</dt>
                <dd className="text-sumi">{data.fileName}</dd>
              </div>
              <div>
                <dt className="text-xs text-hai">ファイルサイズ</dt>
                <dd className="text-sumi">{formatFileSize(data.fileSize)}</dd>
              </div>
              <div>
                <dt className="text-xs text-hai">MIMEタイプ</dt>
                <dd className="text-sumi">{data.mimeType || '-'}</dd>
              </div>
              {data.generatedAt && (
                <div>
                  <dt className="text-xs text-hai">生成日時</dt>
                  <dd className="text-sumi">{formatDate(data.generatedAt)}</dd>
                </div>
              )}
              {data.sentAt && (
                <div>
                  <dt className="text-xs text-hai">送付日時</dt>
                  <dd className="text-sumi">{formatDate(data.sentAt)}</dd>
                </div>
              )}
            </dl>
          ) : (
            <div className="text-center py-8 text-hai">
              <File className="mx-auto h-12 w-12 text-gin mb-2" />
              ファイルがアップロードされていません
            </div>
          )}
        </section>

        {/* 関連情報 */}
        <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6">
          <header className="mb-4 flex items-start gap-2 pl-3 border-l-4 border-l-ai">
            <User className="mt-0.5 h-5 w-5 text-ai" />
            <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
              関連情報
            </h3>
          </header>
          <dl className="space-y-3">
            {data.customer ? (
              <div>
                <dt className="text-xs text-hai">顧客</dt>
                <dd className="text-sumi">
                  <div className="font-medium">{data.customer.name}</div>
                  {data.customer.nameKana && (
                    <div className="text-sm text-hai">{data.customer.nameKana}</div>
                  )}
                </dd>
              </div>
            ) : (
              <div className="text-hai">顧客情報なし</div>
            )}
            {data.contractPlot ? (
              <div>
                <dt className="text-xs text-hai flex items-center">
                  <MapPin className="mr-1 h-3 w-3" />
                  区画
                </dt>
                <dd className="text-sumi">
                  {/* displayNumber 優先・legacy-* 等は「整備中」ミュート表示 #283 */}
                  <LegacyAwareValue value={data.contractPlot.physicalPlot.areaName} kind="areaName" /> - <LegacyAwareValue value={data.contractPlot.physicalPlot.displayNumber || data.contractPlot.physicalPlot.plotNumber} kind="plotNumber" />
                </dd>
              </div>
            ) : (
              <div className="text-hai">区画情報なし</div>
            )}
          </dl>
        </section>

        {/* 日時情報 */}
        <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6">
          <header className="mb-4 flex items-start gap-2 pl-3 border-l-4 border-l-kohaku">
            <Calendar className="mt-0.5 h-5 w-5 text-kohaku" />
            <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
              日時情報
            </h3>
          </header>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-hai">作成日時</dt>
              <dd className="text-sumi">{formatDate(data.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-hai">更新日時</dt>
              <dd className="text-sumi">{formatDate(data.updatedAt)}</dd>
            </div>
            {data.createdBy && (
              <div>
                <dt className="text-xs text-hai">作成者</dt>
                <dd className="text-sumi">{data.createdBy}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      {/* テンプレートデータ（デバッグ用） */}
      {data.templateData && Object.keys(data.templateData).length > 0 && (
        <section className="bg-white rounded-elegant-lg border border-gin p-4 md:p-6">
          <header className="mb-4 flex items-start gap-2 pl-3 border-l-4 border-l-sumi">
            <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi">
              テンプレートデータ
            </h3>
          </header>
          <pre className="text-xs text-sumi bg-kinari-50 border border-gin p-4 rounded-md overflow-x-auto">
            {JSON.stringify(data.templateData, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
