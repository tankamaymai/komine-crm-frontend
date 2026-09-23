'use client';

/**
 * 書類一覧表示コンポーネント
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDocumentList,
  DocumentListItem,
  canRegenerateDocument,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from '@/hooks/useDocuments';
import {
  Plus,
  Search,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  Eye,
  ArrowLeft,
  Printer,
} from 'lucide-react';

interface DocumentListViewProps {
  /** 顧客IDでフィルター */
  customerId?: string;
  /** 顧客名（表示用） */
  customerName?: string;
  onCreateNew: () => void;
  onViewDetail: (id: string) => void;
  /** template_data から PDF を再生成してダウンロード */
  onDownload: (id: string) => void;
  /** アップロード済みファイル実体をダウンロード */
  onDownloadFile: (id: string) => void;
  /** 保存済み許可証を、台紙の上に文字だけ載せて印刷する */
  onPrintText?: (id: string) => void;
  /** テンプレートギャラリーに戻る */
  onBack?: () => void;
}

export function DocumentListView({
  customerId,
  onCreateNew,
  onViewDetail,
  onDownload,
  onDownloadFile,
  onPrintText,
  onBack,
}: DocumentListViewProps) {
  // 顧客IDが指定されている場合は初期フィルターとして設定
  const { data, isLoading, error, params, setPage, setFilters, refresh } = useDocumentList(
    customerId ? { customerId } : undefined
  );
  const [searchText, setSearchText] = useState('');

  const handleSearch = () => {
    setFilters({ search: searchText });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTypeFilter = (value: string) => {
    setFilters({ type: value === 'all' ? undefined : value as DocumentListItem['type'] });
  };

  const handleStatusFilter = (value: string) => {
    setFilters({ status: value === 'all' ? undefined : value as DocumentListItem['status'] });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              テンプレート
            </Button>
          )}
        </div>
        <Button onClick={onCreateNew} size="sm" className="bg-matsu hover:bg-matsu-dark text-white cursor-pointer">
          <Plus className="mr-1 h-4 w-4" />
          新規作成
        </Button>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-4 p-4 bg-kinari-50 rounded-lg border border-gin">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Input
                placeholder="書類名で検索..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-10"
              />
              <button
                onClick={handleSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-hai hover:text-sumi"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Select onValueChange={handleTypeFilter} defaultValue="all">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="種類" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての種類</SelectItem>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleStatusFilter} defaultValue="all">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのステータス</SelectItem>
              {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-beni-50 border border-beni-200 text-beni rounded-lg">
          {error}
        </div>
      )}

      {/* テーブル */}
      <div className="bg-white rounded-lg border border-gin overflow-hidden">
        <table className="w-full">
          <thead className="bg-shiro">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-sumi">書類名</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-sumi">種類</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-sumi">ステータス</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-sumi">顧客</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-sumi">ファイル</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-sumi">作成日</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-sumi">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gin">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-hai">
                  読み込み中...
                </td>
              </tr>
            ) : !data?.items?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-hai">
                  <FileText className="mx-auto h-12 w-12 text-gin mb-2" />
                  書類がありません
                </td>
              </tr>
            ) : (
              data.items.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-kinari-50 cursor-pointer"
                  onClick={() => onViewDetail(doc.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-sumi">{doc.name}</div>
                    {doc.description && (
                      <div className="text-sm text-hai truncate max-w-[200px]">
                        {doc.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ai/10 text-ai border border-ai/30">
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DOCUMENT_STATUS_COLORS[doc.status]}`}
                    >
                      {DOCUMENT_STATUS_LABELS[doc.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-sumi">
                    {doc.customer?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-sumi">
                    {doc.fileName ? (
                      <div>
                        <div className="truncate max-w-[150px]">{doc.fileName}</div>
                        <div className="text-xs text-hai">{formatFileSize(doc.fileSize)}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-sumi">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetail(doc.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {doc.fileName && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="アップロード済みファイルをダウンロード"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadFile(doc.id);
                          }}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      )}
                      {/* 一覧応答は template_data を含まないため templateType のみで判定。
                          template_data 未保存の場合の最終ガードは詳細画面で行う（#251）。 */}
                      {onPrintText &&
                        (doc.templateType === 'permit' ||
                          doc.type === 'permit' ||
                          doc.templateType === 'envelope-letter' ||
                          doc.type === 'envelope_letter') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title={
                              doc.templateType === 'envelope-letter' ||
                              doc.type === 'envelope_letter'
                                ? '封筒に文字だけ印刷'
                                : '台紙に文字だけ印刷'
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              onPrintText(doc.id);
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                      {canRegenerateDocument(doc.templateType) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="PDFを再生成してダウンロード"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(doc.id);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-hai">
            {data.pagination.total}件中 {(params.page - 1) * params.limit + 1}-
            {Math.min(params.page * params.limit, data.pagination.total)}件を表示
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(params.page - 1)}
              disabled={params.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-sumi">
              {params.page} / {data.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(params.page + 1)}
              disabled={params.page >= data.pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
