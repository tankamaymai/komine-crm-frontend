'use client';

import { useMemo, useState } from 'react';
import { Landmark, Download, FileText, Wallet, Loader2, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { BaseDialog } from '@/components/shared/dialogs/BaseDialog';
import { LegacyAwareValue } from '@/components/legacy-aware-value';
import { showSuccess, showError } from '@/lib/toast';
import { useAsyncData } from '@/hooks/useAsyncData';
import {
  getYuchoBilling,
  exportYuchoCsv,
  downloadBlob,
  type YuchoBillingItem,
  type YuchoExportKind,
} from '@/lib/api/yucho';
import {
  CLOSED_REASON_LABEL,
  daysInMonth,
  getYuchoClosedReason,
  nearestYuchoBusinessDay,
  weekdayLabel,
} from '@/lib/yucho-business-day';

const THIS_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const DEFAULT_TRANSFER_DAY = 15;

function formatYen(amount: number) {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/**
 * 記号番号があれば「記号-番号」を組み立てる（backend yuchoAccount.formatSymbolNumber と同ロジック）。
 * どちらか欠ければ null を返し、呼び出し側で従来の支店名推定にフォールバックさせる。
 */
function formatSymbolNumber(
  symbol: string | null | undefined,
  num: string | null | undefined,
): string | null {
  const s = symbol?.replace(/[^\d]/g, '') ?? '';
  const n = num?.replace(/[^\d]/g, '') ?? '';
  if (!s || !n) return null;
  return `${s}-${n}`;
}

/**
 * ゆうちょ風の表示「記号-番号」を組み立てる。
 * #305: CSV出力（backend）は記号番号(yuchoSymbol/yuchoNumber)を正準ソースにするため、
 * プレビュー表示も記号番号があればそれを優先し、CSVと乖離しないようにする。
 * 記号番号が無い場合のみ、従来の支店名(branch_name)の3桁数字から「1{支店コード}0」を推定。
 */
export function formatYuchoAccount(item: YuchoBillingItem): string {
  const info = item.billingInfo;
  if (!info) return '—';
  // 記号番号があれば最優先（CSVと同一ソース）
  const fromSymbolNumber = formatSymbolNumber(info.yuchoSymbol, info.yuchoNumber);
  if (fromSymbolNumber) return fromSymbolNumber;
  // フォールバック: 支店名の3桁から記号を推定（旧データ向け）
  const branch = (info.branchName ?? '').match(/\d{3}/)?.[0];
  const symbol = branch ? `1${branch}0` : info.branchName ?? '';
  const number = info.accountNumber ?? '';
  if (!symbol && !number) return '—';
  return `${symbol}${symbol && number ? '-' : ''}${number}`;
}

function statusBadge(status: string) {
  const isUnpaid = status === 'unpaid' || status === 'pending';
  const isPaid = status === 'paid';
  const styles = isPaid
    ? 'bg-ai/10 text-ai border-ai/30'
    : isUnpaid
      ? 'bg-matsu-50 text-matsu border-matsu-200'
      : 'bg-kinari text-hai border-gin';
  const label = isPaid ? '支払済' : isUnpaid ? '請求対象' : status;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs border font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

export default function YuchoManagement() {
  const [billingYear, setBillingYear] = useState(THIS_YEAR);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sendMethod, setSendMethod] = useState<'browser' | 'zengin'>('browser');
  const [billingMonth, setBillingMonth] = useState(new Date().getMonth() + 1);
  const [transferDay, setTransferDay] = useState(() =>
    nearestYuchoBusinessDay(THIS_YEAR, new Date().getMonth() + 1, DEFAULT_TRANSFER_DAY),
  );

  const { data, isLoading, error } = useAsyncData(
    () =>
      getYuchoBilling({
        year: billingYear,
        month: billingMonth,
        status: 'unbilled',
        category: 'management',
      }),
    { deps: [billingYear, billingMonth] },
  );

  const changePeriod = (year: number, month: number) => {
    setBillingYear(year);
    setBillingMonth(month);
    setTransferDay((day) => nearestYuchoBusinessDay(year, month, day));
  };

  const dayOptions = useMemo(
    () =>
      Array.from({ length: daysInMonth(billingYear, billingMonth) }, (_, i) => {
        const day = i + 1;
        const closed = getYuchoClosedReason(billingYear, billingMonth, day);
        return {
          day,
          label: `${day}日（${weekdayLabel(billingYear, billingMonth, day)}）`,
          closedLabel: closed ? CLOSED_REASON_LABEL[closed] : null,
        };
      }),
    [billingYear, billingMonth],
  );

  const summary = data?.summary;
  const management = useMemo(
    () => (data?.items ?? []).filter((i) => i.category === 'management'),
    [data],
  );
  const managementTotal = summary?.byCategory.management.amount ?? 0;
  const totalCount = summary?.totalCount ?? 0;
  // 実際にCSV（振替ファイル）へ出力される件数・金額と、口座未登録で除外される件数（#172）
  const exportableCount = summary?.exportableCount ?? 0;
  const exportableAmount = summary?.exportableAmount ?? 0;
  const excludedNoAccountCount = summary?.excludedNoAccountCount ?? 0;
  const zenginReady = data?.exportSettings?.zenginReady ?? false;
  const zenginMissing = data?.exportSettings?.missing ?? [];

  const [previewText, setPreviewText] = useState<string>('');
  const [previewKind, setPreviewKind] = useState<YuchoExportKind>('debit');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const periodLabel = `${billingYear}年${billingMonth}月`;
  const transferDateLabel = `${billingYear}/${billingMonth}/${transferDay}（${weekdayLabel(billingYear, billingMonth, transferDay)}）`;

  const buildExportParams = (kind: YuchoExportKind) => ({
    year: billingYear,
    month: billingMonth,
    category: 'management' as const,
    kind,
    transferDay,
    transferMonth: billingMonth,
  });

  const fileLabel = (kind: YuchoExportKind) =>
    kind === 'payer_master' ? '名簿CSV' : kind === 'zengin' ? '120文字ファイル' : '決済CSV';

  const openPreview = async (kind: YuchoExportKind) => {
    if (kind === 'zengin' && !zenginReady) {
      showError(
        '会社の番号が未入力',
        zenginMissing.length > 0
          ? `${zenginMissing.join('、')}を設定してください`
          : '委託者コードなどの会社設定が未入力です',
      );
      return;
    }
    setPreviewKind(kind);
    setPreviewOpen(true);
    setIsPreviewLoading(true);
    try {
      const blob = await exportYuchoCsv(buildExportParams(kind));
      const text = new TextDecoder('shift_jis').decode(await blob.arrayBuffer());
      setPreviewText(text);
    } catch (e) {
      showError('プレビューの取得に失敗しました', e instanceof Error ? e.message : String(e));
      setPreviewText('');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownload = async (kind: YuchoExportKind) => {
    if (kind === 'zengin' && !zenginReady) {
      showError(
        '会社の番号が未入力',
        zenginMissing.length > 0
          ? `${zenginMissing.join('、')}を設定してください`
          : '委託者コードなどの会社設定が未入力です',
      );
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportYuchoCsv(buildExportParams(kind));
      const ext = kind === 'zengin' ? 'txt' : 'csv';
      const monthKey = String(billingMonth).padStart(2, '0');
      const name =
        kind === 'payer_master'
          ? `yucho-payer-master-${billingYear}-${monthKey}-management`
          : kind === 'zengin'
            ? `yucho-zengin-${billingYear}-${monthKey}-management`
            : `yucho-debit-${billingYear}-${monthKey}-management`;
      downloadBlob(`${name}.${ext}`, blob);
      const excludedNote =
        excludedNoAccountCount > 0 ? `（口座未登録${excludedNoAccountCount}件は除外）` : '';
      showSuccess(
        `${fileLabel(kind)}を出力しました`,
        `${periodLabel} ${exportableCount}件出力${excludedNote}`,
      );
      setPreviewOpen(false);
    } catch (e) {
      showError('ファイル出力に失敗しました', e instanceof Error ? e.message : String(e));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-kinari">
      <PageHeader
        title="ゆうちょ連携"
        subtitle="ゆうちょＢｉｚダイレクト用ファイルの作成・出力"
        theme="ai"
        icon={<Landmark className="w-4 h-4 md:w-5 md:h-5 text-white" />}
      />

      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6">
        {/* 対象期間選択 */}
        <div className="bg-white rounded-lg border border-gin p-3 md:p-4 shadow-elegant-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-sumi whitespace-nowrap">対象</label>
              <Select
                value={String(billingYear)}
                onValueChange={(v) => changePeriod(Number(v), billingMonth)}
              >
                <SelectTrigger id="yucho-year-select" className="w-28 md:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(billingMonth)}
                onValueChange={(v) => changePeriod(billingYear, Number(v))}
              >
                <SelectTrigger id="yucho-month-select" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-hai">
                この月が請求月で、今年が番の人だけ出ます（毎年・5年に1回・10年に1回）
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-sumi whitespace-nowrap">引き落とし日</label>
              <Select
                value={String(transferDay)}
                onValueChange={(v) => setTransferDay(Number(v))}
              >
                <SelectTrigger id="yucho-transfer-day-select" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((option) => (
                    <SelectItem
                      key={option.day}
                      value={String(option.day)}
                      disabled={option.closedLabel != null}
                    >
                      {option.label}
                      {option.closedLabel ? ` 休み（${option.closedLabel}）` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gin space-y-3">
            <p className="text-xs text-hai">
              このあと人が、ゆうちょＢｉｚダイレクト（法人）にログインしてファイルを載せます。システムはログインしません。
              ゆうちょの休み（土日・祝日・年末年始）は選べません。ファイルは引き落とし日の2営業日前の17時までに載せてください。
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-medium text-sumi">送り方</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={sendMethod === 'browser' ? 'ai' : 'outline'}
                  onClick={() => setSendMethod('browser')}
                >
                  画面に載せる（2本のCSV）
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={sendMethod === 'zengin' ? 'ai' : 'outline'}
                  onClick={() => setSendMethod('zengin')}
                >
                  1本で送る（120文字）
                </Button>
              </div>
            </div>
            {sendMethod === 'browser' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPreview('payer_master')}
                  disabled={exportableCount === 0 || isLoading}
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  名簿を見る
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('payer_master')}
                  disabled={exportableCount === 0 || isLoading || isExporting}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  名簿CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPreview('debit')}
                  disabled={exportableCount === 0 || isLoading}
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  決済を見る
                </Button>
                <Button
                  variant="ai"
                  size="sm"
                  onClick={() => handleDownload('debit')}
                  disabled={exportableCount === 0 || isLoading || isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1.5" />
                  )}
                  決済CSV
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {!zenginReady && (
                  <p className="text-xs text-matsu">
                    会社の番号（委託者コード）が未入力のため、120文字ファイルは出せません。
                    {zenginMissing.length > 0 ? ` 足りないもの: ${zenginMissing.join('、')}` : ''}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPreview('zengin')}
                    disabled={exportableCount === 0 || isLoading || !zenginReady}
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    プレビュー
                  </Button>
                  <Button
                    variant="ai"
                    size="sm"
                    onClick={() => handleDownload('zengin')}
                    disabled={exportableCount === 0 || isLoading || isExporting || !zenginReady}
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1.5" />
                    )}
                    120文字ファイル
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-white rounded-lg border border-matsu-200 p-3 md:p-4 shadow-elegant-sm">
            <div className="flex items-start gap-2 text-matsu">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">データの取得に失敗しました</p>
                <p className="text-xs text-hai mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 口座未登録による除外の警告（#172: 無言除外で請求漏れに気づけない問題への可視化） */}
        {!isLoading && excludedNoAccountCount > 0 && (
          <div className="bg-kohaku-50 border border-kohaku-200 rounded-lg p-3 md:p-4 shadow-elegant-sm">
            <div className="flex items-start gap-2 text-kohaku-dark">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">
                  {excludedNoAccountCount}人は、ゆうちょの口座番号が無いので引き落としファイルに入りません
                </p>
                <p className="text-xs mt-0.5">
                  一覧の {totalCount}人のうち、ファイルに出るのは {exportableCount}人です。記号・番号が「—」の人は、窓口や振込など、別の方法で請求してください。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* サマリー */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <StatCard
            label="管理料合計"
            value={formatYen(managementTotal)}
            description={`${management.length}件`}
            icon={<Wallet className="w-4 h-4" />}
            theme="matsu"
          />
          <StatCard
            label="ファイルに出る分"
            value={formatYen(exportableAmount)}
            description={
              excludedNoAccountCount > 0
                ? `全${totalCount}件のうち${exportableCount}件`
                : `${exportableCount}件`
            }
            icon={<Landmark className="w-4 h-4" />}
            theme="ai"
          />
          <StatCard
            label="引落予定日"
            value={transferDateLabel}
            description={sendMethod === 'zengin' ? '1本で送る' : '画面に載せる'}
            icon={<FileText className="w-4 h-4" />}
            theme="kohaku"
          />
        </div>

        <div>
          {isLoading ? (
            <LoadingState />
          ) : (
            <ManagementTable items={management} periodLabel={periodLabel} />
          )}
        </div>
      </div>

      {/* CSVプレビューダイアログ */}
      <BaseDialog
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`${fileLabel(previewKind)}のプレビュー`}
        description={`${periodLabel} ${fileLabel(previewKind)}（出力${exportableCount}件 / ${formatYen(exportableAmount)}${
          excludedNoAccountCount > 0 ? ` ・口座未登録${excludedNoAccountCount}件は除外` : ''
        }）`}
        size="full"
        footer={
          <>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              閉じる
            </Button>
            <Button
              variant="ai"
              onClick={() => handleDownload(previewKind)}
              disabled={exportableCount === 0 || isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1.5" />
              )}
              ダウンロード
            </Button>
          </>
        }
      >
        {isPreviewLoading ? (
          <div className="flex items-center justify-center p-8 text-hai">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            読み込み中...
          </div>
        ) : (
          <pre className="bg-sumi text-white text-[10px] md:text-xs p-3 md:p-4 rounded-md overflow-auto max-h-[50vh] whitespace-pre font-mono">
            {previewText || '出力対象データがありません'}
          </pre>
        )}
        <p className="text-[10px] md:text-xs text-hai mt-2">
          {previewKind === 'zengin'
            ? '公式の120文字きっかり（全銀形式）。ゆうちょＢｉｚダイレクトのファイル受付に載せます。'
            : previewKind === 'payer_master'
              ? '新しいお客を載せる名簿です。金額は入っていません。'
              : '今回引き落とす金額の一覧です。右端が金額です。'}
        </p>
      </BaseDialog>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="bg-white rounded-lg border border-gin p-8 md:p-12 text-center">
      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-hai" />
      <p className="text-sm text-hai">読み込み中...</p>
    </div>
  );
}

function ManagementTable({
  items,
  periodLabel,
}: {
  items: YuchoBillingItem[];
  periodLabel: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Wallet className="w-6 h-6" />}
        title={`${periodLabel}の管理料請求対象がありません`}
        description="月を切り替えるか、区画の請求月と管理料が入っているか確認してください。"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const target = document.getElementById('yucho-month-select');
              target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              target?.focus();
            }}
          >
            対象月を変更
          </Button>
        }
      />
    );
  }
  return (
    <>
      <div className="hidden md:block bg-white rounded-lg border border-gin shadow-elegant-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-kinari text-hai text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-medium">区画番号</th>
                <th className="text-left px-4 py-3 font-medium">区画名</th>
                <th className="text-left px-4 py-3 font-medium">契約者</th>
                <th className="text-left px-4 py-3 font-medium">記号・番号</th>
                <th className="text-right px-4 py-3 font-medium">金額</th>
                <th className="text-center px-4 py-3 font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.sourceId} className="border-t border-gin hover:bg-kinari/50">
                  <td className="px-4 py-3 font-mono text-sumi">
                    {/* displayNumber 優先・legacy-* 等は「整備中」ミュート表示 #283 */}
                    <LegacyAwareValue value={item.displayNumber || item.plotNumber} kind="plotNumber" />
                  </td>
                  <td className="px-4 py-3 text-sumi">
                    {/* legacy-* エリア値は「整備中」ミュート表示 #307 */}
                    <LegacyAwareValue value={item.areaName} kind="areaName" />
                  </td>
                  <td className="px-4 py-3 text-sumi">
                    <div>{item.customerName ?? '—'}</div>
                    <div className="text-xs text-hai">{item.customerNameKana ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-hai">{formatYuchoAccount(item)}</td>
                  <td className="px-4 py-3 text-right text-sumi tabular-nums">
                    {formatYen(item.billingAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(item.billingStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-2">
        {items.map((item) => (
          <div
            key={item.sourceId}
            className="bg-white rounded-lg border border-gin p-3 shadow-elegant-sm"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                {/* displayNumber 優先・legacy-* 等は「整備中」ミュート表示 #283 */}
                <p className="font-mono text-xs text-hai">
                  <LegacyAwareValue value={item.displayNumber || item.plotNumber} kind="plotNumber" />
                </p>
                <p className="text-sm text-sumi truncate">{item.customerName ?? '—'}</p>
                <p className="text-[10px] text-hai truncate">{item.customerNameKana ?? ''}</p>
              </div>
              {statusBadge(item.billingStatus)}
            </div>
            <div className="flex items-end justify-between pt-2 border-t border-gin">
              <p className="font-mono text-[10px] text-hai">{formatYuchoAccount(item)}</p>
              <p className="text-sumi tabular-nums">{formatYen(item.billingAmount)}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

