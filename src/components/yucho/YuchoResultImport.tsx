'use client';

/**
 * ゆうちょ自動払込みの結果ファイルを取り込む。
 * 1. ファイルを選んで「中身を見る」（書き込まない）
 * 2. 内容を確かめて「入金を付ける」
 */

import { useRef, useState } from 'react';
import { AlertCircle, FileUp, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showError, showSuccess } from '@/lib/toast';
import {
  applyYuchoResult,
  fileToBase64,
  previewYuchoResult,
  type YuchoResultPlan,
  type YuchoResultRowStatus,
} from '@/lib/api/yucho';

const STATUS_TEXT: Record<YuchoResultRowStatus, string> = {
  will_record: '入金を付けます',
  already_paid: 'もう入金済み（何もしません）',
  no_billing: 'この年の請求がありません（何もしません）',
  amount_mismatch: '請求の残りより多い（何もしません）',
  failed: '引き落とせませんでした',
  unmatched: '台帳に見つかりません（何もしません）',
};

const STATUS_STYLE: Record<YuchoResultRowStatus, string> = {
  will_record: 'text-ai',
  already_paid: 'text-hai',
  no_billing: 'text-kohaku-dark',
  amount_mismatch: 'text-kohaku-dark',
  failed: 'text-beni',
  unmatched: 'text-kohaku-dark',
};

/** 本番の画面は裏側の返事を30秒しか待てないので、この人数ずつ分けて頼む */
const APPLY_BATCH = 40;

const yen = (amount: number) => `¥${amount.toLocaleString('ja-JP')}`;

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
};

interface YuchoResultImportProps {
  year: number;
  month: number;
  /** 入金を付けたあと、一覧を読み直す */
  onApplied?: () => void;
}

