'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  deletePlot,
  restoreContract,
  terminateContract,
  terminateAllByContractor,
} from '@/lib/api/plots';
import { showError, showSuccess, showApiSuccess, showApiError } from '@/lib/toast';
import PlotDetailView from '@/components/plot-detail-view';
import {
  DeleteConfirmDialog,
  RestoreConfirmDialog,
  TerminateConfirmDialog,
} from '@/components/plot-detail-sidebar';

type TerminateTarget = {
  scope: 'one' | 'all';
  plotCode: string;
  customerName: string;
  customerId?: string;
};

export default function PlotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const plotId = params.id as string;

  const [deleteTarget, setDeleteTarget] = useState<{ code: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{ code: string; name: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState<TerminateTarget | null>(null);
  const [isTerminating, setIsTerminating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await deletePlot(plotId);
      if (response.success) {
        setDeleteTarget(null);
        showApiSuccess('削除', '区画データ');
        router.push('/plots');
      } else {
        showApiError('データ削除', response.error?.message, response.error?.details);
      }
    } catch {
      showError('削除中にエラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async (reason: string) => {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      const response = await restoreContract(plotId, { reason });
      if (response.success) {
        setRestoreTarget(null);
        showSuccess('契約区画を復活しました');
        setRefreshKey((k) => k + 1);
      } else {
        showApiError('契約復活', response.error?.message, response.error?.details);
      }
    } catch {
      showError('復活中にエラーが発生しました');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleTerminate = async (reason: string) => {
    if (!terminateTarget) return;
    setIsTerminating(true);
    try {
      const response =
        terminateTarget.scope === 'all' && terminateTarget.customerId
          ? await terminateAllByContractor(terminateTarget.customerId, { reason })
          : await terminateContract(plotId, { reason });
      if (response.success) {
        setTerminateTarget(null);
        showSuccess(response.data.message);
        setRefreshKey((k) => k + 1);
      } else {
        showApiError('契約解約', response.error?.message, response.error?.details);
      }
    } catch {
      showError('解約中にエラーが発生しました');
    } finally {
      setIsTerminating(false);
    }
  };

  return (
    <div className="flex-1 p-3 md:p-6 overflow-auto">
      <PlotDetailView
        key={refreshKey}
        plotId={plotId}
        onBack={() => router.push('/plots')}
        onEdit={() => router.push(`/plots/${plotId}/edit`)}
        onDelete={(code, name) => setDeleteTarget({ code, name })}
        onRestore={(code, name) => setRestoreTarget({ code, name })}
        onTerminate={setTerminateTarget}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        targetName={deleteTarget?.name || ''}
        targetCode={deleteTarget?.code || ''}
        isLoading={isDeleting}
        onDelete={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <RestoreConfirmDialog
        isOpen={!!restoreTarget}
        plotNumber={restoreTarget?.code || ''}
        customerName={restoreTarget?.name || ''}
        isLoading={isRestoring}
        onRestore={handleRestore}
        onClose={() => setRestoreTarget(null)}
      />

      <TerminateConfirmDialog
        key={terminateTarget ? `${terminateTarget.scope}-${terminateTarget.customerId ?? ''}` : 'closed'}
        isOpen={!!terminateTarget}
        scope={terminateTarget?.scope ?? 'one'}
        plotNumber={terminateTarget?.plotCode || ''}
        customerName={terminateTarget?.customerName || ''}
        customerId={terminateTarget?.customerId}
        isLoading={isTerminating}
        onTerminate={handleTerminate}
        onClose={() => setTerminateTarget(null)}
      />
    </div>
  );
}
