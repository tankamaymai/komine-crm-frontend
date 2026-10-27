'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createPlot } from '@/lib/api/plots';
import { PlotFormData, plotFormDataToCreateRequest } from '@/lib/validations/plot-form';
import { showError, showSuccess, showApiSuccess, showApiError } from '@/lib/toast';
import PlotForm from '@/components/plot-form';
import PageHeader from '@/components/page-header';
import { DesktopOnlyGate } from '@/components/desktop-only-gate';

export default function NewPlotPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (data: PlotFormData) => {
    setIsLoading(true);
    try {
      const request = plotFormDataToCreateRequest(data);
      const response = await createPlot(request);
      if (response.success) {
        const plotCount = 1 + (request.additionalPlots?.length ?? 0);
        if (plotCount > 1) {
          showSuccess(`${plotCount}区画を、同じお客様でまとめて登録しました`);
        } else {
          showApiSuccess('作成', '区画');
        }
        router.push('/plots');
      } else {
        showApiError('区画登録', response.error?.message, response.error?.details);
      }
    } catch {
      showError('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/plots');
  };

  return (
    <DesktopOnlyGate description="区画の新規登録は多項目フォームのため、画面幅 768px 以上のPCでの利用をお願いします。">
      <PageHeader
        title="新規区画登録"
        theme="kohaku"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        }
      />
      <div className="flex-1 p-3 md:p-6 overflow-auto">
        <div className="mb-4 flex justify-end">
          <Button size="sm" variant="outline" onClick={handleCancel} className="cursor-pointer">
            キャンセル
          </Button>
        </div>
        <PlotForm
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </DesktopOnlyGate>
  );
}
