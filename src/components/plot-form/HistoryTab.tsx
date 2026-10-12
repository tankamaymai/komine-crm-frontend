'use client';

import { useState } from 'react';
import type { HistoryTabProps } from './types';

/**
 * 履歴レコードの差分1項目
 */
interface ChangeDetail {
  before: unknown;
  after: unknown;
}

/**
 * バックエンド (issue #51) が返す履歴エントリ
 *
 * 既存の `@komine/types` 側の HistoryItem は古い shape を持つため、
 * このコンポーネント内で実際のレスポンスに合わせて拡張型を定義する。
 */
interface HistoryEntry {
  id: string;
  entityType?: string;
  entityLabel?: string;
  entityId?: string;
  actionType: string;
  changedFields?: Record<string, ChangeDetail> | string[] | null;
  fieldLabels?: Record<string, string>;
  beforeRecord?: Record<string, unknown> | null;
  afterRecord?: Record<string, unknown> | null;
  changedBy: string | null;
  changeReason: string | null;
  ipAddress?: string | null;
  createdAt: string | Date;
}

/**
 * UUID形式の判定
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidValue(value: unknown): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * 値を表示用文字列に整形する
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '（未設定）';
  }
  if (typeof value === 'boolean') {
    return value ? 'はい' : 'いいえ';
  }
  if (value instanceof Date) {
    return value.toLocaleString('ja-JP');
  }
  if (typeof value === 'string') {
    // UUID値は省略表示（バックエンド側でフィルタされるが、既存データ用のフォールバック）
    if (isUuidValue(value)) {
      return `（ID: ${value.substring(0, 8)}…）`;
    }
    // ISO 日付っぽい文字列は日本語日時表記に
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString('ja-JP');
      }
    }
    return value;
  }
  if (typeof value === 'number') {
    return value.toLocaleString('ja-JP');
  }
  return JSON.stringify(value);
}

/**
 * 差分が ChangeDetail 形式（オブジェクト）かどうか判定
 */
function isChangeDetailMap(
  changedFields: HistoryEntry['changedFields']
): changedFields is Record<string, ChangeDetail> {
  return (
    !!changedFields &&
    !Array.isArray(changedFields) &&
    typeof changedFields === 'object'
  );
}

/**
 * 履歴行のサマリーテキストを生成する
 */
function summarizeChange(history: HistoryEntry): string {
  if (history.actionType === 'CREATE') {
    return `${history.entityLabel ?? history.entityType ?? ''}を作成`;
  }
  if (history.actionType === 'DELETE') {
    return `${history.entityLabel ?? history.entityType ?? ''}を削除`;
  }
  if (isChangeDetailMap(history.changedFields)) {
    const labels = Object.keys(history.changedFields).map(
      (key) => history.fieldLabels?.[key] ?? key
    );
    if (labels.length === 0) return '-';
    if (labels.length <= 3) return labels.join('、');
    return `${labels.slice(0, 3).join('、')} 他${labels.length - 3}件`;
  }
  if (Array.isArray(history.changedFields)) {
    return history.changedFields.join(', ');
  }
  return '-';
}

