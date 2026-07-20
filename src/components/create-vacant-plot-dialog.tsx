'use client';

/**
 * 空き区画（物理区画のみ）先行登録ダイアログ（システム確認 項目⑦）
 *
 * 旧システムの「区画を先ず作り、そこに契約者情報を入れる」運用に対応する。
 * 契約者・契約情報なしで区画だけを登録し、区画残数管理に「空き」として表示させる。
 * 契約が決まったら台帳の新規区画登録（または契約追加API）で契約を紐づける。
 */

import { useState } from 'react';
import { FormDialog } from '@/components/shared/dialogs';
import { Input } from '@/components/ui/input';
import { createPhysicalPlot } from '@/lib/api/plots';
import { showApiSuccess, showApiError, showError } from '@/lib/toast';

interface CreateVacantPlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** 登録成功後（在庫の再取得など） */
  onCreated: () => void;
}

const initialForm = {
  plotNumber: '',
  areaName: '',
  areaSqm: '3.6',
  notes: '',
};

export function CreateVacantPlotDialog({ isOpen, onClose, onCreated }: CreateVacantPlotDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (key: keyof typeof initialForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleClose = () => {
    setForm(initialForm);
    onClose();
  };

  const handleSubmit = async () => {
    const plotNumber = form.plotNumber.trim();
    const areaName = form.areaName.trim();
    if (!plotNumber || !areaName) {
      showError('区画Noとエリア（区画名）は必須です');
      return;
    }
    const areaSqm = Number(form.areaSqm);
    if (!Number.isFinite(areaSqm) || areaSqm <= 0) {
      showError('面積は0より大きい数値で入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createPhysicalPlot({
        plotNumber,
        areaName,
        areaSqm,
        notes: form.notes.trim() || null,
      });
      if (response.success) {
        showApiSuccess('作成', '空き区画');
        setForm(initialForm);
        onCreated();
        onClose();
      } else {
        showApiError('空き区画登録', response.error?.message, response.error?.details);
      }
    } catch {
      showError('空き区画の登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      isOpen={isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit}
      title="空き区画を登録"
      description="契約者を決めずに区画だけを先に登録します。契約が決まったら台帳の新規区画登録で契約情報を入力してください。"
      submitText="登録"
      isLoading={isSubmitting}
    >
      <div>
        <label htmlFor="vacant-plot-number" className="block text-sm font-medium text-sumi mb-1">
          区画No <span className="text-beni">*</span>
        </label>
        <Input
          id="vacant-plot-number"
          value={form.plotNumber}
          onChange={set('plotNumber')}
          placeholder="例: A-100"
          maxLength={50}
        />
      </div>
      <div>
        <label htmlFor="vacant-area-name" className="block text-sm font-medium text-sumi mb-1">
          エリア（区画名） <span className="text-beni">*</span>
        </label>
        <Input
          id="vacant-area-name"
          value={form.areaName}
          onChange={set('areaName')}
          placeholder="例: 2 / 樹林 / 桜シェア葬F"
          maxLength={100}
        />
      </div>
      <div>
        <label htmlFor="vacant-area-sqm" className="block text-sm font-medium text-sumi mb-1">
          面積（㎡）
        </label>
        <Input
          id="vacant-area-sqm"
          type="number"
          step="0.001"
          min="0.001"
          value={form.areaSqm}
          onChange={set('areaSqm')}
          placeholder="3.6"
        />
      </div>
      <div>
        <label htmlFor="vacant-notes" className="block text-sm font-medium text-sumi mb-1">
          備考
        </label>
        <Input
          id="vacant-notes"
          value={form.notes}
          onChange={set('notes')}
          placeholder="任意"
          maxLength={2000}
        />
      </div>
    </FormDialog>
  );
}
