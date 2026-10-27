'use client';

/**
 * 空き区画の選択（議事録 2026-07-21 §6）
 *
 * 業務要望: 新規顧客登録時の区画指定は手入力による重複や存在しない区画の登録ミスを
 * 防ぐため手入力を不可とし、空き区画のリストから選択する。
 *
 * 空き区画は実データで約2,500件、単一の区画名でも最大647件（凛B）あるため、
 * 素のプルダウンには載せられない。区画名で絞った上で番号のインクリメンタル検索を
 * 併用する。区画名は呼び出し側（BasicInfoTab の期→区画名セレクト）で確定済みの値を渡す。
 */

import { useEffect, useMemo, useState } from 'react';
import type { VacantPlotItem } from '@komine/types';

import { getVacantPlots } from '@/lib/api/plots';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** 一覧に出す最大件数。これを超える場合は検索での絞り込みを促す */
const FETCH_LIMIT = 200;

interface VacantPlotPickerProps {
  /** 選択済みの区画番号（physicalPlot.plotNumber）。未選択なら空文字 */
  value: string;
  /** 区画名（エリア）。未選択のうちは候補を出さない */
  areaName: string | undefined;
  /** 区画を選んだとき。物理区画の識別に必要な値をまとめて返す */
  onSelect: (plot: VacantPlotItem) => void;
  /** 選択を解除したとき */
  onClear: () => void;
  error?: string | undefined;
  /** ほかの段ですでに選んだ区画。候補には出すが押せなくする */
  excludeIds?: string[];
  /** 1画面に複数並べるときの検索欄 id */
  inputId?: string;
  /** 見出し。まとめ買いの2つ目以降で「区画番号（2つ目）」のように変える */
  label?: string;
}

export function VacantPlotPicker({
  value,
  areaName,
  onSelect,
  onClear,
  error,
  excludeIds = [],
  inputId = 'vacant-plot-search',
  label = '区画番号',
}: VacantPlotPickerProps) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<VacantPlotItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // 区画名が未選択のうちは 2,500 件を引かない
    if (!areaName) {
      setItems([]);
      setTotal(0);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await getVacantPlots({
          areaName,
          ...(search.trim() ? { search: search.trim() } : {}),
          limit: FETCH_LIMIT,
        });
        if (cancelled) return;
        if (response.success && response.data) {
          setItems(response.data.items);
          setTotal(response.data.pagination.total);
        } else {
          setItems([]);
          setTotal(0);
          setLoadError('空き区画の取得に失敗しました');
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          setLoadError('空き区画の取得に失敗しました');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 250); // 入力ごとに叩かないよう debounce

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [areaName, search]);

  const selected = useMemo(
    () => items.find((item) => item.plotNumber === value),
    [items, value]
  );

  return (
    <div>
      <Label htmlFor={inputId}>
        {label}
        <span className="text-beni"> *</span>
      </Label>

      {value ? (
        // 選択済み。誤入力を防ぐため手入力欄には戻さず、解除して選び直す
        <div className="mt-1 flex items-center justify-between gap-2 rounded-elegant border border-matsu bg-matsu-50 px-3 py-2">
          <span className="font-mono text-sm text-sumi">
            {selected?.displayNumber || value}
            {selected && (
              <span className="ml-2 font-sans text-xs text-hai tabular-nums">
                空き {selected.availableAreaSqm}㎡
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-matsu underline hover:no-underline"
          >
            選び直す
          </button>
        </div>
      ) : !areaName ? (
        <p className="mt-1 text-sm text-hai">先に区画（エリア）を選択してください</p>
      ) : (
        <>
          <Input
            id={inputId}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="区画番号で絞り込み（例: 56）"
            className={cn('mt-1', error && 'border-beni')}
            autoComplete="off"
          />

          <div className="mt-2 max-h-56 overflow-y-auto rounded-elegant border border-gin">
            {isLoading ? (
              <p className="px-3 py-2 text-sm text-hai">読み込み中...</p>
            ) : loadError ? (
              <p className="px-3 py-2 text-sm text-beni">{loadError}</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-2 text-sm text-hai">
                {search
                  ? '条件に合う空き区画がありません'
                  : `${areaName} に空き区画がありません`}
              </p>
            ) : (
              <ul>
                {items.map((item) => {
                  const taken = excludeIds.includes(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={taken}
                        onClick={() => onSelect(item)}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-2 text-left',
                          taken ? 'cursor-not-allowed bg-kinari/60 text-hai' : 'hover:bg-matsu-50'
                        )}
                      >
                        <span className="font-mono text-sm text-sumi">
                          {item.displayNumber || item.plotNumber}
                          {taken && (
                            <span className="ml-2 font-sans text-xs text-beni">
                              この区画はすでに選んでいます
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-hai tabular-nums">
                          空き {item.availableAreaSqm}㎡
                          {item.availableAreaSqm !== item.areaSqm && ` / 全体 ${item.areaSqm}㎡`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* 上限に達している間は「これで全部」と誤解させないよう明示する */}
          {total > items.length && (
            <p className="mt-1 text-xs text-kohaku-dark">
              {areaName} の空き {total}件のうち {items.length}件を表示中。区画番号で絞り込んでください
            </p>
          )}
          {total > 0 && total === items.length && (
            <p className="mt-1 text-xs text-hai">{areaName} の空き {total}件</p>
          )}
        </>
      )}

      {error && <p className="mt-1 text-sm text-beni">{error}</p>}
    </div>
  );
}