export function HistoryTab({ plotDetail }: HistoryTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const histories = (plotDetail?.histories ?? []) as unknown as HistoryEntry[];

  if (histories.length === 0) {
    return (
      <div className="border border-gin rounded-elegant-lg p-4">
        <h3 className="text-sm font-semibold text-sumi mb-3">履歴情報</h3>
        <p className="text-sm text-hai">履歴データはありません</p>
      </div>
    );
  }

  return (
    <div className="border border-gin rounded-elegant-lg p-4">
      <h3 className="text-sm font-semibold text-sumi mb-3">
        履歴情報 <span className="text-hai font-normal">（{histories.length}件）</span>
      </h3>

      {/* ヘッダー */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-kinari border rounded-t-md text-xs font-medium text-hai">
        <span className="col-span-3">氏名</span>
        <span className="col-span-3">更新履歴</span>
        <span className="col-span-4">更新事由</span>
        <span className="col-span-1" />
        <span className="col-span-1 text-right">詳細</span>
      </div>

      {/* 行 */}
      <div className="border border-t-0 rounded-b-md divide-y">
        {histories.map((history) => {
          const isExpanded = selectedId === history.id;
          return (
            <div key={history.id}>
              <button
                type="button"
                className={`w-full grid grid-cols-12 gap-2 px-3 py-2 text-sm text-left cursor-pointer hover:bg-matsu-50 transition-colors duration-200 ${
                  isExpanded ? 'bg-matsu-50' : ''
                }`}
                onClick={() => setSelectedId(isExpanded ? null : history.id)}
              >
                <span className="col-span-3 text-xs text-sumi">
                  {history.entityLabel ?? history.changedBy ?? '-'}
                </span>
                <span className="col-span-3 text-xs">
                  {new Date(history.createdAt).toLocaleString('ja-JP')}
                </span>
                <span className="col-span-4 truncate text-xs">
                  {history.changeReason || summarizeChange(history)}
                </span>
                <span className="col-span-1" />
                <span className="col-span-1 text-right text-xs text-hai">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </button>

              {/* 展開時の差分表示 */}
              {isExpanded && (
                <div className="px-4 py-3 bg-white border-t text-xs">
                  {history.changeReason && (
                    <div className="mb-2">
                      <span className="font-semibold text-hai">変更事由: </span>
                      <span className="text-sumi">{history.changeReason}</span>
                    </div>
                  )}

                  {history.actionType === 'UPDATE' && isChangeDetailMap(history.changedFields) ? (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-kinari text-hai">
                          <th className="text-left p-2 border">フィールド</th>
                          <th className="text-left p-2 border">変更前</th>
                          <th className="text-left p-2 border">変更後</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(history.changedFields).map(([key, change]) => (
                          <tr key={key} className="border-b">
                            <td className="p-2 border font-medium text-sumi">
                              {history.fieldLabels?.[key] ?? key}
                            </td>
                            <td className="p-2 border text-red-700 line-through">
                              {formatValue(change.before)}
                            </td>
                            <td className="p-2 border text-green-700">
                              {formatValue(change.after)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : history.actionType === 'CREATE' && history.afterRecord ? (
                    (() => {
                      // 値が入っているフィールドだけ表示（issue #63: 未入力フィールドはノイズなので除外）
                      const entries = Object.entries(history.afterRecord)
                        .filter(([k]) => k !== 'id')
                        .filter(
                          ([, v]) => v !== null && v !== undefined && v !== ''
                        );
                      if (entries.length === 0) {
                        return <p className="text-hai">作成内容の詳細はありません</p>;
                      }
                      return (
                        <div>
                          <div className="font-semibold text-hai mb-1">作成内容:</div>
                          <table className="w-full border-collapse">
                            <tbody>
                              {entries.map(([key, value]) => (
                                <tr key={key} className="border-b">
                                  <td className="p-2 border font-medium text-sumi w-1/3">
                                    {history.fieldLabels?.[key] ?? key}
                                  </td>
                                  <td className="p-2 border text-sumi">
                                    {formatValue(value)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  ) : history.actionType === 'DELETE' && history.beforeRecord ? (
                    (() => {
                      const entries = Object.entries(history.beforeRecord)
                        .filter(([k]) => k !== 'id')
                        .filter(
                          ([, v]) => v !== null && v !== undefined && v !== ''
                        );
                      if (entries.length === 0) {
                        return <p className="text-hai">削除されたレコードの詳細はありません</p>;
                      }
                      return (
                        <div>
                          <div className="font-semibold text-hai mb-1">削除されたレコード:</div>
                          <table className="w-full border-collapse">
                            <tbody>
                              {entries.map(([key, value]) => (
                                <tr key={key} className="border-b">
                                  <td className="p-2 border font-medium text-sumi w-1/3">
                                    {history.fieldLabels?.[key] ?? key}
                                  </td>
                                  <td className="p-2 border text-sumi">
                                    {formatValue(value)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-hai">変更内容の詳細はありません</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