export function YuchoResultImport({ year, month, onApplied }: YuchoResultImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<YuchoResultPlan | null>(null);
  const [planKey, setPlanKey] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // 年・月を変えたら、読んだ結果は別の月のものになるので見せない
  const currentKey = `${year}-${month}`;
  const shownPlan = plan && planKey === currentKey ? plan : null;

  const reset = () => {
    setFile(null);
    setPlan(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRead = async () => {
    if (!file) return;
    setIsReading(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await previewYuchoResult({ year, month, fileBase64 });
      if (res.success) {
        setPlan(res.data);
        setPlanKey(currentKey);
      } else {
        setPlan(null);
        showError('結果ファイルを読めませんでした', res.error.message);
      }
    } catch (e) {
      showError('結果ファイルを読めませんでした', e instanceof Error ? e.message : String(e));
    } finally {
      setIsReading(false);
    }
  };

  const handleApply = async () => {
    if (!file || !shownPlan) return;
    setConfirmOpen(false);
    setIsApplying(true);
    const total = shownPlan.rows.length;
    let recordedCount = 0;
    let recordedAmount = 0;
    let notedFailedCount = 0;
    let skippedCount = 0;
    try {
      const fileBase64 = await fileToBase64(file);
      for (let lineFrom = 1; lineFrom <= total; lineFrom += APPLY_BATCH) {
        const lineTo = Math.min(lineFrom + APPLY_BATCH - 1, total);
        setProgress({ done: lineFrom - 1, total });
        const res = await applyYuchoResult({ year, month, fileBase64, lineFrom, lineTo });
        if (!res.success) {
          showError(
            '途中で止まりました',
            `${res.error.message}。${recordedCount}人には付いています。もう一度押すと、残りの人に付けます`
          );
          return;
        }
        recordedCount += res.data.recordedCount;
        recordedAmount += res.data.recordedAmount;
        notedFailedCount += res.data.notedFailedCount;
        skippedCount += res.data.skippedCount;
      }
      const notes = [
        notedFailedCount > 0 ? `引き落とせなかった${notedFailedCount}人は、請求の備考に理由を残しました` : '',
        skippedCount > 0 ? `${skippedCount}人は、その間に入金済みになっていたので付けていません` : '',
      ].filter(Boolean);
      showSuccess(`${recordedCount}人に入金を付けました（${yen(recordedAmount)}）`, notes.join('。'));
      reset();
      onApplied?.();
    } catch (e) {
      showError(
        '途中で止まりました',
        `${e instanceof Error ? e.message : String(e)}。${recordedCount}人には付いています。もう一度押すと、残りの人に付けます`
      );
    } finally {
      setIsApplying(false);
      setProgress(null);
    }
  };

  const s = shownPlan?.summary;
  const skippedNotes = s
    ? [
        s.already_paid.count > 0 ? `もう入金済み${s.already_paid.count}人` : '',
        s.no_billing.count > 0
          ? `請求がまだ無い${s.no_billing.count}人（先に上の「請求を作る」を押してから、もう一度読んでください）`
          : '',
        s.amount_mismatch.count > 0
          ? `金額が合わない${s.amount_mismatch.count}人（窓口入金などで直してください）`
          : '',
        s.unmatched.count > 0 ? `台帳に見つからない${s.unmatched.count}人` : '',
      ].filter(Boolean)
    : [];
  const failedWithBilling = shownPlan?.rows.filter((r) => r.status === 'failed' && r.billingId).length ?? 0;
  const canApply =
    !!shownPlan && !shownPlan.monthMismatch && ((s?.will_record.count ?? 0) > 0 || failedWithBilling > 0);

  return (
    <div className="bg-white rounded-lg border border-gin p-3 md:p-4 shadow-elegant-sm space-y-3">
      <div>
        <p className="text-sm font-medium text-sumi">引き落としの結果を取り込む</p>
        <p className="text-xs text-hai mt-1">
          引き落としが終わったら、ゆうちょＢｉｚダイレクトから結果ファイルを落として、ここで選んでください。
          画面に載せた人は「自動払込み処理結果照会」→「外部ファイル出力」で<strong>全銀データ</strong>を、
          1本で送った人は「外部ファイル受信」で結果を落とします。
          {year}年{month}月の分として読みます。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          aria-label="結果ファイル"
          className="text-sm file:mr-2 file:rounded file:border file:border-gin file:bg-kinari file:px-3 file:py-1 file:text-sm"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPlan(null);
          }}
        />
        <Button variant="outline" size="sm" onClick={handleRead} disabled={!file || isReading || isApplying}>
          {isReading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileUp className="w-4 h-4 mr-1.5" />}
          中身を見る
        </Button>
      </div>

      {shownPlan && s && (
        <div className="space-y-3">
          {shownPlan.monthMismatch && (
            <div className="flex items-start gap-2 rounded-md border border-kohaku-200 bg-kohaku-50 p-3 text-sm text-kohaku-dark">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                このファイルの引き落とし日は {formatDate(shownPlan.transferDate)} です。上で選んでいる{month}月と違います。
                上の「対象」をファイルの月に合わせてから、もう一度「中身を見る」を押してください。
              </p>
            </div>
          )}

          <p className="text-sm text-sumi">
            引き落とし日 {formatDate(shownPlan.transferDate)}・全{shownPlan.rows.length}人。
            <span className="text-ai font-medium">
              {s.will_record.count}人に入金を付けます（{yen(s.will_record.amount)}）。
            </span>
            {s.failed.count > 0 && (
              <span className="text-beni font-medium"> 引き落とせなかった人が{s.failed.count}人います。</span>
            )}
          </p>
          {skippedNotes.length > 0 && (
            <p className="text-xs text-hai">何もしない人: {skippedNotes.join(' ／ ')}</p>
          )}

          <div className="max-h-80 overflow-auto rounded-md border border-gin">
            <table className="w-full text-xs md:text-sm">
              <thead className="sticky top-0 bg-kinari text-hai">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">区画</th>
                  <th className="px-2 py-1.5 text-left font-medium">契約者</th>
                  <th className="px-2 py-1.5 text-right font-medium">金額</th>
                  <th className="px-2 py-1.5 text-left font-medium">ゆうちょの結果</th>
                  <th className="px-2 py-1.5 text-left font-medium">この取り込みで</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gin">
                {shownPlan.rows.map((row) => (
                  <tr key={row.lineNo}>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {row.areaName ? `${row.areaName} ${row.displayNumber || row.plotNumber}` : '—'}
                    </td>
                    <td className="px-2 py-1.5">
                      {row.customerName ?? <span className="text-hai">{row.kana}</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{yen(row.amount)}</td>
                    <td className={`px-2 py-1.5 ${row.resultCode === '0' ? 'text-sumi' : 'text-beni'}`}>
                      {row.resultLabel}
                    </td>
                    <td className={`px-2 py-1.5 ${STATUS_STYLE[row.status]}`}>
                      {row.status === 'failed'
                        ? row.billingId
                          ? '未入金のまま。請求の備考に理由を残します'
                          : '未入金のまま'
                        : row.status === 'amount_mismatch' && row.remainingAmount != null
                          ? `請求の残りは${yen(row.remainingAmount)}（何もしません）`
                          : STATUS_TEXT[row.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ai" size="sm" onClick={() => setConfirmOpen(true)} disabled={!canApply || isApplying}>
              {isApplying ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              {progress
                ? `入金を付けています（${progress.done}/${progress.total}人）`
                : `${s.will_record.count}人に入金を付ける`}
            </Button>
            <Button variant="outline" size="sm" onClick={reset} disabled={isApplying}>
              やめる
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="入金を付けますか"
        description={
          shownPlan && s
            ? `${s.will_record.count}人に、${formatDate(shownPlan.transferDate)}の入金（合計${yen(
                s.will_record.amount
              )}）を付けます。引き落とせなかった人は未入金のままで、請求の備考に理由を残します。同じファイルをもう一度取り込んでも、二重には付きません。`
            : ''
        }
        confirmLabel="入金を付ける"
        onConfirm={handleApply}
      />
    </div>
  );
}
