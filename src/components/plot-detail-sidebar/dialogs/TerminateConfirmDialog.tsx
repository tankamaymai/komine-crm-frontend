'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getContractorPlotNumber } from '@/lib/api/plots';

interface TerminateConfirmDialogProps {
  isOpen: boolean;
  /** one = この区画だけ / all = この人が今持っている区画を全部 */
  scope: 'one' | 'all';
  plotNumber: string;
  customerName: string;
  /** scope=all のとき、対象の区画番号を並べるために使う */
  customerId?: string;
  isLoading?: boolean;
  onTerminate: (reason: string) => void;
  onClose: () => void;
}

const REASON_MAX_LENGTH = 200;

export default function TerminateConfirmDialog({
  isOpen,
  scope,
  plotNumber,
  customerName,
  customerId,
  isLoading = false,
  onTerminate,
  onClose,
}: TerminateConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [allPlotNumbers, setAllPlotNumbers] = useState<string | null>(null);
  const [listError, setListError] = useState(false);

  const isAll = scope === 'all';

  useEffect(() => {
    if (!isOpen || !isAll || !customerId) return;
    let cancelled = false;
    setAllPlotNumbers(null);
    setListError(false);
    getContractorPlotNumber(customerId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) setAllPlotNumbers(res.data.plotNumber);
        else setListError(true);
      })
      .catch(() => {
        if (!cancelled) setListError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isAll, customerId]);

  if (!isOpen) return null;

  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length > 0 && trimmedReason.length <= REASON_MAX_LENGTH;
  const canSubmit = isReasonValid && acknowledged && !isLoading;

  const handleClose = () => {
    setReason('');
    setAcknowledged(false);
    onClose();
  };

  const title = isAll ? 'この人の全区画を解約' : 'この区画を解約';
  const targetLabel = isAll ? allPlotNumbers || plotNumber : plotNumber;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="bg-beni-dark text-white px-6 py-4 rounded-t-lg">
          <h3 className="text-base md:text-lg font-semibold">{title}</h3>
        </div>

        <div className="p-5 md:p-6 space-y-4">
          <div className="bg-beni-50 border border-beni-200 rounded-lg p-3 md:p-4 space-y-1">
            {isAll ? (
              <p className="text-sm text-sumi font-medium">
                この人がいま持っている区画を、全部解約します。別の日に買った区画も一緒に終わります。区画はそれぞれ空きに戻ります。
              </p>
            ) : (
              <p className="text-sm text-sumi font-medium">
                この区画の契約を解約します。区画は空きに戻ります。この人がほかに持っている区画はそのままです。
              </p>
            )}
            <p className="text-xs text-hai">
              お客様の名簿は消えません。間違えたときは、区画ごとに「契約を復活」で戻せます。
            </p>
          </div>

          <div className="bg-shiro rounded-lg p-3 md:p-4 border border-gin">
            <p className="text-sm text-hai mb-1">{isAll ? '解約する区画（全部）:' : '解約する区画:'}</p>
            <p className="font-semibold text-sumi break-words">
              {isAll && !allPlotNumbers && !listError ? '読み込み中...' : targetLabel}
              {customerName ? `（${customerName}）` : ''}
            </p>
            {isAll && listError && (
              <p className="mt-1 text-xs text-beni">
                持っている区画の一覧を読めませんでした。台帳でこの人の区画を確かめてから進めてください。
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="terminate-reason" className="text-sm font-medium text-sumi">
              解約理由 <span className="text-beni">*</span>
            </Label>
            <textarea
              id="terminate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isAll
                  ? '例：契約者からの申し出で、持っている区画をすべて返すため'
                  : '例：契約者からの申し出で、この区画を返すため'
              }
              maxLength={REASON_MAX_LENGTH}
              rows={3}
              className="mt-2 w-full rounded-lg border border-gin bg-white px-3 py-2 text-sm text-sumi placeholder:text-hai focus:border-beni focus:outline-none focus:ring-2 focus:ring-beni/30"
              disabled={isLoading}
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-hai">必須・履歴に記録されます</p>
              <p className="text-xs text-hai tabular-nums">
                {reason.length} / {REASON_MAX_LENGTH}
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              disabled={isLoading}
              className="mt-0.5 h-4 w-4 rounded border-gin text-beni focus:ring-beni/30"
            />
            <span className="text-sm text-sumi">
              {isAll ? (
                <>
                  上の区画を<strong>全部解約</strong>することを確認しました
                </>
              ) : (
                <>
                  この区画を<strong>解約</strong>することを確認しました
                </>
              )}
            </span>
          </label>
        </div>

        <div className="px-5 md:px-6 py-4 bg-shiro rounded-b-lg flex justify-end gap-2 md:gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isLoading} size="sm">
            キャンセル
          </Button>
          <Button
            onClick={() => canSubmit && onTerminate(trimmedReason)}
            disabled={!canSubmit}
            size="sm"
            className="bg-beni hover:bg-beni-dark text-white"
          >
            {isLoading ? '解約中...' : isAll ? '全部解約する' : '解約する'}
          </Button>
        </div>
      </div>
    </div>
  );
}
