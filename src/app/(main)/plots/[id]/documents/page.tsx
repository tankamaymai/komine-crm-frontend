'use client';

import { useParams, useRouter } from 'next/navigation';
import { DocumentManagement } from '@/components/document-management';
import { DesktopOnlyGate } from '@/components/desktop-only-gate';

export default function PlotDocumentHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const plotId = params.id as string;

  return (
    <DesktopOnlyGate description="書類履歴の閲覧・PDFプレビューは画面幅 768px 以上のPCでの利用をお願いします。">
      <DocumentManagement
        contractPlotId={plotId}
        initialMode="list"
        onBack={() => router.push(`/plots/${plotId}`)}
      />
    </DesktopOnlyGate>
  );
}
