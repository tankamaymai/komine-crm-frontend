'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updatePlot } from '@/lib/api/plots';
import { PlotFormData, plotFormDataToUpdateRequest } from '@/lib/validations/plot-form';
import type { UpdatePlotRequest } from '@komine/types';
import { showError, showApiSuccess, showApiError } from '@/lib/toast';
import PlotForm from '@/components/plot-form';
import PageHeader from '@/components/page-header';
import { DesktopOnlyGate } from '@/components/desktop-only-gate';
import { LegacyAwareValue } from '@/components/legacy-aware-value';
import { usePlotDetail } from '@/hooks/usePlots';

export default function EditPlotPage() {
  const params = useParams();
  const router = useRouter();
  const plotId = params.id as string;
  const [isLoading, setIsLoading] = useState(false);

  const { plot: plotDetail, isLoading: isPlotDetailLoading } = usePlotDetail(plotId);

  const handleSave = async (data: PlotFormData, changeReason?: string) => {
    setIsLoading(true);
    try {
      const request = plotFormDataToUpdateRequest(data);
      // 変更理由（#261）。指定があれば本更新で記録される履歴の変更事由に反映される
      if (changeReason) {
        request.changeReason = changeReason;
      }
      let response = await updatePlot(plotId, request);
      if (!response.success && response.error?.code === 'CONFLICT') {
        const proceed = window.confirm(
          response.error.message || 'この承諾書番号は、ほかの契約でも使われています。このまま使いますか？'
        );
        if (!proceed) return;
        response = await updatePlot(plotId, {
          ...request,
          allowDuplicateAcceptanceNumber: true,
        } as UpdatePlotRequest);
      }
      if (response.success) {
        showApiSuccess('更新', '区画情報');
        router.push(`/plots/${plotId}`);
      } else {
        showApiError('区画情報更新', response.error?.message, response.error?.details);
      }
    } catch {
      showError('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/plots/${plotId}`);
  };

  return (
    <DesktopOnlyGate description="区画情報の編集は多項目フォームのため、画面幅 768px 以上のPCでの利用をお願いします。">
      <PageHeader
        title="区画情報編集"
        theme="kohaku"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        }
      />
      <div className="flex-1 p-3 md:p-6 overflow-auto">
        {/* パンくずナビゲーション */}
        <nav className="flex items-center gap-1.5 text-sm text-hai mb-3" aria-label="パンくず">
          <Link href="/plots" className="hover:text-matsu transition-colors">
            台帳
          </Link>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/plots/${plotId}`} className="hover:text-matsu transition-colors truncate">
            {/* 表示用区画番号を優先・legacy-* は「整備中」ミュート表示 #158/#164 */}
            {plotDetail?.physicalPlot ? (
              <LegacyAwareValue
                value={plotDetail.physicalPlot.displayNumber || plotDetail.physicalPlot.plotNumber}
                kind="plotNumber"
              />
            ) : (
              '区画詳細'
            )}
          </Link>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sumi font-medium">編集</span>
        </nav>

        <div className="mb-4 flex justify-end">
          <Button size="sm" variant="outline" onClick={handleCancel} className="cursor-pointer">
            キャンセル
          </Button>
        </div>
        {isPlotDetailLoading && !plotDetail ? (
          <div className="flex items-center justify-center h-64 text-hai">
            区画情報を読み込み中...
          </div>
        ) : (
          <PlotForm
            plotDetail={plotDetail || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        )}
      </div>
    </DesktopOnlyGate>
  );
}
