import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentDetailView } from '@/components/document-detail-view';
import type { DocumentDetail } from '@/lib/api/documents';

/**
 * 書類詳細のダウンロードボタン表示テスト（#249 / #251）
 *
 * - fileName あり → 「ファイルをダウンロード」（実ファイルDL）
 * - templateType + template_data あり → 「PDF再生成」
 * - templateType あり・template_data 無し → 「PDF再生成」非表示
 */

const useDocumentDetailMock = jest.fn();

jest.mock('@/hooks/useDocuments', () => {
  const actual = jest.requireActual('@/hooks/useDocuments');
  return {
    ...actual,
    useDocumentDetail: (...args: unknown[]) => useDocumentDetailMock(...args),
  };
});

function makeDoc(overrides: Partial<DocumentDetail>): DocumentDetail {
  return {
    id: 'doc-x',
    contractPlotId: null,
    customerId: null,
    type: 'invoice',
    name: 'テスト書類',
    description: null,
    status: 'draft',
    fileName: null,
    fileSize: null,
    mimeType: null,
    templateType: null,
    generatedAt: null,
    sentAt: null,
    createdBy: null,
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    fileKey: null,
    templateData: null,
    contractPlot: null,
    customer: null,
    ...overrides,
  };
}

function renderWithDoc(doc: DocumentDetail) {
  const onDownload = jest.fn();
  const onDownloadFile = jest.fn();
  const onPrintText = jest.fn();
  useDocumentDetailMock.mockReturnValue({
    data: doc,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  });
  render(
    <DocumentDetailView
      documentId={doc.id}
      onBack={jest.fn()}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
      onDownload={onDownload}
      onDownloadFile={onDownloadFile}
      onPrintText={onPrintText}
    />
  );
  return { onDownload, onDownloadFile, onPrintText };
}

describe('DocumentDetailView ダウンロードボタン', () => {
  beforeEach(() => {
    useDocumentDetailMock.mockReset();
  });

  it('①fileName あり・templateType 無し → 実ファイルDLボタンのみ表示', () => {
    const { onDownloadFile } = renderWithDoc(
      makeDoc({
        fileName: 'scan.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
        templateType: null,
        templateData: null,
      })
    );
    const fileBtn = screen.getByText('ファイルをダウンロード');
    expect(fileBtn).toBeInTheDocument();
    expect(screen.queryByText('PDF再生成')).not.toBeInTheDocument();

    fireEvent.click(fileBtn);
    expect(onDownloadFile).toHaveBeenCalledWith('doc-x');
  });

  it('②templateType あり・template_data 無し → PDF再生成ボタン非表示', () => {
    renderWithDoc(
      makeDoc({
        fileName: null,
        templateType: 'permit',
        templateData: null,
      })
    );
    expect(screen.queryByText('PDF再生成')).not.toBeInTheDocument();
    expect(screen.queryByText('ファイルをダウンロード')).not.toBeInTheDocument();
  });

  it('③fileName・templateType・template_data 全てあり → 両ボタン表示', () => {
    const { onDownload, onDownloadFile } = renderWithDoc(
      makeDoc({
        fileName: 'invoice.pdf',
        fileSize: 2000,
        mimeType: 'application/pdf',
        templateType: 'invoice',
        templateData: { invoiceNumber: 'INV-1' },
      })
    );
    const fileBtn = screen.getByText('ファイルをダウンロード');
    const regenBtn = screen.getByText('PDF再生成');
    expect(fileBtn).toBeInTheDocument();
    expect(regenBtn).toBeInTheDocument();

    fireEvent.click(fileBtn);
    expect(onDownloadFile).toHaveBeenCalledWith('doc-x');
    fireEvent.click(regenBtn);
    expect(onDownload).toHaveBeenCalledWith('doc-x');
  });

  it('templateType + template_data ありだが fileName 無し → PDF再生成のみ', () => {
    renderWithDoc(
      makeDoc({
        fileName: null,
        templateType: 'invoice',
        templateData: { invoiceNumber: 'INV-2' },
      })
    );
    expect(screen.getByText('PDF再生成')).toBeInTheDocument();
    expect(screen.queryByText('ファイルをダウンロード')).not.toBeInTheDocument();
  });

  it('保存済みの許可証は、台紙に文字だけ印刷できる', () => {
    const { onPrintText } = renderWithDoc(
      makeDoc({
        type: 'permit',
        templateType: 'permit',
        templateData: { applicantName: '山田太郎', issueYear: '2026' },
      })
    );
    const printBtn = screen.getByText('台紙に文字だけ印刷');
    fireEvent.click(printBtn);
    expect(onPrintText).toHaveBeenCalledWith('doc-x');
  });
});
