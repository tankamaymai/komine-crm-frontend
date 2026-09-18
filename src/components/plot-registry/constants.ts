import { PaymentStatus, PhysicalPlotStatus } from '@komine/types';
import { type StatusBadgeProps } from '@/components/ui/status-badge';
import type { AiueoTab, SortKey } from './types';

// ===== 検索履歴 =====

export const SEARCH_HISTORY_KEY = 'komine:plots:search-history';
export const SEARCH_HISTORY_MAX = 5;

// ===== あいう順タブ =====

export const AIUEO_TABS: AiueoTab[] = [
  { key: 'あ', label: 'あ行', shortLabel: 'あ', kataKey: 'ア' },
  { key: 'か', label: 'か行', shortLabel: 'か', kataKey: 'カ' },
  { key: 'さ', label: 'さ行', shortLabel: 'さ', kataKey: 'サ' },
  { key: 'た', label: 'た行', shortLabel: 'た', kataKey: 'タ' },
  { key: 'な', label: 'な行', shortLabel: 'な', kataKey: 'ナ' },
  { key: 'は', label: 'は行', shortLabel: 'は', kataKey: 'ハ' },
  { key: 'ま', label: 'ま行', shortLabel: 'ま', kataKey: 'マ' },
  { key: 'や', label: 'や行', shortLabel: 'や', kataKey: 'ヤ' },
  { key: 'ら', label: 'ら行', shortLabel: 'ら', kataKey: 'ラ' },
  { key: 'わ', label: 'わ行', shortLabel: 'わ', kataKey: 'ワ' },
  { key: 'その他', label: 'その他', shortLabel: '他' },
  { key: '全', label: '全て表示', shortLabel: '全' },
];

// サーバーサイドソート対応マッピング
export const SERVER_SORT_MAP: Partial<Record<SortKey, string>> = {
  plotNumber: 'plotNumber',
  customerName: 'customerName',
  contractDate: 'contractDate',
  paymentStatus: 'paymentStatus',
  managementFee: 'managementFee',
};

// ===== 支払ステータス表示 =====

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.Unpaid]: '未入金',
  [PaymentStatus.Paid]: '入金済',
  [PaymentStatus.PartialPaid]: '一部入金',
  [PaymentStatus.Overdue]: '滞納',
  [PaymentStatus.Refunded]: '返金済',
};

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, StatusBadgeProps['variant']> = {
  [PaymentStatus.Unpaid]: 'unpaid',
  [PaymentStatus.Paid]: 'paid',
  [PaymentStatus.PartialPaid]: 'partial',
  [PaymentStatus.Overdue]: 'overdue',
  [PaymentStatus.Refunded]: 'refunded',
};

export const PLOT_STATUS_LABELS: Record<PhysicalPlotStatus, string> = {
  [PhysicalPlotStatus.Available]: '利用可能',
  [PhysicalPlotStatus.PartiallySold]: '一部販売済',
  [PhysicalPlotStatus.SoldOut]: '完売',
};

export const OCCUPANCY_BADGE_CLASS = {
  vacant: 'bg-gin text-hai-dark border-gin',
  inUse: 'bg-matsu-50 text-matsu-dark border-matsu-200',
} as const;
