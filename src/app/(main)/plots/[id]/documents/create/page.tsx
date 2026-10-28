'use client';

import { useParams, useRouter } from 'next/navigation';
import { usePlotDetail } from '@/hooks/usePlots';
import { getPrimaryCustomer } from '@/lib/api/plots';
import { DocumentManagement } from '@/components/document-management';
import { DesktopOnlyGate } from '@/components/desktop-only-gate';

export default function PlotDocumentCreatePage() {
  const params = useParams();
  const router = useRouter();
  const plotId = params.id as string;

  // plotDetail は書類テンプレートへの自動挿入に使用
  // usePlotDetail は in-memory キャッシュ (2分TTL) を持つため、
  // 区画詳細ページから遷移した場合はキャッシュヒットで再フェッチしない
  const { plot } = usePlotDetail(plotId);
  const customer = plot ? getPrimaryCustomer(plot) : null;

  return (
    <DesktopOnlyGate description="書類作成はテンプレート選択・フィールド入力・PDFプレビューを伴うため、画面幅 768px 以上のPCでの利用をお願いします。">
      <DocumentManagement
        contractPlotId={plotId}
        customerId={customer?.id}
        customerName={customer?.name}
        plotDetail={plot || undefined}
        initialMode="templates"
        onBack={() => router.push(`/plots/${plotId}`)}
      />
    </DesktopOnlyGate>
  );
}
